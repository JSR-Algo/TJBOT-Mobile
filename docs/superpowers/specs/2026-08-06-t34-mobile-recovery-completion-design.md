# T3.4 Mobile Recovery Completion Design

**Date:** 2026-08-06  
**Task:** T3.4 Mobile fallback/recovery flows  
**Scope decision:** User-approved expansion beyond `src/features/fallback/**` into the production observer surface, protected navigation, and auth-return integration

## Context

The first T3.4 pass shipped a strict checkpoint decision model, terminal and
malformed-state lockout, reconnect escalation, audio recovery, and duplicate-tap
suppression. It remained blocked because route-param-only checkpoints could not
survive process death, a stale local `active` value was not authoritative, and
the auth stack replacement discarded the recovery decision.

T5.2 subsequently confirmed that no mobile lesson-session HTTP API exists by
design. Accepted ADR 0006 assigns production lesson ownership to the robot and
the phone to a read-only observer surface. The usable mobile authority is the
existing current-assignment read (`GET /devices/:deviceId/assignment/current`),
with `RunningScreen`/`CompanionScreen` attaching the observer lane when a session
ID is available.

## Architecture

### 1. Persisted Recovery Checkpoint

Add a fallback-owned secure checkpoint store. It writes only a fully validated
checkpoint containing the assignment/session identity needed for recovery and
reads unknown storage data through the existing fail-closed checkpoint parser.

- Corrupt JSON, partial writes, unsupported versions, or incomplete identity
  produce no resumable checkpoint.
- Terminal completion removes the checkpoint.
- Storage failures never fabricate a resumable state; they surface as recovery
  unavailable and are recorded through existing observability.

### 2. Production Checkpoint Lifecycle

`RunningScreen` and `CompanionScreen` are the production lesson mirror surfaces.
They refresh the secure checkpoint whenever a live current assignment is known
and update its phase from supported observer frames. They clear it when the
assignment or observer reports completion, failure, cancellation, or another
terminal outcome.

The hidden phone-runtime lesson screens remain unchanged and production-hidden.

### 3. Cold Start and Post-Auth Return

`RootStackNavigator` reads the pending recovery checkpoint during its existing
boot gate.

- If unauthenticated, the auth stack remains the only mounted stack; the
  checkpoint stays persisted.
- After login succeeds and the protected stack mounts, a valid pending checkpoint
  takes initial-route precedence over the normal protected default and opens
  `LessonResumeScreen`.
- Onboarding and required device setup retain their existing precedence so
  recovery cannot bypass account/device prerequisites.

No recovery payload is passed through `LoginScreen`, avoiding a cross-stack route
parameter contract.

### 4. Authoritative Resume Decision

`LessonResumeScreen` never trusts local `sessionState: active` by itself. For a
valid checkpoint it queries the current assignment by `deviceId` and requires the
result to match the persisted assignment and, when present, session identity.

- Matching live assignment: offer `Keep going`; the action navigates to
  `RunningScreen` with the authoritative assignment/session context.
- Completed, failed, cancelled, missing, or mismatched assignment: show the clean
  lesson-ended path and clear the checkpoint.
- Network or server failure: show a cannot-confirm/retry state. Do not offer
  resume and do not clear a potentially valid checkpoint.
- Double taps and overlapping validation attempts remain single-flight.

Recovery never navigates to `SendToRobotScreen`; it cannot create or restart an
assignment while claiming to resume one.

### 5. Reconnect Target Preservation

Extend the typed `NetworkErrorScreen` navigation params so `failureTarget`
survives every `ReconnectingOverlay` -> `NetworkErrorScreen` -> overlay hop.
Intermediate and terminal retries use the caller's original target.

## Data Shape

The checkpoint gains a schema version and the required production identity:

- `version`
- `deviceId`
- `assignmentId`
- optional `sessionId`
- existing course/child/lesson display and phase fields

Only the parser constructs a trusted persisted checkpoint. Legacy route-only
checkpoints without production identity remain safe-ended rather than silently
upgraded.

## Testing

Follow TDD with explicit RED runs for:

1. storage round-trip and corrupt/partial/version-mismatch fail-closed behavior;
2. cold-start protected entry from a persisted checkpoint;
3. unauthenticated boot followed by login and recovery re-entry;
4. matching live assignment resumes to `RunningScreen`;
5. missing, terminal, or mismatched assignment never resumes;
6. authority-query failure offers retry without clearing or resuming;
7. production screens persist live checkpoints and clear terminal ones;
8. custom reconnect failure target survives multiple hops;
9. existing recovery matrix, audio, double-tap, and exhaustive mapping remain green.

## Non-Goals

- No new backend or T5.2 endpoint.
- No phone-owned lesson WebSocket or phone audio runtime.
- No changes to robot/ESP voice pipelines.
- No optimistic resume from local checkpoint state.
- No bypass of onboarding or required device setup.

## Done Outcome

An app killed during a production robot lesson can reopen the protected recovery
screen after boot or login. The app resumes only by reattaching the existing
production mirror to a matching authoritative live assignment. Any terminal,
corrupt, mismatched, or unverifiable state fails closed and cannot start a new
lesson under the guise of recovery.
