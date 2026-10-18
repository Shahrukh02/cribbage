import { Card, Rank, Suit } from './types';

export const SUITS: Suit[] = ['S', 'H', 'D', 'C'];
export const RANKS: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

export const RANK_LABEL: Record<Rank, string> = {
  1: 'A',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
};

export const RANK_NAME: Record<Rank, string> = {
  1: 'Ace',
  2: 'Two',
  3: 'Three',
  4: 'Four',
  5: 'Five',
  6: 'Six',
  7: 'Seven',
  8: 'Eight',
  9: 'Nine',
  10: 'Ten',
  11: 'Jack',
  12: 'Queen',
  13: 'King',
};

export const SUIT_NAME: Record<Suit, string> = {
  S: 'Spades',
  H: 'Hearts',
  D: 'Diamonds',
  C: 'Clubs',
};

export const makeCard = (rank: Rank, suit: Suit): Card => ({
  id: `${RANK_LABEL[rank]}${suit}`,
  rank,
  suit,
});

/** Parse "AS", "10H", "QD" etc. */
export const parseCard = (id: string): Card => {
  const suit = id.slice(-1) as Suit;
  const label = id.slice(0, -1);
  const rank = RANKS.find(r => RANK_LABEL[r] === label);
  if (!rank || !SUITS.includes(suit)) {
    throw new Error(`Invalid card id: ${id}`);
  }
  return makeCard(rank, suit);
};

export const parseCards = (ids: string): Card[] =>
  ids.trim().split(/\s+/).filter(Boolean).map(parseCard);

export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(makeCard(rank, suit));
    }
  }
  return deck;
};

export type Rng = () => number;

/** Fisher–Yates shuffle returning a new array. */
export const shuffle = <T>(items: readonly T[], rng: Rng = Math.random): T[] => {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Small seeded PRNG (mulberry32) for reproducible tests. */
export const seededRng = (seed: number): Rng => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Cribbage value: Ace = 1, 2–10 face value, J/Q/K = 10. */
export const cardValue = (card: Card): number => Math.min(card.rank, 10);

export const cardName = (card: Card): string =>
  `${RANK_NAME[card.rank]} of ${SUIT_NAME[card.suit]}`;

/** Order cards by rank then suit (for display). */
export const sortCards = (cards: readonly Card[]): Card[] =>
  cards
    .slice()
    .sort(
      (a, b) =>
        a.rank - b.rank || SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit),
    );
