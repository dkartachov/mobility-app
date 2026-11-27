This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Exercise animations

Exercises are animated by the 3D engine: `src/lib/rig3d.ts`, clips in `src/data/exercise-animations-3d.ts`, drawn by `src/components/exercise-figure-3d.tsx`. Read the "Exercise animations" section of `README.md` before touching it; it has how the engine works and how to add a clip.

- After changing a clip, or `rig3d.ts` code the clips are worked out with, run `node scripts/build-clips.mjs` and commit `src/data/exercise-animations-3d.json` with it. The app ships that JSON, never the clips file itself (see README).
- Joint angles stay true to the exercise instructions (90° means 90°). If it doesn't read on screen, change the camera, not the angle.
- Pick the camera that makes the movement readable, highlight the working body part, and add a `trail` for sweeps and rotations.
- No eyes on the figure. The nose is drawn only on a face turned toward the camera, as a line on the face; in profile and from behind the head is a plain circle.
- Review every new or changed animation for clipping and fix all of it before handing it over: no body part drawn over one that is really in front of it (an elbow over the knee it's behind, a far shoulder over the chest, a hand under the foot it holds), no two parts swapping places partway through, even for a frame, and no nose that comes and goes. Check the whole clip, not only stills: print the draw order every 10ms and look at frames around each change. The "No clipping" rule in `README.md` has how to fix it.
- When you add a clip for an exercise, add a test for what matters in that exercise to `src/lib/rig3d.test.ts`.
- A library exercise's photo (its tile in the library, `assets/images/exercises/`) is its clip's still frame, drawn without the highlight. Redraw it whenever the exercise gets a new clip or its clip's still frame or camera changes: `node scripts/render-exercise-photo.mjs <CLIP_NAME_3D> assets/images/exercises/<file>.png`. Keep the file name.

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
