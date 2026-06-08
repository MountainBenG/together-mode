// Feature flags — central on/off switches for features that are still being built.
//
// Rule: a flag only flips to `true` AFTER its feature is built AND has passed its
// own dry run. While it's `false`, the app behaves exactly like the validated build.

// The whole in-progress "new experience" — onboarding, genre picker, age filter.
// OFF = the validated, dry-run-tested flow (Start → code). Flip ON only after a full dry run.
export const NEW_FLOW_ENABLED = false;
