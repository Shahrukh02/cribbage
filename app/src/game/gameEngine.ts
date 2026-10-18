import { createDeck, Rng, shuffle } from './deck';
import { countOf, goItem, playableCards, scorePlay } from './pegging';
import { pone, validateAction, WIN_SCORE } from './rules';
import { scoreHand } from './scoring';
import {
  Card,
  CountingState,
  GameAction,
  GameEvent,
  GameState,
  PlayerId,
  ScoreItem,
  other,
} from './types';

interface DealOptions {
  dealer: PlayerId;
  round: number;
  scores: GameState['scores'];
  rng: Rng;
  /** Supply a specific deck order (tests); otherwise a fresh shuffle is used. */
  deck?: Card[];
  eventSeq?: number;
}

/** Deal six cards to each player: the non-dealer is dealt first, one card at a time. */
export const dealRound = (o: DealOptions): GameState => {
  const deck = o.deck ? o.deck.slice() : shuffle(createDeck(), o.rng);
  const first = pone(o.dealer);
  const hands: GameState['hands'] = { player: [], ai: [] };
  for (let i = 0; i < 12; i++) {
    hands[i % 2 === 0 ? first : other(first)].push(deck[i]);
  }
  return {
    phase: 'discard',
    dealer: o.dealer,
    round: o.round,
    hands,
    crib: [],
    starter: null,
    deck: deck.slice(12),
    scores: o.scores,
    pegging: null,
    counting: null,
    winner: null,
    lastEvents: [],
    eventSeq: o.eventSeq ?? 0,
  };
};

export interface NewGameOptions {
  dealer?: PlayerId;
  rng?: Rng;
  deck?: Card[];
}

export const newGame = (opts: NewGameOptions = {}): GameState => {
  const rng = opts.rng ?? Math.random;
  return dealRound({
    dealer: opts.dealer ?? (rng() < 0.5 ? 'player' : 'ai'),
    round: 1,
    scores: {
      player: { front: 0, back: 0 },
      ai: { front: 0, back: 0 },
    },
    rng,
    deck: opts.deck,
  });
};

/**
 * Award points as a single peg move. Scoring stops the moment a player
 * reaches 121, which ends the game immediately.
 */
const award = (
  state: GameState,
  player: PlayerId,
  items: ScoreItem[],
  source: GameEvent['source'],
): GameState => {
  if (!items.length) {
    return state;
  }
  const scores = { ...state.scores };
  const start = scores[player].front;
  let total = start;
  let seq = state.eventSeq;
  const events: GameEvent[] = [...state.lastEvents];
  let winner: PlayerId | null = state.winner;
  for (const item of items) {
    seq++;
    events.push({ ...item, id: seq, player, source });
    total += item.points;
    if (total >= WIN_SCORE) {
      total = WIN_SCORE;
      winner = player;
      break;
    }
  }
  if (total !== start) {
    scores[player] = { front: total, back: start };
  }
  return {
    ...state,
    scores,
    eventSeq: seq,
    lastEvents: events,
    winner,
    phase: winner ? 'gameOver' : state.phase,
  };
};

const info = (
  state: GameState,
  player: PlayerId,
  kind: 'go',
  label: string,
  explanation: string,
): GameState => {
  const seq = state.eventSeq + 1;
  const ev: GameEvent = {
    id: seq,
    kind,
    points: 0,
    cardIds: [],
    label,
    explanation,
    player,
    source: 'pegging',
  };
  return { ...state, eventSeq: seq, lastEvents: [...state.lastEvents, ev] };
};

const countStep = (
  state: GameState,
  step: 0 | 1 | 2,
): CountingState => {
  const dealer = state.dealer;
  const starter = state.starter as Card;
  if (step === 0) {
    const owner = pone(dealer);
    const cards = state.hands[owner];
    return { step, target: 'pone', owner, cards, result: scoreHand(cards, starter, false) };
  }
  if (step === 1) {
    const cards = state.hands[dealer];
    return { step, target: 'dealer', owner: dealer, cards, result: scoreHand(cards, starter, false) };
  }
  return {
    step,
    target: 'crib',
    owner: dealer,
    cards: state.crib,
    result: scoreHand(state.crib, starter, true),
  };
};

const startPegging = (state: GameState): GameState => ({
  ...state,
  phase: 'pegging',
  pegging: {
    pile: [],
    discarded: [],
    count: 0,
    turn: pone(state.dealer),
    lastPlayer: null,
    goBy: null,
    remaining: { player: state.hands.player, ai: state.hands.ai },
  },
});

const applyPlay = (state: GameState, player: PlayerId, cardId: string): GameState => {
  const peg = state.pegging!;
  const card = peg.remaining[player].find(c => c.id === cardId)!;
  const pile = [...peg.pile, card];
  const count = countOf(pile);
  const remaining = {
    ...peg.remaining,
    [player]: peg.remaining[player].filter(c => c.id !== cardId),
  };
  let next: GameState = {
    ...state,
    pegging: { ...peg, pile, count, remaining, lastPlayer: player, goBy: null },
  };

  next = award(next, player, scorePlay(pile), 'pegging');
  if (next.winner) {
    return next;
  }

  const opp = other(player);
  const oppCan = playableCards(remaining[opp], count).length > 0;
  const meCan = playableCards(remaining[player], count).length > 0;

  if (count !== 31) {
    if (oppCan) {
      return { ...next, pegging: { ...next.pegging!, turn: opp } };
    }
    if (meCan) {
      // Opponent cannot play: they say "Go" and the same player continues.
      next = info(next, opp, 'go', 'Go', `${opp === 'ai' ? 'Opponent' : 'You'} could not play without going over 31.`);
      return { ...next, pegging: { ...next.pegging!, turn: player, goBy: opp } };
    }
    // Neither player can play: the last player to play scores for the go.
    const allDone = !remaining.player.length && !remaining.ai.length;
    next = award(next, player, [goItem(allDone ? 'lastCard' : 'go')], 'pegging');
    if (next.winner) {
      return next;
    }
  }

  return endSequence(next, player);
};

/** Reset the count after a 31 or a go and decide who leads next (or finish pegging). */
const endSequence = (state: GameState, lastPlayer: PlayerId): GameState => {
  const peg = state.pegging!;
  const discarded = [...peg.discarded, ...peg.pile];
  const opp = other(lastPlayer);
  let leader: PlayerId | null = null;
  if (peg.remaining[opp].length) {
    leader = opp;
  } else if (peg.remaining[lastPlayer].length) {
    leader = lastPlayer;
  }
  if (!leader) {
    // Pegging is finished: start counting hands with the non-dealer.
    const counting = countStep(state, 0);
    return {
      ...state,
      phase: 'counting',
      pegging: { ...peg, pile: [], discarded, count: 0, goBy: null },
      counting,
    };
  }
  return {
    ...state,
    pegging: { ...peg, pile: [], discarded, count: 0, turn: leader, goBy: null },
  };
};

export const reduce = (
  state: GameState,
  action: GameAction,
  rng: Rng = Math.random,
): GameState => {
  if (validateAction(state, action) !== null) {
    return state;
  }
  const s: GameState = { ...state, lastEvents: [] };

  switch (action.type) {
    case 'discard': {
      const hand = s.hands[action.player];
      const moved = hand.filter(c => action.cardIds.includes(c.id));
      const kept = hand.filter(c => !action.cardIds.includes(c.id));
      const next: GameState = {
        ...s,
        hands: { ...s.hands, [action.player]: kept },
        crib: [...s.crib, ...moved],
      };
      return next.crib.length === 4 ? { ...next, phase: 'cut' } : next;
    }
    case 'cut': {
      const index = action.index ?? Math.floor(rng() * s.deck.length);
      const starter = s.deck[index];
      let next: GameState = {
        ...s,
        starter,
        deck: s.deck.filter((_, i) => i !== index),
      };
      if (starter.rank === 11) {
        next = award(
          next,
          s.dealer,
          [
            {
              kind: 'heels',
              points: 2,
              cardIds: [starter.id],
              label: 'His heels for 2',
              explanation: 'The starter card is a jack, so the dealer scores 2 points immediately.',
            },
          ],
          'heels',
        );
        if (next.winner) {
          return next;
        }
      }
      return startPegging(next);
    }
    case 'play':
      return applyPlay(s, action.player, action.cardId);
    case 'confirmCount': {
      const c = s.counting!;
      let next = award(
        s,
        c.owner,
        c.result.items,
        c.target === 'crib' ? 'crib' : 'hand',
      );
      if (next.winner) {
        return next;
      }
      if (c.step < 2) {
        return { ...next, counting: countStep(next, (c.step + 1) as 1 | 2) };
      }
      const events = next.lastEvents;
      next = dealRound({
        dealer: other(s.dealer),
        round: s.round + 1,
        scores: next.scores,
        rng,
        eventSeq: next.eventSeq,
      });
      return { ...next, lastEvents: events };
    }
  }
};

export { validateAction };
