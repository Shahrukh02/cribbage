import { cardValue, RANK_LABEL, RANK_NAME, SUIT_NAME } from './deck';
import { Card, Rank, ScoreItem, ScoreResult } from './types';

const ids = (cards: readonly Card[]) => cards.map(c => c.id);

/** All non-empty subsets of the given cards. */
export const subsets = <T>(items: readonly T[]): T[][] => {
  const out: T[][] = [];
  const n = items.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    const s: T[] = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        s.push(items[i]);
      }
    }
    out.push(s);
  }
  return out;
};

const sumValues = (cards: readonly Card[]) =>
  cards.reduce((s, c) => s + cardValue(c), 0);

/** True when the ranks are all different and form a consecutive sequence (Ace is low only). */
export const isRun = (cards: readonly Card[]): boolean => {
  if (cards.length < 3) {
    return false;
  }
  const r = cards.map(c => c.rank).sort((a, b) => a - b);
  for (let i = 1; i < r.length; i++) {
    if (r[i] !== r[i - 1] + 1) {
      return false;
    }
  }
  return true;
};

export const fifteenItem = (cards: readonly Card[]): ScoreItem => ({
  kind: 'fifteen',
  points: 2,
  cardIds: ids(cards),
  label: '15 for 2',
  explanation: 'These cards add up to 15, and every different set that makes 15 scores 2 points.',
});

export const pairItem = (rank: Rank, cards: readonly Card[]): ScoreItem => {
  const n = cards.length;
  const word = RANK_NAME[rank].toLowerCase();
  if (n === 2) {
    return {
      kind: 'pair',
      points: 2,
      cardIds: ids(cards),
      label: 'Pair for 2',
      explanation: `You matched two cards of the same rank (two ${word}s).`,
    };
  }
  if (n === 3) {
    return {
      kind: 'pair',
      points: 6,
      cardIds: ids(cards),
      label: 'Three of a kind for 6',
      explanation: `Three ${word}s make three different pairs, 2 points each.`,
    };
  }
  return {
    kind: 'pair',
    points: 12,
    cardIds: ids(cards),
    label: 'Four of a kind for 12',
    explanation: `All four ${word}s make six different pairs, 2 points each.`,
  };
};

export const runItem = (cards: readonly Card[]): ScoreItem => ({
  kind: 'run',
  points: cards.length,
  cardIds: ids(cards),
  label: `Run of ${cards.length} for ${cards.length}`,
  explanation: `${cards.length} consecutive ranks score ${cards.length} points, one for each card.`,
});

/**
 * Score a four-card hand (or crib) with the starter card.
 * `hand` must contain exactly the four kept cards.
 */
export const scoreHand = (
  hand: readonly Card[],
  starter: Card,
  isCrib: boolean,
): ScoreResult => {
  const all = [...hand, starter];
  const items: ScoreItem[] = [];

  // Fifteens: every distinct combination of cards totalling 15.
  for (const s of subsets(all)) {
    if (sumValues(s) === 15) {
      items.push(fifteenItem(s));
    }
  }

  // Pairs / three / four of a kind, grouped by rank.
  const byRank = new Map<Rank, Card[]>();
  for (const c of all) {
    byRank.set(c.rank, [...(byRank.get(c.rank) ?? []), c]);
  }
  byRank.forEach((cards, rank) => {
    if (cards.length >= 2) {
      items.push(pairItem(rank, cards));
    }
  });

  // Runs: keep only the longest runs (those not contained in a longer one).
  const runs = subsets(all).filter(isRun);
  const maxLen = runs.reduce((m, r) => Math.max(m, r.length), 0);
  for (const r of runs) {
    if (r.length === maxLen) {
      items.push(runItem(r));
    }
  }

  // Flush.
  const handSuit = hand[0]?.suit;
  const handFlush = hand.length === 4 && hand.every(c => c.suit === handSuit);
  if (handFlush) {
    const suit = SUIT_NAME[handSuit].toLowerCase();
    if (starter.suit === handSuit) {
      items.push({
        kind: 'flush',
        points: 5,
        cardIds: ids(all),
        label: 'Flush of 5 for 5',
        explanation: `All four cards and the starter are ${suit}.`,
      });
    } else if (!isCrib) {
      items.push({
        kind: 'flush',
        points: 4,
        cardIds: ids(hand),
        label: 'Flush of 4 for 4',
        explanation: `All four cards in your hand are ${suit}. The starter does not need to match.`,
      });
    }
    // In the crib a four-card flush is worth nothing: all five cards must match.
  }

  // Nobs: jack in the hand matching the starter's suit.
  const nobs = hand.find(c => c.rank === 11 && c.suit === starter.suit);
  if (nobs) {
    items.push({
      kind: 'nobs',
      points: 1,
      cardIds: [nobs.id, starter.id],
      label: 'Nobs for 1',
      explanation: `You hold the jack of ${SUIT_NAME[starter.suit].toLowerCase()}, matching the starter card's suit.`,
    });
  }

  return { total: items.reduce((s, i) => s + i.points, 0), items };
};

export const describeRankSet = (cards: readonly Card[]) =>
  cards.map(c => RANK_LABEL[c.rank]).join(' ');
