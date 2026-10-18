# CribbageApp – context for Claude

Single-player Cribbage (human vs AI) for Android/iOS built with React Native. Beginner-friendly: tutorial, rules page, hints, plain-English score explanations. Dark walnut/felt/gold theme. Android package `com.cribbageapp`. The repo root `D:\cribbage` is not a git repo; the app lives in `D:\cribbage\app`.

Further docs (read as needed):
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) – file map, data flow, state machine, UI components
- [docs/GAME_RULES.md](docs/GAME_RULES.md) – how rules are implemented (scoring, pegging, win)
- [docs/AI.md](docs/AI.md) – AI discard/play heuristics and difficulty levels
- [docs/DEV.md](docs/DEV.md) – commands, build, tests, persistence keys, gotchas

## Stack
React Native 0.88 (new arch on, Hermes on), React 19.3, TypeScript 6, React Navigation native-stack, Reanimated 4 + worklets, gesture-handler, react-native-svg (all card/board art is SVG, no image assets), AsyncStorage, react-native-sound (synthesised wavs), react-native-haptic-feedback, linear-gradient. Jest 29 for tests. Node >= 22.11.

## Key conventions
- **Game logic is pure and UI-free** in `src/game/` – `reduce(state, action)` in `gameEngine.ts` is the only mutator. Keep it that way; test it in `__tests__/game/`.
- Invalid actions are rejected by `validateAction` (returns reason string or `null`); `reduce` returns the same state object when rejected (`useGame.apply` relies on identity check).
- Players are `'player'` (human) and `'ai'`. Card ids are strings like `AS`, `10H`, `QD` (`parseCard`/`parseCards` in `deck.ts`).
- Scoring produces `ScoreItem`s (`kind, points, cardIds, label, explanation`); the engine wraps them as `GameEvent`s with incrementing `id` (`eventSeq`) that the UI turns into toasts.
- All timing/animation/sound/AI-driving lives in `src/hooks/useGame.ts`, not in the engine.
- Code style: 2-space, single quotes, trailing commas, braces on every `if`, explanatory `/** */` comments (see `.prettierrc.js`, `.eslintrc.js`).
- The `GameScreen` has an Android back-button handler that opens the pause menu instead of leaving.

## Status
Game is fully playable end to end; a debug and release APK have been built (`android/app/build/outputs/apk/{debug,release}`). Release is signed with the debug keystore (not production-ready). iOS project exists but `ios/Pods` was not seen/built here.
