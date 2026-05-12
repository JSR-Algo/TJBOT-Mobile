---
entity: ota_releases
domain: 09-ota
service_owner: OtaService
state_machine: '@inline'
api_endpoints:
  - POST /admin/ota/upload
  - POST /admin/ota/:id/stage
  - POST /admin/ota/:id/start
  - POST /admin/ota/:id/increase
  - POST /admin/ota/:id/pause
  - POST /admin/ota/:id/resume
  - POST /admin/ota/:id/recall
  - GET /admin/ota/:id/status
  - GET /v1/ota/check
retention: 365d
sequences_referenced_in:
  - docs/sequences/09-ota/upload-and-signing.sequence.mmd
  - docs/sequences/09-ota/device-check-and-download.sequence.mmd
  - docs/sequences/09-ota/crash-rate-auto-pause.sequence.mmd
  - docs/sequences/08-config/kms-key-rotation-ceremony.sequence.mmd
---

# ota_releases

## Business purpose

The authoritative record for every firmware version ever uploaded. Carries the rollout state machine that governs progressive exposure (5%/25%/50%/100%), auto-pause on crash rate, manual pause/resume, and recall.

## Ownership rules

- Owner service: `OtaService`.
- Writers: admin upload flow (initial INSERT in `drafted`); `OtaService` rollout admin endpoints (`stage`, `start`, `increase`, `pause`, `resume`, `recall`); `CrashMonitorWorker` for `paused_auto` transitions.
- Readers: device-facing `GET /v1/ota/check` (filters by `status='rolling_out'`), admin dashboard (`GET /admin/ota/:id/status`), sys-08 KMS key-rotation ceremony tracker (firmware adoption gate).

## Lifecycle

- Create: `POST /admin/ota/upload` after the binary is validated, gzipped, and signed (`status='drafted'`).
- Update: admin and crash-monitor drive the state machine. `rollout_percentage` is monotonically non-decreasing within a release.
- Delete: 1-year retention via sys-14 retention sweep (`ota_attempts_cleanup` references this). Recalled releases retain their row indefinitely for audit (no auto-delete after recall).

State machine (inline):

```
drafted → cohort_assigned (POST /:id/stage) → rolling_out (POST /:id/start; rollout_percentage=5)
       → rolling_out (POST /:id/increase; 25/50/100)
       → paused (auto via crash monitor OR manual)
       → rolling_out (POST /:id/resume)
       → completed (rollout_percentage=100 AND all-clear)
       → rolled_back (POST /:id/recall, SEV-1)
```

`drafted → rolled_back` directly is permitted (admin can recall a never-released draft).

## Related APIs

- `POST /admin/ota/upload` — INSERT row in `drafted`
- `POST /admin/ota/:id/stage` — verify S3 + manifest sig; → `cohort_assigned`
- `POST /admin/ota/:id/start` → `rolling_out` at 5%
- `POST /admin/ota/:id/increase` — bump percentage (with 24h crash-gate)
- `POST /admin/ota/:id/pause` / `resume`
- `POST /admin/ota/:id/recall` — SEV-1 alert + `rolled_back`
- `GET /admin/ota/:id/status` — admin dashboard
- `GET /v1/ota/check` — device-facing eligibility check (reads `status` + `rollout_percentage`)

## Related sequences

- `docs/sequences/09-ota/upload-and-signing.sequence.mmd` — INSERT path
- `docs/sequences/09-ota/device-check-and-download.sequence.mmd` — read path
- `docs/sequences/09-ota/crash-rate-auto-pause.sequence.mmd` — `paused_auto` writer
- `docs/sequences/08-config/kms-key-rotation-ceremony.sequence.mmd` — fleet adoption gating on a rotation FW release

## Validation rules

- `version` is strict semver; duplicates rejected at INSERT (sys-09 upload-and-signing failure path `version_already_exists` → 409).
- `binary_size_bytes` ≤ `MAX_BINARY_SIZE` (32 MB, hard-coded per spec §Constants).
- `rollout_percentage` ∈ {0, 5, 25, 50, 100}; transitions are monotonic non-decreasing.
- `max_rollout_crash_rate` stored as parts-per-thousand integer (so 50 = 5%); avoids the money-style numeric/decimal/float ban while preserving 0.1% resolution.
- `status` transitions are validated in app code; no DB trigger.

## Edge cases

- Auto-pause race (sys-09 crash-rate-auto-pause `rollout_id_mismatch`): in-flight `/v1/ota/check` calls re-read `status` before issuing a manifest URL; if `paused` / `rolled_back` between offer and download, device gets 304.
- `released_at` is only set the **first** time status enters `rolling_out`; subsequent resumes do NOT reset it (preserves the rollout duration metric).
- Recall is **terminal** — `rolled_back` does not transition back to `rolling_out`. A new release (`POST /admin/ota/upload`) must be created.
- Cross-system FK to sys-08 `config_cohorts` is **optional**: a release without `rollout_cohort_id` applies to all devices matching `hw_revisions_supported` filtered by the percentage gate alone.
- 1-year retention (sys-14 `ota_attempts_cleanup`) applies to *attempts* rows; this release row stays indefinitely so historical audit links resolve.
