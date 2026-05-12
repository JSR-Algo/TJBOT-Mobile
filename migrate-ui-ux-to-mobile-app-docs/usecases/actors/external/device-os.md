# External Actor — Device OS

**Type:** External system (iOS / Android).

**Source evidence:** iOS microphone permission sheet modeled in `src/features/onboarding/MicAskPage.jsx`.

**Used by domains:** `onboarding` (mic permission), `fallback-shell` (audio recovery).

## Delegation edges

UC-O03 — Grant Microphone Permission (`kind: "delegate"`).
