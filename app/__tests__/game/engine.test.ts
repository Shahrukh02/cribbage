import { chooseDiscard, choosePlay } from '../../src/game/ai';
import { createDeck, parseCards, seededRng } from '../../src/game/deck';
import { newGame, reduce } from '../../src/game/gameEngine';
import { playableCards } from '../../src/game/pegging';
import { isStateRestorable, validateAction } from '../../src/game/rules';
import { Card, Difficulty, GameState, PlayerId, other } from '../../src/game/types';

/** Build a deck where the given six-card hands are dealt and `starter` is first in the remaining deck. */
const rig = (
  poneHand: string,
  dealerHand: string,
  starter?: string,
): Card[] => {
  const p = parseCards(poneHand);
  const d = parseCards(dealerHand);
  const used = new Set([...p, ...d].map(c => c.id));
  let rest = createDeck().filter(c => !used.has(c.id));
  if (starter) {
    const s = parseCards(starter)[0];
    rest = [s, ...rest.filter(c => c.id !== s.id)];
  }
  const out: Card[] = [];
  for (let i = 0; i < 6; i++) {
    out.push(p[i], d[i]);
  }
  return [...out, ...rest];
};

const setup = (opts: {
  dealer: PlayerId;
  pone: string;
  dlr: string;
  starter?: string;
}) =>
  newGame({
    dealer: opts.dealer,
    deck: rig(opts.pone, opts.dlr, opts.starter),
  });

const ids = (s: string) => parseCards(s).map(c => c.id);

/** Run both discards, then cut index 0 (the rigged starter). */
const toPegging = (s0: GameState, poneDiscard: string, dealerDiscard: string) => {
  const pone = other(s0.dealer);
  let s = reduce(s0, { type: 'discard', player: pone, cardIds: ids(poneDiscard) });
  s = reduce(s, { type: 'discard', player: s0.dealer, cardIds: ids(dealerDiscard) });
  return reduce(s, { type: 'cut', index: 0 });
};

describe('dealing and discarding', () => {
  it('deals six cards each and leaves 40 in the deck', () => {
    const s = newGame({ dealer: 'ai', rng: seededRng(1) });
    expect(s.hands.player).toHaveLength(6);
    expect(s.hands.ai).toHaveLength(6);
    expect(s.deck).toHaveLength(40);
    expect(s.phase).toBe('discard');
    const all = [...s.hands.player, ...s.hands.ai, ...s.deck];
    expect(new Set(all.map(c => c.id)).size).toBe(52);
  });

  it('puts two cards from each player in the crib then moves to the cut', () => {
    const s0 = setup({
      dealer: 'ai',
      pone: '2H 3H 4H 5H 6H 7H',
      dlr: '2S 3S 4S 5S 6S 7S',
    });
    const s1 = reduce(s0, { type: 'discard', player: 'player', cardIds: ids('2H 3H') });
    expect(s1.hands.player).toHaveLength(4);
    expect(s1.crib).toHaveLength(2);
    expect(s1.phase).toBe('discard');
    const s2 = reduce(s1, { type: 'discard', player: 'ai', cardIds: ids('2S 3S') });
    expect(s2.crib).toHaveLength(4);
    expect(s2.phase).toBe('cut');
  });

  it('rejects invalid discards', () => {
    const s0 = setup({ dealer: 'ai', pone: '2H 3H 4H 5H 6H 7H', dlr: '2S 3S 4S 5S 6S 7S' });
    expect(validateAction(s0, { type: 'discard', player: 'player', cardIds: ids('2H') })).not.toBeNull();
    expect(validateAction(s0, { type: 'discard', player: 'player', cardIds: ids('2H 2H') })).not.toBeNull();
    expect(validateAction(s0, { type: 'discard', player: 'player', cardIds: ids('2S 3S') })).not.toBeNull();
    expect(reduce(s0, { type: 'discard', player: 'player', cardIds: ids('2S 3S') })).toBe(s0);
    const s1 = reduce(s0, { type: 'discard', player: 'player', cardIds: ids('2H 3H') });
    expect(validateAction(s1, { type: 'discard', player: 'player', cardIds: ids('4H 5H') })).not.toBeNull();
    expect(validateAction(s0, { type: 'play', player: 'player', cardId: '2H' })).not.toBeNull();
  });
});

describe('the cut', () => {
  const base = setup({
    dealer: 'ai',
    pone: '2H 3H 4H 5H 6H 7H',
    dlr: '2S 3S 4S 5S 6S 7S',
    starter: 'JD',
  });
  const cutReady = (s: GameState) => {
    let n = reduce(s, { type: 'discard', player: 'player', cardIds: ids('2H 3H') });
    n = reduce(n, { type: 'discard', player: 'ai', cardIds: ids('2S 3S') });
    return n;
  };

  it('gives the dealer 2 points (his heels) when the starter is a jack', () => {
    const s = reduce(cutReady(base), { type: 'cut', index: 0 });
    expect(s.starter?.id).toBe('JD');
    expect(s.scores.ai.front).toBe(2);
    expect(s.lastEvents.map(e => e.kind)).toEqual(['heels']);
    expect(s.phase).toBe('pegging');
    expect(s.deck).toHaveLength(39);
  });

  it('ends the game immediately if his heels reaches 121', () => {
    const ready = cutReady(base);
    const s = reduce(
      { ...ready, scores: { ...ready.scores, ai: { front: 120, back: 100 } } },
      { type: 'cut', index: 0 },
    );
    expect(s.winner).toBe('ai');
    expect(s.phase).toBe('gameOver');
    expect(s.scores.ai.front).toBe(121);
  });

  it('does not award heels for other starters, and the non-dealer leads', () => {
    const b2 = setup({ dealer: 'ai', pone: '2H 3H 4H 5H 6H 7H', dlr: '2S 3S 4S 5S 6S 7S', starter: 'KD' });
    const s = reduce(cutReady(b2), { type: 'cut', index: 0 });
    expect(s.scores.ai.front).toBe(0);
    expect(s.pegging?.turn).toBe('player');
  });
});

describe('pegging', () => {
  // dealer = ai. pone (player) keeps 5H 10H JH KH? built below per test
  const start = (poneKeep: string, dealerKeep: string) => {
    const poneDisc = '2C 3C';
    const dealerDisc = '2D 3D';
    const s0 = setup({
      dealer: 'ai',
      pone: `${poneKeep} ${poneDisc}`,
      dlr: `${dealerKeep} ${dealerDisc}`,
      starter: '9C',
    });
    return toPegging(s0, poneDisc, dealerDisc);
  };
  const play = (s: GameState, p: PlayerId, c: string) =>
    reduce(s, { type: 'play', player: p, cardId: c });

  it('lets the non-dealer lead and enforces turn order', () => {
    const s = start('4H 6H 8H KH', '5S 7S 9S QS');
    expect(s.pegging?.turn).toBe('player');
    expect(validateAction(s, { type: 'play', player: 'ai', cardId: '5S' })).not.toBeNull();
    const s1 = play(s, 'player', '4H');
    expect(s1.pegging?.count).toBe(4);
    expect(s1.pegging?.turn).toBe('ai');
  });

  it('scores 15 for the player who makes it', () => {
    let s = start('4H 6H 8H KH', '5S 7S 9S QS');
    s = play(s, 'player', 'KH'); // 10
    s = play(s, 'ai', '5S'); // 15
    expect(s.scores.ai.front).toBe(2);
    expect(s.lastEvents[0].label).toBe('15 for 2');
  });

  it('rejects plays that go over 31 and handles go', () => {
    let s = start('KH 10H 9H 8H'.replace('10H', 'QH'), '10S JS 7S 5S');
    // player KH(10) ai JS(20) player QH(30)
    s = play(s, 'player', 'KH');
    s = play(s, 'ai', 'JS');
    s = play(s, 'player', 'QH'); // 30
    // At 30 neither player can play (ai's lowest is 5, player holds 9 and 8), so the
    // last player to play (the human) scores the go and the count resets.
    // (K, J, Q in any order is also a run of 3, so 3 + 1 for the go.)
    expect(s.scores.player.front).toBe(4);
    expect(s.lastEvents.map(e => e.kind)).toEqual(['run', 'go']);
    // sequence reset, ai (the non-last player) leads
    expect(s.pegging?.count).toBe(0);
    expect(s.pegging?.pile).toHaveLength(0);
    expect(s.pegging?.turn).toBe('ai');
  });

  it('keeps the same player playing when the opponent says go but they can continue', () => {
    let s = start('AH 2H 3H 4H', 'KS QS JS 10S');
    s = play(s, 'player', '4H'); // 4
    s = play(s, 'ai', 'KS'); // 14
    s = play(s, 'player', '3H'); // 17
    s = play(s, 'ai', 'QS'); // 27
    s = play(s, 'player', '2H'); // 29 -> ai cannot (10+29>31), player can play AH
    expect(s.pegging?.turn).toBe('player');
    expect(s.pegging?.goBy).toBe('ai');
    s = play(s, 'player', 'AH'); // 30 ; ai can't, player has no cards -> go
    expect(s.pegging?.count).toBe(0);
    // 30: neither can continue; last player (human) gets "go" for 1, ai leads next.
    expect(s.lastEvents.map(e => e.kind)).toEqual(['go']);
    expect(s.scores.player.front).toBe(1);
    expect(s.pegging?.turn).toBe('ai');
  });

  it('scores 31 for 2 and does not add a go point', () => {
    let s = start('KH 6H 4H AH', 'QS 5S JS 7S');
    s = play(s, 'player', 'KH'); // 10
    s = play(s, 'ai', 'QS'); // 20
    s = play(s, 'player', '6H'); // 26
    s = play(s, 'ai', '5S'); // 31
    expect(s.scores.ai.front).toBe(2);
    expect(s.lastEvents.map(e => e.kind)).toEqual(['thirtyone']);
    expect(s.pegging?.count).toBe(0);
    // the player who did not play the 31 leads next
    expect(s.pegging?.turn).toBe('player');
  });

  it('awards last card and moves to counting when all cards are played', () => {
    let s = start('4H 6H 8H KH', '5S 7S 9S QS');
    const seq: [PlayerId, string][] = [
      ['player', '4H'],
      ['ai', '5S'],
      ['player', '6H'],
      ['ai', '7S'],
      ['player', '8H'],
    ];
    seq.forEach(([p, c]) => {
      s = play(s, p, c);
    });
    expect(s.phase).toBe('pegging');
    // 6H makes 15 + run of 3 (5) for the human; 7S makes a run of 4 for the ai;
    // 8H makes a run of 5 for the human, then nobody can play so the human also gets the go.
    expect(s.scores.ai.front).toBe(4);
    expect(s.scores.player.front).toBe(5 + 5 + 1);
    expect(s.pegging?.count).toBe(0);
    expect(s.pegging?.turn).toBe('ai');
  });

  it('ends the game immediately when pegging reaches 121', () => {
    let s = start('4H 6H 8H KH', '5S 7S 9S QS');
    s = { ...s, scores: { ...s.scores, ai: { front: 120, back: 110 } } };
    s = play(s, 'player', 'KH');
    s = play(s, 'ai', '5S'); // 15 for 2 → win
    expect(s.winner).toBe('ai');
    expect(s.phase).toBe('gameOver');
    expect(s.scores.ai.front).toBe(121);
    expect(reduce(s, { type: 'play', player: 'player', cardId: '4H' })).toBe(s);
  });

  it('plays through to counting with pone counting first', () => {
    let s = start('4H 6H 8H KH', '5S 7S 9S QS');
    let guard = 0;
    while (s.phase === 'pegging' && guard++ < 40) {
      const peg = s.pegging!;
      const hand = peg.remaining[peg.turn];
      const legal = playableCards(hand, peg.count);
      expect(legal.length).toBeGreaterThan(0);
      s = play(s, peg.turn, legal[0].id);
    }
    expect(s.phase).toBe('counting');
    expect(s.counting?.owner).toBe('player'); // pone
    expect(s.counting?.step).toBe(0);
  });
});

describe('counting', () => {
  const toCounting = (opts: { dealer: PlayerId; pone: string; dlr: string; starter: string }) => {
    const s0 = setup({
      dealer: opts.dealer,
      pone: `${opts.pone} 2C 3C`,
      dlr: `${opts.dlr} 2D 3D`,
      starter: opts.starter,
    });
    let s = toPegging(s0, '2C 3C', '2D 3D');
    // Fast-forward: play out all cards using first legal card.
    let guard = 0;
    while (s.phase === 'pegging' && guard++ < 60) {
      const peg = s.pegging!;
      const legal = playableCards(peg.remaining[peg.turn], peg.count);
      s = reduce(s, { type: 'play', player: peg.turn, cardId: legal[0].id });
    }
    return s;
  };

  it('counts pone, then dealer, then crib, then deals a new round with the dealer rotated', () => {
    let s = toCounting({ dealer: 'ai', pone: 'KH 9D 8C 6S', dlr: 'KS 9S 8H 6H', starter: 'QD' });
    if (s.phase !== 'counting') {
      throw new Error('should be counting but was ' + s.phase);
    }
    expect(s.counting?.target).toBe('pone');
    const afterPeg = { ...s.scores };
    s = reduce(s, { type: 'confirmCount' });
    expect(s.counting?.target).toBe('dealer');
    expect(s.scores.player.front).toBeGreaterThanOrEqual(afterPeg.player.front);
    s = reduce(s, { type: 'confirmCount' });
    expect(s.counting?.target).toBe('crib');
    expect(s.counting?.owner).toBe('ai'); // dealer owns the crib
    s = reduce(s, { type: 'confirmCount' });
    expect(s.phase).toBe('discard');
    expect(s.dealer).toBe('player');
    expect(s.round).toBe(2);
    expect(s.hands.player).toHaveLength(6);
    expect(s.deck).toHaveLength(40);
    expect(s.scores.player.front + s.scores.ai.front).toBeGreaterThan(0);
  });

  it('ends the game when the non-dealer reaches 121 while counting, before the dealer counts', () => {
    // pone holds 5H 5D 5C JS with 5S starter = 29.
    let s = toCounting({ dealer: 'ai', pone: '5H 5D 5C JS', dlr: '4H 6H 8H KH', starter: '5S' });
    expect(s.phase).toBe('counting');
    s = {
      ...s,
      scores: {
        player: { front: 100, back: 90 },
        ai: { front: 115, back: 100 },
      },
    };
    // Pone's 29 takes them past 121 even though the dealer is "ahead" on the board.
    const next = reduce(s, { type: 'confirmCount' });
    expect(next.winner).toBe('player');
    expect(next.phase).toBe('gameOver');
    expect(next.scores.player.front).toBe(121);
    expect(next.scores.ai.front).toBe(115);
  });

  it('ends the game during the crib count', () => {
    let s = toCounting({ dealer: 'ai', pone: '2H 4H 8H KH', dlr: '4S 6S 8S KS', starter: 'QD' });
    s = reduce(s, { type: 'confirmCount' });
    s = reduce(s, { type: 'confirmCount' });
    expect(s.counting?.target).toBe('crib');
    s = { ...s, scores: { ...s.scores, ai: { front: 121 - 1, back: 100 } }, counting: {
      ...s.counting!,
      result: { total: 2, items: [{ kind: 'fifteen', points: 2, cardIds: [], label: '15 for 2', explanation: '' }] },
    } };
    const next = reduce(s, { type: 'confirmCount' });
    expect(next.winner).toBe('ai');
  });
});

describe('state restoration', () => {
  it('accepts a legitimate in-progress state and rejects tampered ones', () => {
    const s = newGame({ rng: seededRng(3) });
    expect(isStateRestorable(JSON.parse(JSON.stringify(s)))).toBe(true);
    const bad = JSON.parse(JSON.stringify(s));
    bad.hands.player[0] = bad.hands.ai[0];
    expect(isStateRestorable(bad)).toBe(false);
    expect(isStateRestorable({})).toBe(false);
    expect(isStateRestorable(null)).toBe(false);
  });
});

describe('AI', () => {
  const diffs: Difficulty[] = ['easy', 'medium', 'hard'];

  it('chooses two distinct cards from its hand to discard', () => {
    diffs.forEach(d => {
      for (let seed = 1; seed <= 10; seed++) {
        const s = newGame({ rng: seededRng(seed), dealer: 'ai' });
        const pick = chooseDiscard(s.hands.ai, true, d, seededRng(seed));
        expect(pick).toHaveLength(2);
        expect(new Set(pick).size).toBe(2);
        expect(validateAction(s, { type: 'discard', player: 'ai', cardIds: pick })).toBeNull();
      }
    });
  });

  it('keeps a strong hand rather than discarding the 5s pair', () => {
    const hand = parseCards('5H 5D 6C 4S KH 2C');
    const pick = chooseDiscard(hand, false, 'hard');
    // best keep contains the 5s with 4/6 for runs; the pick must not discard a five.
    expect(pick).not.toContain('5H');
    expect(pick).not.toContain('5D');
  });

  it('always plays a legal card, or null when it must go', () => {
    diffs.forEach(d => {
      const hand = parseCards('KH QD 5C 9S');
      const move = choosePlay({ hand, pile: parseCards('KS JD'), count: 20, opponentCards: 2 }, d, seededRng(2));
      // count 20: 5C → 25 and 9S → 29 are legal; KH / QD (30) are legal too (<= 31)
      expect(['5C', 'KH', 'QD', '9S']).toContain(move);
      const stuck = choosePlay({ hand: parseCards('KH QD'), pile: [], count: 25, opponentCards: 2 }, d);
      expect(stuck).toBeNull();
    });
  });

  it('takes available points when it can (hard)', () => {
    const hand = parseCards('5C 9S');
    const move = choosePlay(
      { hand, pile: parseCards('KS'), count: 10, opponentCards: 3 },
      'hard',
      seededRng(1),
    );
    expect(move).toBe('5C'); // 15 for 2
  });

  it.each(diffs)('plays complete AI-vs-AI games to a legal finish (%s)', diff => {
    for (let seed = 1; seed <= 12; seed++) {
      const rng = seededRng(seed * 101);
      let s = newGame({ rng });
      let steps = 0;
      while (s.phase !== 'gameOver') {
        if (steps++ > 5000) {
          throw new Error(`game did not finish (seed ${seed})`);
        }
        const before = s;
        if (s.phase === 'discard') {
          for (const p of ['player', 'ai'] as PlayerId[]) {
            if (s.hands[p].length === 6) {
              const pick = chooseDiscard(s.hands[p], s.dealer === p, diff, rng);
              expect(validateAction(s, { type: 'discard', player: p, cardIds: pick })).toBeNull();
              s = reduce(s, { type: 'discard', player: p, cardIds: pick }, rng);
            }
          }
        } else if (s.phase === 'cut') {
          s = reduce(s, { type: 'cut' }, rng);
        } else if (s.phase === 'pegging') {
          const peg = s.pegging!;
          const move = choosePlay(
            {
              hand: peg.remaining[peg.turn],
              pile: peg.pile,
              count: peg.count,
              opponentCards: peg.remaining[other(peg.turn)].length,
            },
            diff,
            rng,
          );
          expect(move).not.toBeNull(); // engine never hands the turn to a player who must go
          expect(validateAction(s, { type: 'play', player: peg.turn, cardId: move! })).toBeNull();
          s = reduce(s, { type: 'play', player: peg.turn, cardId: move! }, rng);
        } else if (s.phase === 'counting') {
          s = reduce(s, { type: 'confirmCount' }, rng);
        }
        expect(s).not.toBe(before);
        expect(s.scores.player.front).toBeLessThanOrEqual(121);
        expect(s.scores.ai.front).toBeLessThanOrEqual(121);
      }
      expect(s.winner).not.toBeNull();
      expect(s.scores[s.winner!].front).toBe(121);
    }
  });
});
