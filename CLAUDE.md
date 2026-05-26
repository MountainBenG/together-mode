@../gesture_recognition/CLAUDE.md

---

## Together Mode Workspace

This Claude Code session is operating on the **Together Mode** React Native (Expo) codebase. All agent infrastructure — logs, specs, comms, reviews, questions-for-dad — resolves via symlinks in this directory to `../gesture_recognition/`.

**Git context:** Boot sequence Steps 1 and 2 (sync, uncommitted changes) operate on the **together-mode** git repo. Log writes resolve via symlinks to gesture_recognition.

**CRITICAL — Expo versioning:** Expo APIs change frequently between major versions. Before writing any Expo or React Native code, check the versioned docs at the URL in `AGENTS.md` to confirm the API is current for SDK 54.

### Codebase map

```
together-mode/
├── App.tsx                — root navigator + session state machine (Screen type, subscriptions)
├── screens/
│   ├── HomeScreen.tsx     — entry: start session or join one
│   ├── CodeScreen.tsx     — player 1 shows session code
│   ├── JoinScreen.tsx     — player 2 enters code
│   ├── VotingScreen.tsx   — both players vote on trailers
│   └── MatchScreen.tsx    — shown when both vote yes
├── services/
│   └── sessions.ts        — Supabase session logic: createSession, joinSession, subscribeToSession
├── lib/
│   ├── supabase.ts        — Supabase client
│   └── playerId.ts        — persistent anonymous player ID (AsyncStorage)
├── .env                   — Supabase URL + key (not committed)
└── AGENTS.md              — Expo version warning (read before writing Expo code)
```

**Stack:** React Native + Expo SDK 54, TypeScript, Supabase (Postgres + realtime subscriptions).

**Open blocker (as of 2026-05-19):** Supabase JWT anon key — the `sb_publishable_` format key was rejected by the REST API. Needs the `eyJ...` JWT key from the Supabase project dashboard → Settings → Connect.
