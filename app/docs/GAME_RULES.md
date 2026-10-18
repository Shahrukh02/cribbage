# Rules as implemented

- Standard 52-card deck, 2 players, first to **121** wins (mid-round, immediately).
- Deal 6 each (non-dealer / "pone" dealt first, alternating). Each discards 2 to the crib (`DEAL_SIZE=6, KEEP_SIZE=4, CRIB_SIZE=4`). Crib belongs to the dealer. Dealer alternates each round; first dealer random.
- Cut: starter taken from remaining 40-card deck (pone cuts; human taps deck, AI auto-cuts after 1100ms). Jack starter → **his heels**, dealer +2.
- Card values: A=1, 2–10 face value, J/Q/K=10. Ace is low only for runs.

## Pegging (`pegging.ts` + `applyPlay` in gameEngine)
Pone leads. Running count must stay ≤ 31 (`PEG_LIMIT`). `scorePlay(pile)` after each card:
- count == 15 → 2; count == 31 → 2
- trailing same-rank cards: pair 2 / three 6 / four 12
- longest trailing run of ≥3 cards (any order) → length points
Go: if opponent can't play, they get an info "Go" event and the same player continues. When neither can play, last player gets 1 ("Go"), or "Last card" 1 if all cards are gone. 31 resets the count without a separate go point. After reset, leader = opponent of last player if they have cards, else last player; if no cards remain → counting.

## Counting / show (`scoring.ts`)
Order: pone's hand, dealer's hand, dealer's crib (starter included in all). Scores: every 15 (subset sum) =2; pairs 2/6/12; runs ≥3 (counts duplicate-run multiples); flush 4 cards = 4 (+1 if starter matches); crib flush only counts if all 5 match; nobs (jack of starter's suit in hand) = 1. `scoreHand(cards, starter, isCrib)` returns `{total, items}`; each item has a beginner `explanation`. Each count step must be confirmed by the user (`confirmCount`).

## Score display
`scores[p] = {front, back}` – front/back peg positions. Only the leading peg moves on scoring (`back` = previous front).

## Save/restore
`isStateRestorable` rejects corrupt/finished saves: validates phase, dealer, scores < 121, 52 unique known cards across hands/crib/deck/starter, hand sizes by phase, pegging count consistency, counting state present.
