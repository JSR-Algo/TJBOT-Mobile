<!-- HAND-CURATED. -->

# Course Domain — Flow Narrative

**Entry:** `course` (from home hub or course-library)

**Exit targets:**
- `lesson_ready` → lesson-session domain (start a specific lesson)

## Journey

The course domain is a pure browse/navigation hierarchy with no error states. Users drill down from `course` (top-level overview) → `level` → `unit` → `lesson_list` → `lesson_detail`, then launch into lesson-session via `go('lesson_ready')`. Two lateral entry points exist: `review_entry` (review mode, enters course at review level) and `daily_mission` (highlights the suggested daily lesson).

All states are `kind: "happy"`. No edge-case templates required — the domain has no async operations and no failure modes of its own. Errors that arise from launching a lesson surface in the lesson-session domain.

## Edge cases used

None.

## Screenshots

TBD — design prototype screens at `src/features/course/`.
