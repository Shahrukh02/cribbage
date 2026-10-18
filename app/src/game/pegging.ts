import { cardValue, RANK_NAME } from './deck';
import { isRun, pairItem, runItem } from './scoring';
import { Card, ScoreItem } from './types';

export const PEG_LIMIT = 31;

export const countOf = (pile: readonly Card[]) =>
  pile.reduce((s, c) => s + cardValue(c), 0);

/** Cards from `hand` that can legally be played on the current count. */
export const playableCards = (hand: readonly Card[], count: number): Card[] =>
  hand.filter(c => count + cardValue(c) <= PEG_LIMIT);

/**
 * Points scored by the card that was just played.
 * `pile` already includes the card played last. Last-card / go points are
 * awarded by the game engine, not here.
 */
export const scorePlay = (pile: readonly Card[]): ScoreItem[] => {
  const items: ScoreItem[] = [];
  if (pile.length === 0) {
    return items;
  }
  const count = countOf(pile);

  if (count === 15) {
    items.push({
      kind: 'fifteen',
      points: 2,
      cardIds: pile.map(c => c.id),
      label: '15 for 2',
      explanation: 'The running count reached exactly 15.',
    });
  }
  if (count === 31) {
    items.push({
      kind: 'thirtyone',
      points: 2,
      cardIds: pile.map(c => c.id),
      label: '31 for 2',
      explanation: 'The running count reached exactly 31, the limit.',
    });
  }

  // Pairs: trailing cards of the same rank.
  const last = pile[pile.length - 1];
  let same = 1;
  for (let i = pile.length - 2; i >= 0 && pile[i].rank === last.rank; i--) {
    same++;
  }
  if (same >= 2) {
    const cards = pile.slice(pile.length - same);
    const item = pairItem(last.rank, cards);
    item.explanation =
      same === 2
        ? `You matched the last card played (${RANK_NAME[last.rank]}).`
        : same === 3
        ? `Three ${RANK_NAME[last.rank].toLowerCase()}s in a row: three pairs, 2 points each.`
        : `Four ${RANK_NAME[last.rank].toLowerCase()}s in a row: six pairs, 2 points each.`;
    items.push(item);
  }

  // Runs: the longest trailing group of 3+ cards that forms a run in any order.
  for (let len = pile.length; len >= 3; len--) {
    const tail = pile.slice(pile.length - len);
    if (isRun(tail)) {
      const item = runItem(tail);
      item.explanation = `The last ${len} cards played form a run of consecutive ranks, in any order.`;
      items.push(item);
      break;
    }
  }

  return items;
};

export const goItem = (kind: 'go' | 'lastCard'): ScoreItem => ({
  kind,
  points: 1,
  cardIds: [],
  label: kind === 'go' ? 'Go for 1' : 'Last card for 1',
  explanation:
    kind === 'go'
      ? 'Nobody else could play without going over 31, so you get 1 point for the last card.'
      : 'You played the very last card of the pegging round, worth 1 point.',
});
