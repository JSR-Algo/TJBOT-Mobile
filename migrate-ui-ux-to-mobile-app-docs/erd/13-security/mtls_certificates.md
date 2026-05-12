---
entity: mtls_certificates
domain: 13-security
service_owner: CertificateVerifier
state_machine: '@inline'
api_endpoints:
  - POST /security/certificates
  - POST /security/certificates/:id/revoke
retention: hard
sequences_referenced_in:
  - docs/sequences/13-security/cert-verification-and-revocation.sequence.mmd
---

# mtls_certificates

## Business purpose

Registry of every device mTLS certificate (one row per cert; rotation appends a new row). Drives the cert-verification hot path on every device handshake and the revocation list used by the gateway.

## Ownership rules

- Owner service: `CertificateVerifier` (read path); `SecurityService` and manufacturing provisioning (write path).
- Writers: manufacturing on issue, `SecurityService` on revoke/rotate.
- Readers: gateway on every mTLS handshake; admin dashboard; sys-15 factory tooling.

## Lifecycle

- Create: at manufacturing time (`status='provisioned'`).
- Update: `provisioned → active` on first successful handshake (sets `first_seen_at`); `active → revoked` on incident; `active → expired` by cron at `expires_at`.
- Delete: hard-deleted by sys-14 after compliance retention (typically 7 years).
- State machine (inline): `provisioned → active → revoked | expired`.

## Related APIs

- `POST /security/certificates` — register (manufacturing).
- `POST /security/certificates/:id/revoke` — revoke (incident response).

## Related sequences

- `docs/sequences/13-security/cert-verification-and-revocation.sequence.mmd` — verify + revoke.

## Validation rules

- `certificate_fingerprint` SHA-256 of the cert in colon-hex; unique across all rows.
- `expires_at > issued_at`; max cert lifetime 5 years (manufacturing convention).
- `status='revoked'` requires `revoke_reason` non-empty.

## Edge cases

- Cross-domain FK: `device_id` references `devices.id` owned by Lane C. Phase 3 adds the explicit `Ref:` after Lane C lands. Lane B's file already declares the cross-domain comment per CONVENTIONS rule 3.
- A device may have multiple certs in `provisioned` state (rotation overlap window) but only one `active` at a time (app-layer constraint).
- mTLS root CA rotation is **not** managed here — it lives in `kms_keys` with `purpose='mtls_root'`. This table only tracks device leaf certs.
