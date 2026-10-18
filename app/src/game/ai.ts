import { cardValue, createDeck, Rng, shuffle } from './deck';
import { PEG_LIMIT, playableCards, scorePlay } from './pegging';
import { scoreHand } from './scoring';
import { Card, Difficulty } from './types';

/* -------------------------------------------------------------------------- */
/* Discarding                                                                  */
/* -------------------------------------------------------------------------- */

/** Rough expected value of two discarded cards to the crib, ignoring ownership. */
export const cribPotential = (a: Card, b: Card): number => {
  let v = 0;
  const va = cardValue(a);
  const vb = cardValue(b);
  if (a.rank === b.rank) {
    v += 2.5;
  }
  if (va + vb === 15) {
    v += 2;
  }
  if (a.rank === 5 || b.rank === 5) {
    v += 1.1;
  }
  const gap = Math.abs(a.rank - b.rank);
  if (gap === 1) {
    v += 0.9;
  } else if (gap === 2) {
    v += 0.6;
  } else if (gap === 3) {
    v += 0.2;
  }
  if (a.suit === b.suit) {
    v += 0.3;
  }
  if (a.rank === 11 || b.rank === 11) {
    v += 0.15;
  }
  return v;
};

const pairsOf = (hand: Card[]): [Card, Card][] => {
  const out: [Card, Card][] = [];
  for (let i = 0; i < hand.length; i++) {
    for (let j = i + 1; j < hand.length; j++) {
      out.push([hand[i], hand[j]]);
    }
  }
  return out;
};

const unseenStarters = (hand: Card[]): Card[] => {
  const held = new Set(hand.map(c => c.id));
  return createDeck().filter(c => !held.has(c.id));
};

export interface DiscardOption {
  discard: [Card, Card];
  keep: Card[];
  /** Average hand score over possible starters. */
  handValue: number;
  /** Signed crib adjustment (positive when it helps the AI). */
  cribValue: number;
  total: number;
}

/** Rank every way of discarding two cards from six. Best option first. */
export const rankDiscards = (
  hand: Card[],
  isDealer: boolean,
  samples: number | 'all',
  cribWeight: number,
  rng: Rng = Math.random,
): DiscardOption[] => {
  const pool = unseenStarters(hand);
  const starters = samples === 'all' ? pool : shuffle(pool, rng).slice(0, samples);
  const options = pairsOf(hand).map(discard => {
    const keep = hand.filter(c => c !== discard[0] && c !== discard[1]);
    let sum = 0;
    for (const st of starters) {
      sum += scoreHand(keep, st, false).total;
    }
    const handValue = sum / starters.length;
    const cribValue = (isDealer ? 1 : -1) * cribPotential(discard[0], discard[1]) * cribWeight;
    return { discard, keep, handValue, cribValue, total: handValue + cribValue };
  });
  return options.sort((a, b) => b.total - a.total);
};

export const chooseDiscard = (
  hand: Card[],
  isDealer: boolean,
  difficulty: Difficulty,
  rng: Rng = Math.random,
): string[] => {
  let pick: DiscardOption;
  if (difficulty === 'easy' && rng() < 0.55) {
    const all = pairsOf(hand);
    const d = all[Math.floor(rng() * all.length)];
    return [d[0].id, d[1].id];
  }
  if (difficulty === 'hard') {
    pick = rankDiscards(hand, isDealer, 'all', 1, rng)[0];
  } else {
    pick = rankDiscards(hand, isDealer, 8, difficulty === 'medium' ? 0.6 : 0.3, rng)[0];
  }
  return [pick.discard[0].id, pick.discard[1].id];
};

/** A beginner-friendly suggestion for which two cards to put in the crib. */
export const suggestDiscard = (hand: Card[], isDealer: boolean) => {
  const best = rankDiscards(hand, isDealer, 'all', 1)[0];
  const [a, b] = best.discard;
  const reason = isDealer
    ? 'The crib is yours, so cards that work well together are fine to send there.'
    : 'The crib belongs to your opponent, so avoid sending cards that score well together.';
  return { cardIds: [a.id, b.id], keepAverage: best.handValue, reason };
};

/* -------------------------------------------------------------------------- */
/* Pegging                                                                     */
/* -------------------------------------------------------------------------- */

export interface PegView {
  hand: Card[];
  pile: Card[];
  count: number;
  /** Cards the opponent still holds (the AI may only know how many). */
  opponentCards: number;
}

const defensePenalty = (newCount: number, difficulty: Difficulty): number => {
  let p = 0;
  if (newCount === 5) {
    p += 1.2;
  }
  if (newCount === 21) {
    p += 1.0;
  }
  if (difficulty === 'hard') {
    if (newCount === 10) {
      p += 0.5;
    }
    if (newCount === 26 || newCount === 25) {
      p += 0.3;
    }
  }
  return p;
};

const leadPenalty = (card: Card): number => {
  const v = cardValue(card);
  if (v === 5) {
    return 1.2;
  }
  if (v === 10) {
    return 0.5;
  }
  if (v >= 6) {
    return 0.2;
  }
  return 0;
};

/** Pick a legal card to play, or null if the AI must say "Go". */
export const choosePlay = (
  view: PegView,
  difficulty: Difficulty,
  rng: Rng = Math.random,
): string | null => {
  const legal = playableCards(view.hand, view.count);
  if (!legal.length) {
    return null;
  }
  const scored = legal.map(card => {
    const pile = [...view.pile, card];
    const immediate = scorePlay(pile).reduce((s, i) => s + i.points, 0);
    const newCount = view.count + cardValue(card);
    let value = immediate;
    if (difficulty !== 'easy') {
      value -= defensePenalty(newCount, difficulty);
    }
    if (difficulty === 'hard') {
      if (view.pile.length === 0) {
        value -= leadPenalty(card);
      }
      // Keep low cards for later so we are less likely to be stuck; play high when nothing scores.
      value += immediate === 0 ? cardValue(card) * 0.02 : 0;
      // Leaving the count where the opponent can pair us is slightly risky.
      const last = view.pile[view.pile.length - 1];
      if (last && last.rank === card.rank) {
        value += 0.1;
      }
      // Prefer plays that let us hit 31 next, e.g. count 21 + a 10 held.
      if (newCount <= PEG_LIMIT && view.hand.some(c => c !== card && newCount + cardValue(c) === 31)) {
        value += 0.4;
      }
    }
    return { card, value: value + rng() * 0.05 };
  });

  if (difficulty === 'easy' && rng() < 0.6) {
    return legal[Math.floor(rng() * legal.length)].id;
  }
  scored.sort((a, b) => b.value - a.value);
  return scored[0].card.id;
};
