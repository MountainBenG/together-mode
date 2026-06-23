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

---

## Async voting — DESIGN LOCKED (2026-06-16). Build behind a new `ASYNC_VOTING_ENABLED` flag.
Ben's design = Model B + tiebreaker reuse:
- **Voting:** each player swipes all 8 movies at their own pace — NO per-movie waiting.
- **When BOTH finish, compare the two yes-lists:**
  - 0 movies both liked → No Match.
  - exactly 1 → that's the match.
  - 2+ → run the existing tiebreaker over the **mutual-yes set** (Ben's reuse idea).
- **One end-wait:** if you finish first, a single "waiting for them to finish" (not per-movie).
- **Data-model change (the meaty part):** the session must store each player's FULL yes/no per movie + a per-player "done" flag — not just the current-movie vote. (e.g. `player1_votes`/`player2_votes` JSONB + `player1_done`/`player2_done`, or a votes table.)
- **Build order:** flag off → add DB storage (Ben runs SQL) → rewrite VotingScreen vote/advance + the match computation → feed the mutual set into TiebreakerScreen → dry run on 2 devices → flip flag. Multi-step; build with fresh focus.

**✅ SHIPPED 2026-06-16** — `ASYNC_VOTING_ENABLED` ON after a two-device dry run. Migration added `player1_yes`/`player2_yes` (jsonb) + `player1_done`/`player2_done` (bool).
- **Gotcha to remember:** Supabase realtime handed the jsonb yes-arrays back in a shape the strict `===` intersection missed (string / number-type drift), so it always computed 0 mutual → always "No Match." Fixed with `asIdArray()` coercion in VotingScreen before intersecting. **Lesson: never trust the runtime type of a jsonb column from a realtime payload — coerce it.**

---

## Tiebreaker → coin-flip Final Round — SHIPPED 2026-06-16
The tiebreaker now ALWAYS resolves (no more dead-end No Match from it):
- Pick favorite → if you disagree → **manual Final Round** (one more real vote) → if you STILL disagree → **coin flip**.
- Coin flip is **deterministic**: both phones derive the same winner from `code + the two titles` (no random mismatch, no extra round-trip).
- Honest labeling: the coin outcome says **"The coin chose!"** (not "It's a match!"), via a `byChance` flag threaded App → MatchScreen.
- Animated minted-coin toss (gravity arc + 8 flips + metallic sheen) in TiebreakerScreen. Lottie is the route if we ever want photoreal.

Resolves the old tiebreaker "Bugs to fix": the "1 option vs 2" faceoff race did NOT reproduce on a two-device test (both rendered 2); the "1-option pick" is moot since the pick list is the mutual-yes set (always 2+).

---

## Recommendations engine v1 — SHIPPED 2026-06-16 (`RECOMMENDATIONS_ENABLED` ON)
First layer of the recs engine: the genre screen surfaces a "✨ Recommended for you" card = the genre this player has said yes to most (`getFavoriteGenres` over the `recordVote` taste data). Picking it flows through the normal genre select, so the session + two-player matching are unchanged. Shows only once there's vote history. Verified solo on device.
**Next layers:** (1) movie-level "because you liked X" via TMDB `/movie/{id}/recommendations` — needs liked-movie-IDs tracked + a shared rec-seed on the session so BOTH phones fetch the same catalog (otherwise matching breaks); (2) profiles / "who's watching" so taste is tracked per-person, not per-device.

---

## Movie-level recommendations — SHIPPED 2026-06-16 (`MOVIE_RECS_ENABLED` ON)
"Because you liked X": the genre screen's recommended card becomes "🎬 Movies you'll probably love" when the host has liked-movie history. Seeds TMDB `/movie/{id}/recommendations` from the host's recent yes-votes (`recordLikedMovie`), and the seed travels through the session (new `rec_seed_ids` jsonb column) so BOTH phones build the same catalog → matching still works. Verified on two devices (same movies both sides).
**Known gap (must-fix before publishing to kids):** recs are NOT age-filtered yet — `fetchRecommendedMovies` ignores `maxCert`. Seeds are the user's own age-appropriate likes so recs track that, but a real cert filter on the rec path is still needed.

---

## Accounts + Profiles (Netflix-style) — DESIGN LOCKED 2026-06-16. Build behind `ACCOUNTS_ENABLED`.
Ben's vision: a **family account** you log into once (credentials saved → auto-login), with multiple **"who's watching" profiles** inside it, each tracking its own taste.

- **Family account:** Supabase Auth (email + password). Configure `lib/supabase.ts` client with AsyncStorage storage + `persistSession: true` → stays logged in across launches (no re-typing).
- **Profiles:** `profiles` table (`id uuid`, `account_id = auth.uid()`, `name`, `color/emoji`). RLS so a user only sees/edits their own. Many per account.
- **Who's watching:** on launch → logged in? → fetch the account's profiles → "Who's watching?" picker → pick = active profile. No profiles yet → "Add profile." Not logged in → login/signup screen.
- **Identity integration (the key wiring):** the active profile's id becomes the `playerId` used for sessions (`player1_id`/`player2_id`) AND for taste (`preferences` keyed by profile id). Flag ON = use profile id; OFF = today's anonymous device playerId.
- **Taste per profile:** key preferences by profile id. v1 local (AsyncStorage per profile); later a server-side `profile_preferences` table so taste follows the account across devices.
- **Build phases:** (1) Supabase Auth client config + login/signup screen + flag; (2) profiles table + RLS + "Who's watching" picker + add-profile; (3) wire active profile id as the identity through sessions + preferences; (4, later) server-side taste so it follows the account.
- **Why build it carefully/fresh:** this is auth — real credentials + RLS + session persistence. Subtle to get right; worth a clear head, not a marathon-tail rush.

**Phase 1 DONE — validated 2026-06-16 (flag still OFF until profiles land):** family-account login/signup via Supabase Auth, session persists → stays logged in across relaunch. `lib/supabase.ts` configured with AsyncStorage + `persistSession`; `services/auth.ts`; `screens/LoginScreen.tsx`; App gates to the login screen when `ACCOUNTS_ENABLED` + not logged in. Verified on two devices: login works, stays logged in after full relaunch, pairing + voting still work while authenticated (no RLS break).
- Dashboard gotcha: the "Confirm email" toggle wasn't on the Email provider page in this Supabase version — tested via a dashboard-created **auto-confirmed** user + in-app Log in. Smooth in-app signup (handling email confirmation) still to sort before launch.
- Remaining: **Phase 2** profiles table + RLS + "Who's watching" picker + add-profile; **Phase 3** wire active profile id as the identity through sessions + preferences. Flip flag ON only when Phase 2 is also done.

**Phase 2 DONE + `ACCOUNTS_ENABLED` ON — shipped 2026-06-16:** `profiles` table (+ RLS) + "Who's watching?" picker + add-profile. Picking a profile sets it as the player identity (`setPlayerId(profile.id)`), so taste/recommendations track **per person**, not per device. Full feature (login → who's watching → app) live + validated on device.
- Also fixed: `events` (analytics) table RLS only allowed anon inserts → blocked once logged in. Added an `insert to authenticated` policy.
- Remaining polish (not blockers): smooth in-app signup (handle the email-confirmation step); server-side per-profile taste so it follows the account across devices (today it's local AsyncStorage keyed by profile id); an in-app "switch profile" button (today you switch by relaunching).

**Age filter — FIXED 2026-06-16 (it was leaking R movies the whole time):** TMDB's `/discover` `certification.lte` is unreliable — under a G cap it still returned R movies (American Pie, Ted, EuroTrip). Now we verify each candidate's US rating ourselves via a shared `filterByCert()` and keep ONLY confirmed at/under the cap (unrated + above-cap dropped). Applied to BOTH the genre/popular path AND the movie-recs path. Tradeoff: catalog load is slower (it checks ~40 ratings). Also closes the recs age-filter gap noted earlier. **Lesson: don't trust TMDB's certification filter — verify ratings client-side.**

---

## Red-Team critique (The Critic, 2026-06-23) — kept items
Ran the app through a critique agent. Most were already fixed (the tiebreaker set) or based on an older flow. The ones genuinely worth tracking:

- [ ] **Can match on a movie you can't actually watch (or already saw).** "Where to watch" only shows AFTER the match — so you can land on a film not on your services, a $20 rental, or one you've already seen. Now that we fetch watch-providers, fix it: (a) pre-filter the deck to watchable titles (ask once which services each person has), (b) add a "seen it" hide/skip. **Highest-value of the bunch.**
- [ ] **Identify movies by TMDB id, not title string.** We store/look up the matched movie by `matched_movie_title`, and `fetchWatchProviders` searches by title → duplicate/remake titles can show the wrong movie. Thread the TMDB id through match + display.
- [x] **Misleading ratings on unreleased movies.** ✅ Done 2026-06-23 — added `voteCount` to the Movie type; the "more info" rating now shows only when the movie has ≥50 votes (hides unreleased / low-confidence ratings).
- [x] **Match-screen stat reads as a letdown.** ✅ Done 2026-06-23 — replaced "Found on movie X — you said yes to Y" with a clean "You both said yes! 🍿".
- [ ] **Second-person install friction.** Joining requires installing the app. A no-install **web join** (code → URL → vote in the mobile browser, no account) is the highest-leverage adoption fix for the phone app. (Partly mooted by the phoneless TV direction, but real for phones.)

**Strategic (not a quick fix — the strongest point):** the app is a ~90-second utility with no reason to return. The recurring fix across the critique is a **persistent shared watchlist** — mutual yeses accrue into a ranked shared queue a pair comes back to. Adds retention AND makes "where to watch" get hit far more often (helps the business model). Worth weighing as a big next direction.
