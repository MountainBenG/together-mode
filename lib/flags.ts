// Feature flags — central on/off switches for features that are still being built.
//
// Rule: a flag only flips to `true` AFTER its feature is built AND has passed its
// own dry run. While it's `false`, the app behaves exactly like the validated build.

// The whole in-progress "new experience" — onboarding, genre picker, age filter.
// OFF = the validated, dry-run-tested flow (Start → code). Flip ON only after a full dry run.
export const NEW_FLOW_ENABLED = true;

// Voice voting — say "yes" or "no" instead of tapping buttons.
// OFF = tap-only (safe for Expo Go). Flip ON only after installing
// @react-native-voice/voice and building a dev client.
export const VOICE_ENABLED = false;

// Alexa skill integration — shows the 4-digit PIN on the code screen
// so users can say "Alexa, ask Together Mode to join {pin}".
// OFF = PIN hidden (no visual clutter until the skill is deployed).
export const ALEXA_ENABLED = false;

// Async voting — each person votes through all the movies at their own pace
// (no per-movie waiting); when BOTH finish, matches = movies both said yes to
// (0 = No Match, 1 = match, 2+ = tiebreaker over the mutual set).
// OFF = the validated lock-step flow. Requires the player*_yes / player*_done
// columns (see the migration). Flip ON only after its own two-device dry run.
export const ASYNC_VOTING_ENABLED = true;

// Recommendations (v1) — surfaces a "Recommended for you" genre on the genre screen,
// auto-chosen from the taste data recordVote() has been collecting (the genre this
// player says yes to most). Flows through the normal genre pick, so two-player
// matching is unaffected. OFF until its own dry run.
export const RECOMMENDATIONS_ENABLED = true;

// Movie-level recommendations — "because you liked X" via TMDB /movie/{id}/recommendations,
// seeded by the host's recent liked movies and shared through the session so BOTH phones
// build the same catalog (otherwise two-player matching breaks). Builds on the recs above.
// OFF until its own dry run.
export const MOVIE_RECS_ENABLED = true;

// Accounts + profiles (Netflix-style) — a family account logs in once (stays logged
// in) and picks a "who's watching" profile. Phase 1 = login/signup. OFF = today's
// anonymous, no-login flow. Flip ON only after its own dry run.
export const ACCOUNTS_ENABLED = true;
