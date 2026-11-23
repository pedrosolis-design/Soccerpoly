import crypto from 'node:crypto';
import type { WebSocket } from 'ws';
import {
  BAD_LUCK_CARDS,
  BOARD_TILES,
  BOT_PROFILES,
  CLUB_KIT_PALETTES,
  createParticipantsFromDrafts,
  FOOTBALLERS_POOL,
  LEAGUE_META,
  LUCK_CARDS,
  pickNonRepeatingChallenge,
  pickNonRepeatingDuel,
  TABLE_REACTIONS,
} from '../src/data/gameData.ts';
import type {
  ActiveModal,
  AuctionState,
  BoardTile,
  ChallengeCard,
  ChampionRecord,
  DuelState,
  FeedEntry,
  Footballer,
  LeagueId,
  Participant,
  PlayerReaction,
  PublicRoomSummary,
  RoomState,
  RoomVisibility,
} from '../src/types/game.ts';

interface ClientBinding {
  ws: WebSocket;
  roomCode: string | null;
  participantId: string | null;
}

interface InternalRoom {
  state: RoomState;
  seatTokens: Map<string, string>; // participantId -> secret seatToken
  usedChallengeIds: Set<string>;
  usedDuelIds: Set<string>;
  waitingKickTimers: Map<string, NodeJS.Timeout>;
  challengeSecret: {
    correctIndex?: number;
    explanation?: string;
  } | null;
  duelSecret: {
    correctIndex: number;
    explanation: string;
  } | null;
  turnTimer: NodeJS.Timeout | null;
  botTimer: NodeJS.Timeout | null;
  stepTimer: NodeJS.Timeout | null;
  auctionTimer: NodeJS.Timeout | null;
  duelTimer: NodeJS.Timeout | null;
  resolveTimer: NodeJS.Timeout | null;
  cleanupTimer: NodeJS.Timeout | null;
}

const TURN_DURATION_MS = 30_000;
const AUCTION_DURATION_MS = 10_000;
const DUEL_DURATION_MS = 12_000;

export class GameServerEngine {
  private rooms = new Map<string, InternalRoom>();
  private clients = new Map<WebSocket, ClientBinding>();
  private hallOfFame: ChampionRecord[] = [];
  private metrics = {
    startedAt: Date.now(),
    roomsCreated: 0,
    onlineMatchesStarted: 0,
    onlineMatchesFinished: 0,
    localMatchesStarted: 0,
  };

  public recordLocalMatchStarted(): void {
    this.metrics.localMatchesStarted += 1;
  }

  public getEngineMetrics() {
    let activeOnlinePlayers = 0;
    let waitingRooms = 0;
    let inGameRooms = 0;
    for (const room of this.rooms.values()) {
      if (room.state.phase === 'WAITING') waitingRooms += 1;
      if (room.state.phase === 'IN_GAME') inGameRooms += 1;
      activeOnlinePlayers += room.state.participants.filter(
        (p) => p.isHumanOwner && p.connected
      ).length;
    }
    return {
      ...this.metrics,
      activeConnections: this.clients.size,
      activeRooms: this.rooms.size,
      waitingRooms,
      inGameRooms,
      activeOnlinePlayers,
      hallOfFameSessionCount: this.hallOfFame.length,
    };
  }

  public getHallOfFame(): ChampionRecord[] {
    return [...this.hallOfFame];
  }

  public addLocalChampion(input: {
    winnerName: unknown;
    clubName: unknown;
    color: unknown;
    secondaryColor: unknown;
    points: unknown;
    moneyLeft: unknown;
    squadCount: unknown;
    playersCount: unknown;
  }): ChampionRecord {
    const rec: ChampionRecord = {
      id: `ch-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      winnerName: this.sanitizeText(input.winnerName, 'Campeón', 16),
      clubName: this.sanitizeText(input.clubName, 'Club 412', 20),
      color:
        typeof input.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(input.color)
          ? input.color
          : '#4B6B94',
      secondaryColor:
        typeof input.secondaryColor === 'string' &&
        /^#[0-9a-fA-F]{6}$/.test(input.secondaryColor)
          ? input.secondaryColor
          : '#E9D69B',
      points:
        typeof input.points === 'number' && Number.isFinite(input.points)
          ? Math.max(0, Math.min(500, Math.round(input.points)))
          : 60,
      moneyLeft:
        typeof input.moneyLeft === 'number' && Number.isFinite(input.moneyLeft)
          ? Math.max(0, Math.min(5000, Math.round(input.moneyLeft)))
          : 0,
      squadCount:
        typeof input.squadCount === 'number' && Number.isFinite(input.squadCount)
          ? Math.max(0, Math.min(30, Math.round(input.squadCount)))
          : 0,
      mode: 'local',
      playersCount:
        typeof input.playersCount === 'number' &&
        Number.isFinite(input.playersCount)
          ? Math.max(2, Math.min(5, Math.round(input.playersCount)))
          : 2,
      wonAt: Date.now(),
    };
    this.hallOfFame = [rec, ...this.hallOfFame.slice(0, 29)];
    return rec;
  }

  public verifySeatToken(code: string, seatToken: string): boolean {
    const room = this.rooms.get(code.toUpperCase().trim());
    if (!room || !seatToken) return false;
    for (const token of room.seatTokens.values()) {
      if (token === seatToken) return true;
    }
    return false;
  }

  public registerSocket(
    ws: WebSocket,
    cookieSeat?: { code: string; seatToken: string } | null
  ) {
    const binding: ClientBinding = { ws, roomCode: null, participantId: null };
    this.clients.set(ws, binding);

    if (cookieSeat?.code && cookieSeat?.seatToken) {
      const restored = this.tryRestoreSeat(
        ws,
        binding,
        cookieSeat.code,
        cookieSeat.seatToken
      );
      if (restored) return;
    }

    this.sendToSocket(ws, {
      type: 'room:public_list',
      rooms: this.getPublicRooms(),
    });
  }

  public handleDisconnect(ws: WebSocket, explicitLeave = false) {
    const binding = this.clients.get(ws);
    this.clients.delete(ws);
    if (!binding?.roomCode || !binding.participantId) return;

    const room = this.rooms.get(binding.roomCode);
    if (!room) return;

    const participant = room.state.participants.find(
      (p) => p.id === binding.participantId
    );
    if (!participant) return;

    if (room.state.phase === 'WAITING') {
      const kickParticipant = () => {
        room.waitingKickTimers.delete(participant.id);
        room.state.participants = room.state.participants.filter(
          (p) => p.id !== participant.id
        );
        room.seatTokens.delete(participant.id);

        if (room.state.participants.length === 0) {
          this.destroyRoom(room.state.code);
          this.broadcastPublicRooms();
          return;
        }

        room.state.participants.forEach((p, idx) => {
          p.seatIndex = idx;
          p.isHost = idx === 0;
        });
        this.bumpAndBroadcast(room);
        this.broadcastPublicRooms();
      };

      if (explicitLeave) {
        kickParticipant();
        return;
      }

      // Brief 6s grace period on accidental drop / F5 reload in waiting room
      participant.connected = false;
      const prevTimer = room.waitingKickTimers.get(participant.id);
      if (prevTimer) clearTimeout(prevTimer);
      room.waitingKickTimers.set(
        participant.id,
        setTimeout(() => {
          if (!participant.connected && room.state.phase === 'WAITING') {
            kickParticipant();
          }
        }, 6_000)
      );
      return;
    }

    // During IN_GAME: smart Bot takes over seamlessly
    participant.connected = false;
    participant.isBot = true;
    this.pushFeed(
      room,
      participant,
      'se desconectó · un Bot tomó su lugar temporalmente'
    );
    this.bumpAndBroadcast(room);

    const anyHumanConnected = room.state.participants.some(
      (p) => p.isHumanOwner && p.connected
    );

    if (!anyHumanConnected) {
      room.cleanupTimer = setTimeout(() => {
        this.destroyRoom(room.state.code);
      }, 120_000);
    } else {
      this.scheduleContextualBots(room);
    }
  }

  public handleMessage(ws: WebSocket, raw: string) {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw);
    } catch {
      this.sendError(ws, 'Mensaje inválido.');
      return;
    }

    const type = typeof msg.type === 'string' ? msg.type : '';
    const binding = this.clients.get(ws);
    if (!binding) return;

    switch (type) {
      case 'room:list_public':
        this.sendToSocket(ws, {
          type: 'room:public_list',
          rooms: this.getPublicRooms(),
        });
        return;

      case 'room:create':
        this.handleCreateRoom(ws, binding, msg);
        return;

      case 'room:join':
        this.handleJoinRoom(ws, binding, msg);
        return;

      case 'room:quick_match':
        this.handleQuickMatch(ws, binding, msg);
        return;

      case 'room:reconnect':
        this.handleReconnect(ws, binding, msg);
        return;

      case 'room:leave':
        this.handleDisconnect(ws, true);
        binding.roomCode = null;
        binding.participantId = null;
        this.clients.set(ws, binding);
        this.sendToSocket(ws, { type: 'room:left' });
        this.sendToSocket(ws, {
          type: 'room:public_list',
          rooms: this.getPublicRooms(),
        });
        return;
    }

    // All remaining actions require an active room binding
    if (!binding.roomCode || !binding.participantId) {
      this.sendError(ws, 'No estás conectado a ninguna sala.');
      return;
    }
    const room = this.rooms.get(binding.roomCode);
    if (!room) {
      this.sendError(ws, 'La sala ya no existe.');
      return;
    }

    const actor = room.state.participants.find(
      (p) => p.id === binding.participantId
    );
    if (!actor) {
      this.sendError(ws, 'Asiento no encontrado.');
      return;
    }

    // Verify seat token when provided or bound via ws
    if (
      typeof msg.seatToken === 'string' &&
      room.seatTokens.get(actor.id) !== msg.seatToken
    ) {
      this.sendError(ws, 'Token de sesión inválido.');
      return;
    }

    switch (type) {
      case 'lobby:update_profile':
        this.handleUpdateProfile(room, actor, msg);
        return;
      case 'lobby:toggle_ready':
        if (room.state.phase !== 'WAITING') return;
        actor.isReady = !actor.isReady;
        this.bumpAndBroadcast(room);
        return;
      case 'lobby:toggle_fill_bots':
        if (room.state.phase !== 'WAITING' || !actor.isHost) return;
        room.state.fillWithBots = !room.state.fillWithBots;
        this.bumpAndBroadcast(room);
        return;
      case 'lobby:start_match':
        this.handleStartMatch(ws, room, actor);
        return;
      case 'turn:roll_dice':
        this.handleRollDice(ws, room, actor);
        return;
      case 'turn:sign_player':
        this.handleSignPlayer(ws, room, actor, msg);
        return;
      case 'turn:pass_signing':
        this.handlePassSigning(ws, room, actor);
        return;
      case 'turn:sell_player':
        this.handleSellPlayer(ws, room, actor, msg);
        return;
      case 'auction:place_bid':
        this.handleAuctionBid(ws, room, actor);
        return;
      case 'auction:pass':
        this.handleAuctionPass(room, actor);
        return;
      case 'challenge:submit_answer':
        this.handleChallengeAnswer(ws, room, actor, msg);
        return;
      case 'challenge:penalty_shot':
        this.handlePenaltyShot(ws, room, actor, msg);
        return;
      case 'challenge:crossbar_kick':
        this.handleCrossbarKick(ws, room, actor, msg);
        return;
      case 'duel:submit_answer':
        this.handleDuelAnswer(ws, room, actor, msg);
        return;
      case 'luck:apply':
        this.handleApplyLuck(ws, room, actor);
        return;
      case 'jail:resolve':
        this.handleResolveJail(ws, room, actor, msg);
        return;
      case 'reaction:send':
        this.handleReaction(room, actor, msg);
        return;
      case 'room:rematch':
        if (room.state.phase === 'FINISHED' && actor.isHost) {
          this.restartMatch(room);
        }
        return;
      case 'room:return_to_lobby':
        if (room.state.phase === 'FINISHED' && actor.isHost) {
          this.returnRoomToLobby(room);
        }
        return;
    }
  }

  /* ------------------------------------------------------------------------ */
  /* ROOM CREATION, MATCHMAKING & RECONNECTION                                */
  /* ------------------------------------------------------------------------ */

  private sanitizeText(input: unknown, fallback: string, maxLen: number): string {
    if (typeof input !== 'string') return fallback;
    const cleaned = input.replace(/[<>]/g, '').trim().slice(0, maxLen);
    return cleaned || fallback;
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return this.rooms.has(code) ? this.generateRoomCode() : code;
  }

  private handleCreateRoom(
    ws: WebSocket,
    binding: ClientBinding,
    msg: Record<string, unknown>
  ) {
    this.detachIfBound(ws, binding);

    const visibility: RoomVisibility =
      msg.visibility === 'public' ? 'public' : 'private';
    const name = this.sanitizeText(msg.name, 'Jugador 1', 16);
    const clubName = this.sanitizeText(msg.clubName, `Club ${name}`, 20);
    const paletteId =
      typeof msg.paletteId === 'string' ? msg.paletteId : 'xeneize';

    const code = this.generateRoomCode();
    const hostParticipant = createParticipantsFromDrafts(
      [{ id: `u-${crypto.randomBytes(3).toString('hex')}`, name, clubName, paletteId }],
      [false]
    )[0];

    const seatToken = crypto.randomBytes(16).toString('hex');
    const room: InternalRoom = {
      state: {
        code,
        visibility,
        phase: 'WAITING',
        participants: [hostParticipant],
        activePlayerIndex: 0,
        diceValue: 1,
        isMoving: false,
        turnDeadlineMs: null,
        activeModal: { type: 'NONE' },
        feed: [],
        sequenceId: 1,
        fillWithBots: true,
      },
      seatTokens: new Map([[hostParticipant.id, seatToken]]),
      usedChallengeIds: new Set(),
      usedDuelIds: new Set(),
      waitingKickTimers: new Map(),
      challengeSecret: null,
      duelSecret: null,
      turnTimer: null,
      botTimer: null,
      stepTimer: null,
      auctionTimer: null,
      duelTimer: null,
      resolveTimer: null,
      cleanupTimer: null,
    };

    this.rooms.set(code, room);
    this.metrics.roomsCreated += 1;
    binding.roomCode = code;
    binding.participantId = hostParticipant.id;
    this.clients.set(ws, binding);

    this.sendToSocket(ws, {
      type: 'room:joined',
      participantId: hostParticipant.id,
      seatToken,
      state: this.sanitizeRoomState(room),
    });
    this.broadcastPublicRooms();
  }

  private handleJoinRoom(
    ws: WebSocket,
    binding: ClientBinding,
    msg: Record<string, unknown>
  ) {
    const code =
      typeof msg.code === 'string'
        ? msg.code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
        : '';
    const room = this.rooms.get(code);
    if (!room) {
      this.sendError(ws, `No encontramos ninguna sala con el código ${code}.`);
      return;
    }
    if (room.state.phase !== 'WAITING') {
      this.sendError(ws, 'Esa partida ya comenzó.');
      return;
    }
    if (room.state.participants.length >= 5) {
      this.sendError(ws, 'La sala ya está completa (5/5 clubes).');
      return;
    }

    this.detachIfBound(ws, binding);

    const idx = room.state.participants.length;
    const name = this.sanitizeText(msg.name, `Jugador ${idx + 1}`, 16);
    const clubName = this.sanitizeText(msg.clubName, `Club ${name}`, 20);
    const paletteId =
      typeof msg.paletteId === 'string'
        ? msg.paletteId
        : CLUB_KIT_PALETTES[idx % CLUB_KIT_PALETTES.length].id;

    const participant = createParticipantsFromDrafts(
      [{ id: `u-${crypto.randomBytes(3).toString('hex')}`, name, clubName, paletteId }],
      [false]
    )[0];
    participant.seatIndex = idx;
    participant.isHost = false;

    const seatToken = crypto.randomBytes(16).toString('hex');
    room.state.participants.push(participant);
    room.seatTokens.set(participant.id, seatToken);

    binding.roomCode = code;
    binding.participantId = participant.id;
    this.clients.set(ws, binding);

    this.sendToSocket(ws, {
      type: 'room:joined',
      participantId: participant.id,
      seatToken,
      state: this.sanitizeRoomState(room),
    });
    this.bumpAndBroadcast(room);
    this.broadcastPublicRooms();
  }

  private handleQuickMatch(
    ws: WebSocket,
    binding: ClientBinding,
    msg: Record<string, unknown>
  ) {
    const openPublic = Array.from(this.rooms.values()).find(
      (r) =>
        r.state.visibility === 'public' &&
        r.state.phase === 'WAITING' &&
        r.state.participants.length < 5
    );

    if (openPublic) {
      this.handleJoinRoom(ws, binding, { ...msg, code: openPublic.state.code });
    } else {
      this.handleCreateRoom(ws, binding, { ...msg, visibility: 'public' });
    }
  }

  private tryRestoreSeat(
    ws: WebSocket,
    binding: ClientBinding,
    code: string,
    seatToken: string
  ): boolean {
    const cleanCode = code.toUpperCase().trim();
    const room = this.rooms.get(cleanCode);
    if (!room) return false;

    let matchedId: string | null = null;
    for (const [pId, token] of room.seatTokens.entries()) {
      if (token === seatToken) {
        matchedId = pId;
        break;
      }
    }
    if (!matchedId) return false;

    const participant = room.state.participants.find((p) => p.id === matchedId);
    if (!participant) return false;

    const kickTimer = room.waitingKickTimers.get(participant.id);
    if (kickTimer) {
      clearTimeout(kickTimer);
      room.waitingKickTimers.delete(participant.id);
    }

    if (room.cleanupTimer) {
      clearTimeout(room.cleanupTimer);
      room.cleanupTimer = null;
    }

    participant.connected = true;
    participant.isBot = false;

    binding.roomCode = cleanCode;
    binding.participantId = participant.id;
    this.clients.set(ws, binding);

    if (room.state.phase === 'IN_GAME') {
      this.pushFeed(room, participant, 'volvió a conectarse al partido');
    }

    this.sendToSocket(ws, {
      type: 'room:joined',
      participantId: participant.id,
      seatToken,
      state: this.sanitizeRoomState(room),
    });
    this.bumpAndBroadcast(room);
    return true;
  }

  private handleReconnect(
    ws: WebSocket,
    binding: ClientBinding,
    msg: Record<string, unknown>
  ) {
    const code =
      typeof msg.code === 'string' ? msg.code.toUpperCase().trim() : '';
    const seatToken = typeof msg.seatToken === 'string' ? msg.seatToken : '';
    if (!this.tryRestoreSeat(ws, binding, code, seatToken)) {
      this.sendError(ws, 'La sala anterior ya finalizó o tu asiento expiró.');
    }
  }

  private detachIfBound(ws: WebSocket, binding: ClientBinding) {
    if (binding.roomCode && binding.participantId) {
      this.handleDisconnect(ws);
      binding.roomCode = null;
      binding.participantId = null;
    }
  }

  /* ------------------------------------------------------------------------ */
  /* WAITING ROOM & MATCH START                                               */
  /* ------------------------------------------------------------------------ */

  private handleUpdateProfile(
    room: InternalRoom,
    actor: Participant,
    msg: Record<string, unknown>
  ) {
    if (room.state.phase !== 'WAITING') return;
    actor.name = this.sanitizeText(msg.name, actor.name, 16);
    actor.clubName = this.sanitizeText(msg.clubName, actor.clubName, 20);
    actor.shortTag =
      actor.name
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 3)
        .toUpperCase() || actor.shortTag;

    if (typeof msg.paletteId === 'string') {
      const pal = CLUB_KIT_PALETTES.find((p) => p.id === msg.paletteId);
      if (pal) {
        actor.color = pal.primary;
        actor.secondaryColor = pal.secondary;
      }
    }
    this.bumpAndBroadcast(room);
    this.broadcastPublicRooms();
  }

  private handleStartMatch(
    ws: WebSocket,
    room: InternalRoom,
    actor: Participant
  ) {
    if (room.state.phase !== 'WAITING') return;
    if (!actor.isHost) {
      this.sendError(ws, 'Solo el anfitrión puede iniciar la partida.');
      return;
    }

    if (!room.state.fillWithBots && room.state.participants.length < 2) {
      this.sendError(
        ws,
        'Necesitás al menos 2 clubes (o activá completar con Bots).'
      );
      return;
    }

    if (room.state.fillWithBots) {
      const targetSeats = Math.max(4, room.state.participants.length);
      const usedNames = new Set(room.state.participants.map((p) => p.name));
      let botIdx = 0;

      while (room.state.participants.length < Math.min(5, targetSeats)) {
        const profile = BOT_PROFILES[botIdx % BOT_PROFILES.length];
        botIdx += 1;
        if (usedNames.has(profile.name)) continue;
        usedNames.add(profile.name);
        const seatIndex = room.state.participants.length;
        const bot = createParticipantsFromDrafts(
          [
            {
              id: `bot-${crypto.randomBytes(2).toString('hex')}`,
              name: profile.name,
              clubName: profile.clubName,
              paletteId: profile.paletteId,
            },
          ],
          [true]
        )[0];
        bot.seatIndex = seatIndex;
        bot.isHost = false;
        room.state.participants.push(bot);
      }
    }

    room.state.phase = 'IN_GAME';
    room.state.activePlayerIndex = 0;
    room.state.activeModal = { type: 'NONE' };
    this.metrics.onlineMatchesStarted += 1;
    room.state.feed = [
      {
        id: `kickoff-${Date.now()}`,
        actorName: room.state.participants[0].name,
        actorColor: room.state.participants[0].color,
        text: `arranca el torneo online con ${room.state.participants[0].clubName}`,
        delta: '$500M · 0 PTS',
      },
    ];

    this.scheduleTurnClock(room);
    this.bumpAndBroadcast(room);
    this.broadcastPublicRooms();
    this.scheduleContextualBots(room);
  }

  private restartMatch(room: InternalRoom) {
    this.clearAllTimers(room);
    room.challengeSecret = null;
    room.duelSecret = null;
    room.usedChallengeIds.clear();
    room.usedDuelIds.clear();
    room.state.phase = 'IN_GAME';
    room.state.activePlayerIndex = 0;
    room.state.diceValue = 1;
    room.state.isMoving = false;
    room.state.activeModal = { type: 'NONE' };
    this.metrics.onlineMatchesStarted += 1;
    room.state.participants = room.state.participants.map((p) => ({
      ...p,
      money: 500,
      points: 0,
      position: 0,
      laps: 0,
      jailTurns: 0,
      hasDiscount: false,
      squad: [],
      trophies: {
        copaDeLaLiga: false,
        ligaNacional: false,
        championsLeague: false,
      },
    }));
    room.state.feed = [
      {
        id: `rematch-${Date.now()}`,
        actorName: 'Monopolio 412',
        actorColor: '#4F7D63',
        text: '¡Revancha iniciada! Todos desde Salida con $500M.',
      },
    ];
    this.scheduleTurnClock(room);
    this.bumpAndBroadcast(room);
    this.scheduleContextualBots(room);
  }

  private returnRoomToLobby(room: InternalRoom) {
    this.clearAllTimers(room);
    room.challengeSecret = null;
    room.duelSecret = null;
    room.usedChallengeIds.clear();
    room.usedDuelIds.clear();

    const humans = room.state.participants
      .filter((p) => p.isHumanOwner)
      .map((p, idx) => ({
        ...p,
        seatIndex: idx,
        isHost: idx === 0,
        isBot: !p.connected,
        isReady: idx === 0,
        money: 500,
        points: 0,
        position: 0,
        laps: 0,
        jailTurns: 0,
        hasDiscount: false,
        squad: [],
        trophies: {
          copaDeLaLiga: false,
          ligaNacional: false,
          championsLeague: false,
        },
      }));

    room.state.phase = 'WAITING';
    room.state.participants = humans;
    room.state.activePlayerIndex = 0;
    room.state.diceValue = 1;
    room.state.isMoving = false;
    room.state.turnDeadlineMs = null;
    room.state.activeModal = { type: 'NONE' };
    room.state.feed = [];

    this.bumpAndBroadcast(room);
    this.broadcastPublicRooms();
  }

  /* ------------------------------------------------------------------------ */
  /* TURN LOGIC, SHOT CLOCK, DICE MOVEMENT & TILE RESOLUTION                  */
  /* ------------------------------------------------------------------------ */

  private getActivePlayer(room: InternalRoom): Participant {
    return room.state.participants[room.state.activePlayerIndex];
  }

  private scheduleTurnClock(room: InternalRoom) {
    if (room.turnTimer) {
      clearTimeout(room.turnTimer);
      room.turnTimer = null;
    }
    if (room.state.phase !== 'IN_GAME') {
      room.state.turnDeadlineMs = null;
      return;
    }

    const modalType = room.state.activeModal.type;
    if (modalType === 'AUCTION' || modalType === 'DUEL' || modalType === 'VICTORY') {
      room.state.turnDeadlineMs = null;
      return;
    }

    room.state.turnDeadlineMs = Date.now() + TURN_DURATION_MS;
    const expectedSeq = room.state.sequenceId;

    room.turnTimer = setTimeout(() => {
      if (room.state.phase !== 'IN_GAME') return;
      if (room.state.isMoving) return;
      const active = this.getActivePlayer(room);

      if (room.state.activeModal.type === 'NONE') {
        if (active.jailTurns > 0) {
          this.resolveJailInternal(room, active, 'WAIT');
        } else {
          this.pushFeed(room, active, 'agotó el reloj de 30s · tiro automático');
          this.executeDiceRoll(room, active);
        }
        return;
      }

      if (room.state.activeModal.type === 'SIGNING') {
        this.pushFeed(room, active, 'no decidió a tiempo · pasa turno');
        this.triggerAuctionOrAdvance(room, active);
        return;
      }

      if (room.state.activeModal.type === 'LUCK') {
        this.applyLuckInternal(room, active);
        return;
      }

      if (room.state.activeModal.type === 'JAIL') {
        this.resolveJailInternal(room, active, 'WAIT');
        return;
      }

      if (
        room.state.activeModal.type === 'CHALLENGE' &&
        !room.state.activeModal.challenge.resolved &&
        room.state.sequenceId >= expectedSeq
      ) {
        this.finalizeChallenge(room, active, false);
      }
    }, TURN_DURATION_MS + 400);
  }

  private handleRollDice(
    ws: WebSocket,
    room: InternalRoom,
    actor: Participant
  ) {
    if (room.state.phase !== 'IN_GAME') return;
    const active = this.getActivePlayer(room);
    if (active.id !== actor.id) {
      this.sendError(ws, 'Todavía no es tu turno.');
      return;
    }
    if (room.state.isMoving || room.state.activeModal.type !== 'NONE') return;
    if (active.jailTurns > 0) {
      room.state.activeModal = {
        type: 'JAIL',
        reason: 'Estás en la cárcel. Elegí cómo resolver este turno.',
        bailCost: 100,
      };
      this.scheduleTurnClock(room);
      this.bumpAndBroadcast(room);
      return;
    }

    this.executeDiceRoll(room, active);
  }

  private executeDiceRoll(room: InternalRoom, active: Participant) {
    if (room.turnTimer) {
      clearTimeout(room.turnTimer);
      room.turnTimer = null;
    }

    const roll = Math.floor(Math.random() * 6) + 1;
    room.state.diceValue = roll;
    room.state.isMoving = true;
    room.state.turnDeadlineMs = null;
    this.bumpAndBroadcast(room);

    let stepsLeft = roll;

    const stepNext = () => {
      if (room.state.phase !== 'IN_GAME') return;
      stepsLeft -= 1;
      const nextPos = (active.position + 1) % BOARD_TILES.length;
      const crossedStart = nextPos === 0;
      active.position = nextPos;

      if (crossedStart) {
        active.laps += 1;
        active.money += 100;
        active.trophies = {
          copaDeLaLiga: active.trophies.copaDeLaLiga || active.points >= 20,
          ligaNacional: active.trophies.ligaNacional || active.points >= 40,
          championsLeague: active.trophies.championsLeague || active.points >= 60,
        };
      }

      this.bumpAndBroadcast(room);

      if (stepsLeft > 0) {
        room.stepTimer = setTimeout(stepNext, 165);
      } else {
        room.stepTimer = setTimeout(() => {
          room.state.isMoving = false;
          this.afterLanding(room, active);
        }, 220);
      }
    };

    room.stepTimer = setTimeout(stepNext, 420);
  }

  private afterLanding(room: InternalRoom, active: Participant) {
    if (
      active.trophies.copaDeLaLiga &&
      active.trophies.ligaNacional &&
      active.trophies.championsLeague
    ) {
      room.state.phase = 'FINISHED';
      room.state.activeModal = { type: 'VICTORY', winner: { ...active } };
      this.metrics.onlineMatchesFinished += 1;
      this.clearAllTimers(room);
      this.pushFeed(room, active, '¡CONQUISTÓ EL TRIPLETE Y GANÓ EL TORNEO!', 'CAMPEÓN');
      this.hallOfFame = [
        {
          id: `hof-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
          winnerName: active.name,
          clubName: active.clubName,
          color: active.color,
          secondaryColor: active.secondaryColor,
          points: active.points,
          moneyLeft: active.money,
          squadCount: active.squad.length,
          mode: 'online',
          playersCount: room.state.participants.length,
          wonAt: Date.now(),
        },
        ...this.hallOfFame.slice(0, 29),
      ];
      this.bumpAndBroadcast(room);
      return;
    }

    // Check 1v1 Duel condition: landed on a non-Start, non-Jail tile occupied by another club
    const pos = active.position;
    if (pos !== 0 && pos !== 5 && pos !== 15) {
      const rival = room.state.participants.find(
        (p) => p.id !== active.id && p.position === pos
      );
      if (rival) {
        this.startDuel(room, active, rival);
        return;
      }
    }

    const tile: BoardTile = BOARD_TILES[pos];
    this.triggerTile(room, tile, active);
  }

  private triggerTile(
    room: InternalRoom,
    tile: BoardTile,
    active: Participant
  ) {
    if (tile.kind === 'league' || tile.kind === 'legends') {
      const leagueId = tile.leagueId ?? 'premier';
      const signedIds = new Set(
        room.state.participants.flatMap((p) => p.squad.map((f) => f.id))
      );
      const options = this.pickLeagueOptions(leagueId, signedIds);
      room.state.activeModal = {
        type: 'SIGNING',
        leagueId,
        leagueTitle: LEAGUE_META[leagueId].name,
        options,
      };
      this.scheduleTurnClock(room);
      this.bumpAndBroadcast(room);
      this.scheduleContextualBots(room);
      return;
    }

    if (tile.kind === 'challenge') {
      this.openChallengeModal(room, active);
      return;
    }

    if (tile.kind === 'luck') {
      const card = LUCK_CARDS[Math.floor(Math.random() * LUCK_CARDS.length)];
      room.state.activeModal = { type: 'LUCK', card };
      this.scheduleTurnClock(room);
      this.bumpAndBroadcast(room);
      this.scheduleContextualBots(room);
      return;
    }

    if (tile.kind === 'badluck') {
      const card =
        BAD_LUCK_CARDS[Math.floor(Math.random() * BAD_LUCK_CARDS.length)];
      room.state.activeModal = { type: 'LUCK', card };
      this.scheduleTurnClock(room);
      this.bumpAndBroadcast(room);
      this.scheduleContextualBots(room);
      return;
    }

    if (tile.kind === 'discount') {
      active.hasDiscount = true;
      this.pushFeed(
        room,
        active,
        'activó cupón de descuento para su próximo fichaje',
        '-50%'
      );
      this.advanceTurn(room);
      return;
    }

    if (tile.kind === 'gotojail' || tile.kind === 'jail') {
      active.position = 5;
      active.jailTurns = 2;
      this.pushFeed(room, active, 'cayó en la cárcel (2 turnos)', 'CÁRCEL');
      this.advanceTurn(room);
      return;
    }

    this.pushFeed(room, active, 'pasó por Salida / Llegada', '+$100M');
    this.advanceTurn(room);
  }

  private pickLeagueOptions(
    leagueId: LeagueId,
    alreadySignedIds: Set<string>
  ): Footballer[] {
    const pool = FOOTBALLERS_POOL.filter((f) => f.leagueId === leagueId);
    const available = pool.filter((f) => !alreadySignedIds.has(f.id));
    const source = available.length >= 3 ? available : pool;

    if (leagueId === 'legends') {
      return [...source].sort(() => Math.random() - 0.5).slice(0, 3);
    }

    const tiers: Array<Footballer['tier']> = ['ORO', 'PLATA', 'BRONCE'];
    return tiers
      .map((tier) => {
        const candidates = source.filter((f) => f.tier === tier);
        if (candidates.length > 0) {
          return candidates[Math.floor(Math.random() * candidates.length)];
        }
        const fallback = pool.filter((f) => f.tier === tier);
        return fallback[Math.floor(Math.random() * fallback.length)] ?? pool[0];
      })
      .filter(Boolean);
  }

  /* ------------------------------------------------------------------------ */
  /* SIGNINGS & FLASH AUCTION (10s)                                           */
  /* ------------------------------------------------------------------------ */

  private handleSignPlayer(
    ws: WebSocket,
    room: InternalRoom,
    actor: Participant,
    msg: Record<string, unknown>
  ) {
    if (room.state.activeModal.type !== 'SIGNING') return;
    if (this.getActivePlayer(room).id !== actor.id) {
      this.sendError(ws, 'No podés fichar fuera de tu turno.');
      return;
    }

    const footballerId =
      typeof msg.footballerId === 'string' ? msg.footballerId : '';
    const footballer = room.state.activeModal.options.find(
      (f) => f.id === footballerId
    );
    if (!footballer) return;

    const finalCost = actor.hasDiscount
      ? Math.round(footballer.cost * 0.5)
      : footballer.cost;

    if (actor.money < finalCost) {
      this.sendError(ws, 'No te alcanza el presupuesto para ese jugador.');
      return;
    }

    actor.money -= finalCost;
    actor.points += footballer.points;
    actor.hasDiscount = false;
    actor.squad.push(footballer);

    this.pushFeed(
      room,
      actor,
      `fichó a ${footballer.name} para ${actor.clubName}`,
      `-$${finalCost}M · +${footballer.points} PTS`
    );
    this.advanceTurn(room);
  }

  private handlePassSigning(
    ws: WebSocket,
    room: InternalRoom,
    actor: Participant
  ) {
    if (room.state.activeModal.type !== 'SIGNING') return;
    if (this.getActivePlayer(room).id !== actor.id) {
      this.sendError(ws, 'No podés pasar fuera de tu turno.');
      return;
    }
    this.triggerAuctionOrAdvance(room, actor);
  }

  private triggerAuctionOrAdvance(room: InternalRoom, seller: Participant) {
    if (room.state.activeModal.type !== 'SIGNING') {
      this.advanceTurn(room);
      return;
    }

    const topCard = room.state.activeModal.options[0];
    if (!topCard) {
      this.advanceTurn(room);
      return;
    }

    const startingBid = Math.max(10, Math.round((topCard.cost * 0.5) / 5) * 5);
    const eligibleBidders = room.state.participants.filter(
      (p) => p.id !== seller.id && p.money >= startingBid
    );

    if (eligibleBidders.length === 0) {
      this.pushFeed(room, seller, 'pasó sin fichar (sin interesados en subasta)');
      this.advanceTurn(room);
      return;
    }

    const auction: AuctionState = {
      player: topCard,
      sellerId: seller.id,
      startingBid,
      currentBid: startingBid,
      highestBidderId: null,
      highestBidderName: null,
      highestBidderClub: null,
      passedIds: [seller.id],
      endsAtMs: Date.now() + AUCTION_DURATION_MS,
    };

    room.state.activeModal = { type: 'AUCTION', auction };
    this.pushFeed(
      room,
      seller,
      `mandó a subasta a ${topCard.name}`,
      `Base $${startingBid}M`
    );
    this.scheduleTurnClock(room);
    this.scheduleAuctionExpiry(room);
    this.bumpAndBroadcast(room);
    this.scheduleContextualBots(room);
  }

  private scheduleAuctionExpiry(room: InternalRoom) {
    if (room.auctionTimer) clearTimeout(room.auctionTimer);
    if (room.state.activeModal.type !== 'AUCTION') return;
    const msLeft = Math.max(200, room.state.activeModal.auction.endsAtMs - Date.now());
    room.auctionTimer = setTimeout(() => {
      this.finishAuction(room);
    }, msLeft);
  }

  private handleAuctionBid(
    ws: WebSocket,
    room: InternalRoom,
    actor: Participant
  ) {
    if (room.state.activeModal.type !== 'AUCTION') return;
    const auction = room.state.activeModal.auction;
    if (actor.id === auction.sellerId) {
      this.sendError(ws, 'No podés pujar en tu propia subasta.');
      return;
    }
    if (auction.passedIds.includes(actor.id)) return;
    if (auction.highestBidderId === actor.id) return;

    const nextBid = auction.highestBidderId
      ? auction.currentBid + 10
      : auction.startingBid;

    if (actor.money < nextBid) {
      this.sendError(ws, 'Presupuesto insuficiente para pujar.');
      return;
    }

    auction.currentBid = nextBid;
    auction.highestBidderId = actor.id;
    auction.highestBidderName = actor.name;
    auction.highestBidderClub = actor.clubName;
    // Extend deadline up to +4s grace on late bids
    auction.endsAtMs = Math.max(auction.endsAtMs, Date.now() + 4_000);

    this.scheduleAuctionExpiry(room);
    this.bumpAndBroadcast(room);
    this.scheduleContextualBots(room);
  }

  private handleAuctionPass(room: InternalRoom, actor: Participant) {
    if (room.state.activeModal.type !== 'AUCTION') return;
    const auction = room.state.activeModal.auction;
    if (!auction.passedIds.includes(actor.id)) {
      auction.passedIds.push(actor.id);
    }

    const activeBidders = room.state.participants.filter(
      (p) =>
        p.id !== auction.sellerId &&
        !auction.passedIds.includes(p.id) &&
        p.money >=
          (auction.highestBidderId
            ? auction.currentBid + 10
            : auction.startingBid)
    );

    // If no other eligible bidder remains (or only highestBidder can't outbid themselves)
    const anyoneElseCanBid = activeBidders.some(
      (p) => p.id !== auction.highestBidderId
    );
    if (!anyoneElseCanBid) {
      this.finishAuction(room);
    } else {
      this.bumpAndBroadcast(room);
    }
  }

  private finishAuction(room: InternalRoom) {
    if (room.auctionTimer) {
      clearTimeout(room.auctionTimer);
      room.auctionTimer = null;
    }
    if (room.state.activeModal.type !== 'AUCTION') return;
    const auction = room.state.activeModal.auction;

    if (auction.highestBidderId) {
      const winner = room.state.participants.find(
        (p) => p.id === auction.highestBidderId
      );
      if (winner && winner.money >= auction.currentBid) {
        winner.money -= auction.currentBid;
        winner.points += auction.player.points;
        winner.squad.push(auction.player);
        this.pushFeed(
          room,
          winner,
          `ganó la subasta por ${auction.player.name}`,
          `-$${auction.currentBid}M · +${auction.player.points} PTS`
        );
      }
    } else {
      const seller = room.state.participants.find(
        (p) => p.id === auction.sellerId
      );
      if (seller) {
        this.pushFeed(
          room,
          seller,
          `dejó desierta la subasta de ${auction.player.name}`
        );
      }
    }

    this.advanceTurn(room);
  }

  private handleSellPlayer(
    ws: WebSocket,
    room: InternalRoom,
    actor: Participant,
    msg: Record<string, unknown>
  ) {
    if (room.state.phase !== 'IN_GAME') return;
    const active = this.getActivePlayer(room);
    if (
      active.id !== actor.id ||
      room.state.isMoving ||
      room.state.activeModal.type !== 'NONE'
    ) {
      this.sendError(ws, 'Solo podés vender al inicio de tu turno.');
      return;
    }

    const idx = typeof msg.squadIndex === 'number' ? msg.squadIndex : -1;
    if (idx < 0 || idx >= actor.squad.length) return;

    const sold = actor.squad[idx];
    const refund = Math.round(sold.cost * 0.5);
    actor.money += refund;
    actor.points = Math.max(0, actor.points - sold.points);
    actor.squad.splice(idx, 1);

    this.pushFeed(
      room,
      actor,
      `vendió a ${sold.name} al mercado`,
      `+$${refund}M · -${sold.points} PTS`
    );
    this.bumpAndBroadcast(room);
  }

  /* ------------------------------------------------------------------------ */
  /* SERVER-VALIDATED DIGITAL CHALLENGES                                      */
  /* ------------------------------------------------------------------------ */

  private openChallengeModal(room: InternalRoom, active: Participant) {
    const template = pickNonRepeatingChallenge(room.usedChallengeIds);
    const durationMs =
      template.mode === 'TRIVIA'
        ? (template.timeLimitSec ?? 12) * 1000
        : template.mode === 'CAREER'
          ? (template.timeLimitSec ?? 16) * 1000
          : 25_000;

    room.challengeSecret = {
      correctIndex: template.correctIndex,
      explanation: template.explanation,
    };

    const sanitizedCard: ChallengeCard = {
      ...template,
      correctIndex: undefined,
      explanation: undefined,
    };

    room.state.activeModal = {
      type: 'CHALLENGE',
      challenge: {
        card: sanitizedCard,
        expiresAtMs: Date.now() + durationMs,
        shotsTaken: 0,
        goals: 0,
        attempts: 0,
        hitCrossbar: false,
      },
    };
    room.state.turnDeadlineMs = Date.now() + durationMs;

    if (room.turnTimer) clearTimeout(room.turnTimer);
    room.turnTimer = setTimeout(() => {
      if (
        room.state.activeModal.type === 'CHALLENGE' &&
        !room.state.activeModal.challenge.resolved
      ) {
        this.finalizeChallenge(room, active, false);
      }
    }, durationMs + 600);

    this.bumpAndBroadcast(room);
    this.scheduleContextualBots(room);
  }

  private handleChallengeAnswer(
    ws: WebSocket,
    room: InternalRoom,
    actor: Participant,
    msg: Record<string, unknown>
  ) {
    if (room.state.activeModal.type !== 'CHALLENGE') return;
    if (this.getActivePlayer(room).id !== actor.id) {
      this.sendError(ws, 'Solo el jugador en turno responde este desafío.');
      return;
    }

    const ch = room.state.activeModal.challenge;
    if (ch.resolved) return;
    if (ch.card.mode !== 'TRIVIA' && ch.card.mode !== 'CAREER') return;

    const chosenIndex = typeof msg.optionIndex === 'number' ? msg.optionIndex : -1;
    const isSuccess = chosenIndex === room.challengeSecret?.correctIndex;
    this.finalizeChallenge(room, actor, isSuccess, chosenIndex);
  }

  private handlePenaltyShot(
    ws: WebSocket,
    room: InternalRoom,
    actor: Participant,
    msg: Record<string, unknown>
  ) {
    if (room.state.activeModal.type !== 'CHALLENGE') return;
    if (this.getActivePlayer(room).id !== actor.id) return;
    const ch = room.state.activeModal.challenge;
    if (ch.resolved || ch.card.mode !== 'PENALTY') return;

    const aim =
      msg.aim === 'LEFT' || msg.aim === 'RIGHT' ? msg.aim : 'CENTER';
    const power =
      typeof msg.power === 'number'
        ? Math.max(0, Math.min(100, msg.power))
        : 50;

    const zones: Array<'LEFT' | 'CENTER' | 'RIGHT'> = ['LEFT', 'CENTER', 'RIGHT'];
    const keeper = zones[Math.floor(Math.random() * zones.length)];

    let outcome: 'GOAL' | 'SAVED' | 'MISS' = 'GOAL';
    let message = '¡GOLAZO AL ÁNGULO!';
    if (power > 83) {
      outcome = 'MISS';
      message = '¡Se fue por arriba del travesaño!';
    } else if (power < 22) {
      outcome = 'SAVED';
      message = 'Remate muy suave, la agarró fácil.';
    } else if (keeper === aim) {
      outcome = 'SAVED';
      message = '¡Atajadón del arquero al mismo palo!';
    }

    ch.shotsTaken = (ch.shotsTaken ?? 0) + 1;
    if (outcome === 'GOAL') ch.goals = (ch.goals ?? 0) + 1;
    ch.lastShot = { aim, keeper, outcome, message };

    const won = (ch.goals ?? 0) >= 1;
    const outOfShots = (ch.shotsTaken ?? 0) >= 2;

    if (won || outOfShots) {
      this.finalizeChallenge(room, actor, won);
    } else {
      this.bumpAndBroadcast(room);
    }
  }

  private handleCrossbarKick(
    ws: WebSocket,
    room: InternalRoom,
    actor: Participant,
    msg: Record<string, unknown>
  ) {
    if (room.state.activeModal.type !== 'CHALLENGE') return;
    if (this.getActivePlayer(room).id !== actor.id) return;
    const ch = room.state.activeModal.challenge;
    if (ch.resolved || ch.card.mode !== 'CROSSBAR') return;

    const level =
      typeof msg.level === 'number'
        ? Math.max(0, Math.min(100, msg.level))
        : 50;

    ch.attempts = (ch.attempts ?? 0) + 1;
    let outcome: 'HIT' | 'LOW' | 'HIGH' = 'LOW';
    let message = 'Muy abajo, pegó en la red.';

    if (level >= 64 && level <= 80) {
      outcome = 'HIT';
      message = '¡CLANG! ¡Le pegaste justo al travesaño!';
      ch.hitCrossbar = true;
    } else if (level > 80) {
      outcome = 'HIGH';
      message = '¡Muy alto! Pasó por encima del arco.';
    }

    ch.lastShot = { level, outcome, message };

    if (ch.hitCrossbar || (ch.attempts ?? 0) >= 3) {
      this.finalizeChallenge(room, actor, Boolean(ch.hitCrossbar));
    } else {
      this.bumpAndBroadcast(room);
    }
  }

  private finalizeChallenge(
    room: InternalRoom,
    actor: Participant,
    isSuccess: boolean,
    chosenIndex?: number
  ) {
    if (room.turnTimer) {
      clearTimeout(room.turnTimer);
      room.turnTimer = null;
    }
    if (room.state.activeModal.type !== 'CHALLENGE') return;

    const ch = room.state.activeModal.challenge;
    if (ch.resolved) return;

    ch.resolved = {
      isSuccess,
      correctIndex: room.challengeSecret?.correctIndex,
      chosenIndex,
      explanation: room.challengeSecret?.explanation,
    };

    if (isSuccess) {
      actor.money += ch.card.reward;
      actor.jailTurns = 0;
      this.pushFeed(
        room,
        actor,
        `superó "${ch.card.title}"`,
        `+$${ch.card.reward}M`
      );
    } else {
      actor.money = Math.max(0, actor.money - ch.card.penalty);
      if (ch.card.sendToJailOnFail) {
        actor.position = 5;
        actor.jailTurns = 2;
      }
      this.pushFeed(
        room,
        actor,
        `falló "${ch.card.title}"${ch.card.sendToJailOnFail ? ' y fue a la cárcel' : ''}`,
        `-$${ch.card.penalty}M`
      );
    }

    this.bumpAndBroadcast(room);

    room.resolveTimer = setTimeout(() => {
      room.challengeSecret = null;
      this.advanceTurn(room);
    }, 1700);
  }

  /* ------------------------------------------------------------------------ */
  /* 1v1 DUEL ON SHARED TILE (12s)                                            */
  /* ------------------------------------------------------------------------ */

  private startDuel(
    room: InternalRoom,
    challenger: Participant,
    defender: Participant
  ) {
    const q = pickNonRepeatingDuel(room.usedDuelIds);
    room.duelSecret = {
      correctIndex: q.correctIndex,
      explanation: q.explanation,
    };

    const duel: DuelState = {
      challengerId: challenger.id,
      defenderId: defender.id,
      stake: 40,
      question: q.question,
      options: q.options,
      endsAtMs: Date.now() + DUEL_DURATION_MS,
      answeredIds: [],
    };

    room.state.activeModal = { type: 'DUEL', duel };
    room.state.turnDeadlineMs = null;
    this.pushFeed(
      room,
      challenger,
      `cruzó casillero con ${defender.name} · ¡Duelo 1v1!`,
      '$40M en juego'
    );

    if (room.duelTimer) clearTimeout(room.duelTimer);
    room.duelTimer = setTimeout(() => {
      this.resolveDuel(room, null, null, 'Tiempo agotado · Empate sin premio');
    }, DUEL_DURATION_MS + 400);

    this.bumpAndBroadcast(room);
    this.scheduleContextualBots(room);
  }

  private handleDuelAnswer(
    ws: WebSocket,
    room: InternalRoom,
    actor: Participant,
    msg: Record<string, unknown>
  ) {
    if (room.state.activeModal.type !== 'DUEL') return;
    const duel = room.state.activeModal.duel;
    if (duel.resolved) return;

    if (actor.id !== duel.challengerId && actor.id !== duel.defenderId) {
      this.sendError(ws, 'Este duelo es solo entre los dos clubes involucrados.');
      return;
    }
    if (duel.answeredIds.includes(actor.id)) return;

    const idx = typeof msg.optionIndex === 'number' ? msg.optionIndex : -1;
    duel.answeredIds.push(actor.id);
    const rivalId =
      actor.id === duel.challengerId ? duel.defenderId : duel.challengerId;

    if (idx === room.duelSecret?.correctIndex) {
      this.resolveDuel(
        room,
        actor.id,
        rivalId,
        `${actor.name} respondió primero y acertó`
      );
    } else {
      this.resolveDuel(
        room,
        rivalId,
        actor.id,
        `${actor.name} falló · punto automático para el rival`
      );
    }
  }

  private resolveDuel(
    room: InternalRoom,
    winnerId: string | null,
    loserId: string | null,
    reason: string
  ) {
    if (room.duelTimer) {
      clearTimeout(room.duelTimer);
      room.duelTimer = null;
    }
    if (room.state.activeModal.type !== 'DUEL') return;
    const duel = room.state.activeModal.duel;
    if (duel.resolved) return;

    duel.resolved = {
      winnerId,
      loserId,
      correctIndex: room.duelSecret?.correctIndex ?? 0,
      explanation: room.duelSecret?.explanation ?? '',
      reason,
    };

    if (winnerId && loserId) {
      const winner = room.state.participants.find((p) => p.id === winnerId);
      const loser = room.state.participants.find((p) => p.id === loserId);
      if (winner && loser) {
        const transfer = Math.min(duel.stake, loser.money);
        loser.money -= transfer;
        winner.money += transfer;
        this.pushFeed(
          room,
          winner,
          `le ganó el duelo 1v1 a ${loser.name}`,
          `+$${transfer}M`
        );
      }
    } else {
      const challenger = room.state.participants.find(
        (p) => p.id === duel.challengerId
      );
      if (challenger) {
        this.pushFeed(room, challenger, 'empató el duelo 1v1', '$0M');
      }
    }

    this.bumpAndBroadcast(room);

    room.resolveTimer = setTimeout(() => {
      room.duelSecret = null;
      this.advanceTurn(room);
    }, 1800);
  }

  /* ------------------------------------------------------------------------ */
  /* LUCK, JAIL & REACTIONS                                                   */
  /* ------------------------------------------------------------------------ */

  private handleApplyLuck(
    ws: WebSocket,
    room: InternalRoom,
    actor: Participant
  ) {
    if (room.state.activeModal.type !== 'LUCK') return;
    if (this.getActivePlayer(room).id !== actor.id) {
      this.sendError(ws, 'Esperá tu turno.');
      return;
    }
    this.applyLuckInternal(room, actor);
  }

  private applyLuckInternal(room: InternalRoom, actor: Participant) {
    if (room.state.activeModal.type !== 'LUCK') return;
    const card = room.state.activeModal.card;

    actor.money = Math.max(0, actor.money + card.moneyDelta);
    actor.position =
      (actor.position + card.moveSteps + BOARD_TILES.length) % BOARD_TILES.length;
    if (card.grantDiscount) {
      actor.hasDiscount = true;
    }

    const deltaLabel =
      card.moneyDelta !== 0
        ? card.moneyDelta > 0
          ? `+$${card.moneyDelta}M`
          : `-$${Math.abs(card.moneyDelta)}M`
        : card.grantDiscount
          ? '-50% FICHAJE'
          : `${card.moveSteps} CASILLEROS`;

    this.pushFeed(room, actor, `sacó "${card.title}"`, deltaLabel);
    this.advanceTurn(room);
  }

  private handleResolveJail(
    ws: WebSocket,
    room: InternalRoom,
    actor: Participant,
    msg: Record<string, unknown>
  ) {
    if (this.getActivePlayer(room).id !== actor.id) {
      this.sendError(ws, 'No es tu turno.');
      return;
    }
    const action =
      msg.action === 'BAIL' || msg.action === 'CHALLENGE' ? msg.action : 'WAIT';
    this.resolveJailInternal(room, actor, action);
  }

  private resolveJailInternal(
    room: InternalRoom,
    actor: Participant,
    action: 'BAIL' | 'CHALLENGE' | 'WAIT'
  ) {
    if (action === 'BAIL' && actor.money >= 100) {
      actor.money -= 100;
      actor.jailTurns = 0;
      room.state.activeModal = { type: 'NONE' };
      this.pushFeed(room, actor, 'pagó fianza y salió de la cárcel', '-$100M');
      this.scheduleTurnClock(room);
      this.bumpAndBroadcast(room);
      this.scheduleContextualBots(room);
      return;
    }

    if (action === 'CHALLENGE') {
      this.openChallengeModal(room, actor);
      return;
    }

    actor.jailTurns = Math.max(0, actor.jailTurns - 1);
    this.pushFeed(room, actor, 'cumplió 1 turno en la cárcel');
    this.advanceTurn(room);
  }

  private handleReaction(
    room: InternalRoom,
    actor: Participant,
    msg: Record<string, unknown>
  ) {
    const found = TABLE_REACTIONS.find((r) => r.key === msg.reactionKey);
    if (!found) return;
    const reaction: PlayerReaction = {
      id: `rx-${Date.now()}-${Math.random()}`,
      participantId: actor.id,
      emoji: found.emoji,
      label: found.label,
      at: Date.now(),
    };
    this.broadcastToRoom(room.state.code, {
      type: 'game:reaction',
      reaction,
    });
  }

  private advanceTurn(room: InternalRoom) {
    if (room.state.phase !== 'IN_GAME') return;
    room.state.activeModal = { type: 'NONE' };
    room.state.activePlayerIndex =
      (room.state.activePlayerIndex + 1) % room.state.participants.length;
    this.scheduleTurnClock(room);
    this.bumpAndBroadcast(room);
    this.scheduleContextualBots(room);
  }

  /* ------------------------------------------------------------------------ */
  /* SMART BOT AGENT                                                          */
  /* ------------------------------------------------------------------------ */

  private scheduleContextualBots(room: InternalRoom) {
    if (room.botTimer) {
      clearTimeout(room.botTimer);
      room.botTimer = null;
    }
    if (room.state.phase !== 'IN_GAME' || room.state.isMoving) return;

    const modal = room.state.activeModal;
    const active = this.getActivePlayer(room);

    // 1. Auction Bot Bidding
    if (modal.type === 'AUCTION') {
      const auction = modal.auction;
      const nextBid = auction.highestBidderId
        ? auction.currentBid + 10
        : auction.startingBid;
      const botCandidates = room.state.participants.filter(
        (p) =>
          p.isBot &&
          p.id !== auction.sellerId &&
          p.id !== auction.highestBidderId &&
          !auction.passedIds.includes(p.id) &&
          p.money >= nextBid &&
          nextBid <= Math.round(auction.player.cost * 0.85) &&
          p.money - nextBid >= 60
      );

      if (botCandidates.length > 0) {
        const chosenBot =
          botCandidates[Math.floor(Math.random() * botCandidates.length)];
        room.botTimer = setTimeout(() => {
          if (room.state.activeModal.type !== 'AUCTION') return;
          this.handleAuctionBid({} as WebSocket, room, chosenBot);
        }, 1200 + Math.random() * 1100);
      }
      return;
    }

    // 2. Duel 1v1 Bot Answer
    if (modal.type === 'DUEL' && !modal.duel.resolved) {
      const duelBots = [modal.duel.challengerId, modal.duel.defenderId]
        .map((id) => room.state.participants.find((p) => p.id === id))
        .filter((p): p is Participant => Boolean(p && p.isBot));

      if (duelBots.length > 0) {
        const bot = duelBots[Math.floor(Math.random() * duelBots.length)];
        room.botTimer = setTimeout(() => {
          if (room.state.activeModal.type !== 'DUEL' || room.state.activeModal.duel.resolved) return;
          const correct = room.duelSecret?.correctIndex ?? 0;
          const picksCorrect = Math.random() < 0.65;
          const optionIndex = picksCorrect
            ? correct
            : (correct + 1) % modal.duel.options.length;
          this.handleDuelAnswer({} as WebSocket, room, bot, { optionIndex });
        }, 2300 + Math.random() * 1700);
      }
      return;
    }

    // 3. Active Turn Bot
    if (!active.isBot) return;

    room.botTimer = setTimeout(() => {
      if (room.state.phase !== 'IN_GAME' || room.state.isMoving) return;
      const current = this.getActivePlayer(room);
      if (!current.isBot) return;

      const curModal = room.state.activeModal;

      if (curModal.type === 'NONE') {
        if (current.jailTurns > 0) {
          this.resolveJailInternal(
            room,
            current,
            current.money >= 220 ? 'BAIL' : 'WAIT'
          );
        } else {
          this.executeDiceRoll(room, current);
        }
        return;
      }

      if (curModal.type === 'SIGNING') {
        const affordable = curModal.options.filter((opt) => {
          const price = current.hasDiscount ? Math.round(opt.cost * 0.5) : opt.cost;
          return current.money >= price;
        });

        // Smart strategy: pick highest points if leaving buffer or close to 60 pts
        const best = affordable.find((opt) => {
          const price = current.hasDiscount ? Math.round(opt.cost * 0.5) : opt.cost;
          return current.money - price >= 80 || current.points + opt.points >= 60;
        }) ?? affordable[affordable.length - 1];

        if (best) {
          this.handleSignPlayer({} as WebSocket, room, current, {
            footballerId: best.id,
          });
        } else {
          this.triggerAuctionOrAdvance(room, current);
        }
        return;
      }

      if (curModal.type === 'LUCK') {
        this.applyLuckInternal(room, current);
        return;
      }

      if (curModal.type === 'JAIL') {
        this.resolveJailInternal(
          room,
          current,
          current.money >= 220 ? 'BAIL' : 'WAIT'
        );
        return;
      }

      if (curModal.type === 'CHALLENGE' && !curModal.challenge.resolved) {
        const won = Math.random() < 0.62;
        this.finalizeChallenge(room, current, won);
      }
    }, 950 + Math.random() * 550);
  }

  /* ------------------------------------------------------------------------ */
  /* HELPERS & BROADCASTS                                                     */
  /* ------------------------------------------------------------------------ */

  private clearAllTimers(room: InternalRoom) {
    if (room.turnTimer) clearTimeout(room.turnTimer);
    if (room.botTimer) clearTimeout(room.botTimer);
    if (room.stepTimer) clearTimeout(room.stepTimer);
    if (room.auctionTimer) clearTimeout(room.auctionTimer);
    if (room.duelTimer) clearTimeout(room.duelTimer);
    if (room.resolveTimer) clearTimeout(room.resolveTimer);
    if (room.cleanupTimer) clearTimeout(room.cleanupTimer);
    room.turnTimer = null;
    room.botTimer = null;
    room.stepTimer = null;
    room.auctionTimer = null;
    room.duelTimer = null;
    room.resolveTimer = null;
    room.cleanupTimer = null;
  }

  private destroyRoom(code: string) {
    const room = this.rooms.get(code);
    if (!room) return;
    for (const t of room.waitingKickTimers.values()) {
      clearTimeout(t);
    }
    room.waitingKickTimers.clear();
    this.clearAllTimers(room);
    this.rooms.delete(code);
  }

  private pushFeed(
    room: InternalRoom,
    actor: Participant,
    text: string,
    delta?: string
  ) {
    const entry: FeedEntry = {
      id: `${Date.now()}-${Math.random()}`,
      actorName: actor.name,
      actorColor: actor.color,
      text,
      delta,
    };
    room.state.feed = [entry, ...room.state.feed.slice(0, 49)];
  }

  private sanitizeRoomState(room: InternalRoom): RoomState {
    return {
      ...room.state,
      participants: room.state.participants.map((p) => ({
        ...p,
        squad: [...p.squad],
        trophies: { ...p.trophies },
      })),
    };
  }

  private bumpAndBroadcast(room: InternalRoom) {
    room.state.sequenceId += 1;
    this.broadcastToRoom(room.state.code, {
      type: 'game:state_update',
      state: this.sanitizeRoomState(room),
    });
  }

  private getPublicRooms(): PublicRoomSummary[] {
    return Array.from(this.rooms.values())
      .filter(
        (r) =>
          r.state.visibility === 'public' &&
          r.state.phase === 'WAITING' &&
          r.state.participants.length < 5
      )
      .map((r) => {
        const host = r.state.participants[0];
        return {
          code: r.state.code,
          hostName: host?.name ?? 'Anfitrión',
          hostClub: host?.clubName ?? 'Club',
          playerCount: r.state.participants.length,
          maxPlayers: 5,
        };
      });
  }

  private broadcastPublicRooms() {
    const rooms = this.getPublicRooms();
    for (const binding of this.clients.values()) {
      if (!binding.roomCode) {
        this.sendToSocket(binding.ws, { type: 'room:public_list', rooms });
      }
    }
  }

  private broadcastToRoom(code: string, payload: unknown) {
    const serialized = JSON.stringify(payload);
    for (const binding of this.clients.values()) {
      if (binding.roomCode === code && binding.ws.readyState === 1) {
        binding.ws.send(serialized);
      }
    }
  }

  private sendToSocket(ws: WebSocket, payload: unknown) {
    if (ws && typeof ws.send === 'function' && ws.readyState === 1) {
      ws.send(JSON.stringify(payload));
    }
  }

  private sendError(ws: WebSocket, message: string) {
    this.sendToSocket(ws, { type: 'room:error', message });
  }
}
