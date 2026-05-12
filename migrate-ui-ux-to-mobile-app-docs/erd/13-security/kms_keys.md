---
entity: kms_keys
domain: 13-security
service_owner: SecurityService
state_machine: '@inline'
api_endpoints:
  - POST /security/keys
  - POST /security/keys/:id/rotate
  - POST /security/keys/:id/compromise
retention: hard
sequences_referenced_in:
  - docs/sequences/13-security/secrets-cache-fetch.sequence.mmd
  - docs/sequences/13-security/ota-key-rotation-ceremony.sequence.mmd
---

# kms_keys

## Business purpose

Metadata for every KMS / YubiHSM key in the platform: alias, purpose, algorithm, lifecycle status, and the chain of predecessor keys. **Key material never leaves the cryptographic device.**

## Ownership rules

- Owner service: `SecurityService`
- Writers: `SecurityService` (key create, rotate, retire, mark-compromised); two-person ceremony for OTA signing keys per sys-13 §6.
- Readers: `SecretsCache` (resolves alias → active key); every service that needs to encrypt/sign at the envelope layer.

## Lifecycle

- Create: `POST /security/keys` (admin ceremony) — issues a row in `active`.
- Update: `rotating` during ceremony, `retired` after successor takes over, `compromised` on incident.
- Delete: never — keys are immutable after rotation/retire to support old-data decryption.
- State machine (inline): `active → rotating → retired`, or `active → compromised` (emergency).

## Related APIs

- `POST /security/keys` — provision.
- `POST /security/keys/:id/rotate` — start a rotation.
- `POST /security/keys/:id/compromise` — emergency mark.

## Related sequences

- `docs/sequences/13-security/secrets-cache-fetch.sequence.mmd` — cache resolves active key.
- `docs/sequences/13-security/ota-key-rotation-ceremony.sequence.mmd` — dual-control rotation.

## Validation rules

- `alias` unique. Aliases match `^[a-z0-9-]+(-\d{4}-q[1-4])?$` (date-stamped successors).
- `algorithm` is one of an allow-listed set per `purpose`.
- A row can only enter `rotating` if there is no existing `rotating` row for the same `purpose`.

## Edge cases

- `compromised` triggers cascade emit of `security_events` rows + scheduled rotation of every dependent key. Compromise is irreversible — no `compromised → active` transition.
- Self-ref `rotated_from_id` permits chained history; the chain is walked when re-decrypting old envelopes encrypted by retired keys.
