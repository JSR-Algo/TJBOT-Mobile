# 09-ota — OTA release management

**System spec:** `docs/site/software/systems/09-ota-release-management.md`
**Sequences:** `docs/sequences/09-ota/*.sequence.mmd`
**Owning service(s):** `OtaService`, `CrashMonitorWorker`
**Lane:** F (worker-5, Phase 2)
**Status:** complete — 5 entities.

## Entities

| Entity | Role |
|---|---|
| `ota_releases` | Canonical release row + full state machine `drafted → cohort_assigned → rolling_out → paused → completed | rolled_back`. |
| `ota_cohorts` | OTA-only cohorts (canary / partner devices); subset overlay on sys-08 `config_cohorts`. |
| `ota_assignments` | Per-(device, release) attempt rows; lifecycle `offered → ... → success | failed | rollback | skipped`. |
| `ota_crash_reports` | Device-emitted crash detail for crash-rate auto-pause; immutable. |
| `ota_pause_decisions` | Append-only audit log of every rollout-lifecycle decision; cross-domain FK to sys-12 admin_users. |

## Stateless service annotations

- `@stateless: CrashMonitorWorker` — sliding-window crash-rate evaluator; writes `ota_pause_decisions`.
