# Edge Cases — `progress`

> Per UC, declare a non-empty subset of `{cancel, error, retry, timeout, unauthorized, validation, n/a}` plus rationale ≥ 20 chars per chosen mode. `n/a` rationale must contain a justification keyword from `{stateless, single-step, no-async, view-only, terminal}` (D5/AC6).
>
> `n/a` ratio per domain ≤ 50% (D5).

---

## UC-P01

- **error**: API failure for `getTodayProgress` must show a non-blocking error state (e.g. "Couldn't load today's progress") with a retry CTA; the rest of the UI must remain navigable.
- **timeout**: Request exceeding SLO must surface a retry affordance without navigating away.
- **n/a**: No user input in this view — validation does not apply (view-only read screen).

## UC-P02

- **error**: `getWordsPracticed` failure must show a graceful empty-state message rather than a blank list or crash.
- **timeout**: Request exceeding SLO must surface a retry CTA while preserving navigation context.
- **cancel**: Child can tap back at any time to return to UC-P01 without side effects.

## UC-P03

- **error**: `getLessonSummary` failure must not block post-lesson navigation; must fall back to a "Session complete" message with minimal detail rather than crashing.
- **timeout**: If summary fetch exceeds SLO, show partial data (score from local session) and a "Details unavailable" note.
- **retry**: Child must be able to retry the summary fetch from the error state without re-triggering the lesson.

## UC-P04

- **error**: `getReviewQueue` failure must surface a recoverable error; child must be able to retry or navigate back to UC-P01.
- **timeout**: Queue fetch exceeding SLO must surface a retry CTA and not auto-route child into a lesson.
- **cancel**: Child can tap back to exit the review queue screen without entering the review lesson.
- **validation**: Empty review queue (no words flagged) must display an informative "Nothing to review" state rather than an empty list.

## UC-P05

- **n/a**: Celebration is view-only with auto-advance — no user input, no async call, no state mutation (view-only, no-async).
