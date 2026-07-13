# Backend Mapping — `progress`

> Every cell is either a real export from `src/services/api/progress.api.js`, a real action from a store, an entity sketch from `docs/erd/README.md`, or the literal sentinel `BACKEND_NOT_DESIGNED`. Cited file paths must exist on disk (verified by `check-backend-sentinel.mjs`).

**Domain ADR Pointer rule:** `—` when every cell in the row is sentinel. Otherwise must cite `decisions/NNNN-backend-progress.md`.

---

| UC ID | Endpoint | Service | DB Entity | Events | Domain ADR Pointer |
|---|---|---|---|---|---|
| UC-P01 | getTodayProgress | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-P02 | getWordsPracticed | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-P03 | getLessonSummary | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-P04 | getReviewQueue | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-P05 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-P06 | `GET /v1/mobile/rewards`, `GET /v1/mobile/rewards/inbox`, `POST /v1/mobile/rewards/{rewardId}/seen` | `src/services/api/rewards.api.ts` | `lesson_reward_ledger`, `robot_reward_totals`, `child_reward_streaks` | authoritative completion reward + idempotent seen acknowledgement | `decisions/0006-lesson-session-ownership.md` |
| UC-P07 | `GET /v1/mobile/leaderboard`, `PUT /v1/mobile/devices/{deviceId}/leaderboard-preference` | `src/services/api/leaderboard.api.ts` | `robot_leaderboard_preferences`, reward aggregate projection | authenticated leaderboard read + preference audit | `decisions/0006-lesson-session-ownership.md` |
| UC-P08 | `PATCH /v1/mobile/children/{childId}` | `src/services/api/households.ts` | `child_profiles` | owned child display-name audit | `decisions/0011-multi-child-management.md` |

---

## Notes

- `progress.api.js` exports `getTodayProgress`, `getWordsPracticed`, `getLessonSummary`, `getReviewQueue` — all throw `not implemented`; no `progress.store.js` found on disk.
- UC-P05 (Celebration) is a view-only screen; no API call required.
- UC-P06 through UC-P08 consume the authoritative parent-scoped contracts. The mobile client never sends a parent email, rejects malformed response envelopes, and queues only the idempotent reward-seen acknowledgement while offline.
- Events column stays sentinel until an event bus is designed.
- Domain ADR Pointer is `—` for all rows because the API exports all throw sentinel errors (no backend contract yet). When backend lands, create `decisions/NNNN-backend-progress.md` and update pointers.
