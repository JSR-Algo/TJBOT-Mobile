---
entity: demo_devices
domain: 22-demo
service_owner: DemoCLI
state_machine: none
api_endpoints: []
no_api: true
sequences_referenced_in:
  - docs/sequences/22-demo/demo-content-build-and-flash.sequence.mmd
  - docs/sequences/22-demo/retail-loop-attract-to-conversation.sequence.mmd
retention: hard
---

# demo_devices

## Business purpose

Registry of physical TBOT devices configured for retail demo mode. Scratch records with no PII; used by DemoCLI to track which units have demo content flashed, their demo content version, and whether demo mode is currently enabled. No production user data is linked.

## Ownership rules

- Owner service: `DemoCLI`
- Writers: `DemoCLI` (creates/updates on flash operations; `demo_enabled` toggled by operator)
- Readers: `DemoCLI` (fleet management), operations tooling

## Lifecycle

- Create: when an operator runs `tbot-demo flash` on a new device for the first time.
- Update: `demo_content_version` updated on each flash; `demo_enabled` toggled by operator; `last_seen_at` updated on analytics flush.
- Delete: hard — devices are removed from registry when decommissioned from retail.
- State machine: none — `demo_enabled` boolean is the only state; no transitions to track.

## Related APIs

- No REST APIs — managed exclusively via `tbot-demo` CLI commands.

## Related sequences

- `docs/sequences/22-demo/demo-content-build-and-flash.sequence.mmd` — flash operation registers/updates this row
- `docs/sequences/22-demo/retail-loop-attract-to-conversation.sequence.mmd` — `demo_enabled` flag read at device boot to enter demo mode

## Validation rules

- `serial_number` is unique — enforced by DB unique index.
- No PII stored — `retail_location` is a description (e.g. "Best Buy NYC display"), not personally identifiable.
- `device_id` FK to `devices` is optional/nullable — a demo device may not have a corresponding production device row.

## Edge cases

- **Optional device FK**: `device_id` is nullable; a demo unit in retail need not be registered in the production DeviceService. Phase 3 reconciliation will confirm whether this cross-domain FK is needed or should be dropped.
- **Content-addressable flash**: the same `demo_content_version` string on two different units guarantees identical content (manifest hash per sequence spec). `demo_content_version` is the manifest hash or version tag, not a row PK.
