export type LeagueId =
  | 'premier'
  | 'laliga'
  | 'seriea'
  | 'bundesliga'
  | 'ligue1'
  | 'brasileirao'
  | 'ligaarg'
  | 'eredivisie'
  | 'legends';

export type TileKind =
  | 'start'
  | 'league'
  | 'challenge'
  | 'luck'
  | 'badluck'
  | 'jail'
  | 'gotojail'
  | 'discount'
  | 'legends';

export interface BoardTile {
  id: number;
  title: string;
  subtitle: string;
  kind: TileKind;
  leagueId?: LeagueId;
  accentHex: string;
  headerBg: string;
  priceRange?: string;
  pointsRange?: string;
  gridCol: number;
  gridRow: number;
  isCorner?: boolean;
}

export type CardTier = 'ORO' | 'PLATA' | 'BRONCE' | 'LEYENDA';

export interface Footballer {
  id: string;
  name: string;
  club: string;
  position: string;
  number: number;
  nationality: string;
  leagueId: LeagueId;
  leagueLabel: string;
  tier: CardTier;
  cost: number;
  points: number;
  kitPrimary: string;
  kitSecondary: string;
}

export type ChallengeMode = 'TRIVIA' | 'CAREER' | 'PENALTY' | 'CROSSBAR';

export interface ChallengeCard {
  id: string;
  mode: ChallengeMode;
  category: string;
  title: string;
  description: string;
  reward: number;
  penalty: number;
  sendToJailOnFail?: boolean;
  question?: string;
  options?: string[];
  correctIndex?: number;
  explanation?: string;
  timeLimitSec?: number;
  careerClubs?: Array<{ club: string; years: string }>;
}

export interface ChallengeAttemptState {
  card: ChallengeCard;
  expiresAtMs: number;
  // Server-authoritative mini-game progress
  shotsTaken?: number;
  goals?: number;
  attempts?: number;
  hitCrossbar?: boolean;
  lastShot?: {
    aim?: 'LEFT' | 'CENTER' | 'RIGHT';
    keeper?: 'LEFT' | 'CENTER' | 'RIGHT';
    level?: number;
    outcome: 'GOAL' | 'SAVED' | 'MISS' | 'HIT' | 'LOW' | 'HIGH';
    message: string;
  };
  resolved?: {
    isSuccess: boolean;
    correctIndex?: number;
    chosenIndex?: number;
    explanation?: string;
  };
}

export interface LuckCard {
  id: string;
  type: 'luck' | 'badluck';
  title: string;
  description: string;
  moneyDelta: number;
  moveSteps: number;
  grantDiscount?: boolean;
}

export interface TrophiesState {
  copaDeLaLiga: boolean; // 20 pts + vuelta
  ligaNacional: boolean; // 40 pts + vuelta
  championsLeague: boolean; // 60 pts + vuelta
}

export interface Participant {
  id: string;
  seatIndex: number;
  name: string;
  clubName: string;
  shortTag: string;
  color: string;
  secondaryColor: string;
  money: number;
  points: number;
  position: number; // 0..19
  laps: number;
  jailTurns: number;
  hasDiscount: boolean;
  squad: Footballer[];
  trophies: TrophiesState;
  isBot: boolean;
  isHumanOwner: boolean;
  connected: boolean;
  isHost: boolean;
  isReady: boolean;
}

export interface AuctionState {
  player: Footballer;
  sellerId: string;
  startingBid: number;
  currentBid: number;
  highestBidderId: string | null;
  highestBidderName: string | null;
  highestBidderClub: string | null;
  passedIds: string[];
  endsAtMs: number;
}

export interface DuelQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface DuelState {
  challengerId: string;
  defenderId: string;
  stake: number;
  question: string;
  options: string[];
  endsAtMs: number;
  answeredIds: string[];
  resolved?: {
    winnerId: string | null;
    loserId: string | null;
    correctIndex: number;
    explanation: string;
    reason: string;
  };
}

export type ActiveModal =
  | { type: 'NONE' }
  | {
      type: 'SIGNING';
      leagueId: LeagueId;
      leagueTitle: string;
      options: Footballer[];
    }
  | {
      type: 'AUCTION';
      auction: AuctionState;
    }
  | {
      type: 'CHALLENGE';
      challenge: ChallengeAttemptState;
    }
  | {
      type: 'DUEL';
      duel: DuelState;
    }
  | {
      type: 'LUCK';
      card: LuckCard;
    }
  | {
      type: 'JAIL';
      reason: string;
      bailCost: number;
    }
  | {
      type: 'VICTORY';
      winner: Participant;
    };

export interface FeedEntry {
  id: string;
  actorName: string;
  actorColor: string;
  text: string;
  delta?: string;
}

export type RoomVisibility = 'public' | 'private';
export type RoomPhase = 'WAITING' | 'IN_GAME' | 'FINISHED';

export interface RoomState {
  code: string;
  visibility: RoomVisibility;
  phase: RoomPhase;
  participants: Participant[];
  activePlayerIndex: number;
  diceValue: number;
  isMoving: boolean;
  turnDeadlineMs: number | null;
  activeModal: ActiveModal;
  feed: FeedEntry[];
  sequenceId: number;
  fillWithBots: boolean;
}

export interface PublicRoomSummary {
  code: string;
  hostName: string;
  hostClub: string;
  playerCount: number;
  maxPlayers: number;
}

export interface PlayerReaction {
  id: string;
  participantId: string;
  emoji: string;
  label: string;
  at: number;
}

export interface TrophyEvent {
  id: string;
  participantId: string;
  participantName: string;
  clubName: string;
  color: string;
  secondaryColor: string;
  tier: 'copa' | 'liga' | 'ucl';
  title: string;
  points: number;
  at: number;
}

export interface ChampionRecord {
  id: string;
  winnerName: string;
  clubName: string;
  color: string;
  secondaryColor: string;
  points: number;
  moneyLeft: number;
  squadCount: number;
  mode: 'online' | 'local';
  playersCount: number;
  wonAt: number;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  clubName: string;
  paletteId: string;
  matchesPlayed: number;
  tripletesWon: number;
  bestPoints: number;
}
