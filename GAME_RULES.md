# Cribbage: Game Rules

The rules of two-player Cribbage as played in this app. The first player to peg **121 points** wins.

For how these rules are implemented in code, see `app/docs/GAME_RULES.md`.

---

## 1. Quick summary

1. Each round, both players are dealt 6 cards and each puts 2 into the **crib**.
2. A **starter** card is cut from the deck.
3. Players take turns playing cards to a running count of up to **31** (**pegging**), scoring as they go.
4. Both hands and the crib are counted (**the show**).
5. The dealer role swaps and a new round starts. Repeat until someone reaches 121.

Points are marked on the cribbage board with pegs. The game ends the instant a player reaches 121, even in the middle of a round.

---

## 2. Cards and values

A standard 52-card deck is used. Suits do not rank; they only matter for flushes and nobs.

| Card | Counting value | Rank for runs |
|---|---|---|
| Ace | 1 | Low only (A-2-3 is a run; Q-K-A is not) |
| 2 to 10 | Face value | Face value |
| Jack | 10 | 11 |
| Queen | 10 | 12 |
| King | 10 | 13 |

Fifteens and the pegging count use the **counting value**. Runs use the **rank**, so J-Q-K is a run but 10-J-Q-K counts as 10 + 10 + 10 + 10 for fifteens.

---

## 3. Roles

- **Dealer**: owns the crib. The first dealer is random. The role swaps every round.
- **Pone** (non-dealer): leads the pegging, cuts the deck, and counts first.

---

## 4. A round, step by step

### 4.1 Deal
Each player receives 6 cards.

### 4.2 Discard to the crib
Each player chooses 2 cards and puts them face down in the crib. The crib's 4 cards belong to the dealer and are counted for the dealer at the end of the round.

Strategy tip:
- **Your crib**: throw cards that work well together (pairs, cards that sum to 15, adjacent ranks, a 5).
- **Opponent's crib**: throw cards that do not combine, and avoid giving 5s.

### 4.3 The cut
The pone cuts the deck. The top card turned face up is the **starter**. It is shared by both hands and the crib when counting.

> **His heels**: if the starter is a **Jack**, the dealer scores **2 points** immediately.

### 4.4 Pegging (the play)
The pone plays first. Players alternate playing one card face up, announcing the running **count** (the sum of the counting values of all cards played in this sequence).

Rules:
- The count may never go **over 31**.
- If you cannot play a card without going over 31, you say **"Go"**. Your opponent keeps playing as long as they can stay at or under 31.
- When neither player can play, the sequence ends, the count resets to 0, and play continues with the remaining cards. The player who did not play last leads the new sequence (if they have cards left).

Points scored by the card you just played:

| Event | Points | Example |
|---|---|---|
| Count reaches exactly **15** | 2 | Count 8, you play a 7 |
| Count reaches exactly **31** | 2 | Count 21, you play a 10 |
| **Pair**: same rank as the card just before | 2 | 6 then 6 |
| **Three of a kind** | 6 | 6, 6, 6 |
| **Four of a kind** | 12 | 6, 6, 6, 6 |
| **Run** of 3 or more of the most recent cards, in any order | 1 per card in the run | 4, 6, 5 scores 3 |
| **Go**: you played the last card of a sequence (count under 31) | 1 | Opponent could not play |
| **Last card**: you played the very last card of the round | 1 | Same as Go |

Notes:
- Pairs and runs only use the **unbroken trailing cards** of the current sequence. If a different card interrupts, the earlier cards no longer count.
- Runs can be in any order: a 5, 3, 4 sequence is a run of 3 when the 4 is played.
- Reaching 31 scores the 2 points for 31 and does **not** also score a Go.

### 4.5 The show (counting)
After all cards are played, each hand is counted together with the starter, in this order:

1. **Pone's hand** (4 cards + starter)
2. **Dealer's hand** (4 cards + starter)
3. **Dealer's crib** (4 cards + starter)

The pone counts first on purpose: if a player reaches 121 first, the game is over, so the order can decide a close game.

Scoring in the show:

| Combination | Points | Notes |
|---|---|---|
| **Fifteen**: any set of cards totalling 15 | 2 each | Every different set counts separately |
| **Pair** | 2 | |
| **Three of a kind** | 6 | Three pairs |
| **Four of a kind** | 12 | Six pairs |
| **Run** of 3, 4 or 5 | 1 per card | Duplicate cards multiply runs (see below) |
| **Flush**, 4 cards of one suit in the hand | 4 | Starter is not required |
| **Flush**, all 5 cards of one suit (hand + starter) | 5 | |
| **His nobs**: Jack in your hand of the same suit as the starter | 1 | |

Special cases:
- **Flush in the crib** only counts if **all 5 cards** (crib + starter) match. A 4-card crib flush scores nothing.
- **Nobs** applies to hands and the crib (a Jack in the crib that matches the starter suit).
- **Double and triple runs**: a run with a duplicated rank counts once per way to form it. Example, 4-4-5-6 is two runs of 3 = 6 points, plus the pair of 4s = 2.
- A hand with no points is called a "nineteen" hand in tradition. The app simply shows 0.

### 4.6 Next round
The dealer role passes to the other player, new cards are dealt, and the round repeats.

---

## 5. Winning

- First to **121** wins immediately, whether it happens during the cut, the pegging, or the show.
- Points are scored in the order the rules above give. The game stops at the exact moment 121 is reached.

---

## 6. Worked example (one hand)

You are the dealer and hold **5♥ 5♠ J♦ 10♣**, and the starter is **5♦**.

- Fifteens: each of the three 5s makes 15 with the J and with the 10, which is 6 sets (12 points). 5+5+5 is a seventh set (2 points). Total **14**
- Three of a kind (5-5-5): **6**
- His nobs (J♦ matches starter 5♦): **1**
- **Total: 21** (a very strong hand).

---

## 7. Scoring cheat sheet

| What | Points |
|---|---|
| Fifteen (pegging or show) | 2 |
| Thirty-one (pegging) | 2 |
| Pair | 2 |
| Three of a kind | 6 |
| Four of a kind | 12 |
| Run | 1 per card |
| Flush (4 / 5 cards) | 4 / 5 |
| His nobs | 1 |
| His heels (Jack starter, dealer) | 2 |
| Go / Last card | 1 |

---

## 8. App behaviour (differences from a table game)

- **Automatic scoring**: the app finds every combination for you. Each score pops up with a short plain-English reason (turn this off in Settings, *Score explanations*).
- **Illegal plays**: a card that would take the count over 31 is dimmed and shakes if tapped. You cannot play it.
- **Go**: the app declares Go automatically when a player has no legal card.
- **Counting is confirmed by you**: tap to move through the pone's hand, the dealer's hand and the crib. Tap any scoring line to highlight the cards behind it.
- **Hints**: the Hint button suggests the best two cards to discard and a good card to play. Turn coaching text off in Settings.
- **Difficulty and speed**: Easy, Medium and Hard control how the opponent plays and discards. Speed controls how long it "thinks".
- **Saving**: a game in progress is saved automatically; use **Continue** on the home screen.
- **Two-player only**: this app plays human versus AI, with the standard 6-card deal.
