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
