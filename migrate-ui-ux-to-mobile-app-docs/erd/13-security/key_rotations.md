---
entity: key_rotations
domain: 13-security
service_owner: SecurityService
state_machine: '@inline'
api_endpoints:
  - POST /security/keys/:id/rotate
  - POST /security/secrets/:name/rotate
retention: hard
sequences_referenced_in:
  - docs/sequences/13-security/ota-key-rotation-ceremony.sequence.mmd
---

# key_rotations

## Business purpose

Immutable ceremony log: every key/secret rotation produces one row, regardless of outcome. Drives the SOC-2 rotation cadence dashboard and the auto-pause logic for stale keys.

## Ownership rules

- Owner service: `SecurityService`
- Writers: rotation orchestrator (synchronously inside ceremony).
- Readers: SOC-2 audit pipeline, sys-11 telemetry, `SecurityEngineer` dashboard.

## Lifecycle

- Create: at start of ceremony with `status='completed' | 'failed' | 'rolled_back'` set at finish.
- Update: forbidden (row immutable).
- Delete: by sys-14 retention after 7-year SOC-2 window.
- State machine: none — the row reflects ceremony outcome at end, never transitions.

## Related APIs

- `POST /security/keys/:id/rotate` — primary trigger.
- `POST /security/secrets/:name/rotate` — secret-only rotation.

## Related sequences

- `docs/sequences/13-security/ota-key-rotation-ceremony.sequence.mmd` — two-person ceremony.

## Validation rules

- `rotated_at` ≤ `new_key_active_at`.
- `rotation_method='emergency'` requires `notes` non-empty.
- `kms_key_id` is null only when rotation is purely against `secret_versions`.

## Edge cases

- Failure mode (`rolled_back`): predecessor key/secret stays active; downstream services notified via emitted `security_events`.
- Two simultaneous rotation attempts on the same `secret_name` must fail — advisory lock at orchestrator + app-layer guard.
