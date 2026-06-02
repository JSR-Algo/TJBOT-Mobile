---
entity: backup_snapshots
domain: 14-retention
service_owner: RetentionWorker
state_machine: '@inline'
api_endpoints:
  - GET /admin/retention/snapshots
  - POST /v1/account/export
  - GET /v1/account/export/:id
retention: 365d
sequences_referenced_in:
  - docs/sequences/14-retention/cron-job-base-execution.sequence.mmd
  - docs/sequences/14-retention/account-deletion-pipeline.sequence.mmd
---

# backup_snapshots

## Business purpose

Auditable registry of every backup or data-export artefact:

- RDS automated snapshots (daily, 35-day retention)
- RDS cross-region snapshots (us-west-2 DR, 7-day retention)
- RDS manual snapshots (pre-migration cutovers, indefinite until manual delete)
- S3 data-export packages produced for COPPA right-of-access (`POST /v1/account/export`, 7-day retention)

The snapshot bytes live in AWS; this table is the manifest used by ops + compliance to prove backup posture and audit data exports.

## Legal foundation

- **COPPA 16 CFR §312.6** — right of access (data export).
- **GDPR §15** — right to receive personal data in a structured, machine-readable format.

Data-export rows are critical compliance artefacts: they prove the company satisfied a right-of-access request.

## Ownership rules

- Owner service: `RetentionWorker` (for sweeps); data-export INSERTs come from a sibling `DataExportService` (sys-14 internal).
- Writers: `RetentionWorker` (snapshot lifecycle), data-export pipeline (manual + scheduled).
- Readers: ops dashboards, sys-12 support, FTC / regulator export, sys-13 incident-response (snapshot-restore decision points).

## Lifecycle

- Create: AWS or DataExportService notifies the worker (event-driven for RDS, in-process for S3 export).
- Update: `status` transitions `creating → available → expired → deleted`; `expires_at` may be extended for manual / forensic snapshots.
- Delete: hard delete row when AWS deletion confirms (after `status='deleted'`). 1-year retention on the row itself (for audit history) per `retention: 365d` frontmatter.

State machine (inline): `creating → available` (AWS confirms ready) → `expired` (past `expires_at`) → `deleted` (worker confirms AWS-side removal).

## Related APIs

- `GET /admin/retention/snapshots` — ops view
- `POST /v1/account/export` — parent initiates COPPA right-of-access export → INSERT row
- `GET /v1/account/export/:id` — parent downloads the export (signed URL)

## Related sequences

- `docs/sequences/14-retention/cron-job-base-execution.sequence.mmd` — sweep + expiry tracking
- `docs/sequences/14-retention/account-deletion-pipeline.sequence.mmd` — companion data-export-then-delete flow

## Validation rules

- `kind='rds_automated'` → `rds_snapshot_id` required, `s3_bucket`/`s3_key` null.
- `kind='s3_data_export'` → `s3_bucket`/`s3_key` required, `rds_snapshot_id` null, `scope_household_id` required.
- `encryption_key_id` REQUIRED for every snapshot (no unencrypted backups; spec §Security implicit invariant).
- `expires_at` MUST be ≥ `taken_at + 7d` (no shorter snapshot retention than the COPPA-export window).

## Edge cases

- **Cross-region copy**: `kind='rds_cross_region'` rows reference the primary snapshot via a same-table `parent_snapshot_id` (NOT modelled in this row — captured in `s3_key`'s text payload to avoid recursive FKs); ops scripts maintain that linkage.
- **Data-export expiry while parent is downloading**: signed URL is independently TTL'd at 1 hour (CloudFront default). If the row expires (7 days) but parent still has the URL, S3 lifecycle removes the object — the URL becomes a 403. Parent must re-request export.
- **COPPA legal note**: data-export rows MUST be retained for at least 90 days post-issue for audit (regulatory practice), but the artefact bytes can expire at 7 days. The DB row's 1-year retention covers the audit horizon.
- **Cross-domain FKs**: `encryption_key_id` → sys-13 `kms_keys`; `scope_household_id` → sys-01 households; `data_export_request_id` → sys-14 internal table (the `data_export_requests` table from spec §4). These FKs are owned by their respective producers per CONVENTIONS §3; this lane carries only the columns.
