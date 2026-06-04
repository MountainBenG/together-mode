# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@../Vision_Click/CLAUDE.md

---

## Together Mode Workspace

This Claude Code session operates on the **Together Mode** React Native (Expo SDK 54) codebase. All agent infrastructure — logs, specs, comms, reviews, questions-for-dad — resolves via symlinks in this directory to `../Vision_Click/`.

**Git context:** Boot sequence Steps 1 and 2 (sync, uncommitted changes) operate on the **together-mode** git repo. Log writes resolve via symlinks to gesture_recognition.

**CRITICAL — Expo versioning:** Expo APIs change frequently between major versions. Before writing any Expo or React Native code, read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ to confirm the API is current for SDK 54. (See `AGENTS.md`.)

## Commands

```bash
npm start          # expo start — Metro bundler + QR for Expo Go
npm run ios        # expo start --ios
npm run android    # expo start --android
npm run web        # expo start --web
npx tsc --noEmit   # typecheck (strict mode is on; there is no lint or test setup)
```

There is no test runner, linter, or build script configured beyond Expo's. TypeScript `strict` is enabled via `expo/tsconfig.base`.

## Environment

Supabase credentials come from a git-ignored `.env`, read at runtime as `EXPO_PUBLIC_*` vars (Expo inlines these into the client bundle):

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

**Open blocker (as of 2026-05-19):** the `sb_publishable_` format anon key was rejected by the REST API. Needs the legacy `eyJ...` JWT key from the Supabase dashboard → Settings → Connect. `services/sessions.ts` (raw HEAD probe in `createSession`) and `lib/supabase.ts` (key-prefix logs) contain temporary debug scaffolding for diagnosing this — remove once the key works.

## Architecture

Two phones drive one shared **session row** in Supabase Postgres. The entire app is a state machine over that row's `status`, synced in real time.

**Single source of truth — the `sessions` row** (inferred schema; columns used by `services/sessions.ts`):
`id`, `code`, `player1_id`, `player2_id`, `status`, `player1_voted`, `player2_voted`, `current_movie_index`, `matched_movie_title`.

**Status lifecycle:** `waiting` → `voting` → `matched`. Player 1 `createSession` inserts a `waiting` row with a random 4-char `code`; Player 2 `joinSession` finds it by code and flips it to `voting`.

**Screen navigation lives in `App.tsx`**, not a navigation library — a `screen` state variable conditionally renders one of five screens (`home`/`code`/`join`/`voting`/`match`). Transitions are driven by callbacks (`handleStart`, `handleJoin`, `handleMatch`, `handleReset`) and by realtime updates.

**Realtime sync** (`subscribeToSession`) opens a Supabase channel filtered to one row (`code=eq.<CODE>`) listening for `UPDATE`. Two subscription points:
- `App.tsx` — Player 1 on the `code` screen waits for `status === 'voting'` (Player 2 joined), then advances.
- `VotingScreen.tsx` — both players subscribe for the whole voting loop.

**Matching is client-computed, and runs on BOTH phones** (`VotingScreen.handleSessionUpdate`). On each row update, each client compares `player1_voted`/`player2_voted`:
- both `yes` → `setMatched` (writes `status='matched'` + title)
- both voted but not both `yes` → `advanceMovie` (bumps `current_movie_index` mod catalog length, clears both votes)

Because both clients react to the same update, these writes are issued redundantly by both phones — this is idempotent enough to work but is a race-prone design; account for it before adding voting logic.

**Movie catalog is hardcoded** as the `MOVIES` array in `VotingScreen.tsx`. The matched movie's title is looked up by `current_movie_index` and persisted into the row, so a movie is identified by its index — keep the array stable.

**Player identity** (`lib/playerId.ts`) is an anonymous random ID persisted in AsyncStorage; there is no auth.

### File map

```
App.tsx                — root: screen state machine + Player-1 join subscription
screens/HomeScreen     — start a session or choose to join
screens/CodeScreen     — Player 1 displays the session code
screens/JoinScreen     — Player 2 enters a code
screens/VotingScreen   — voting loop + matching logic + MOVIES catalog
screens/MatchScreen    — match celebration
services/sessions.ts   — all Supabase reads/writes + realtime subscription
lib/supabase.ts        — Supabase client
lib/playerId.ts        — persistent anonymous player ID
```
