# After Wednesday — backlog

> Frozen on 2026-06-09, the day before the first user test. Everything here is for **after** the Wednesday test. **Do NOT touch the proven build before then.**
>
> Rule going forward: every new feature stays behind its flag (`NEW_FLOW_ENABLED`, `VOICE_ENABLED`, `TRAILERS_ENABLED`) and gets its **own dry run** before the flag flips on.

## Finish the age filter (behind `NEW_FLOW_ENABLED`)
Already built & wired: flag, `max_certification` column, combined genre+age fetch, age picker, full flow (Start → genre → age → filtered movies).
- [ ] **Step 5 — rating badge** in the corner of each movie card (per-movie cert via TMDB `/movie/{id}/release_dates`).
- [ ] **Its own dry run** on two devices: onboarding → genre → age → only movies at/under the rating, badges show, pairing + voting + match all still work.
- [ ] Then flip `NEW_FLOW_ENABLED` → `true`.

## Bugs to fix
- [ ] **Tiebreaker faceoff race** — in the Final Round one phone shows 1 option, the other 2 (should be 2 on both). Add logging to print `myPick` / `theirPickTitle` on each phone, reproduce on two devices, fix the sync. (`screens/TiebreakerScreen.tsx`)
- [ ] **1-option pick** — if a player said yes to only one movie, the "pick your favorite" screen has a single pointless button. Auto-pick it, or show a shared/combined list.

## Cleanup / discipline
- [ ] Haptics + progress pill landed in `VotingScreen` un-flagged (low-risk). Decide: keep, or gate. Reaffirm: new stuff goes behind a flag.
- [ ] Voice voting (`VOICE_ENABLED`, `hooks/useVoiceVoting.ts`) is stubbed — to go live, install `@react-native-voice/voice` + build a dev client (Expo Go won't run native voice).
- [ ] Remove debug `console.log`s in `lib/supabase.ts` (prints URL + key prefix every launch).
- [ ] `fetchMoviesByCertification` in `services/movies.ts` is now redundant (superseded by `fetchPopularMovies(genreId, maxCert)`) — remove it.
- [ ] Rare edge: `generateCode()` can occasionally produce a <4-char code → unjoinable. Harden it.
- [ ] Add a `.env.example` so the Supabase/TMDB config can't get lost again.

## Bigger / optional
- [ ] Trailers (`TRAILERS_ENABLED`, off): YouTube embed is blocked in the iOS WebView (error 152/153). Revisit with `react-native-youtube-iframe` or a proxy if trailers are worth it.

---

## Progress — 2026-06-15
**Shipped & live** (`NEW_FLOW_ENABLED` ON, dry-run-tested): onboarding, genre filter, age filter + rating badges. Plus HomeScreen self-serve start fix (proven on a fresh user), bigger/clearer fonts, big "waiting" caption.

**Adaptivity — started, ISOLATED (wire AFTER the next test; it touches the live flow):**
- `services/preferences.ts` built — per-player genre-preference tracking (AsyncStorage). Nothing imports it yet.
- Wiring steps: (A) keep `genre_ids` on the `Movie` type (parseResults drops them now); (B) call `recordVote(playerId, movie.genreIds, vote)` in VotingScreen.handleVote; (C) bias `fetchPopularMovies` toward `getFavoriteGenres(playerId)`; (D, later) train an ML model on the collected data if the heuristic isn't enough.

**Still open:** tiebreaker faceoff race; 1-option pick polish; debug logs in lib/supabase.ts; remove redundant fetchMoviesByCertification; add .env.example; trailers (youtube-iframe/proxy).

---

## Async voting (from user test, 2026-06-15) — bigger change
**Problem:** Voting is lock-step — you have to wait for the other person to vote on each movie before either of you advances ("Waiting for the other person to vote…"). The per-movie waiting is friction (ties to the earlier "waiting felt like lag" feedback).
**Desired:** Let each person go through all 8 movies at their **own pace** — no waiting per movie. Compute matches from the full set of yes-votes (any movie you *both* said yes to = a match).
**Note:** Real architecture change — matching model goes from lock-step per-movie → independent voting + compare. Touches the session model (per-movie `*_voted` columns → per-player yes-lists) and the live voting flow. Design deliberately; don't bolt on.
