# T17 run07: ambiguous enrollment rejection

Isolated sys16 candidate, unintegrated and awaiting coordinator review. Full T17 BLOCKED.

| Requirement | Behavior and native proof |
| --- | --- |
| Post-assignment404 | COURSE_NOT_AVAILABLE retains the mounted dispatched identity; another explicit Add cannot enroll or navigate falsely. |
| Unknown disposition | Recognized4xx, future codes, retryable:true and missing/contradictory status are not rollback proof. |
| Single retry exception | LESSON_NOT_PLAYABLE with HTTP422 comes from audited pre-assignment playability/checksum paths. Nested/flat/string and normalized error forms permit explicit retry. |
| True local preflight | Failed device lookup never dispatches enrollment; a later explicit lookup can succeed. |
| Identity/lifecycle | Account/household/child/course/device B stays available; A-B-A and late404responses retain A's guard and cannot navigate. |
| Prior review corrections | Canonical RUNNING/RUNNING rejoin and all run06 pending/lifecycle/identity fences remain unchanged. |

Current backend creates assignment before an enrollment upsert may return COURSE_NOT_AVAILABLE404.
The upsert rollback does not undo assignment. ASSET_PACK_NOT_READY409 can also follow a
committed generation request. Those are unresolved side effects, not safe retries.
The sole allowlisted response is422playability; run06's unsupported412fixture is corrected
to422with the same retry assertions, and412now has a guarded-disposition regression.

Mounted memory is not restart persistence, backend idempotency, or remote reconciliation.
No automatic dispatch/start/activation, auth/contract change or recovery-checkpoint clear.
Friendly domain copy is preserved; it does not release the stable write guard.
Tests use actual components/normalizer with mocked APIs and account/navigation/lifecycle.
No backend execution or physical race is claimed. Final commands and exact source identities
are in run07 evidence.19canonical parity skips, unchanged100%coverage gate, flow/screen-prop
limitations, native/Detox and all26/service/physical/teacher/media/rights/release gates remain.
