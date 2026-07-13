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
| UC-P06 | `rewards.api.ts → getRewardHistory, getRewardInbox, acknowledgeRewardSeen` | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | authoritative completion reward + idempotent seen acknowledgement | `decisions/0001-backend-progress.md` |
| UC-P07 | `leaderboard.api.ts → getLeaderboard, updateLeaderboardPreference` | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | authenticated leaderboard read + preference audit | `decisions/0001-backend-progress.md` |
| UC-P08 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | owned child display-name and active-child audit through `src/services/api/households.ts` | `decisions/0001-backend-progress.md` |

---

## Notes

- `progress.api.js` exports `getTodayProgress`, `getWordsPracticed`, `getLessonSummary`, `getReviewQueue` — all throw `not implemented`; no `progress.store.js` found on disk.
- UC-P05 consumes only the unseen persisted inbox and idempotent seen acknowledgement; missing inbox data is a waiting state, not an estimated award.
- UC-P06 through UC-P08 consume the authoritative parent-scoped contracts. The mobile client never sends a parent email, rejects malformed response envelopes, and queues only the idempotent reward-seen acknowledgement while offline.
- Service and entity cells remain sentinel because this mobile workspace's validator recognizes Zustand service actions and mobile-owned ERD entities only. The authoritative persistence remains backend-owned; endpoint cells cite the real mobile API exports.
- Events column stays sentinel until an event bus is designed.
- Domain ADR Pointer is `—` for all rows because the API exports all throw sentinel errors (no backend contract yet). When backend lands, create `decisions/NNNN-backend-progress.md` and update pointers.
