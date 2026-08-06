# T3.4 Mobile Recovery Design

## Scope

Harden only `src/features/fallback/**` and add recovery regression tests. Do not implement or alter the lesson-session API, backend contracts, voice pipelines, or other feature-owned code.

## Recovery Model

`recoveryTypes.ts` owns a pure decision layer for persisted lesson recovery. A checkpoint records the lesson phase, authoritative session disposition, authentication state, and existing resume context.

- Only `connecting`, `greeting`, `listening`, and `speaking` checkpoints with an active session may resume.
- `done`, terminated, expired, or malformed checkpoints take the clean lesson-ended path and never navigate to a fake resumed lesson.
- An expired authentication state requires sign-in before the resume decision is evaluated again.
- Missing or interrupted persisted fields default to the safe non-resumable outcome.
- Every recovery reason maps exhaustively to a fallback screen.

## Screen Behavior

- `LessonResumeScreen` renders the decision outcome, prevents duplicate resume actions, and navigates only when the checkpoint is resumable.
- `NetworkErrorScreen` preserves the checkpoint and starts the requested reconnect attempt.
- `ReconnectingOverlay` advances failed attempts and escalates at the configured threshold instead of assuming a successful reconnect.
- `AudioRecoveryScreen` preserves the checkpoint through a Bluetooth or device-route interruption and offers an explicit return-to-lesson decision after the route is restored.

## Verification

Add a recovery-matrix test covering every required phase and failure family. Dedicated assertions cover the never-resume-terminated invariant, partial persisted state, expired auth, reconnect thresholds, audio-route recovery, double-tap suppression, and exhaustive reason mapping.

The executable T3.4 repro runs the focused matrix test, failing at the pre-patch merge base and passing on the feature branch. The task and standard mobile suites are then run as required by the Ship checklist; unrelated baseline failures are recorded in the master findings log rather than fixed here.
