# External Actor — Realtime Voice Service

**Type:** External system.

**Source evidence:** `openRealtime` is implemented in `src/services/ws/realtime.{ts,js}` for the mobile observer lane. Production sessionId auto-attach and realtime provider wiring are not confirmed in source (KD10).

**Provider identity:** **NOT CONFIRMED IN SOURCE** (KD10).

**Used by domains:** `lesson-session` only.

## Delegation edges

See `reference/cross-domain-edges.json` for `kind: "delegate"` entries with target `ACTOR:RealtimeVoice` (UC-L02 Connect Realtime Voice, UC-L08 Process Utterance).
