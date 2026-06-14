# TestSprite Plan: Mobile Lesson Demo PR

## Feature/Edit Name

Mobile lesson demo and lesson planner entry points.

## Changed Routes

- `TodayProgressScreen` now exposes `Open lesson demo` and `View today's lesson`.
- `LessonDemoHomeScreen`
- `LessonDemoRoadmapScreen`
- `LessonDemoSessionScreen`
- `LessonDemoParentSummaryScreen`
- `LessonDemoShowcaseScreen`
- `LessonPlannerScreen`
- `ChildPracticeScreen`
- `RobotLessonControlScreen`

## Changed API Routes / Data Flows

- Static lesson demo uses local fixture content only; no backend call is required.
- `LessonPlannerScreen` calls `getTodaySession(childId)` through the existing learning API boundary.
- `ChildPracticeScreen` uses `getTodaySession(childId)` when a `sessionId` is supplied and falls back safely if the session is unavailable.
- `RobotLessonControlScreen` calls:
  - `POST /robot-lessons/start`
  - `GET /robot-lessons/:sessionId/status`
  - `POST /robot-lessons/:sessionId/stop`
- Demo progress persists under secure storage key `tbot_lesson_demo_progress`.

## User Roles

- Parent/guardian: opens the Progress tab, reviews today's lesson, launches the static six-month lesson path, and reads parent summaries.
- Child learner: uses short, low-density child practice screens with fallback content when live session data is unavailable.
- Robot operator/support: starts and stops a robot lesson session and monitors active status.

## Happy Paths

- From `TodayProgressScreen`, tap `Open lesson demo`, choose an age band, start today's lesson, advance all seven steps, and land on `LessonDemoParentSummaryScreen`.
- From `LessonDemoHomeScreen`, open `LessonDemoRoadmapScreen`, choose a week, and verify `LessonDemoSessionScreen` opens with the selected week and age band.
- From `LessonDemoShowcaseScreen`, tap `Week 13 showcase` and verify it opens `LessonDemoSessionScreen` with `week=13`, `day=5`, `ageBand=7-9`.
- From `TodayProgressScreen`, tap `View today's lesson`; if the backend session loads, verify objective, focus items, lesson steps, Vietnamese support, and `Start child practice`.
- From `RobotLessonControlScreen`, start a lesson with default demo values and verify active status appears; stop the session and verify status updates.

## Edge Cases

- No child profile: `LessonPlannerScreen` should show an add-child prerequisite instead of calling the API.
- Learning API unavailable: `LessonPlannerScreen` and `ChildPracticeScreen` should show safe fallback practice.
- Selected static lesson missing: `LessonDemoSessionScreen` should fall back to the first lesson.
- Duplicate lesson completion: local demo progress should not double-count completed lesson IDs.
- Robot lesson start returns non-active state: show the backend error reason.
- Robot status polling fails: keep the active session visible and do not crash.

## Regressions

- Existing `TodayProgressScreen` loading, error, and ready states still render.
- Existing progress route ownership and state-machine alignment stay valid.
- Main tab order remains `Home`, `Devices`, `Library`, `Progress`, `Profile`.
- Child-facing lesson screens do not expose raw IDs, URLs, source-card IDs, provider names, or model names.

## Setup / Login State

- Use an authenticated parent account with onboarding complete to reach the protected Progress tab.
- For live lesson planner testing, seed at least one child profile.
- For robot lesson control, configure a backend that supports `/robot-lessons/*`; otherwise verify fallback error handling only.
