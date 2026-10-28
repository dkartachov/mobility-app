# Mobility

A stretching and mobility app built with Expo (SDK 58) and Expo Router. iOS and Android only. All data is stored on the device in SQLite; there is no backend.

## Structure

```
src/
  app/                 Routes (Expo Router)
    _layout.tsx        Root Stack + SQLite provider
    (tabs)/            Dashboard | Start (default tab) | Profile
    edit-profile.tsx   Modal
    new-goal.tsx       Modal
  components/          Shared UI
  constants/theme.ts   Colors (teal accent), spacing, radii
  db/                  Schema/migrations and typed queries per table
  lib/                 Date helpers, profile photo storage
```

Schema changes go in `src/db/schema.ts` as a new entry appended to `MIGRATIONS`.

Tests sit next to the code they cover (`*.test.ts(x)`). Database tests run real SQL against an in-memory database from `src/test-utils/sqlite.ts`, which uses Node's built-in `node:sqlite` (Node 22.13 or newer).

## Commands

```bash
npx expo start                          # dev server (needs the development build installed)
npx expo lint                           # lint
npx tsc --noEmit                        # typecheck
npm test                                # unit and component tests (Jest)
npx expo-doctor                         # check dependencies and config
npx eas-cli@latest build --profile development   # new dev build after adding native packages
npx eas-cli@latest update               # ship an over-the-air update
```
