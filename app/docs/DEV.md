# Dev guide

## Commands (run in `D:\cribbage\app`)
- `npm start` – Metro; `npm run android` / `npm run ios`
- `npm test` – Jest (`__tests__/game/*`: engine ~22 cases, scoring ~35, tutorial 2); `npm run lint`
- `node scripts/gen-sounds.js` – regenerates `assets/sounds/*.wav` (synthesised, royalty-free). Sound files must also be in the Android `res/raw` / iOS bundle for `Sound.MAIN_BUNDLE` to find them – verify if sounds are silent.
- Android build: `cd android && gradlew assembleDebug|assembleRelease` (Gradle 9.4.1). APKs land in `android/app/build/outputs/apk/`. Logs from earlier builds: `D:\cribbage\gradle-build.log/.err` (only deprecation notes; builds succeeded).

## Config facts
- `applicationId com.cribbageapp`; release uses the **debug keystore** (change before publishing).
- `newArchEnabled=true`, `hermesEnabled=true`.
- Reanimated 4 needs `react-native-worklets` (babel plugin configured in `babel.config.js`).

## AsyncStorage keys
`cribbage.game.v1` (saved GameState, bump version if `GameState` shape changes), `cribbage.settings.v1`, `cribbage.tutorial.v1` (tutorial progress).

## Testing tips
- `newGame({dealer, deck, rng})` and `dealRound({deck})` accept a rigged deck; `engine.test.ts` has a `rig()` helper (pone hand, dealer hand, starter first in remaining deck). `seededRng` in `deck.ts` for determinism.
- `reduce(state, action, rng)` takes an injectable rng for the cut and next deal.

## Gotchas
- Don't mutate state in `reduce`; it relies on returning the same reference for rejected actions.
- `lastEvents` is reset at the start of every `reduce`; UI de-dupes events by `id > lastEventId`.
- When adding a new `ScoreKind`, update `types.ts`, the scoring builder, and any UI that switches on kind.
- Layout is computed from window size in `utils/layout.ts`; card positions for all animated cards derive from it – change geometry there, not in components.
- Build output folders (`android/app/build`, `.cxx`, `node_modules`) are huge; exclude them from searches.
