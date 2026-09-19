# T3.2 Architecture-Aligned Closeout Design

> Historical plan: DONE references below describe the proposed 2026-08-06 closeout,
> not a new approval. The reconciled [verification matrix](../../qa/ad-hoc/2026-08-06-t32-mobile-session-machine.md)
> is REVIEW; production observer/device qualification is not established by this document.

**Date:** 2026-08-06
**Task:** T3.2 Mobile lesson-session state machine
**Decision:** Closeout correction only; no T5.2 dependency and no production behavior change

## Context

T3.2 shipped the 24-screen lesson-session model, state-to-screen projection,
terminal-state guards, stale-event epoch checks, and Android hardware-back
coverage. Its evidence marked renderer debounce, foreground re-sync, and listener
deduplication as unverifiable because the phone-runtime machine has no production
consumer.

Accepted ADR `migrate-ui-ux-to-mobile-app-docs/decisions/0006-lesson-session-ownership.md`
explains why: the robot owns the production lesson WebSocket, while the phone is a
read-only observer. The 24 phone-runtime screens are intentionally retained as a
demo/prototype surface and must remain production-hidden. Production foreground
re-sync belongs to the observer-backed Running/Companion surface, not these
screens.

## Decision

Keep the shipped T3.2 implementation unchanged and correct its closeout records:

1. Keep all 24 lesson-session routes production-hidden with
   `backend-contract-unavailable` metadata.
2. Keep the machine factory without a production source caller.
3. Reclassify the three no-runtime observations as architecture constraints, not
   incomplete T3.2 defects.
4. Preserve the existing verified T3.2 evidence for model transitions,
   projection, terminals, stale events, and hardware-back behavior.
5. Do not claim authoritative cold-start recovery, observer re-attachment, or
   post-auth recovery continuation. Those remain outside T3.2 and T5.2 is not
   included in this closeout.

## Changes

- Amend the T3.2 evidence status and honest-gaps language to cite ADR 0006.
- Amend the T3.2 task status narrative to state that production-hidden behavior is
  intentional.
- Reclassify matching findings-log rows without deleting their historical record.
- Record fresh verification and Ship-checklist evidence for the documentation-only
  closeout.

No files under `src/` or `tests/` change.

## Verification

Before and after the documentation correction:

- `npm run test:state-machines`
- `npm run test:navigation`
- `npm run typecheck`
- `npm run lint`
- repository standard suite required by the T3.2 Ship checklist

The branch must remain behaviorally identical to its base. Diff review must show
only documentation and campaign tracking changes.

## Explicit Non-Goals

- No lesson-session API implementation.
- No observer WebSocket implementation or contract changes.
- No production visibility for the 24 phone-runtime screens.
- No T3.4 status change.
- No claim that local checkpoints prove the robot/backend session is active.

## Expected Outcome

T3.2 remains DONE because its scoped model and screen-safety criteria are already
verified. Its closeout evidence accurately reflects the accepted robot-owned
production architecture. T3.4 remains blocked on authoritative production
recovery integration outside this task.
