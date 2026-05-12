---
entity: safety_blocklist_entries
domain: 05-safety
service_owner: SafetyService
state_machine: '@inline'
api_endpoints:
  - POST /internal/v1/admin/blocklists
  - GET /v1/admin/safety/blocklists
  - GET /v1/admin/safety/blocklists/:versionId
retention: hard
sequences_referenced_in:
  - docs/sequences/05-safety/input-filter.sequence.mmd
  - docs/sequences/05-safety/policy-publish.sequence.mmd
---

# safety_blocklist_entries

## Business purpose

Relational expansion of the per-version blocklist JSON: one row per regex pattern, tagged with category, severity action, locale, and pattern-NFA worst-case steps. Designed for fast per-locale boot loading by `BlocklistCache` and for queryable post-incident analysis ("which pattern matched? which version was active?"). Append-only — patterns are never deleted, only retired by the next version.

## Ownership rules

- Owner service: `SafetyService`
- Writers: `SafetyService` admin pipeline (`POST /internal/v1/admin/blocklists`) writes all entries for a new version inside one transaction. `BlocklistCache` reads only — never writes.
- Readers: `BlocklistCache` (orchestrator-side in-memory load at boot + on publish event); `SafetyInvestigationService` (sys-12) post-incident lookup; admin tooling for diff between versions.

## Lifecycle

- Create: admin draft → publish via `POST /internal/v1/admin/blocklists` → bulk INSERT of all entries, `published_at` set on transaction commit, prior version's entries get `retired_at` stamped. Atomic.
- Update: never — append-only. Edits to a pattern require a new version_no.
- Delete: hard-delete after 365d post-retirement (no PII; pure operational data) — runbook-driven, not a routine sweep.
- State machine (inline): `draft (published_at IS NULL) → published (published_at set) → retired (retired_at set)`.

## Related APIs

- `POST /internal/v1/admin/blocklists` — atomic publish; gated by red-team suite (sys-05 §16) + pattern-NFA backtracking probe.
- `GET /v1/admin/safety/blocklists` — list all versions + counts per category.
- `GET /v1/admin/safety/blocklists/:versionId` — full entry list for one version.

## Related sequences

- `docs/sequences/05-safety/input-filter.sequence.mmd` — `BlocklistCache` consults active entries at every turn (<5ms budget).
- `docs/sequences/05-safety/policy-publish.sequence.mmd` — publish gate flow: pattern compile + backtracking probe + red-team regression check before flipping `published_at`.

## Validation rules

- `(pattern_sha256, locale, version_no)` unique — no duplicate patterns within a version-locale tuple.
- `severity='block_with_redirect'` requires `redirect_category` non-NULL.
- `severity='family_configurable'` requires `family_configurable_key` non-NULL.
- `max_pattern_steps` populated at publish time by validation pipeline; rejected if > 1_000_000 (catastrophic backtracking guard).
- `category` MUST be one of the 12 enumerated categories in sys-05 §8 — enforced in admin handler (no DB CHECK because the set evolves slowly).

## Edge cases

- **Concurrent publish race:** atomic transaction inserts entries + sets `published_at` + retires prior version in one statement — no in-flight reader sees a partial version.
- **Auto-promote backflow:** when production traffic surfaces a new unsafe pattern (auto_promoted_from_event), it lands as a `draft` entry; admin reviews + promotes to `curated` in the next publish.
- **Rollback:** rolling back to a prior version_no does NOT require restoring deleted rows — older versions stay in the table with `retired_at` set; admin "rollback" simply flips the version pointer in `safety_policy_versions.blocklist_version_id`.
- **No cross-domain FK on this side:** `created_by_admin_user_id` cross-references sys-12; the Ref: lives in 12-admin (admin side owns the audit relationship). Phase 3 reconciles.
- **Retention:** unlike child-PII tables, this is a curated catalog with no child data. Hard-delete is operational, not COPPA-driven.
