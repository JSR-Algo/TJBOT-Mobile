<!-- HAND-CURATED. -->
# Progress Domain Flow

**Owner lane:** C  
**Entry:** `lesson_summary` (from lesson-session on lesson complete)  
**Exits:** → `home_hub_idle` (home domain); → `lesson_ready` (lesson-session, review/retry)

## Purpose

Post-lesson debrief sequence. Shows the child what they accomplished, celebrates wins, surfaces review suggestions, and routes back to home or into another lesson.

## Journey narrative

After a lesson completes, lesson-session fires `go('lesson_summary')`. The Lesson Summary screen displays words covered and score. From there:

- **Celebration path** — strong performance triggers `celebration` screen (confetti, reward animation), then optionally shows `review_needed` if some words still need practice.
- **Review path** — if comprehension was low, `review_needed` appears directly, offering a "Practice again" CTA that fires `go('lesson_ready')` back into lesson-session, or "Done" that exits to home.
- **Progress detail** — `today_progress` aggregates today's session data; `words_practiced` shows the word-level breakdown. Both route back to home via cross-domain edge.

## States

| ID | Kind | Title | Role |
|----|------|-------|------|
| `lesson_summary` | happy | Lesson Summary | Entry; shows score + word count |
| `celebration` | happy | Celebration | Reward screen for strong performance |
| `review_needed` | happy | Review Needed | Surfaces weak words; offers retry |
| `today_progress` | happy | Today's Progress | Daily aggregate stats |
| `words_practiced` | happy | Words Practiced | Per-word breakdown |

All states are happy-path — no error or recovery states in this domain.

## Entry / exit edges

| Direction | Edge | Trigger |
|-----------|------|---------|
| Inbound | lesson-session → `lesson_summary` | lesson complete |
| Outbound | `lesson_summary` → `home_hub_idle` | "Done" CTA |
| Outbound | `lesson_summary` → `lesson_ready` | "Practice more" CTA |
| Outbound | `review_needed` → `lesson_ready` | "Practice again" CTA |
| Outbound | `review_needed` → `home_hub_idle` | "Done" CTA |
| Outbound | `celebration` → `home_hub_idle` | auto-advance or "Done" |
| Outbound | `today_progress` → `home_hub_idle` | back / "Done" |
