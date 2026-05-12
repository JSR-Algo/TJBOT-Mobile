---
entity: media_assets
domain: _shared
service_owner: ContentService
state_machine: '@inline'
api_endpoints:
  - POST /media/upload-url
  - POST /media/:id/finalize
  - GET /media/:id
retention: soft
sequences_referenced_in:
  - docs/sequences/06-content/content-pack-publish.sequence.mmd
  - docs/sequences/09-ota/upload-and-signing.sequence.mmd
  - docs/sequences/20-authoring/publish-to-system06.sequence.mmd
---

# media_assets

## Business purpose

DB row + S3 URI for every binary asset: lesson audio, activity images, OTA release archives, fallback voice phrases, demo content, etc. Per plan §3 Q-10 — keeping a DB row enables moderation, dedup by checksum, retention sweep, and cache invalidation.

## Ownership rules

- Owner service: `ContentService` (primary writer for content packs); `OtaService` writes OTA images; `SafetyService.ModerationWorker` populates `moderation_state` for user-supplied media; `AuthoringService` writes draft media.
- Writers: services listed above (each scoped by `owner_service`).
- Readers: device runtime (audio/image fetches), parent app, admin tooling.

## Lifecycle

- Create: `POST /media/upload-url` → row in `uploading`; upload to S3 directly; `POST /media/:id/finalize` flips to `active`.
- Update: `moderation_state` transitions; metadata updates for derived assets.
- Delete: soft (`archived` then `deleted`); sys-14 hard-deletes from S3 + DB after retention window.
- State machine (inline): `uploading → active → archived → deleted`.

## Related sequences

- `docs/sequences/06-content/content-pack-publish.sequence.mmd` — content publish path.
- `docs/sequences/09-ota/upload-and-signing.sequence.mmd` — OTA image registration.
- `docs/sequences/20-authoring/publish-to-system06.sequence.mmd` — authoring → content handoff.

## Validation rules

- `s3_uri` matches `^s3://[a-z0-9.-]+/.+$` and the bucket prefix matches the `kind` per the S3 bucket policy.
- `checksum_sha256` is 64 hex chars; verified by the uploader on finalize.
- `content_type` ∈ allow-list per `kind` (e.g. `audio/mp4` only for `voice_phrase`).
- User-supplied media (authoring drafts; demo-content overrides) must reach `moderation_state='approved'` before `status='active'`.

## Edge cases

- Dedup at upload: if `checksum_sha256` matches an existing row of the same `kind`, the upload reuses the existing `s3_uri` (saves storage + speeds re-publishes).
- OTA images carry a counter-signed manifest separately (sys-09); the manifest hash lives in `metadata.manifest_sha256` not in `checksum_sha256` (which is the binary itself).
- Retention: archived `voice_phrase` assets (sys-04) retire at 90d; OTA images retain 2y for rollback; content pack assets retain until 18 months past the content pack's `retired_at`.
- Cross-service moderation: any user-supplied media goes through sys-05 `ModerationWorker` regardless of `owner_service`; rejected media is hard-deleted by retention worker.
