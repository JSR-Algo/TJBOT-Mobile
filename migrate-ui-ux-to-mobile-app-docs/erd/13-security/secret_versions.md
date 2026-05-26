---
entity: secret_versions
domain: 13-security
service_owner: SecretsCache
state_machine: '@inline'
api_endpoints:
  - POST /security/secrets/:name/versions
  - POST /security/secrets/:name/versions/:version/activate
  - POST /security/secrets/:name/versions/:version/retire
retention: hard
sequences_referenced_in:
  - docs/sequences/13-security/secrets-cache-fetch.sequence.mmd
---

# secret_versions

## Business purpose

Application-layer secret material (DB passwords, third-party API keys, webhook signing secrets) stored as envelope-encrypted blobs. One row per version per name; rotation appends a new row.

## Ownership rules

- Owner service: `SecretsCache` (read path); `SecurityService` (write path).
- Writers: `SecurityService` rotation flow.
- Readers: any service whose bootstrap pulls secrets via `SecretsCache`.

## Lifecycle

- Create: rotation appends a new `pending` row.
- Update: `pending → active` on activation (preceding version moves to `retired` atomically); `compromised` on incident.
- Delete: never — old versions are needed to decrypt at-rest data signed by retired keys.
- State machine (inline): `pending → active → retired`, or any state → `compromised`.

## Related APIs

- `POST /security/secrets/:name/versions` — store new ciphertext.
- `.../activate` — promote to active.
- `.../retire` — demote to retired.

## Related sequences

- `docs/sequences/13-security/secrets-cache-fetch.sequence.mmd` — cache miss path; pulls active version.

## Validation rules

- Exactly one `active` row per `secret_name` (app-layer + partial unique index in DDL emitter).
- `envelope_kms_key_id` must be a `kms_keys` row with `purpose='envelope'` and `status='active'` at the time of write.

## Edge cases

- Compromise of envelope key triggers re-wrap of every `active` secret using the new envelope key, producing a new `secret_versions` row per secret (the underlying material may be unchanged but the ciphertext is renewed).
- Concurrent rotations must serialise on `secret_name` (advisory lock).
