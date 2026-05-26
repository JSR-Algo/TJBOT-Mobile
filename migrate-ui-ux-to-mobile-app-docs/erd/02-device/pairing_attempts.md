---
entity: pairing_attempts
domain: 02-device
service_owner: DeviceService
state_machine: .omc/plans/state-machines-mobile-ux.md#23-devicepairing
api_endpoints:
  - POST /v1/devices/pair/start
  - GET /v1/devices/pair/:token/status
  - POST /v1/devices/pair/:token/claim
sequences_referenced_in:
  - docs/sequences/02-device/consumer-provisioning.sequence.mmd
  - docs/sequences/02-device/decommission.sequence.mmd
  - docs/sequences/02-device/transfer.sequence.mmd
  - docs/sequences/02-device/factory-registration.sequence.mmd
retention: 30d
---

# pairing_attempts

## Business purpose

Records each attempt by a parent to pair a new TBot device to their household. A pairing attempt issues a short-lived token broadcast over BLE; the device reads the token, authenticates with the backend, and claims the pairing. Failed and expired attempts are retained 30 days for diagnostics then swept.

**Note:** The task brief used the term "device_pairings" (the audit business name); `pairing_attempts` is the ERD name matching SM plan §8.3. The existing `device_pairings` table in this folder models the completed BLE pairing handshake (different lifecycle stage); `pairing_attempts` models the token lifecycle.

## Ownership rules

- Owner service: `DeviceService`
- Writers: `DeviceService` (creates on pair-start; advances state on device claim or error), sweep worker (sets EXPIRED)
- Readers: `DeviceService` (token lookup on device auth), `ParentApp` (status polling), `OfflineSweepWorker` (expiry sweep)

## Lifecycle

- Create: on `POST /v1/devices/pair/start` — DeviceService mints token, writes row with state=TOKEN_ISSUED and expires_at=now()+10min.
- Update: state transitions only; state_version incremented on each write.
- Delete: never hard-deleted at close. `RetentionWorker` (sys-14) purges rows where `created_at < now() - interval '30 days'` and `state IN (PAIRING_FAILED, EXPIRED, CLAIMED)`.
- State machine: `.omc/plans/state-machines-mobile-ux.md#23-devicepairing`

  | From | To | Trigger |
  |---|---|---|
  | TOKEN_ISSUED | PROVISIONING | Device reads BLE token + calls /provision |
  | PROVISIONING | CLAIM_PENDING | Backend validates device cert; awaiting user confirm |
  | CLAIM_PENDING | CLAIMED | Parent confirms claim in app |
  | CLAIM_PENDING | PAIRING_FAILED | Timeout or cert mismatch |
  | PROVISIONING | PAIRING_FAILED | Cert validation failed |
  | TOKEN_ISSUED | EXPIRED | expires_at elapsed (sweep) |
  | PROVISIONING | EXPIRED | expires_at elapsed (sweep) |
  | CLAIM_PENDING | EXPIRED | expires_at elapsed (sweep) |

## Notes

### Partial index on expiry

The `idx_pairing_attempts_expiry` index ideally has a partial predicate `WHERE state IN ('TOKEN_ISSUED', 'PROVISIONING', 'CLAIM_PENDING')` to avoid scanning terminal rows. DBML cannot express this natively. The migration file adds:

```sql
CREATE INDEX idx_pairing_attempts_expiry_partial
  ON pairing_attempts(expires_at)
  WHERE state IN ('TOKEN_ISSUED', 'PROVISIONING', 'CLAIM_PENDING');
```

The DBML `Indexes` block carries the full-column index `(expires_at)` with a Note documenting the partial predicate.

## Related APIs

- `POST /v1/devices/pair/start` — create pairing attempt; returns token + expires_at
- `GET /v1/devices/pair/:token/status` — poll state (used by ParentApp pairing screen)
- `POST /v1/devices/pair/:token/claim` — parent confirms device claim; transitions CLAIM_PENDING → CLAIMED

## Related sequences

- `docs/sequences/02-device/consumer-provisioning.sequence.mmd` — full pairing flow
- `docs/sequences/02-device/decommission.sequence.mmd` — references pairing history during device offboard
- `docs/sequences/02-device/transfer.sequence.mmd` — transfer checks existing active pairing
- `docs/sequences/02-device/factory-registration.sequence.mmd` — factory uses separate path; pairing_attempts not used but references device_serial overlap

## Validation rules

- Only one non-terminal attempt per user_id allowed at a time (app-layer check; no DB constraint because terminal rows stay in table for audit).
- `token` is a 32-byte cryptographically random hex string; uniqueness enforced by index.
- `expires_at` must be in the future at creation time.
- `state_version` must increment monotonically; stale writes rejected.

## Edge cases

- **Re-pair after failure**: previous PAIRING_FAILED row is left; new attempt creates a new row.
- **Concurrent attempts**: second pair/start for same user_id returns 409 if active attempt exists (app layer).
- **Transfer context**: during device transfer, DeviceService validates no active pairing attempt exists before initiating transfer.
