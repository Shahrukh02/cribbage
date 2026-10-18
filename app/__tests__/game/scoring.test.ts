import { cardValue, createDeck, parseCard, parseCards, seededRng, shuffle } from '../../src/game/deck';
import { scoreHand } from '../../src/game/scoring';
import { countOf, scorePlay } from '../../src/game/pegging';

const hand = (s: string, starter: string, crib = false) =>
  scoreHand(parseCards(s), parseCard(starter), crib);

describe('deck', () => {
  it('has 52 unique cards', () => {
    const d = createDeck();
    expect(d).toHaveLength(52);
    expect(new Set(d.map(c => c.id)).size).toBe(52);
  });
  it('shuffles without losing or duplicating cards, deterministically for a seed', () => {
    const a = shuffle(createDeck(), seededRng(7));
    const b = shuffle(createDeck(), seededRng(7));
    expect(a.map(c => c.id)).toEqual(b.map(c => c.id));
    expect(new Set(a.map(c => c.id)).size).toBe(52);
    expect(a.map(c => c.id)).not.toEqual(createDeck().map(c => c.id));
  });
  it('assigns cribbage values', () => {
    expect(cardValue(parseCard('AS'))).toBe(1);
    expect(cardValue(parseCard('9H'))).toBe(9);
    expect(cardValue(parseCard('10D'))).toBe(10);
    expect(cardValue(parseCard('JC'))).toBe(10);
    expect(cardValue(parseCard('QC'))).toBe(10);
    expect(cardValue(parseCard('KC'))).toBe(10);
  });
});

describe('hand scoring', () => {
  it('scores the perfect 29 hand', () => {
    expect(hand('5H 5D 5C JS', '5S').total).toBe(29); // jack of spades matches starter 5S
  });
  it('scores 28 when the nobs jack does not match', () => {
    expect(hand('5H 5D 5C JC', '5S').total).toBe(28);
  });
  it('scores a hand with nothing as zero', () => {
    expect(hand('2H 4D 8C KS', '6D').total).toBe(0);
  });
  it('counts multiple combinations of 15', () => {
    const r = hand('5H 10D JC KS', '5S'); // 5+10,5+J,5+K for each five = 6 fifteens
    expect(r.items.filter(i => i.kind === 'fifteen')).toHaveLength(6);
    expect(r.items.find(i => i.kind === 'pair')?.points).toBe(2);
    expect(r.total).toBe(6 * 2 + 2 + 0); // pair of fives, JC suit differs from starter 5S
  });
  it('counts three cards totalling 15', () => {
    const r = hand('2H 3D 10C KS', '4D');
    // 2+3+10, 2+3+K = 15 x2 ; 2,3,4 run of 3
    expect(r.items.filter(i => i.kind === 'fifteen')).toHaveLength(2);
    expect(r.items.filter(i => i.kind === 'run')).toHaveLength(1);
    expect(r.total).toBe(4 + 3);
  });
  it('scores pair, three of a kind and four of a kind', () => {
    expect(hand('7H 7D 2C KS', '9D').items.find(i => i.kind === 'pair')?.points).toBe(2);
    expect(hand('7H 7D 7C KS', '9D').items.find(i => i.kind === 'pair')?.points).toBe(6);
    expect(hand('7H 7D 7C 7S', '9D').items.find(i => i.kind === 'pair')?.points).toBe(12);
  });
  it('scores a simple run', () => {
    const r = hand('3H 4D 5C KS', '9D');
    expect(r.items.filter(i => i.kind === 'run')[0].points).toBe(3);
  });
  it('scores a double run (3,4,5,5)', () => {
    const r = hand('3H 4D 5C 5S', 'KD');
    const runs = r.items.filter(i => i.kind === 'run');
    expect(runs).toHaveLength(2);
    expect(runs.every(x => x.points === 3)).toBe(true);
    // two runs of 3 (6) + pair (2) + fifteens: 5+K, 5+K (4) = 12
    expect(r.total).toBe(6 + 2 + 4 + 2 * 0 + 0 + 0);
  });
  it('scores a double-double run (3,3,4,4,5) as 24 total with pairs', () => {
    const r = hand('3H 3D 4C 4S', '5D');
    const runs = r.items.filter(i => i.kind === 'run');
    expect(runs).toHaveLength(4);
    const pairs = r.items.filter(i => i.kind === 'pair');
    expect(pairs.reduce((s, p) => s + p.points, 0)).toBe(4);
    // 4 runs of 3 (12) + two pairs (4) + two fifteens 3+3+4+5 (4)
    expect(r.items.filter(i => i.kind === 'fifteen')).toHaveLength(2);
    expect(r.total).toBe(20);
  });
  it('scores a triple run (5,5,5,6,7)', () => {
    const r = hand('5H 5D 5C 6S', '7D');
    expect(r.items.filter(i => i.kind === 'run')).toHaveLength(3);
    expect(r.items.find(i => i.kind === 'pair')?.points).toBe(6);
  });
  it('does not score a 4-run as multiple 3-runs', () => {
    const r = hand('3H 4D 5C 6S', 'KD');
    const runs = r.items.filter(i => i.kind === 'run');
    expect(runs).toHaveLength(1);
    expect(runs[0].points).toBe(4);
  });
  it('treats ace as low only (Q K A is not a run)', () => {
    const r = hand('QH KD AC 7S', '2D');
    expect(r.items.filter(i => i.kind === 'run')).toHaveLength(0);
  });
  it('scores a five-card run', () => {
    const r = hand('2H 3D 4C 5S', '6D');
    expect(r.items.filter(i => i.kind === 'run')[0].points).toBe(5);
  });

  describe('flushes', () => {
    it('hand: 4 cards of a suit score 4', () => {
      const r = hand('2H 5H 9H KH', '3S');
      expect(r.items.find(i => i.kind === 'flush')?.points).toBe(4);
    });
    it('hand: starter of the same suit scores 5', () => {
      const r = hand('2H 5H 9H KH', '3H');
      expect(r.items.find(i => i.kind === 'flush')?.points).toBe(5);
    });
    it('hand: a starter of the same suit alone is not a flush', () => {
      const r = hand('2H 5H 9H KS', '3H');
      expect(r.items.find(i => i.kind === 'flush')).toBeUndefined();
    });
    it('crib: four same-suit cards without the starter score nothing', () => {
      const r = hand('2H 5H 9H KH', '3S', true);
      expect(r.items.find(i => i.kind === 'flush')).toBeUndefined();
    });
    it('crib: all five cards of a suit score 5', () => {
      const r = hand('2H 5H 9H KH', '3H', true);
      expect(r.items.find(i => i.kind === 'flush')?.points).toBe(5);
    });
  });

  describe('nobs', () => {
    it('scores 1 for a jack matching the starter suit', () => {
      const r = hand('JH 2D 8C KS', '4H');
      expect(r.items.find(i => i.kind === 'nobs')?.points).toBe(1);
    });
    it('does not score for a jack of another suit', () => {
      const r = hand('JD 2D 8C KS', '4H');
      expect(r.items.find(i => i.kind === 'nobs')).toBeUndefined();
    });
    it('does not score when the starter itself is the jack', () => {
      const r = hand('2D 8C KS 9S', 'JH');
      expect(r.items.find(i => i.kind === 'nobs')).toBeUndefined();
    });
    it('applies to the crib too', () => {
      const r = hand('JH 2D 8C KS', '4H', true);
      expect(r.items.find(i => i.kind === 'nobs')?.points).toBe(1);
    });
  });
});

describe('pegging play scoring', () => {
  const play = (s: string) => scorePlay(parseCards(s));
  const pts = (s: string) => play(s).reduce((a, i) => a + i.points, 0);

  it('counts values', () => {
    expect(countOf(parseCards('KH 5D AS'))).toBe(16);
  });
  it('scores 15 for 2', () => {
    expect(pts('7H 8D')).toBe(2);
    expect(play('7H 8D')[0].kind).toBe('fifteen');
  });
  it('scores 31 for 2', () => {
    expect(pts('KH QD 5C 6S')).toBe(2);
    expect(play('KH QD 5C 6S')[0].kind).toBe('thirtyone');
  });
  it('scores pair, pair royal, double pair royal', () => {
    expect(pts('4H 4D')).toBe(2);
    expect(pts('4H 4D 4C')).toBe(6);
    expect(pts('4H 4D 4C 4S')).toBe(12);
  });
  it('only pairs consecutive cards', () => {
    expect(pts('4H 9D 4C')).toBe(0);
  });
  it('scores runs in any order, using the longest trailing run', () => {
    expect(pts('4H 2D 3C')).toBe(3);
    expect(pts('5H 3D 4C')).toBe(3 + 0);
    expect(pts('KH 3H 5D 4C 2S')).toBe(4 + 0); // 3,5,4,2 -> run of 4 (count 29 not 15/31)
  });
  it('does not score a run broken by a duplicate', () => {
    expect(pts('3H 4D 4C 5S')).toBe(0 + 0);
  });
  it('can combine 15 and a run', () => {
    // 4,5,6 = 15 and a run of 3
    expect(pts('4H 5D 6C')).toBe(2 + 3);
  });
  it('can combine 15 with a pair', () => {
    // 5,5,5 = 15 and three of a kind
    expect(pts('5H 5D 5C')).toBe(2 + 6);
  });
  it('can combine 31 with a run', () => {
    expect(pts('KH 6D 7C 8S')).toBe(2 + 3);
  });
});
