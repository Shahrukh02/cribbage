export const TUTORIAL_KEY = 'cribbage.tutorial.v1';

export type Check =
  | { kind: 'values10' }
  | { kind: 'fifteen'; min?: number }
  | { kind: 'pair'; size?: number }
  | { kind: 'run'; size?: number }
  | { kind: 'flush' }
  | { kind: 'nobs' }
  | { kind: 'discard'; isDealer: boolean }
  | { kind: 'peg'; goal: 'fifteen' | 'thirtyone' | 'pair' | 'run' };

export interface Step {
  title: string;
  body: string;
  /** Space-separated card ids to display. */
  cards?: string;
  starter?: string;
  /** Cards already played in a pegging demo (shown as a pile with the running count). */
  pile?: string;
  /** If set the learner must interact with `cards` to continue. */
  check?: Check;
  ask?: string;
  /** Show the real scoring of a hand: the learner taps "Count it". */
  reveal?: { hand: string; starter: string; crib?: boolean };
  /** Final step action. */
  playNow?: boolean;
}

export interface Lesson {
  id: string;
  title: string;
  summary: string;
  steps: Step[];
}

export const LESSONS: Lesson[] = [
  {
    id: 'goal',
    title: 'The goal and card values',
    summary: 'Race to 121 points and learn what each card is worth.',
    steps: [
      {
        title: 'Race to 121',
        body:
          'Cribbage is a race. You and your opponent score points in every round and move pegs along a board. The first player to reach 121 points wins, even in the middle of a round.',
      },
      {
        title: 'What cards are worth',
        body:
          'For adding up, an Ace counts 1, the cards 2 to 10 count their number, and the Jack, Queen and King each count 10.',
        cards: 'AS 5H 10D JC QH KS',
      },
      {
        title: 'Try it: tens',
        body: 'Face cards count as 10, just like the ten itself.',
        ask: 'Tap every card that is worth 10.',
        cards: 'AH 4S 10C JD 7H KC 2S QD',
        check: { kind: 'values10' },
      },
    ],
  },
  {
    id: 'crib',
    title: 'The deal and the crib',
    summary: 'Choose which two cards to send to the crib.',
    steps: [
      {
        title: 'Six cards, keep four',
        body:
          'Each player is dealt six cards. You each choose two to put face down in a separate hand called the crib, and keep four. The crib belongs to the dealer and is counted at the end of the round.',
      },
      {
        title: 'You are the dealer',
        body:
          'Because the crib is yours, it helps you. Cards that work together, like a pair or two that add to 15, are fine to send there.',
        ask: 'Choose two cards for your own crib. Keep the best four for your hand.',
        cards: '2C 4D 5H 5S 9D KS',
        check: { kind: 'discard', isDealer: true },
      },
      {
        title: 'Your opponent is the dealer',
        body:
          'Now the crib helps your opponent, so be careful. Avoid sending 5s or cards that pair up or total 15 together.',
        ask: 'Choose two cards to give to your opponent’s crib.',
        cards: '3H 7C 8D 8S JS KC',
        check: { kind: 'discard', isDealer: false },
      },
      {
        title: 'The dealer alternates',
        body:
          'The deal passes to the other player every round, so the crib advantage goes back and forth. The dealer’s crib is a free extra hand each round.',
      },
    ],
  },
  {
    id: 'starter',
    title: 'The starter card and nobs',
    summary: 'The shared card and the jack bonus.',
    steps: [
      {
        title: 'Cutting the starter',
        body:
          'After the discards, the non-dealer cuts the deck and the top card is turned face up. This starter card counts as part of every hand and the crib when they are scored.',
      },
      {
        title: 'His heels',
        body:
          'If the starter is a Jack, the dealer scores 2 points right away. This is called “his heels”.',
        cards: 'JD',
      },
      {
        title: 'Nobs',
        body:
          'If you hold a Jack of the same suit as the starter, you score 1 point for “nobs”. Only the jack in your own hand counts for this.',
        cards: '3C 6D JH 9S',
        starter: 'KH',
      },
      {
        title: 'Try it: nobs',
        body: 'The starter is the King of Hearts.',
        ask: 'Tap the card in your hand that scores nobs.',
        cards: 'JS 3C JH 9S',
        starter: 'KH',
        check: { kind: 'nobs' },
      },
    ],
  },
  {
    id: 'fifteens',
    title: 'Counting fifteens',
    summary: 'Any cards adding to 15 score 2 points.',
    steps: [
      {
        title: 'Fifteen for 2',
        body:
          'Every different set of cards that adds up to exactly 15 scores 2 points. A single card can be part of several fifteens.',
        cards: '5H KS',
      },
      {
        title: 'Try it: find a fifteen',
        body: 'Two or more cards. Remember a Jack, Queen or King is 10.',
        ask: 'Tap cards that add up to 15.',
        cards: '7C 8D 3S 4H 9D',
        check: { kind: 'fifteen' },
      },
      {
        title: 'Try it: three cards',
        body: 'Fifteens can use three or more cards.',
        ask: 'Tap three or more cards that add up to 15.',
        cards: '2H 3D 10C 4S',
        check: { kind: 'fifteen', min: 3 },
      },
    ],
  },
  {
    id: 'pairs',
    title: 'Pairs',
    summary: 'Matching ranks score 2, 6 or 12.',
    steps: [
      {
        title: 'Pairs, threes and fours',
        body:
          'Two cards of the same rank score 2 points. Three of a kind scores 6 (it is three different pairs), and four of a kind scores 12.',
        cards: '9S 9D',
      },
      {
        title: 'Try it: find the pair',
        body: 'Suits do not matter for pairs, only the rank.',
        ask: 'Tap two cards of the same rank.',
        cards: '4H 9S 9D KC 2C',
        check: { kind: 'pair' },
      },
      {
        title: 'Try it: three of a kind',
        body: 'Three cards of one rank are worth 6.',
        ask: 'Tap all three cards of the same rank.',
        cards: '6H 2C 6D 9H 6S',
        check: { kind: 'pair', size: 3 },
      },
      {
        title: 'Putting it together',
        body:
          'Fifteens and pairs add up. Tap “Count it” to see how this hand scores, using the real scoring rules.',
        reveal: { hand: '5H 5S 10D JC', starter: '5C' },
      },
    ],
  },
  {
    id: 'runs',
    title: 'Runs',
    summary: 'Three or more cards in a row.',
    steps: [
      {
        title: 'Run for 3 or more',
        body:
          'Three or more cards in consecutive rank, in any suit, score one point per card. The Ace is low, so A-2-3 is a run but Q-K-A is not.',
        cards: '3H 4D 5S',
      },
      {
        title: 'Try it: find the run',
        body: 'The cards do not need to be next to each other in your hand.',
        ask: 'Tap the cards that form a run.',
        cards: '3H 9C 4D KD 5S',
        check: { kind: 'run' },
      },
      {
        title: 'Try it: a longer run',
        body: 'A run of four scores 4 points.',
        ask: 'Tap the longest run you can find.',
        cards: '6C 7D 8H 9S JD',
        check: { kind: 'run', size: 4 },
      },
      {
        title: 'Double runs',
        body:
          'A repeated rank inside a run makes a double run: each different path through the cards scores. See what the engine counts here.',
        reveal: { hand: '3H 4D 5C 5S', starter: 'KD' },
      },
    ],
  },
  {
    id: 'flushes',
    title: 'Flushes',
    summary: 'Cards of one suit, with the crib exception.',
    steps: [
      {
        title: 'Flush in your hand',
        body:
          'If all four cards in your hand are the same suit you score 4. If the starter card matches too, you score 5.',
      },
      {
        title: 'Try it: find the flush',
        body: 'Four cards of one suit.',
        ask: 'Tap the four cards that make a flush.',
        cards: '2H 7H 4S 9H KH',
        check: { kind: 'flush' },
      },
      {
        title: 'Count the hand',
        body: 'This hand has four hearts and a spade starter. A flush of four is scored.',
        reveal: { hand: '2H 7H 9H KH', starter: '4S' },
      },
      {
        title: 'The crib is stricter',
        body:
          'In the crib a flush only counts if all five cards (the four crib cards and the starter) are the same suit. Four hearts with a spade starter score nothing in the crib.',
        reveal: { hand: '2H 7H 9H KH', starter: '4S', crib: true },
      },
    ],
  },
  {
    id: 'pegging',
    title: 'Pegging and the 31 count',
    summary: 'Scoring while you play your cards.',
    steps: [
      {
        title: 'Playing cards to 31',
        body:
          'After the starter is turned, the non-dealer plays one card face up and says the running count. Players alternate adding a card, and the count may never go over 31.',
      },
      {
        title: 'Score a fifteen',
        body: 'Making the count exactly 15 scores 2 points. The count is 9 now.',
        ask: 'Play the card that makes the count 15.',
        pile: '9H',
        cards: '6C KD 2S 4H',
        check: { kind: 'peg', goal: 'fifteen' },
      },
      {
        title: 'Score a pair',
        body: 'Playing the same rank as the previous card scores a pair for 2.',
        ask: 'Play the card that pairs the last card played.',
        pile: '7H 3D',
        cards: '3S 8C KH',
        check: { kind: 'peg', goal: 'pair' },
      },
      {
        title: 'Score a run',
        body:
          'Playing a card that makes the last three or more cards a run scores one point per card, in any order.',
        ask: 'Play the card that completes a run.',
        pile: '5H 7C',
        cards: '6D KS 2H',
        check: { kind: 'peg', goal: 'run' },
      },
      {
        title: 'Reach 31',
        body: 'Making exactly 31 scores 2 points. The count is 27 now.',
        ask: 'Play the card that makes 31.',
        pile: 'KS 9H 8D',
        cards: '4C 5H 3S',
        check: { kind: 'peg', goal: 'thirtyone' },
      },
      {
        title: 'Go and last card',
        body:
          'If you cannot play without going over 31 you say “Go” and your opponent keeps playing. Whoever plays the last card scores 1 point (“go” or “last card”). After a 31 or a go, the count starts again from zero.',
      },
    ],
  },
  {
    id: 'show',
    title: 'Counting hands and the crib',
    summary: 'The “show” at the end of each round.',
    steps: [
      {
        title: 'The order matters',
        body:
          'When all cards are played, hands are counted using the starter. The non-dealer counts first, then the dealer counts their hand, and finally the dealer counts the crib. Points are pegged immediately, so if the non-dealer reaches 121 first, the game is over.',
      },
      {
        title: 'Count a hand',
        body: 'Look for fifteens, pairs and runs, then tap “Count it”.',
        reveal: { hand: '4H 4S 5D 6C', starter: '9H' },
      },
      {
        title: 'Count a crib',
        body: 'The crib is counted the same way, but a flush needs all five cards.',
        reveal: { hand: '2D 2S 8C 7H', starter: '9H', crib: true },
      },
    ],
  },
  {
    id: 'advantage',
    title: 'The dealer’s advantage',
    summary: 'Why the deal matters, and what to do next.',
    steps: [
      {
        title: 'Why the dealer has an edge',
        body:
          'The dealer owns the crib, an extra scoring hand each round, and also scores two for the last card more often. The non-dealer gets to count first and to lead in pegging. Because the deal alternates every round, things even out over a game.',
      },
      {
        title: 'Strategy in a sentence',
        body:
          'Keep four cards that score well together (fifteens, pairs, runs). If the crib is yours, give it cards that pair up or add to 15. If it is your opponent’s, split your discards.',
      },
      {
        title: 'You are ready',
        body:
          'Play a game now. Leave “Explain every score” on, and use the hint button whenever you are unsure.',
        playNow: true,
      },
    ],
  },
];
