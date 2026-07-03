# API

## Status

Placeholders only. No backend wired. Every exported function in `src/services/api/*.api.js` currently throws `Error('not implemented')`. The shape below mirrors the **literal** function names declared today.

## Layout

| Path | Role |
|---|---|
| `src/services/api/<domain>.api.js` | Per-domain placeholder functions. |
| `src/services/http/` | Shared HTTP client. **Empty today** — `client.js` not yet authored. |
| `src/services/ws/realtime.{ts,js}` | Parent observer WebSocket transport for realtime session mirror. |

## Per-domain placeholders

Function lists below are extracted verbatim from the source files. Backend contract column is the **expected** wire-up — it is intentionally light because no backend spec exists yet.

### `auth.api.js`

| Placeholder | Expected backend contract |
|---|---|
| `login()` | POST credentials, return session |
| `logout()` | Invalidate session |
| `getChildProfile()` | Fetch child profile for current user |
| `saveChildProfile(profile)` | Persist child profile |

### `course.api.js`

| Placeholder | Expected backend contract |
|---|---|
| `getCourse(courseId)` | Fetch course metadata |
| `getLevel(levelId)` | Fetch level inside course |
| `getUnit(unitId)` | Fetch unit inside level |
| `getLessonDetail(lessonId)` | Fetch lesson contents |
| `getLessonList(unitId)` | List lessons in unit |
| `getReviewQueue(userId)` | Spaced-repetition queue |
| `getDailyMission(userId)` | Today's daily mission |

### `course-library.api.js`

| Placeholder | Expected backend contract |
|---|---|
| `listLibrary()` | List purchasable courses |
| `getCourseDetail()` | Detail for one library entry |
| `purchaseCourse()` | Begin purchase flow |
| `unlockCourse()` | Mark a course unlocked post-purchase |
| `sendCourseToRobot()` | Push course to paired robot |
| `getRobotSyncStatus()` | Poll robot sync state |

### `device.api.js`

| Placeholder | Expected backend contract |
|---|---|
| `pairDevice()` | Begin pairing handshake |
| `getDeviceStatus()` | Snapshot of current device |
| `getFirmwareVersion()` | Firmware version + update channel |
| `runFirmwareUpdate()` | Trigger update |
| `setDeviceWifi()` | Provision wifi credentials |
| `unpairDevice()` | Drop binding |

### `home.api.js`

| Placeholder | Expected backend contract |
|---|---|
| `getHomeHub()` | Hub bundle (greeting state, daily mission ref, badges) |
| `getDailyState()` | Today's daily-cycle state |

### `lesson-session.api.js`

| Placeholder | Expected backend contract |
|---|---|
| `startSession()` | Open a realtime session |
| `endSession()` | Close + emit summary |
| `sendUtterance()` | Forward kid speech turn |
| `getActivityList()` | List activities in current lesson |
| `reportSafetyEvent()` | Escalate flagged content |

### `parent.api.js`

| Placeholder | Expected backend contract |
|---|---|
| `getParentSummary()` | Parent dashboard summary |
| `getParentToday()` | Today view |
| `getParentHistory()` | History timeline |
| `getSafetyConfig()` | Read safety toggles |
| `updateSafetyConfig()` | Persist safety toggles |
| `getSettings()` | Read settings |
| `updateSettings()` | Persist settings |

### `progress.api.js`

| Placeholder | Expected backend contract |
|---|---|
| `getTodayProgress()` | Today's progress slice |
| `getWordsPracticed()` | Word/phrase practice list |
| `getLessonSummary()` | Per-lesson recap |
| `getReviewQueue()` | Review-needed queue |

### `purchase.api.js`

| Placeholder | Expected backend contract |
|---|---|
| `createOrder()` | Create order |
| `getOrder()` | Fetch order state |
| `processPayment()` | Settle payment |
| `getShippingStatus()` | Shipping tracker |
| `activateRobot()` | Bind purchased robot |

### `robot-mgmt.api.js`

| Placeholder | Expected backend contract |
|---|---|
| `getRobotStatus()` | High-level robot health |
| `getBattery()` | Battery + charging state |
| `getStorage()` | Storage usage |
| `runMicTest()` | Mic self-test |
| `runSpeakerTest()` | Speaker self-test |
| `factoryReset()` | Wipe + re-pair |
| `getSupportInfo()` | Support / RMA info |

## Wire-up checklist

For each `throw new Error('not implemented')`:

1. Add `src/services/http/client.js` (axios or fetch wrapper) — currently missing.
2. Replace the throw with a real HTTP call routed through that client.
3. Plumb the response into the matching `src/store/<domain>.store.js` placeholder.
4. Add error handling (network, auth-expired, validation).
5. Update `docs/erd/README.md` once entity shapes solidify.

## WebSocket surface

`src/services/ws/realtime.{ts,js}` exposes `openRealtime(sessionId)` for the read-only parent observer lane (`/realtime/v1/observer/{sessionId}`). It validates the observer session id and bearer token before opening a socket, derives `ws`/`wss` from the configured API origin, parses JSON frames, bounds reconnect attempts, re-reads the access token on reconnect, keeps retrying after transient reconnect socket-construction failures while budget remains, and reports terminal reconnect/socket errors through `onError`.

Production course mirror screens can carry an optional observer `sessionId` through the local current-assignment/mobile route path, but production auto-attach still requires backend/session handoff proof that the authoritative realtime `sessionId` is emitted in live assignment/session state. Do not pass lesson `assignmentId` into this observer endpoint; when no authoritative `sessionId` is present, `RunningScreen` and `CompanionScreen` must keep using bounded current-assignment polling as the fail-closed fallback.

## Still TBD

- HTTP client implementation (`src/services/http/client.js` not yet authored).
- Auth token storage/refresh strategy.
- Production proof that backend/session handoff emits authoritative observer `sessionId` and mobile auto-attaches in a live environment.
- Per-call argument shapes — placeholders use unnamed `args` parameters.
