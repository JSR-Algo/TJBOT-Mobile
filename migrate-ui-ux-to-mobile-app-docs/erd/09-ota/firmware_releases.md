---
entity: firmware_releases
domain: 09-ota
service_owner: OtaService
state_machine: "@inline"
api_endpoints:
  - POST /admin/ota/firmware/upload
  - POST /admin/ota/firmware/:id/sign
  - POST /admin/ota/firmware/:id/publish
  - POST /admin/ota/firmware/:id/pause
  - POST /admin/ota/firmware/:id/rollback
  - GET /admin/ota/firmware/:id
  - GET /v1/ota/firmware/check
sequences_referenced_in:
  - docs/sequences/09-ota/upload-and-signing.sequence.mmd
  - docs/sequences/09-ota/device-check-and-download.sequence.mmd
  - docs/sequences/09-ota/crash-rate-auto-pause.sequence.mmd
retention: 5y
---

# firmware_releases

## Business purpose

Canonical record of each firmware release artifact for TBot devices, including artifact provenance (S3 URI, KMS key ARN, ECDSA signature) and rollout controls. Drives the device OTA update path: devices query for the latest published release for their hardware_revision + channel, download the artifact from S3, and verify the signature before flashing.

**Note on coexistence with `ota_releases`**: `ota_releases.dbml` (also in this folder) models the rollout-management side (cohort assignment, percentage gates, recalled state). `firmware_releases` models the artifact and signing provenance. They are related but distinct: `ota_releases` may reference `firmware_releases` by ID for artifact lookup; the separation allows rollout state to be reset without re-signing the artifact.

## Ownership rules

- Owner service: `OtaService`
- Writers: `OtaService` (admin upload + state transitions), `CrashMonitorWorker` (sets state=paused + auto_paused_at when crash rate exceeds threshold), admin (manual pause/rollback via AdminCommandService)
- Readers: `OtaService` (device check endpoint), `Device` (artifact download), `CrashMonitorWorker` (monitors active releases)

## Lifecycle

- Create: admin uploads firmware binary via `POST /admin/ota/firmware/upload`. `OtaService` stores artifact in S3, records row with state=draft.
- Update: state transitions only after initial create (artifact_s3_uri, signature, signature_kms_key_arn are immutable after state=signed).
- Delete: never hard-deleted. Retained 5 years for compliance + rollback safety. `state = retired` is the terminal deactivation state.
- State machine: `@inline`

  | From | To | Trigger | Notes |
  |---|---|---|---|
  | draft | signed | KMS signing job completes successfully | `signature` + `signature_kms_key_arn` written atomically |
  | signed | published | admin approves rollout | `published_at` set; `rollout_percentage` starts at 0 |
  | published | paused | `CrashMonitorWorker` detects crash_rate > crash_threshold_ppm | `auto_paused_at` + `paused_reason` set |
  | published | paused | admin manual pause | `paused_reason` set |
  | paused | published | admin resumes after investigation | `auto_paused_at` left as audit record |
  | published | rolled_back | SEV-1 admin recall | all in-flight downloads aborted |
  | paused | rolled_back | SEV-1 admin recall | |
  | rolled_back | retired | admin archives after rollback complete | |
  | published | retired | superseded by newer stable release at 100% | |
  | signed | retired | artifact abandoned before publish | |

## Notes

### `crash_threshold_ppm` semantics

`crash_threshold_ppm` is parts-per-million of device sessions that crash within 5 minutes of applying the update. Default 5000 ppm = 0.5%. `CrashMonitorWorker` samples the crash_reports table (sys-09 `ota_crash_reports`) for the release and computes the rate; exceeds threshold → sets state=paused automatically. Human investigation required before resume.

### Partial index on channel/state

The `idx_firmware_releases_channel_published` index ideally has predicate `WHERE state = 'published'`. The DBML Note documents this; migration adds:

```sql
CREATE INDEX idx_firmware_releases_channel_published_partial
  ON firmware_releases(channel, hardware_revision, rollout_percentage)
  WHERE state = 'published';
```

### 5-year retention

Firmware artifacts must be retainable for rollback to any shipped version within 5 years of manufacture. `state = retired` signals soft-deactivation; the S3 artifact is NOT deleted until the retention window elapses.

## Related APIs

- `POST /admin/ota/firmware/upload` — upload binary; creates row with state=draft
- `POST /admin/ota/firmware/:id/sign` — trigger KMS signing job → state=signed
- `POST /admin/ota/firmware/:id/publish` — approve for rollout → state=published
- `POST /admin/ota/firmware/:id/pause` — manual pause
- `POST /admin/ota/firmware/:id/rollback` — SEV-1 recall → state=rolled_back
- `GET /v1/ota/firmware/check` — device polls for latest published release for its hw_rev + channel

## Related sequences

- `docs/sequences/09-ota/upload-and-signing.sequence.mmd` — binary upload + KMS signing ceremony
- `docs/sequences/09-ota/device-check-and-download.sequence.mmd` — device OTA check + S3 download
- `docs/sequences/09-ota/crash-rate-auto-pause.sequence.mmd` — CrashMonitorWorker auto-pause flow

## Validation rules

- `version` + `hardware_revision` + `channel` is UNIQUE (DB-enforced).
- `artifact_s3_uri`, `signature`, `signature_kms_key_arn` are immutable after state=signed; writes to these fields rejected with 409.
- `rollout_percentage` must be monotonically increasing (app-layer); decreasing it is rejected.
- `crash_threshold_ppm` range: 1–1_000_000 ppm.

## Edge cases

- **Concurrent uploads**: same version+hw_rev+channel → 409 from unique index.
- **KMS signing failure**: row stays in state=draft; admin retries; partial signature is NOT persisted.
- **Device downloads during pause**: in-flight download for a paused release is allowed to complete; `OtaService` only stops issuing new download URLs.
- **Cross-domain**: no FK to other domains. KMS ARN and S3 URI are string references to AWS resources.
