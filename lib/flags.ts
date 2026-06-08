// Feature flags — central on/off switches for features that are still being built.
//
// Rule: a flag only flips to `true` AFTER its feature is built AND has passed its
// own dry run. While it's `false`, the app behaves exactly like the validated build.

// Age-range filter + rating badges. Built behind this switch; off until proven.
export const AGE_FILTER_ENABLED = false;
