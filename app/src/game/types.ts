export type Suit = 'S' | 'H' | 'D' | 'C';
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export interface Card {
  /** Unique id such as "AS", "10H", "QD". */
  id: string;
  rank: Rank;
  suit: Suit;
}

export type PlayerId = 'player' | 'ai';
export type Difficulty = 'easy' | 'medium' | 'hard';

export type ScoreKind =
  | 'fifteen'
  | 'pair'
  | 'run'
  | 'flush'
  | 'nobs'
  | 'thirtyone'
  | 'go'
  | 'lastCard'
  | 'heels';

/** One scoring combination, with the cards responsible for it. */
export interface ScoreItem {
  kind: ScoreKind;
  points: number;
  cardIds: string[];
  /** Short message such as "15 for 2". */
  label: string;
  /** Plain-English reason shown to beginners. */
  explanation: string;
}

export interface ScoreResult {
  total: number;
  items: ScoreItem[];
}

/** A scoring (or informational) event emitted by the engine. */
export interface GameEvent extends ScoreItem {
  id: number;
  player: PlayerId;
  /** Phase in which the event happened. */
  source: 'heels' | 'pegging' | 'hand' | 'crib';
}

export type Phase =
  | 'discard'
  | 'cut'
  | 'pegging'
  | 'counting'
  | 'gameOver';

export interface PegScore {
  front: number;
  back: number;
}

export interface PeggingState {
  /** Cards played since the last count reset, in order. */
  pile: Card[];
  /** Cards from earlier sequences in this round (already scored). */
  discarded: Card[];
  count: number;
  turn: PlayerId;
  /** Player who played the most recent card. */
  lastPlayer: PlayerId | null;
  /** Player who most recently said "Go" in the current sequence. */
  goBy: PlayerId | null;
  /** Cards still to be played by each player. */
  remaining: Record<PlayerId, Card[]>;
}

export type CountTarget = 'pone' | 'dealer' | 'crib';

export interface CountingState {
  step: 0 | 1 | 2;
  target: CountTarget;
  owner: PlayerId;
  cards: Card[];
  result: ScoreResult;
}

export interface GameState {
  phase: Phase;
  dealer: PlayerId;
  round: number;
  /** Cards each player holds before/after discarding (four after discard). */
  hands: Record<PlayerId, Card[]>;
  crib: Card[];
  starter: Card | null;
  /** Remaining undealt deck (the starter is cut from here). */
  deck: Card[];
  scores: Record<PlayerId, PegScore>;
  pegging: PeggingState | null;
  counting: CountingState | null;
  winner: PlayerId | null;
  /** Events produced by the most recent transition. */
  lastEvents: GameEvent[];
  eventSeq: number;
}

export type GameAction =
  | { type: 'discard'; player: PlayerId; cardIds: string[] }
  | { type: 'cut'; index?: number }
  | { type: 'play'; player: PlayerId; cardId: string }
  | { type: 'confirmCount' };

export const other = (p: PlayerId): PlayerId => (p === 'player' ? 'ai' : 'player');
