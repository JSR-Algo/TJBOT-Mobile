# 18-wire-protocol — Wire Protocol Domain Types

**System spec:** `docs/site/software/systems/18-wire-protocol-domain-types.md`
**Owning service(s):** wire-protocol (shared types — no persistent owner)
**Lane:** G (worker-6, Phase 2)

@stateless — no database tables. This folder contains shared enum/type declarations only.

## What is here

`wire-protocol-domain-types.dbml` — a single DBML file with `enum` declarations only. No `Table` blocks. These types are cross-referenced by domain DBML files across multiple systems.

## Declared types

| Type | Domain |
|---|---|
| `ws_close_code` | WebSocket close codes (4000–4006) |
| `session_turn_role` | child / assistant |
| `transcript_segment_kind` | speech / intent / safety_event / system_annotation |
| `safety_severity` | low / medium / high / critical |
| `safety_action` | allow / redact / block / escalate |
| `delivery_channel` | push_ota / pull_config / mqtt_command / webhook |
| `billing_tier` | free / plus / enterprise |
| `entitlement_source` | stripe_subscription / promotional / trial / admin_override |
| `device_capability` | voice_input / servo_face / led_ring / proximity_sensor / touch_sensor / wifi variants |
| `notification_channel` | push_apns / push_fcm / email_ses / sms_sns |

## Usage

Domain DBML files import these types by name. DBML does not have an explicit import mechanism — domain files must copy the enum declaration or reference this file in a comment. Phase 3 will establish whether global-erd.dbml concatenation handles deduplication.
