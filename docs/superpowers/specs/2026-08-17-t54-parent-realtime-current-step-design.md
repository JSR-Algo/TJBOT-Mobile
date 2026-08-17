# T5.4 Parent Realtime Current-Step Design

## Context

`ParentTodayScreen` receives its initial state through
`GET /mobile/children/:childId/learning-status` and subsequent updates through
`lesson.progress.updated` WebSocket frames. A physical T5.4 run started with
`activeLearning.currentStep = null`. The first persisted `step_started` frame
contained a complete current-step object, but the mobile merge path retained
`null`, so the step card remained absent until an app foreground transition
forced an HTTP refresh.

## Root Cause

`mergeRealtimeUpdate()` only merges a current-step delta when a cached step
already exists. When the cached step is `null`, every non-null step delta is
converted back to `null`. This makes the first live step unrepresentable through
realtime even though the backend frame is valid.

## Decision

Keep the existing partial-delta merge behavior for an established step. When
the cached step is `null`, create it only if the incoming delta contains every
required `ParentLearningStep` field with valid types:

- `stepId`: non-empty string
- `stepNumber`: finite non-negative number
- `total`: finite non-negative number
- `activityTitle`: string
- `phase`: string
- `subject`: string or `null`

An incomplete delta must not invent a step. The existing query invalidation
continues to request the authoritative HTTP snapshot, preserving fail-safe
recovery for malformed or genuinely partial frames.

## Scope

Modify only the parent learning-status query merge and its focused tests. Do not
change the WebSocket frame shape, backend projection, authentication, reconnect
policy, screen layout, or navigation.

## Test Strategy

1. Start from an HTTP snapshot whose active lesson has `currentStep = null`.
2. Deliver the next contiguous realtime revision with a complete first-step
   object.
3. Assert that the query cache immediately contains that step and its percent,
   before the invalidating HTTP request resolves.
4. Deliver an incomplete current-step delta from the same starting state and
   assert that the cache keeps `currentStep = null` while the HTTP invalidation
   still runs.
5. Re-run existing partial-step merge, terminal, reconnect, and revision-gap
   coverage to protect current behavior.

## Physical Acceptance

Install the merged Android build, open Parent Today before assignment start, and
run a fresh physical `w02-feelings` lesson. Without backgrounding or reopening
the app, archive visible `Bước N trên 9` and the expected percentages for s1-s9,
with event-to-visible timestamps. The terminal state must become `COMPLETED` and
the normal robot face must return after the three-layer lesson ends.
