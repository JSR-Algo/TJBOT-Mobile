# TestSprite Checklist: Mobile Lesson Planner

## Feature / Edit Name

Mobile Lesson Planner and Child Practice Entry

## Changed Mobile Routes / Surfaces

- `LessonPlanner`
- `ChildPractice`
- `Progress` tab parent dashboard lesson entry
- `Interaction` screen audio start and playback behavior
- `Devices` list and device detail connection-state display

## Changed API Routes / Data Flows

- `GET /learning/children/:childId/session/today`
- `GET /learning/progress/:childId`
- `POST /learning/children/:childId/interactions`
- `POST /learning/children/:childId/session/complete`
- Live auth isolation check is opt-in through `TBOT_RUN_LIVE_AUTH_ISOLATION=1`.

## User Roles

- Parent: opens today's lesson from the Progress tab, reviews the objective, sees safe fallback copy, and starts child practice.
- Child: sees simple practice steps without raw child IDs or session IDs.
- QA: verifies offline/error fallback behavior when the learning session cannot load.

## Happy Paths

- Parent opens the Progress tab and taps `View today's lesson`.
- Lesson planner loads today's session and shows objective, focus words, lesson steps, Vietnamese support, and reward summary.
- Parent starts child practice from the lesson plan.
- Child practice advances through listen, try, and reward steps, then returns to the prior screen.
- Interaction screen starts listening only when the audio streamer actually starts.
- Gemini live client tests disconnect clients after each test to avoid open handles.

## Edge Cases

- No child profile exists.
- `GET /learning/children/:childId/session/today` fails.
- Session has no focus words.
- Audio streamer native module is unavailable.
- TTS playback never reports `didJustFinish`; timeout cleanup should still release the player.
- Learning backend is not reachable; auth isolation test should remain skipped unless explicitly enabled.

## Regression Checks

- Navigation type safety for `LessonPlanner` and `ChildPractice`.
- Parent dashboard KPI failure still leaves the lesson entry available.
- Child practice does not display raw child IDs or session IDs.
- Device cards still show connection, battery, firmware, and WiFi state clearly.
- Robot face assets render from `src/assets/robot-faces/` without committing `.omc` agent-state files.

## Setup Data / Login State

- Requires a logged-in parent account with at least one child profile for full mobile flow testing.
- Use a child profile with a valid learning session payload containing warmup, core learning, interaction, reinforcement, and reward data.
- Run live backend auth isolation only when a local or staging backend is intentionally reachable and `TBOT_RUN_LIVE_AUTH_ISOLATION=1` is set.
