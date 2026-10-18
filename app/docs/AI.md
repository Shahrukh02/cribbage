# AI (src/game/ai.ts)

## Discard
`rankDiscards(hand, isDealer, samples, cribWeight)`: for each of the 15 ways to discard 2 of 6, average `scoreHand` of the kept 4 over possible starters (all unseen cards, or a random sample) plus a signed crib estimate `±cribPotential(a,b) * cribWeight` (+ if AI is dealer, − otherwise). `cribPotential` rewards pairs (2.5), summing to 15 (2), a five (1.1), adjacency (gap1 0.9, gap2 0.6, gap3 0.2), same suit 0.3, jack 0.15.

| Difficulty | Discard behaviour |
|---|---|
| easy | 55% random pair; else 8 starter samples, cribWeight 0.3 |
| medium | 8 samples, cribWeight 0.6 |
| hard | all starters, cribWeight 1 |

`suggestDiscard` (human hint) = hard-level best option + a one-sentence reason.

## Pegging – `choosePlay(view, difficulty)`
Score = immediate points from `scorePlay` − `defensePenalty(newCount)` (count 5 → 1.2, 21 → 1.0; hard also 10 → 0.5, 25/26 → 0.3) + tiny random noise. Hard additionally: leading penalty (5 → 1.2, 10 → 0.5, ≥6 → 0.2), prefers high card when nothing scores (+0.02/value), +0.1 for matching last card, +0.4 if a held card can make 31 next. Easy: ignores defence and picks a random legal card 60% of the time. Returns `null` if no legal card (Go). The hint button uses `'hard'`.

AI "thinking" delay = `AI_DELAY[aiSpeed] * (0.85–1.15)`.
