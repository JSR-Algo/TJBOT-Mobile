---
entity: demo_session_overrides
domain: 22-demo
service_owner: DemoCLI
state_machine: none
api_endpoints: []
no_api: true
sequences_referenced_in:
  - docs/sequences/22-demo/retail-loop-attract-to-conversation.sequence.mmd
retention: 24h
---

# demo_session_overrides

## Business purpose

Short-lived per-session configuration overrides for retail demo interactions. Allows operators to customize a specific demo script, persona, or language for a device without reflashing the demo content partition. Rows are session-scoped and expire within 24 hours.

## Ownership rules

- Owner service: `DemoCLI`
- Writers: `DemoCLI` (operator sets overrides via CLI command before a demo session)
- Readers: `DemoCLI` (checked at session start on the device to override default interaction scripts)

## Lifecycle

- Create: when an operator runs a demo override CLI command before a scheduled demo session.
- Update: not mutated — operators create a new override row to replace an existing one.
- Delete: hard-deleted by DemoCLI sweep on device boot when `expires_at < now()`. Maximum retention is 24 hours or end of session, whichever comes first.
- State machine: none — rows are read-once and swept; no lifecycle states.

## Related APIs

- No REST APIs — managed exclusively via `tbot-demo` CLI commands.

## Related sequences

- `docs/sequences/22-demo/retail-loop-attract-to-conversation.sequence.mmd` — `interaction_id` maps to content slots in the retail loop; override replaces the default flash content for that slot

## Validation rules

- `expires_at` must be at most 24 hours after `created_at`.
- `override_data` must match the documented shape `{script?, persona?, language?}` — validated by DemoCLI before insert.
- `interaction_id` must match a valid slot from the demo content manifest on the target device.

## Edge cases

- **Override not consumed**: if the device never enters `DEMO_CONV` before `expires_at`, the override row is swept on next boot — no action required.
- **Multiple overrides**: if multiple rows exist for the same `(demo_device_id, interaction_id)`, DemoCLI selects the most recently created non-expired row.
- **No PII**: override data contains only script text or persona tags from the approved demo content library — never user-generated or personally identifiable content.
