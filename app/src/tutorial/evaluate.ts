import { rankDiscards } from '../game/ai';
import { cardValue, parseCards, RANK_LABEL, RANK_NAME } from '../game/deck';
import { countOf, PEG_LIMIT, scorePlay } from '../game/pegging';
import { isRun, subsets } from '../game/scoring';
import { Card } from '../game/types';
import { Step } from './lessons';

export interface Verdict {
  ok: boolean;
  message: string;
}

const names = (cards: Card[]) => cards.map(c => RANK_LABEL[c.rank]).join(' + ');

/** Judge a learner's selection with the real scoring code. */
export const evaluateStep = (step: Step, selectedIds: string[]): Verdict => {
  const check = step.check;
  const cards = parseCards(step.cards ?? '');
  const picked = cards.filter(c => selectedIds.includes(c.id));
  if (!check) {
    return { ok: true, message: '' };
  }

  switch (check.kind) {
    case 'values10': {
      const tens = cards.filter(c => cardValue(c) === 10).map(c => c.id).sort();
      const sel = picked.map(c => c.id).sort();
      const ok = tens.join() === sel.join();
      return ok
        ? { ok, message: '10, Jack, Queen and King are all worth 10. Aces count 1.' }
        : { ok, message: 'Not quite. Look for the 10, Jack, Queen and King, and leave out the others.' };
    }
    case 'fifteen': {
      const total = picked.reduce((s, c) => s + cardValue(c), 0);
      const min = check.min ?? 2;
      if (picked.length < min) {
        return { ok: false, message: `Pick at least ${min} cards.` };
      }
      return total === 15
        ? { ok: true, message: `${names(picked)} = 15. That scores 2 points.` }
        : { ok: false, message: `Those add up to ${total}, not 15. Try another combination.` };
    }
    case 'pair': {
      const size = check.size ?? 2;
      const sameRank = picked.length >= 2 && picked.every(c => c.rank === picked[0].rank);
      if (!sameRank) {
        return { ok: false, message: 'A pair is two or more cards of the same rank.' };
      }
      if (picked.length !== size) {
        return { ok: false, message: `There are ${size} cards to find here. Tap exactly ${size}.` };
      }
      const pts = size === 2 ? 2 : size === 3 ? 6 : 12;
      return {
        ok: true,
        message: `${size} ${RANK_NAME[picked[0].rank].toLowerCase()}s score ${pts} points.`,
      };
    }
    case 'run': {
      if (!isRun(picked)) {
        return { ok: false, message: 'A run needs at least three cards with consecutive ranks, like 4-5-6.' };
      }
      if (check.size && picked.length !== check.size) {
        return { ok: false, message: `There is a run of ${check.size} here. Look for one more card.` };
      }
      return { ok: true, message: `A run of ${picked.length} scores ${picked.length} points.` };
    }
    case 'flush': {
      const ok = picked.length >= 4 && picked.every(c => c.suit === picked[0].suit);
      return ok
        ? { ok, message: 'Four cards of the same suit: a flush for 4 points.' }
        : { ok, message: 'Tap four cards that share a suit.' };
    }
    case 'nobs': {
      const starter = parseCards(step.starter ?? '')[0];
      const ok =
        picked.length === 1 && picked[0].rank === 11 && picked[0].suit === starter.suit;
      return ok
        ? { ok, message: 'Correct. A jack matching the starter’s suit is worth 1 point.' }
        : { ok, message: 'Look for the Jack with the same suit as the starter.' };
    }
    case 'discard': {
      if (picked.length !== 2) {
        return { ok: false, message: 'Choose exactly two cards to discard.' };
      }
      const options = rankDiscards(cards, check.isDealer, 'all', 1);
      const mine = options.find(o => picked.every(c => o.discard.includes(c)))!;
      const best = options[0];
      const avg = mine.handValue.toFixed(1);
      if (mine.total >= best.total - 0.5) {
        return {
          ok: true,
          message: `Good choice. Your kept hand averages about ${avg} points once the starter is turned.`,
        };
      }
      const [a, b] = best.discard;
      return {
        ok: true,
        message: `Playable, but your kept hand averages about ${avg} points. Sending ${RANK_LABEL[a.rank]} and ${RANK_LABEL[b.rank]} instead would be stronger overall.`,
      };
    }
    case 'peg': {
      if (picked.length !== 1) {
        return { ok: false, message: 'Play exactly one card.' };
      }
      const pile = parseCards(step.pile ?? '');
      const next = [...pile, picked[0]];
      const count = countOf(next);
      if (count > PEG_LIMIT) {
        return { ok: false, message: `That would make ${count}, over 31. Pick a lower card.` };
      }
      const items = scorePlay(next);
      const want =
        check.goal === 'thirtyone' ? 'thirtyone' : check.goal === 'pair' ? 'pair' : check.goal;
      const hit = items.find(i => i.kind === want);
      return hit
        ? { ok: true, message: `${hit.label}. ${hit.explanation}` }
        : {
            ok: false,
            message: `That makes the count ${count} and scores ${items.reduce((s, i) => s + i.points, 0)}. Try another card.`,
          };
    }
  }
};

/** Find a selection that satisfies the step (used by the "Show me" button). */
export const findSolution = (step: Step): string[] | null => {
  if (!step.check) {
    return null;
  }
  const cards = parseCards(step.cards ?? '');
  const candidates = subsets(cards).sort((a, b) => a.length - b.length);
  for (const sub of candidates) {
    const ids = sub.map(c => c.id);
    if (step.check.kind === 'discard') {
      if (ids.length === 2) {
        const options = rankDiscards(cards, step.check.isDealer, 'all', 1);
        return [options[0].discard[0].id, options[0].discard[1].id];
      }
      continue;
    }
    if (evaluateStep(step, ids).ok) {
      return ids;
    }
  }
  return null;
};
