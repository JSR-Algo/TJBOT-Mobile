# Hot UC — `UC-L01 Start Voice Session`

> Hot dossier per Phase 1.5 backfill. Owning lane: B. Promoted via §6.2 Criterion 2 (target of ≥3 cross-domain edges per `reference/cross-domain-edges.json`).

## Identity

- **ID:** UC-L01
- **Title:** Start Voice Session
- **Domain:** `lesson-session`
- **Owning Lane:** B
- **Hot criteria met:** **Criterion 2** (8 incoming cross-domain edges — the universal "begin a lesson" handoff)

## Status

- **Index status:** `defined`
- **Backend status:** `BACKEND_NOT_DESIGNED`. Real wiring would call `lesson-session.api.js → startSession()` to mint a `Session` row, then hand the `sessionId` to `useLessonStore.start()`.

## Detailed flow

1. Mount `LessonReadyPage` — Robot avatar + "Today's lesson" header + headphones hint (`LessonReadyScreen.jsx`).
2. Child taps "I'm ready!" CTA (`LessonReadyScreen.jsx:25`) → `go('connecting')`.
3. UC-L02 (Connect to Realtime Voice) fires as `<<include>>` step (per `lesson-session.usecase.puml:53`).
4. On voice-connect success → UC-L03 (Receive Robot Greeting).
5. On voice-connect failure → UC-L19 (Recover from Audio Error).
6. Once UC-L03 plays, UC-L04 (Begin Activity) drives the activity loop.

State machine: `src/features/lesson-session/states.js` (turn states). Store: `src/store/lesson.store.js → start(sessionId)`.

## Why hot — incoming edges (8)

UC-L01 is the **single point** all "start a lesson" flows converge on:

- UC-O04 (onboarding "Enter First Lesson")
- UC-H03 (kid-hub "Start Today's Lesson")
- UC-C05 (course-browse "Start Lesson From Detail")
- UC-C06 (legacy "Start Lesson From Detail")
- UC-C07 (course-browse "Start Review")
- UC-C08 (course-browse "Start Daily Mission")
- UC-DP14 (device-pairing "First Lesson")
- UC-P04 (progress "Review Needed → re-enter")

**Implication:** any change to UC-L01's preconditions (mic permission, voice service availability, paired robot) ripples into 7 sibling sources. Add new preconditions only with cross-lane review.

## Cross-domain edges

- Incoming: 8 launches/re-enters edges (see "Why hot").
- Outgoing: UC-L01 includes UC-L02 which delegates to `ACTOR:RealtimeVoice` (intra-domain include + external delegate).

## Open questions

- **Mic-permission re-check on entry:** UC-O03 grants permission once. If iOS revokes between sessions (rare), UC-L01 currently has no re-check — would land on UC-L19 mid-connect instead of failing fast on UC-L01.
- **Robot-paired precondition:** all 8 entry sources assume a paired robot (UC-DP10). What if the robot is unpaired between Phase 0.5 onboarding and the first actual lesson? Currently no guard — UC-L02 would just hang waiting for voice routing through the (missing) robot.
- **Session-resume vs new-session:** UC-P04 "re-enters" UC-L01. Does that mint a new `Session` row or resume the prior `sessionId`? Currently undefined; impacts progress aggregation.

## Carry-forward

- New backlog entry candidate: `BACKLOG-UC-L01-PRECONDITION-GUARDS` (owner: Lane B, target: TBD; action: define hard preconditions list and where they're checked — UC-L01 mount vs UC-L02 connect).
