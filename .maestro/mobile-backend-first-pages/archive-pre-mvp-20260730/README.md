# Archived pre-MVP Maestro packs (2026-07-30)

These flows target screens that are intentionally hidden from the parent-app
MVP production navigator (`src/navigation/mvpProductionRoutes.ts`):

- `interaction/` — nav chains across MyRobotScreen, RobotStatusScreen,
  CourseComplete, CourseLocked, NeedsSync, DeviceSession, LessonReady, etc.
- `page-asserts/` — fragment asserts with no navigation setup; they assume the
  previous screen and many reference non-MVP copy ("Parent Space",
  "Course quality").

Owner lock Q23=A: non-MVP routes stay hidden in production. The active suite is:

- `.maestro/nest-spine-auth.yaml`
- `.maestro/nest-spine-signup-home.yaml`
- `.maestro/nest-spine-onboard-home-lesson.yaml`
- `.maestro/persistent-tab-pill.yaml`
- `.maestro/pairing-setup-blueprint.yaml`
- `.maestro/next-five-mvp.yaml`
- `.maestro/mobile-backend-first-pages/first-five-mvp.yaml`
- `.maestro/mobile-backend-first-pages/17-page-deeplink-pack.yaml`
- `.maestro/mobile-backend-first-pages/22-page-strict-recapture.yaml`
- `.maestro/mobile-backend-first-pages/page01-today-command-center.yaml`
- `.maestro/mobile-backend-first-pages/parent-summary-assert.yaml`
- `.maestro/mobile-backend-first-pages/parent-summary-recapture.yaml`
- `.maestro/mobile-backend-first-pages/{dismiss-open,scroll-top,settle-no-metro}.yaml`
