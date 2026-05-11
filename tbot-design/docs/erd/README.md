# ERD

## Status

**TBD.** No backend schema is designed for this prototype. The store placeholders under `src/store/` are the closest thing to an entity sketch today, and they are intentionally minimal.

## Expected entities

Sketched from `src/store/*.store.js` placeholder shapes plus the per-domain page set. Names are conventional, not contractual.

| Entity | Source / signal | Likely fields (sketch only) |
|---|---|---|
| `User` | `auth.store.js → state.user` | id, email/phone, role |
| `Child` | `auth.store.js → state.child` | id, name, age, persona, active course |
| `Course` | `course.store.js → state.currentCourseId`, `course-library.api.js` | id, title, level list, language pair |
| `Level` | `course.store.js → state.currentLevel`, `course.api.js → getLevel` | id, courseId, order, theme |
| `Unit` | `course.store.js → state.currentUnit`, `course.api.js → getUnit` | id, levelId, title |
| `Lesson` | `course.api.js → getLessonDetail / getLessonList` | id, unitId, activity refs, est. duration |
| `Activity` | `lesson-session.api.js → getActivityList` | id, lessonId, kind (intro / speak / listen / etc.) |
| `Word` | `progress.api.js → getWordsPracticed` | id, surface, lemma, pronunciation status |
| `Order` | `purchase.api.js → createOrder / getOrder`, `purchase.store.js → state.orderId` | id, userId, sku, payment status, shipping status |
| `Cart` | `cart.store.js` | items[], pendingCourseId |
| `Device` | `device.store.js`, `device.api.js` | id, ownerUserId, paired flag, firmware version, wifi state |
| `Session` | `lesson.store.js → state.sessionId`, `lesson-session.api.js → startSession` | id, deviceId, childId, lessonId, lastTurnState |

## Relationships (likely)

```
User ─┬─< Child >─┬─ Course
      │           ├─ Order
      │           ├─ Session ─< Activity ─< Word
      │           └─ progress (derived)
      └── Device (paired)
                 └── Session
```

Diagram is sketch-only — confirm with backend once it is designed.

## Pointers

| For | Look at |
|---|---|
| Concrete state placeholders | `src/store/*.store.js` |
| Function shapes that imply entities | `src/services/api/*.api.js` |
| Per-domain screens that consume each entity | `src/features/<domain>/states.js` |

## Still TBD

- Authoritative entity definitions (waiting on backend design).
- Foreign-key cardinalities (`Child` ↔ `Course` is likely many-to-many through enrollment, but unconfirmed).
- Realtime session wire format (frames, telemetry, safety events).
- Persistence boundary between client store, backend, and on-device firmware state.

When the backend ERD is designed, replace this file with the formal diagram + entity dictionary.
