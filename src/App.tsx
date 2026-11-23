import { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { AnimatePresence, MotionConfig } from 'motion/react';
import {
  BAD_LUCK_CARDS,
  BOARD_TILES,
  createParticipantsFromDrafts,
  FOOTBALLERS_POOL,
  LEAGUE_META,
  LUCK_CARDS,
  pickNonRepeatingChallenge,
  PlayerDraft,
} from './data/gameData';
import {
  ActiveModal,
  BoardTile,
  ChallengeAttemptState,
  ChampionRecord,
  FeedEntry,
  Footballer,
  LeagueId,
  Participant,
  TrophyEvent,
  UserProfile,
} from './types/game';
import {
  auth,
  registerWithUsernamePassword,
  signInWithUsernamePassword,
  signOutUser,
} from './firebase';
import { useMultiplayerSocket } from './hooks/useMultiplayerSocket';
import {
  formatFirebaseUserError,
  profileRepository,
} from './services/profileRepository';
import {
  isAudioMuted,
  playStadiumCelebration,
  playTone,
  setAudioMuted,
} from './utils/audioEngine';
import { OnlineHub } from './components/OnlineHub';
import { WaitingRoom } from './components/WaitingRoom';
import { LobbySetup } from './components/LobbySetup';
import { PlayerHudBar } from './components/PlayerHudBar';
import { BoardGrid } from './components/BoardGrid';
import { SigningModal } from './components/SigningModal';
import { AuctionModal } from './components/AuctionModal';
import { DuelModal } from './components/DuelModal';
import { ChallengeModal } from './components/ChallengeModal';
import { SquadDrawer } from './components/SquadDrawer';
import { VictoryModal } from './components/VictoryModal';
import { TripleteFooter } from './components/TripleteFooter';
import { TrophyCelebrationOverlay } from './components/TrophyCelebrationOverlay';
import { MatchHistoryDrawer } from './components/MatchHistoryDrawer';
import { HallOfFameModal } from './components/HallOfFameModal';
import { AccountAuthModal } from './components/AccountAuthModal';
import {
  MetricsModal,
  type AdminMetricsSnapshot,
} from './components/MetricsModal';

function getLeagueOptions(
  leagueId: LeagueId,
  alreadySignedIds: Set<string>
): Footballer[] {
  const pool = FOOTBALLERS_POOL.filter((f) => f.leagueId === leagueId);
  const availablePool = pool.filter((f) => !alreadySignedIds.has(f.id));
  const source = availablePool.length >= 3 ? availablePool : pool;

  if (leagueId === 'legends') {
    const shuffled = [...source].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
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

function createChallengeAttempt(usedIds: Set<string>): ChallengeAttemptState {
  const card = pickNonRepeatingChallenge(usedIds);
  const durationMs =
    card.mode === 'TRIVIA'
      ? (card.timeLimitSec ?? 12) * 1000
      : card.mode === 'CAREER'
        ? (card.timeLimitSec ?? 16) * 1000
        : 25_000;

  return {
    card,
    expiresAtMs: Date.now() + durationMs,
    shotsTaken: 0,
    goals: 0,
    attempts: 0,
    hitCrossbar: false,
  };
}

type PlayMode = 'ONLINE' | 'LOCAL';
type LocalPhase = 'LOBBY' | 'PLAYING';

export default function App() {
  const [mode, setMode] = useState<PlayMode>('ONLINE');

  /* ------------------------------------------------------------------------ */
  /* ONLINE MULTIPLAYER SOCKET                                                */
  /* ------------------------------------------------------------------------ */
  const socket = useMultiplayerSocket();
  const room = socket.roomState;

  /* ------------------------------------------------------------------------ */
  /* LOCAL PRACTICE MODE STATE                                                */
  /* ------------------------------------------------------------------------ */
  const [localPhase, setLocalPhase] = useState<LocalPhase>('LOBBY');
  const [localParticipants, setLocalParticipants] = useState<Participant[]>([]);
  const [localActiveIdx, setLocalActiveIdx] = useState(0);
  const [localDice, setLocalDice] = useState(1);
  const [localRolling, setLocalRolling] = useState(false);
  const [localMoving, setLocalMoving] = useState(false);
  const [localModal, setLocalModal] = useState<ActiveModal>({ type: 'NONE' });
  const [localFeed, setLocalFeed] = useState<FeedEntry[]>([]);
  const [inspectedPlayerId, setInspectedPlayerId] = useState<string | null>(null);

  const [isMuted, setIsMuted] = useState(() => isAudioMuted());
  const [showHistory, setShowHistory] = useState(false);
  const [showHallOfFame, setShowHallOfFame] = useState(false);
  const [champions, setChampions] = useState<ChampionRecord[]>([]);
  const [loadingChampions, setLoadingChampions] = useState(false);
  const [hallOfFameWarning, setHallOfFameWarning] = useState<string | null>(null);
  const [trophyEvent, setTrophyEvent] = useState<TrophyEvent | null>(null);
  const [onlineRolling, setOnlineRolling] = useState(false);
  const [onlineRollingFace, setOnlineRollingFace] = useState(1);

  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [metricsSnapshot, setMetricsSnapshot] =
    useState<AdminMetricsSnapshot | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  const timersRef = useRef<number[]>([]);
  const localUsedChallengesRef = useRef<Set<string>>(new Set());
  const prevOnlineStepRef = useRef<string>('');
  const prevOnlineModalRef = useRef<string>('NONE');
  const prevOnlineMovingRef = useRef<boolean>(false);
  const prevTrophiesRef = useRef<
    Record<string, { copa: boolean; liga: boolean; ucl: boolean }>
  >({});
  const trophyTimerRef = useRef<number | null>(null);
  const prevLocalVictoryRef = useRef<boolean>(false);
  const prevOnlineVictoryRef = useRef<boolean>(false);

  useEffect(() => {
    let settled = false;
    const safetyTimer = window.setTimeout(() => {
      if (!settled) setAuthLoading(false);
    }, 4000);

    const unsub = onAuthStateChanged(
      auth,
      async (user) => {
        settled = true;
        window.clearTimeout(safetyTimer);
        setAuthUser(user);
        if (user) {
          try {
            const prof = await profileRepository.getUserProfile(
              user.uid,
              user.displayName
            );
            setUserProfile(prof);
            setFirebaseError(null);
          } catch (err) {
            console.error('Error cargando perfil de Firebase:', err);
            setUserProfile(null);
            setFirebaseError(formatFirebaseUserError(err, 'profile'));
          }
        } else {
          setUserProfile(null);
        }
        setAuthLoading(false);
      },
      (err) => {
        settled = true;
        window.clearTimeout(safetyTimer);
        console.error('Error observando sesión Firebase:', err);
        setAuthLoading(false);
        setFirebaseError(formatFirebaseUserError(err, 'auth'));
      }
    );
    return () => {
      window.clearTimeout(safetyTimer);
      unsub();
    };
  }, []);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => window.clearTimeout(t));
      if (trophyTimerRef.current !== null) {
        window.clearTimeout(trophyTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem('m412_visited') === '1') return;
      window.sessionStorage.setItem('m412_visited', '1');
    } catch {
      // Ignore storage restrictions
    }
    void fetch('/api/metrics/visit', {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {});
  }, []);

  const isCreatorAdmin = Boolean(
    authUser?.email === 'nsoliscordova@gmail.com' && authUser.emailVerified
  );

  const loadAdminMetrics = useCallback(async () => {
    setLoadingMetrics(true);
    setMetricsError(null);
    try {
      const snap = await profileRepository.getAdminMetrics();
      setMetricsSnapshot(snap);
    } catch (err) {
      setMetricsError(
        err instanceof Error ? err.message : 'No se pudieron cargar las métricas.'
      );
    } finally {
      setLoadingMetrics(false);
    }
  }, []);

  const handleOpenMetrics = useCallback(() => {
    setShowMetrics(true);
    void loadAdminMetrics();
  }, [loadAdminMetrics]);

  const handleLoginPassword = useCallback(
    async (username: string, password: string) => {
      setFirebaseError(null);
      try {
        await signInWithUsernamePassword(username, password);
      } catch (err) {
        console.error('Error al iniciar sesión:', err);
        throw new Error(formatFirebaseUserError(err, 'auth'));
      }
    },
    []
  );

  const handleRegisterPassword = useCallback(
    async (username: string, password: string) => {
      setFirebaseError(null);
      try {
        await registerWithUsernamePassword(username, password);
      } catch (err) {
        console.error('Error al crear cuenta:', err);
        throw new Error(formatFirebaseUserError(err, 'auth'));
      }
    },
    []
  );

  const handleSignOut = useCallback(async () => {
    try {
      await signOutUser();
      setUserProfile(null);
      setFirebaseError(null);
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
  }, []);

  const handleSaveProfile = useCallback(
    async (identity: {
      displayName: string;
      clubName: string;
      paletteId: string;
    }): Promise<boolean> => {
      if (!authUser) return false;
      setFirebaseError(null);
      try {
        const updated = await profileRepository.updateClubIdentity(
          authUser.uid,
          identity
        );
        setUserProfile(updated);
        return true;
      } catch (err) {
        console.error('Error al guardar club en Firebase:', err);
        setFirebaseError(formatFirebaseUserError(err, 'profile'));
        return false;
      }
    },
    [authUser]
  );

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      setAudioMuted(next);
      return next;
    });
  }, []);

  const handleOpenHallOfFame = useCallback(async () => {
    setShowHallOfFame(true);
    setLoadingChampions(true);
    setHallOfFameWarning(null);
    try {
      const result = await profileRepository.getHallOfFame();
      setChampions(result.champions);
      setHallOfFameWarning(result.cloudWarning);
    } catch (err) {
      setHallOfFameWarning(formatFirebaseUserError(err, 'hallOfFame'));
    } finally {
      setLoadingChampions(false);
    }
  }, []);

  const isOnlineMoving = Boolean(
    mode === 'ONLINE' &&
      room &&
      (room.phase === 'IN_GAME' || room.phase === 'FINISHED') &&
      room.isMoving
  );

  // Online synchronized dice rolling animation
  useEffect(() => {
    if (isOnlineMoving && !prevOnlineMovingRef.current) {
      prevOnlineMovingRef.current = true;
      setOnlineRolling(true);
      let ticks = 0;
      const rollTick = window.setInterval(() => {
        ticks += 1;
        setOnlineRollingFace(Math.floor(Math.random() * 6) + 1);
        playTone(320 + ticks * 32, 42);
        if (ticks >= 6) {
          window.clearInterval(rollTick);
          setOnlineRolling(false);
        }
      }, 55);
      return () => {
        window.clearInterval(rollTick);
        setOnlineRolling(false);
      };
    }

    if (!isOnlineMoving) {
      prevOnlineMovingRef.current = false;
      setOnlineRolling(false);
    }
  }, [isOnlineMoving]);

  // Online synchronized audio cues
  useEffect(() => {
    if (mode !== 'ONLINE' || !room || room.phase === 'WAITING') return;
    const active = room.participants[room.activePlayerIndex];
    const stepKey = `${room.activePlayerIndex}:${active?.position ?? 0}`;
    if (prevOnlineStepRef.current && prevOnlineStepRef.current !== stepKey && room.isMoving) {
      playTone(490, 50, 'sine');
    }
    prevOnlineStepRef.current = stepKey;

    if (prevOnlineModalRef.current !== room.activeModal.type) {
      if (room.activeModal.type === 'SIGNING' || room.activeModal.type === 'AUCTION') {
        playTone(620, 90, 'triangle');
      } else if (room.activeModal.type === 'DUEL') {
        playTone(540, 110, 'square');
      } else if (room.activeModal.type === 'VICTORY') {
        playTone(760, 180, 'sine');
      }
      prevOnlineModalRef.current = room.activeModal.type;
    }
  }, [mode, room]);

  // Record local Triplete winner in Hall of Fame + Firebase profile stats
  useEffect(() => {
    const isVictory = mode === 'LOCAL' && localModal.type === 'VICTORY';
    if (isVictory && !prevLocalVictoryRef.current && localModal.type === 'VICTORY') {
      const w = localModal.winner;
      void profileRepository
        .recordLocalChampion({
          winnerName: w.name,
          clubName: w.clubName,
          color: w.color,
          secondaryColor: w.secondaryColor,
          points: w.points,
          moneyLeft: w.money,
          squadCount: w.squad.length,
          mode: 'local',
          playersCount: localParticipants.length,
        })
        .catch(() => {});
      if (authUser) {
        void profileRepository
          .recordMatchStats(authUser.uid, {
            wonTriplete: true,
            points: w.points,
          })
          .then((updated) => {
            if (updated) setUserProfile(updated);
          })
          .catch(() => {});
      }
    }
    prevLocalVictoryRef.current = isVictory;
  }, [mode, localModal, localParticipants.length, authUser]);

  // Record online Triplete result in Firestore when signed in
  useEffect(() => {
    const isVictory =
      mode === 'ONLINE' &&
      Boolean(
        room &&
          room.phase === 'FINISHED' &&
          room.activeModal.type === 'VICTORY'
      );

    if (
      isVictory &&
      !prevOnlineVictoryRef.current &&
      room &&
      room.activeModal.type === 'VICTORY' &&
      authUser
    ) {
      const winner = room.activeModal.winner;
      const me = socket.myParticipantId
        ? room.participants.find((p) => p.id === socket.myParticipantId) ?? null
        : null;

      if (me) {
        const didIWin = winner.id === me.id;
        void profileRepository
          .recordMatchStats(authUser.uid, {
            wonTriplete: didIWin,
            points: me.points,
          })
          .then((updated) => {
            if (updated) setUserProfile(updated);
          })
          .catch(() => {});

        if (didIWin) {
          void profileRepository
            .recordOnlineChampionForSignedInUser({
              winnerName: winner.name,
              clubName: winner.clubName,
              color: winner.color,
              secondaryColor: winner.secondaryColor,
              points: winner.points,
              moneyLeft: winner.money,
              squadCount: winner.squad.length,
              mode: 'online',
              playersCount: room.participants.length,
            })
            .catch(() => {});
        }
      }
    }
    prevOnlineVictoryRef.current = isVictory;
  }, [mode, room, socket.myParticipantId, authUser]);

  // Local challenge countdown expiration for Trivia/Career
  useEffect(() => {
    if (mode !== 'LOCAL' || localModal.type !== 'CHALLENGE') return;
    const ch = localModal.challenge;
    if (ch.resolved) return;
    if (ch.card.mode !== 'TRIVIA' && ch.card.mode !== 'CAREER') return;

    const msLeft = Math.max(50, ch.expiresAtMs - Date.now());
    const timer = window.setTimeout(() => {
      setLocalModal((prev) => {
        if (prev.type !== 'CHALLENGE' || prev.challenge.resolved) return prev;
        return {
          type: 'CHALLENGE',
          challenge: {
            ...prev.challenge,
            resolved: {
              isSuccess: false,
              correctIndex: prev.challenge.card.correctIndex,
              explanation: prev.challenge.card.explanation,
            },
          },
        };
      });
    }, msLeft);

    return () => window.clearTimeout(timer);
  }, [mode, localModal]);

  const localActivePlayer = localParticipants[localActiveIdx];

  const pushLocalFeed = useCallback(
    (actor: Participant, text: string, delta?: string) => {
      setLocalFeed((prev) => [
        {
          id: `${Date.now()}-${Math.random()}`,
          actorName: actor.name,
          actorColor: actor.color,
          text,
          delta,
        },
        ...prev.slice(0, 49),
      ]);
    },
    []
  );

  const handleStartLocalMatch = (drafts: PlayerDraft[]) => {
    const fresh = createParticipantsFromDrafts(drafts);
    localUsedChallengesRef.current.clear();
    prevTrophiesRef.current = {};
    setTrophyEvent(null);
    setShowHistory(false);
    setLocalParticipants(fresh);
    setLocalActiveIdx(0);
    setLocalDice(1);
    setLocalRolling(false);
    setLocalMoving(false);
    setLocalModal({ type: 'NONE' });
    setInspectedPlayerId(null);
    setLocalFeed([
      {
        id: `start-${Date.now()}`,
        actorName: fresh[0].name,
        actorColor: fresh[0].color,
        text: `arranca el torneo con ${fresh[0].clubName} desde Salida`,
        delta: '$500M · 0 PTS',
      },
    ]);
    setLocalPhase('PLAYING');
    playTone(540, 90, 'triangle');
    void fetch('/api/metrics/local-match', { method: 'POST' }).catch(() => {});
  };

  const handleRestartLocalSameClubs = () => {
    localUsedChallengesRef.current.clear();
    prevTrophiesRef.current = {};
    setTrophyEvent(null);
    setShowHistory(false);
    setLocalParticipants((prev) =>
      prev.map((p) => ({
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
      }))
    );
    setLocalActiveIdx(0);
    setLocalDice(1);
    setLocalRolling(false);
    setLocalMoving(false);
    setLocalModal({ type: 'NONE' });
    setInspectedPlayerId(null);
    setLocalFeed([
      {
        id: `restart-${Date.now()}`,
        actorName: 'Monopolio 412',
        actorColor: '#4F7D63',
        text: 'Partido reiniciado · Todos en Salida con $500M y 0 PTS.',
      },
    ]);
  };

  const advanceLocalTurn = useCallback(() => {
    setLocalModal({ type: 'NONE' });
    setLocalActiveIdx((prev) => (prev + 1) % localParticipants.length);
  }, [localParticipants.length]);

  const evaluateLapAndTrophies = (
    player: Participant,
    crossedStart: boolean
  ): Participant => {
    if (!crossedStart) return player;
    return {
      ...player,
      laps: player.laps + 1,
      money: player.money + 100,
      trophies: {
        copaDeLaLiga: player.trophies.copaDeLaLiga || player.points >= 20,
        ligaNacional: player.trophies.ligaNacional || player.points >= 40,
        championsLeague: player.trophies.championsLeague || player.points >= 60,
      },
    };
  };

  const triggerLocalTileAction = useCallback(
    (tile: BoardTile, playerSnapshot: Participant, allParticipants: Participant[]) => {
      if (tile.kind === 'league' || tile.kind === 'legends') {
        const leagueId = tile.leagueId ?? 'premier';
        const signedIds = new Set(
          allParticipants.flatMap((p) => p.squad.map((f) => f.id))
        );
        const options = getLeagueOptions(leagueId, signedIds);
        setLocalModal({
          type: 'SIGNING',
          leagueId,
          leagueTitle: LEAGUE_META[leagueId].name,
          options,
        });
        return;
      }

      if (tile.kind === 'challenge') {
        setLocalModal({
          type: 'CHALLENGE',
          challenge: createChallengeAttempt(localUsedChallengesRef.current),
        });
        return;
      }

      if (tile.kind === 'luck') {
        const card = LUCK_CARDS[Math.floor(Math.random() * LUCK_CARDS.length)];
        setLocalModal({ type: 'LUCK', card });
        return;
      }

      if (tile.kind === 'badluck') {
        const card =
          BAD_LUCK_CARDS[Math.floor(Math.random() * BAD_LUCK_CARDS.length)];
        setLocalModal({ type: 'LUCK', card });
        return;
      }

      if (tile.kind === 'discount') {
        setLocalParticipants((prev) =>
          prev.map((p, idx) =>
            idx === localActiveIdx ? { ...p, hasDiscount: true } : p
          )
        );
        pushLocalFeed(
          playerSnapshot,
          'activó el cupón de descuento para su próximo fichaje',
          '-50%'
        );
        advanceLocalTurn();
        return;
      }

      if (tile.kind === 'gotojail' || tile.kind === 'jail') {
        setLocalParticipants((prev) =>
          prev.map((p, idx) =>
            idx === localActiveIdx ? { ...p, position: 5, jailTurns: 2 } : p
          )
        );
        pushLocalFeed(playerSnapshot, 'cayó en la cárcel (2 turnos)', 'CÁRCEL');
        advanceLocalTurn();
        return;
      }

      pushLocalFeed(playerSnapshot, 'pasó por Salida / Llegada', '+$100M');
      advanceLocalTurn();
    },
    [localActiveIdx, advanceLocalTurn, pushLocalFeed]
  );

  const handleLocalRollDice = () => {
    if (
      !localActivePlayer ||
      localRolling ||
      localMoving ||
      localModal.type !== 'NONE'
    ) {
      return;
    }
    setLocalRolling(true);

    let ticks = 0;
    const rollInterval = window.setInterval(() => {
      setLocalDice(Math.floor(Math.random() * 6) + 1);
      playTone(320 + ticks * 35, 45);
      ticks += 1;
      if (ticks >= 7) {
        window.clearInterval(rollInterval);
        const finalRoll = Math.floor(Math.random() * 6) + 1;
        setLocalDice(finalRoll);
        setLocalRolling(false);
        setLocalMoving(true);

        const startPos = localActivePlayer.position;
        let step = 0;

        const stepInterval = window.setInterval(() => {
          step += 1;
          const nextPos = (startPos + step) % BOARD_TILES.length;
          const crossedStart = nextPos === 0;
          playTone(460 + step * 30, 55, 'sine');

          setLocalParticipants((prev) =>
            prev.map((p, idx) => {
              if (idx !== localActiveIdx) return p;
              return evaluateLapAndTrophies({ ...p, position: nextPos }, crossedStart);
            })
          );

          if (step >= finalRoll) {
            window.clearInterval(stepInterval);
            const finishTimer = window.setTimeout(() => {
              setLocalMoving(false);
              setLocalParticipants((latest) => {
                const current = latest[localActiveIdx];
                if (
                  current.trophies.copaDeLaLiga &&
                  current.trophies.ligaNacional &&
                  current.trophies.championsLeague
                ) {
                  setLocalModal({ type: 'VICTORY', winner: current });
                  return latest;
                }
                const landedTile = BOARD_TILES[nextPos];
                triggerLocalTileAction(landedTile, current, latest);
                return latest;
              });
            }, 240);
            timersRef.current.push(finishTimer);
          }
        }, 165);
      }
    }, 65);
  };

  const handleLocalSignPlayer = (footballer: Footballer, finalCost: number) => {
    if (!localActivePlayer) return;
    playTone(660, 120, 'triangle');
    setLocalParticipants((prev) =>
      prev.map((p, idx) => {
        if (idx !== localActiveIdx) return p;
        return {
          ...p,
          money: Math.max(0, p.money - finalCost),
          points: p.points + footballer.points,
          hasDiscount: false,
          squad: [...p.squad, footballer],
        };
      })
    );
    pushLocalFeed(
      localActivePlayer,
      `fichó a ${footballer.name} para ${localActivePlayer.clubName}`,
      `-$${finalCost}M · +${footballer.points} PTS`
    );
    advanceLocalTurn();
  };

  const handleLocalChallengeAnswer = (optionIndex: number) => {
    if (localModal.type !== 'CHALLENGE' || localModal.challenge.resolved) return;
    const { card } = localModal.challenge;
    const isSuccess = optionIndex === (card.correctIndex ?? 0);
    setLocalModal({
      type: 'CHALLENGE',
      challenge: {
        ...localModal.challenge,
        resolved: {
          isSuccess,
          correctIndex: card.correctIndex,
          chosenIndex: optionIndex,
          explanation: card.explanation,
        },
      },
    });
  };

  const handleLocalPenaltyShot = (
    aim: 'LEFT' | 'CENTER' | 'RIGHT',
    power: number
  ) => {
    if (localModal.type !== 'CHALLENGE' || localModal.challenge.resolved) return;
    const ch = localModal.challenge;
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

    const shotsTaken = (ch.shotsTaken ?? 0) + 1;
    const goals = (ch.goals ?? 0) + (outcome === 'GOAL' ? 1 : 0);
    const won = goals >= 1;
    const finished = won || shotsTaken >= 2;

    setLocalModal({
      type: 'CHALLENGE',
      challenge: {
        ...ch,
        shotsTaken,
        goals,
        lastShot: { aim, keeper, outcome, message },
        resolved: finished ? { isSuccess: won } : undefined,
      },
    });
  };

  const handleLocalCrossbarKick = (level: number) => {
    if (localModal.type !== 'CHALLENGE' || localModal.challenge.resolved) return;
    const ch = localModal.challenge;
    const attempts = (ch.attempts ?? 0) + 1;
    let outcome: 'HIT' | 'LOW' | 'HIGH' = 'LOW';
    let message = 'Muy abajo, pegó en la red / arquero.';
    let hit = Boolean(ch.hitCrossbar);

    if (level >= 64 && level <= 80) {
      outcome = 'HIT';
      message = '¡CLANG! ¡Le pegaste justo al travesaño!';
      hit = true;
    } else if (level > 80) {
      outcome = 'HIGH';
      message = '¡Muy alto! Pasó por encima del arco.';
    }

    const finished = hit || attempts >= 3;
    setLocalModal({
      type: 'CHALLENGE',
      challenge: {
        ...ch,
        attempts,
        hitCrossbar: hit,
        lastShot: { level, outcome, message },
        resolved: finished ? { isSuccess: hit } : undefined,
      },
    });
  };

  const handleContinueLocalChallenge = () => {
    if (localModal.type !== 'CHALLENGE' || !localActivePlayer) return;
    const { card, resolved } = localModal.challenge;
    const success = Boolean(resolved?.isSuccess);

    if (success) {
      playTone(720, 120, 'sine');
      setLocalParticipants((prev) =>
        prev.map((p, idx) =>
          idx === localActiveIdx
            ? { ...p, money: p.money + card.reward, jailTurns: 0 }
            : p
        )
      );
      pushLocalFeed(localActivePlayer, `superó "${card.title}"`, `+$${card.reward}M`);
    } else {
      playTone(190, 160, 'sawtooth');
      setLocalParticipants((prev) =>
        prev.map((p, idx) => {
          if (idx !== localActiveIdx) return p;
          return {
            ...p,
            money: Math.max(0, p.money - card.penalty),
            position: card.sendToJailOnFail ? 5 : p.position,
            jailTurns: card.sendToJailOnFail ? 2 : p.jailTurns,
          };
        })
      );
      pushLocalFeed(
        localActivePlayer,
        `falló "${card.title}"${card.sendToJailOnFail ? ' y fue a la cárcel' : ''}`,
        `-$${card.penalty}M`
      );
    }

    advanceLocalTurn();
  };

  const handleLocalLuck = () => {
    if (localModal.type !== 'LUCK' || !localActivePlayer) return;
    const { card } = localModal;

    setLocalParticipants((prev) =>
      prev.map((p, idx) => {
        if (idx !== localActiveIdx) return p;
        const nextPos =
          (p.position + card.moveSteps + BOARD_TILES.length) % BOARD_TILES.length;
        return {
          ...p,
          money: Math.max(0, p.money + card.moneyDelta),
          position: nextPos,
          hasDiscount: p.hasDiscount || Boolean(card.grantDiscount),
        };
      })
    );

    const deltaLabel =
      card.moneyDelta !== 0
        ? card.moneyDelta > 0
          ? `+$${card.moneyDelta}M`
          : `-$${Math.abs(card.moneyDelta)}M`
        : card.grantDiscount
          ? '-50% FICHAJE'
          : `${card.moveSteps} CASILLEROS`;

    pushLocalFeed(localActivePlayer, `sacó "${card.title}"`, deltaLabel);
    advanceLocalTurn();
  };

  const handleLocalJail = (action: 'BAIL' | 'CHALLENGE' | 'WAIT') => {
    if (!localActivePlayer) return;

    if (action === 'BAIL') {
      setLocalParticipants((prev) =>
        prev.map((p, idx) =>
          idx === localActiveIdx
            ? { ...p, money: Math.max(0, p.money - 100), jailTurns: 0 }
            : p
        )
      );
      pushLocalFeed(localActivePlayer, 'pagó la fianza y salió de la cárcel', '-$100M');
      setLocalModal({ type: 'NONE' });
      return;
    }

    if (action === 'CHALLENGE') {
      setLocalModal({
        type: 'CHALLENGE',
        challenge: createChallengeAttempt(localUsedChallengesRef.current),
      });
      return;
    }

    setLocalParticipants((prev) =>
      prev.map((p, idx) =>
        idx === localActiveIdx
          ? { ...p, jailTurns: Math.max(0, p.jailTurns - 1) }
          : p
      )
    );
    pushLocalFeed(localActivePlayer, 'cumplió 1 turno en la cárcel');
    advanceLocalTurn();
  };

  /* ------------------------------------------------------------------------ */
  /* UNIFIED VIEW SELECTION                                                   */
  /* ------------------------------------------------------------------------ */
  const isOnlineInGame =
    mode === 'ONLINE' &&
    Boolean(room && (room.phase === 'IN_GAME' || room.phase === 'FINISHED'));

  const currentParticipants = isOnlineInGame
    ? room!.participants
    : localParticipants;
  const currentActiveIdx = isOnlineInGame
    ? room!.activePlayerIndex
    : localActiveIdx;
  const currentActivePlayer = currentParticipants[currentActiveIdx];
  const currentModal = isOnlineInGame ? room!.activeModal : localModal;
  const inspectedPlayer =
    currentParticipants.find((p) => p.id === inspectedPlayerId) ?? null;

  const onlineMe =
    isOnlineInGame && socket.myParticipantId
      ? room!.participants.find((p) => p.id === socket.myParticipantId) ?? null
      : null;

  const isMyTurn = isOnlineInGame
    ? Boolean(
        onlineMe &&
          currentActivePlayer &&
          onlineMe.id === currentActivePlayer.id &&
          !currentActivePlayer.isBot
      )
    : true;

  const isBoardDimmed =
    currentModal.type !== 'NONE' ||
    Boolean(inspectedPlayer) ||
    showHistory ||
    Boolean(trophyEvent);

  // Detect newly unlocked intermediate/final trophies across Online & Local modes
  useEffect(() => {
    const inArena =
      isOnlineInGame || (mode === 'LOCAL' && localPhase === 'PLAYING');
    if (!inArena || currentParticipants.length === 0) {
      prevTrophiesRef.current = {};
      return;
    }

    const prevMap = prevTrophiesRef.current;
    const isInitialSeed = Object.keys(prevMap).length === 0;
    const resetDetected = currentParticipants.some((p) => {
      const old = prevMap[p.id];
      if (!old) return false;
      return (
        (old.copa && !p.trophies.copaDeLaLiga) ||
        (old.liga && !p.trophies.ligaNacional) ||
        (old.ucl && !p.trophies.championsLeague)
      );
    });

    if (isInitialSeed || resetDetected) {
      const seeded: Record<
        string,
        { copa: boolean; liga: boolean; ucl: boolean }
      > = {};
      for (const p of currentParticipants) {
        seeded[p.id] = {
          copa: p.trophies.copaDeLaLiga,
          liga: p.trophies.ligaNacional,
          ucl: p.trophies.championsLeague,
        };
      }
      prevTrophiesRef.current = seeded;
      return;
    }

    let unlockedEvent: TrophyEvent | null = null;
    const nextMap: Record<
      string,
      { copa: boolean; liga: boolean; ucl: boolean }
    > = { ...prevMap };

    for (const p of currentParticipants) {
      const old = prevMap[p.id] ?? { copa: false, liga: false, ucl: false };
      if (!old.ucl && p.trophies.championsLeague) {
        unlockedEvent = {
          id: `tr-${p.id}-ucl-${Date.now()}`,
          participantId: p.id,
          participantName: p.name,
          clubName: p.clubName,
          color: p.color,
          secondaryColor: p.secondaryColor,
          tier: 'ucl',
          title: 'Champions League',
          points: p.points,
          at: Date.now(),
        };
      } else if (!old.liga && p.trophies.ligaNacional && !unlockedEvent) {
        unlockedEvent = {
          id: `tr-${p.id}-liga-${Date.now()}`,
          participantId: p.id,
          participantName: p.name,
          clubName: p.clubName,
          color: p.color,
          secondaryColor: p.secondaryColor,
          tier: 'liga',
          title: 'Liga Nacional',
          points: p.points,
          at: Date.now(),
        };
      } else if (!old.copa && p.trophies.copaDeLaLiga && !unlockedEvent) {
        unlockedEvent = {
          id: `tr-${p.id}-copa-${Date.now()}`,
          participantId: p.id,
          participantName: p.name,
          clubName: p.clubName,
          color: p.color,
          secondaryColor: p.secondaryColor,
          tier: 'copa',
          title: 'Copa de la Liga',
          points: p.points,
          at: Date.now(),
        };
      }

      nextMap[p.id] = {
        copa: p.trophies.copaDeLaLiga,
        liga: p.trophies.ligaNacional,
        ucl: p.trophies.championsLeague,
      };
    }

    prevTrophiesRef.current = nextMap;

    if (unlockedEvent) {
      setTrophyEvent(unlockedEvent);
      playStadiumCelebration(unlockedEvent.tier);
      if (trophyTimerRef.current !== null) {
        window.clearTimeout(trophyTimerRef.current);
      }
      trophyTimerRef.current = window.setTimeout(() => {
        setTrophyEvent(null);
      }, 3600);
    }
  }, [isOnlineInGame, mode, localPhase, currentParticipants]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen w-full paper-canvas flex flex-col justify-between px-3 py-3 sm:px-5 sm:py-4 overflow-x-hidden">
        <AnimatePresence mode="wait">
          {mode === 'ONLINE' && !room && (
            <OnlineHub
              key="online-hub"
              connectionStatus={socket.status}
              publicRooms={socket.publicRooms}
              errorMsg={socket.errorMsg}
              firebaseError={firebaseError}
              onDismissFirebaseError={() => setFirebaseError(null)}
              authUser={authUser}
              userProfile={userProfile}
              authLoading={authLoading}
              onOpenAuthModal={() => setShowAuthModal(true)}
              onSignOut={handleSignOut}
              onSaveProfile={handleSaveProfile}
              onQuickMatch={socket.quickMatch}
              onCreateRoom={socket.createRoom}
              onJoinRoom={socket.joinRoom}
              onRefreshRooms={socket.refreshPublicRooms}
              onOpenHallOfFame={handleOpenHallOfFame}
              isAdmin={isCreatorAdmin}
              onOpenMetrics={handleOpenMetrics}
            />
          )}

          {mode === 'ONLINE' && room && room.phase === 'WAITING' && socket.myParticipantId && (
            <WaitingRoom
              key="waiting-room"
              room={room}
              myParticipantId={socket.myParticipantId}
              errorMsg={socket.errorMsg}
              onToggleReady={socket.toggleReady}
              onToggleFillBots={socket.toggleFillBots}
              onStartMatch={socket.startMatch}
              onLeave={socket.leaveRoom}
            />
          )}

          {mode === 'LOCAL' && localPhase === 'LOBBY' && (
            <LobbySetup
              key="local-lobby"
              onStartMatch={handleStartLocalMatch}
              onBackToOnline={() => setMode('ONLINE')}
            />
          )}

          {(isOnlineInGame || (mode === 'LOCAL' && localPhase === 'PLAYING')) &&
            currentActivePlayer && (
              <div
                key="arena"
                className="w-full max-w-[1400px] mx-auto flex-1 flex flex-col gap-3 justify-between"
              >
                {isOnlineInGame && socket.errorMsg && (
                  <div className="rounded-2xl bg-[#F4D6DC] border-2 border-[#111111] px-4 py-2 text-xs font-bold text-[#111111] text-center">
                    {socket.errorMsg}
                  </div>
                )}

                {/* Top Broadcast Scorebug HUD */}
                <PlayerHudBar
                  participants={currentParticipants}
                  activePlayerIndex={currentActiveIdx}
                  myParticipantId={isOnlineInGame ? socket.myParticipantId : null}
                  turnDeadlineMs={isOnlineInGame ? room!.turnDeadlineMs : null}
                  reactions={isOnlineInGame ? socket.reactions : []}
                  onInspectSquad={(player) => setInspectedPlayerId(player.id)}
                />

                {/* Centerpiece 7x5 Monopoly Pitch Board */}
                <main className="w-full flex-1 flex items-center">
                  <BoardGrid
                    tiles={BOARD_TILES}
                    participants={currentParticipants}
                    activePlayerIndex={currentActiveIdx}
                    diceValue={
                      isOnlineInGame
                        ? onlineRolling
                          ? onlineRollingFace
                          : room!.diceValue
                        : localDice
                    }
                    isRolling={isOnlineInGame ? onlineRolling : localRolling}
                    isMoving={isOnlineInGame ? room!.isMoving : localMoving}
                    isDimmed={isBoardDimmed}
                    isMyTurn={isMyTurn}
                    isOnline={isOnlineInGame}
                    roomCode={isOnlineInGame ? room!.code : undefined}
                    turnDeadlineMs={isOnlineInGame ? room!.turnDeadlineMs : null}
                    feed={isOnlineInGame ? room!.feed : localFeed}
                    onRollDice={
                      isOnlineInGame ? socket.rollDice : handleLocalRollDice
                    }
                    onOpenJailOptions={() => {
                      if (isOnlineInGame) {
                        socket.rollDice();
                      } else {
                        setLocalModal({
                          type: 'JAIL',
                          reason:
                            'Estás en la cárcel. Elegí cómo resolver este turno para volver al tablero.',
                          bailCost: 100,
                        });
                      }
                    }}
                    onResetMatch={handleRestartLocalSameClubs}
                    onOpenHistory={() => setShowHistory(true)}
                  />
                </main>

                {/* Bottom Triplete Objective Bar */}
                <TripleteFooter
                  activePlayer={currentActivePlayer}
                  isOnline={isOnlineInGame}
                  isMuted={isMuted}
                  onToggleMute={handleToggleMute}
                  onSendReaction={
                    isOnlineInGame ? socket.sendReaction : undefined
                  }
                  onBackToLobby={() => {
                    setInspectedPlayerId(null);
                    setShowHistory(false);
                    if (isOnlineInGame) {
                      socket.leaveRoom();
                    } else {
                      setLocalModal({ type: 'NONE' });
                      setLocalPhase('LOBBY');
                    }
                  }}
                />
              </div>
            )}
        </AnimatePresence>

        {/* Contextual Game Views — Only rendered at the exact game moment */}
        <AnimatePresence>
          {currentModal.type === 'SIGNING' && currentActivePlayer && (
            <SigningModal
              key="signing-modal"
              participant={currentActivePlayer}
              leagueTitle={currentModal.leagueTitle}
              options={currentModal.options}
              isMyTurn={isMyTurn}
              isOnline={isOnlineInGame}
              onSign={(player, finalCost) => {
                if (isOnlineInGame) {
                  socket.signPlayer(player.id);
                } else {
                  handleLocalSignPlayer(player, finalCost);
                }
              }}
              onPass={() => {
                if (isOnlineInGame) {
                  socket.passSigning();
                } else {
                  advanceLocalTurn();
                }
              }}
            />
          )}

          {currentModal.type === 'AUCTION' && onlineMe && (
            <AuctionModal
              key="auction-modal"
              auction={currentModal.auction}
              me={onlineMe}
              onBid={socket.placeBid}
              onPass={socket.passAuction}
            />
          )}

          {currentModal.type === 'DUEL' && onlineMe && (
            <DuelModal
              key="duel-modal"
              duel={currentModal.duel}
              participants={currentParticipants}
              meId={onlineMe.id}
              onSubmitAnswer={socket.submitDuelAnswer}
            />
          )}

          {(currentModal.type === 'CHALLENGE' ||
            currentModal.type === 'LUCK' ||
            currentModal.type === 'JAIL') &&
            currentActivePlayer && (
              <ChallengeModal
                key={`challenge-${currentModal.type}`}
                modal={currentModal}
                participant={currentActivePlayer}
                isMyTurn={isMyTurn}
                onSubmitChallengeAnswer={
                  isOnlineInGame
                    ? socket.submitChallengeAnswer
                    : handleLocalChallengeAnswer
                }
                onPenaltyShot={
                  isOnlineInGame ? socket.sendPenaltyShot : handleLocalPenaltyShot
                }
                onCrossbarKick={
                  isOnlineInGame ? socket.sendCrossbarKick : handleLocalCrossbarKick
                }
                onContinueLocalChallenge={
                  isOnlineInGame ? undefined : handleContinueLocalChallenge
                }
                onResolveLuck={
                  isOnlineInGame ? socket.applyLuck : handleLocalLuck
                }
                onResolveJail={
                  isOnlineInGame ? socket.resolveJail : handleLocalJail
                }
              />
            )}

          {currentModal.type === 'VICTORY' && !trophyEvent && (
            <VictoryModal
              key="victory-modal"
              winner={currentModal.winner}
              isOnline={isOnlineInGame}
              canRematch={isOnlineInGame ? Boolean(onlineMe?.isHost) : true}
              onRestartSameClubs={() => {
                if (isOnlineInGame) {
                  socket.requestRematch();
                } else {
                  handleRestartLocalSameClubs();
                }
              }}
              onReturnToWaitingRoom={
                isOnlineInGame ? socket.returnToLobby : undefined
              }
              onBackToLobby={() => {
                setInspectedPlayerId(null);
                setShowHistory(false);
                if (isOnlineInGame) {
                  socket.leaveRoom();
                } else {
                  setLocalModal({ type: 'NONE' });
                  setLocalPhase('LOBBY');
                }
              }}
            />
          )}
        </AnimatePresence>

        {/* Trophy Lifting Celebration Overlay */}
        <AnimatePresence>
          {trophyEvent && (
            <TrophyCelebrationOverlay
              key={trophyEvent.id}
              event={trophyEvent}
              onDismiss={() => setTrophyEvent(null)}
            />
          )}
        </AnimatePresence>

        {/* Full Match History Drawer */}
        <AnimatePresence>
          {showHistory && (
            <MatchHistoryDrawer
              key="match-history"
              feed={isOnlineInGame ? room!.feed : localFeed}
              onClose={() => setShowHistory(false)}
            />
          )}
        </AnimatePresence>

        {/* Cloud & Session Hall of Fame Modal */}
        <AnimatePresence>
          {showHallOfFame && (
            <HallOfFameModal
              key="hall-of-fame"
              champions={champions}
              loading={loadingChampions}
              cloudWarning={hallOfFameWarning}
              isSignedIn={Boolean(authUser)}
              onOpenAuthModal={() => {
                setShowHallOfFame(false);
                setShowAuthModal(true);
              }}
              onClose={() => setShowHallOfFame(false)}
            />
          )}
        </AnimatePresence>

        {/* Username & Password Account Modal */}
        <AnimatePresence>
          {showAuthModal && (
            <AccountAuthModal
              key="account-auth-modal"
              onLogin={handleLoginPassword}
              onRegister={handleRegisterPassword}
              onClose={() => setShowAuthModal(false)}
            />
          )}
        </AnimatePresence>

        {/* Creator Admin Metrics Modal */}
        <AnimatePresence>
          {showMetrics && isCreatorAdmin && (
            <MetricsModal
              key="creator-metrics"
              metrics={metricsSnapshot}
              loading={loadingMetrics}
              error={metricsError}
              onRefresh={loadAdminMetrics}
              onClose={() => setShowMetrics(false)}
            />
          )}
        </AnimatePresence>

        {/* Squad Inspector Drawer */}
        <AnimatePresence>
          {inspectedPlayer && (
            <SquadDrawer
              key={`squad-${inspectedPlayer.id}`}
              participant={inspectedPlayer}
              canSell={
                Boolean(currentActivePlayer) &&
                inspectedPlayer.id === currentActivePlayer.id &&
                isMyTurn &&
                currentModal.type === 'NONE' &&
                !(isOnlineInGame ? room!.isMoving : localMoving)
              }
              onSellPlayer={(squadIndex) => {
                if (isOnlineInGame) {
                  socket.sellPlayer(squadIndex);
                  return;
                }
                const sold = inspectedPlayer.squad[squadIndex];
                if (!sold) return;
                const refund = Math.round(sold.cost * 0.5);
                setLocalParticipants((prev) =>
                  prev.map((p) => {
                    if (p.id !== inspectedPlayer.id) return p;
                    return {
                      ...p,
                      money: p.money + refund,
                      points: Math.max(0, p.points - sold.points),
                      squad: p.squad.filter((_, idx) => idx !== squadIndex),
                    };
                  })
                );
                pushLocalFeed(
                  inspectedPlayer,
                  `vendió a ${sold.name} al mercado`,
                  `+$${refund}M · -${sold.points} PTS`
                );
              }}
              onClose={() => setInspectedPlayerId(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
