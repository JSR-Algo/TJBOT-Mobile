---
entity: phrase_cache_entries
domain: 04-realtime
service_owner: RealtimeService
state_machine: '@inline'
api_endpoints:
  - GET /v1/admin/phrase-cache
  - POST /v1/admin/phrase-cache
  - PATCH /v1/admin/phrase-cache/:id
  - POST /v1/admin/phrase-cache/:id/retire
retention: hard
sequences_referenced_in:
  - docs/sequences/04-realtime/provider-failover.sequence.mmd
  - docs/sequences/05-safety/fallback-selection.sequence.mmd
---

# phrase_cache_entries

## Business purpose

Registry of pre-rendered TTS audio (Opus / PCM16) used to serve common phrases without a Google TTS round-trip — both as a normal fast-path optimization (greetings, scripted intents) and as the last-resort TTS failover when the live TTS circuit is open. Each row maps a normalized phrase text to an S3 audio URI plus optional pre-computed expression-sync frames. The phrase cache is the **audio counterpart** to sys-05's [[fallback_templates]] (text counterpart); the two are intentionally separate per plan §13.

## Ownership rules

- Owner service: `RealtimeService`
- Writers: `Orchestrator` (lazy auto-promote: when a generated LLM phrase exceeds hit threshold and clears moderation, an auto-promoted row is inserted with `origin='auto-promoted-from-llm'`), admin tools via `POST /v1/admin/phrase-cache`, `PATCH /v1/admin/phrase-cache/:id` (curation), retire workflow.
- Readers: every `Orchestrator` instance preloads the active set for its serving locales at boot (~50 MB in-memory cache per sys-04 §8). `hit_count` updated via background-buffered increments to avoid DB write per cache hit.

## Lifecycle

- Create: admin curates a new phrase OR orchestrator auto-promotes a frequent LLM response after moderation. INSERT with `status='active'`, `version_no=1`.
- Update: TTS voice regeneration / text edit → `version_no` increments, new S3 object URI written, old object remains until retire. `hit_count` / `last_hit_at` updated asynchronously by a batch flush.
- Delete: hard-delete after `retired_at + 90d` (operational policy; not COPPA-sensitive — no child PII). Retirement is the soft-stop; hard-delete clears S3 lifecycle policy artefacts.
- State machine (inline): `active → retired` (admin), `active → rebuilding` (TTS regen in progress, served from old S3 URI until swap), `rebuilding → active` (new version published). No row is ephemeral / session-scoped — entries are a curated asset, not derived state.

## Related APIs

- `GET /v1/admin/phrase-cache` — list/filter by locale / age / hit_count.
- `POST /v1/admin/phrase-cache` — admin curation (sys-12 console).
- `PATCH /v1/admin/phrase-cache/:id` — promote auto-promoted-from-llm → curated, update text / voice.
- `POST /v1/admin/phrase-cache/:id/retire` — soft retire (sets `status='retired'`, `retired_at=now()`).

## Related sequences

- `docs/sequences/04-realtime/provider-failover.sequence.mmd` — TTS circuit open → orchestrator falls back to phrase cache lookup by normalized text.
- `docs/sequences/05-safety/fallback-selection.sequence.mmd` — sys-05 selects a fallback template (text), then orchestrator looks up its audio in phrase_cache_entries.

## Validation rules

- `phrase_text_sha256` MUST equal SHA-256 of NFKD-lowercased `phrase_text` — write-time check.
- `(phrase_text_sha256, locale, age_band, voice_profile)` uniqueness prevents duplicate cache rows for the same lookup key.
- `audio_size_bytes` <= 1 MB (orchestrator buffer cap).
- `version_no` strictly monotonic — no reuse of previous values.
- `status='active'` rows MUST have `audio_s3_uri` reachable at boot — startup smoke check fails fast.

## Edge cases

- **Cache miss during TTS failover:** sys-04 §8 last-resort table — when phrase cache misses AND live TTS circuit is open → orchestrator sends `LLM_TOKEN` text frames if device supports text fallback. The miss is logged and may seed an admin curation task.
- **Voice profile rotation:** when a new voice is deployed, ALL active rows for the old voice are retired in bulk. Rebuild jobs re-render the canonical phrase list under the new voice.
- **Auto-promote moderation:** auto-promoted rows are quarantined (status='active' but a hidden `origin` filter excludes them from admin "curated" view) until reviewer console (sys-20) signs off.
- **Hot-key bias:** `hit_count` aggressively increments for greeting phrases; we cap LRU eviction to avoid losing rarely-used safety phrases. Safety phrases (`origin='failover-canned'`) are pinned.
- **No COPPA exposure:** the phrase text is curator-supplied, never derived from a specific child utterance verbatim; auto-promote pipeline filters any PII patterns identically to sys-05 input filter.
