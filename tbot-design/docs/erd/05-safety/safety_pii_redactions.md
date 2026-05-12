---
entity: safety_pii_redactions
domain: 05-safety
service_owner: SafetyService
state_machine: none
api_endpoints:
  - GET /v1/admin/safety/pii-redactions
retention: coppa-180d
sequences_referenced_in:
  - docs/sequences/05-safety/input-filter.sequence.mmd
  - docs/sequences/05-safety/output-filter.sequence.mmd
  - docs/sequences/05-safety/safety-event-fanout.sequence.mmd
---

# safety_pii_redactions

## Business purpose

Privacy-preserving ledger of every PII detection event. Records **what type of PII was detected and where in the transcript** but **never the raw value**. The matched substring lives transiently in [[session_transcripts]] (24h text-clear sweep); after that, the only durable artifact is the type+position+SHA-256 hash here. Required for (a) COPPA §312.10 audit ("we detected and did not store"), (b) parent weekly PII counter (sys-07), (c) per-type dashboards (sys-11), (d) admin investigation timelines (sys-12).

## Ownership rules

- Owner service: `SafetyService` (via `PIIDetector` module)
- Writers: `PIIDetector` (sync inside `POST /internal/v1/conversation/generate`); paired 1:1 with a [[safety_events]] row (one redaction = one event of type `input_pii_detected` or `output_pii_emitted`).
- Readers: `SummaryWorker` (sys-07 weekly summary PII counter); `SafetyInvestigationService` (sys-12); `TelemetryService` (per-type rate trends); `RetentionWorker` (sys-14) cascading on child deletion.

## Lifecycle

- Create: written synchronously when `PIIDetector` matches one of the 10 types. The corresponding [[safety_events]] row is written first; `safety_event_id` is FK-linked here.
- Update: never (append-only); `purged_at` is the only post-write mutation, set by retention sweep when the row is hard-deleted (a soft marker preserved for aggregate counters).
- Delete: hard-delete at 180d (COPPA §312.10) OR earlier on child account deletion (sys-14 cascade).
- State machine: none — single-shot ledger entry.

## Related APIs

- `GET /v1/admin/safety/pii-redactions` — operator dashboard; never returns raw PII (impossible — it isn't stored).
- Indirect: written from `POST /internal/v1/conversation/generate`.

## Related sequences

- `docs/sequences/05-safety/input-filter.sequence.mmd` — PII detection during input pipeline step 4.
- `docs/sequences/05-safety/output-filter.sequence.mmd` — PII leak in output (sys-05 §20 P1 alert canary).
- `docs/sequences/05-safety/safety-event-fanout.sequence.mmd` — fan-out to sys-07 / sys-10 / sys-11 consumers.

## Validation rules

- `safety_event_id` unique (1:1 with [[safety_events]]).
- `match_position` ≥ 0; `match_length` ≥ 1.
- `transcript_hash` MUST equal SHA-256 of the normalized transcript at detection time (allowing forensic correlation with [[session_transcripts]].transcript_sha256 while the latter survives — the hash itself is durable).
- `detection_pattern` MUST be an opaque identifier — never the raw regex source (the regex itself is fingerprinted; raw regex lives only in [[safety_blocklist_entries]] / detector module).
- `disposition='redacted_and_logged'` requires the response path replaced the PII span with `[redacted]` before any TTS — orchestrator-enforced.
- `disposition='allowed_after_review'` is reserved for support-tool override; requires admin audit trail in sys-12.

## Edge cases

- **First-name-only is NOT PII (sys-05 §9 tip):** "My name is Mia" doesn't trigger; only full-name disclosure does. No row written.
- **SSN false positive guard:** when a SSN-shape match co-occurs with a ZIP-code match, the SSN match is suppressed — sys-05 §9 — and no row is written for the SSN.
- **Output PII (`output_pii_emitted`):** if the LLM emits PII (a regression), a row is written + sys-05 P1 alert fires; in steady-state this should be 0 events.
- **Cross-domain cascade:** when sys-14 deletes a child, `child_profile_id`-matched rows MUST be hard-deleted within 24h regardless of the normal 180d cap; runbook owned by sys-14.
- **Hash collision:** SHA-256 collisions are negligible at our scale; we accept the cryptographic guarantee rather than pairing with a salt that would render forensic correlation impossible.
- **No raw PII anywhere:** validator rule (Phase 5) MUST grep the entire table at runtime to confirm no column ever holds raw PII text. This is a COPPA P0 hard-gate.
