import { createDeck } from './deck';
import { countOf, playableCards } from './pegging';
import { Card, GameAction, GameState, Phase, PlayerId } from './types';

export const WIN_SCORE = 121;
export const DEAL_SIZE = 6;
export const KEEP_SIZE = 4;
export const CRIB_SIZE = 4;

export const cribOwner = (state: Pick<GameState, 'dealer'>): PlayerId =>
  state.dealer;

/** The player who does not own the crib; they lead the pegging and count first. */
export const pone = (dealer: PlayerId): PlayerId =>
  dealer === 'player' ? 'ai' : 'player';

export const hasCard = (cards: readonly Card[], id: string) =>
  cards.some(c => c.id === id);

/**
 * Check an action against the current state.
 * Returns `null` when valid, otherwise a human-readable reason.
 */
export const validateAction = (
  state: GameState,
  action: GameAction,
): string | null => {
  if (state.phase === 'gameOver') {
    return 'The game is over.';
  }
  switch (action.type) {
    case 'discard': {
      if (state.phase !== 'discard') {
        return 'Not the discard phase.';
      }
      const hand = state.hands[action.player];
      if (hand.length !== DEAL_SIZE) {
        return 'This player has already discarded.';
      }
      const unique = new Set(action.cardIds);
      if (action.cardIds.length !== 2 || unique.size !== 2) {
        return 'Discard exactly two different cards.';
      }
      if (!action.cardIds.every(id => hasCard(hand, id))) {
        return 'Card is not in hand.';
      }
      return null;
    }
    case 'cut': {
      if (state.phase !== 'cut' || state.starter) {
        return 'Not the cut phase.';
      }
      if (
        action.index !== undefined &&
        (!Number.isInteger(action.index) ||
          action.index < 0 ||
          action.index >= state.deck.length)
      ) {
        return 'Cut position out of range.';
      }
      return null;
    }
    case 'play': {
      if (state.phase !== 'pegging' || !state.pegging) {
        return 'Not the pegging phase.';
      }
      const peg = state.pegging;
      if (peg.turn !== action.player) {
        return 'Not this player\'s turn.';
      }
      const card = peg.remaining[action.player].find(c => c.id === action.cardId);
      if (!card) {
        return 'Card is not available to play.';
      }
      if (!playableCards([card], peg.count).length) {
        return 'That card would take the count over 31.';
      }
      return null;
    }
    case 'confirmCount':
      return state.phase === 'counting' && state.counting
        ? null
        : 'Nothing to count.';
  }
};

const PHASES: Phase[] = ['discard', 'cut', 'pegging', 'counting', 'gameOver'];

/**
 * Verify a (deserialized) state is internally consistent before restoring it.
 * Returns true only when it is safe to continue the game from it.
 */
export const isStateRestorable = (s: unknown): s is GameState => {
  try {
    const st = s as GameState;
    if (!st || !PHASES.includes(st.phase) || st.phase === 'gameOver') {
      return false;
    }
    if (!['player', 'ai'].includes(st.dealer)) {
      return false;
    }
    for (const p of ['player', 'ai'] as PlayerId[]) {
      const sc = st.scores[p];
      if (!(sc.front >= 0 && sc.front < WIN_SCORE && sc.back >= 0)) {
        return false;
      }
    }
    const all = [
      ...st.hands.player,
      ...st.hands.ai,
      ...st.crib,
      ...st.deck,
      ...(st.starter ? [st.starter] : []),
    ];
    // The starter is cut out of the deck, so it should not be counted twice.
    const unique = new Set(all.map(c => c.id));
    if (all.length !== 52 || unique.size !== 52) {
      return false;
    }
    const reference = new Set(createDeck().map(c => c.id));
    if (!all.every(c => reference.has(c.id))) {
      return false;
    }
    if (st.phase === 'discard') {
      const placed =
        st.crib.length + st.hands.player.length + st.hands.ai.length;
      if (placed !== 12 || st.starter) {
        return false;
      }
    } else if (st.hands.player.length !== KEEP_SIZE || st.hands.ai.length !== KEEP_SIZE || st.crib.length !== CRIB_SIZE) {
      return false;
    }
    if (st.phase === 'pegging') {
      const peg = st.pegging;
      if (!peg || !st.starter) {
        return false;
      }
      if (countOf(peg.pile) !== peg.count || peg.count > 31) {
        return false;
      }
      for (const p of ['player', 'ai'] as PlayerId[]) {
        if (!peg.remaining[p].every(c => hasCard(st.hands[p], c.id))) {
          return false;
        }
      }
    }
    if (st.phase === 'counting' && (!st.counting || !st.starter)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};
