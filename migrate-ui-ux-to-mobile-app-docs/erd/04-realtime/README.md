# 04-realtime — Realtime session orchestrator

**System spec:** `docs/site/software/systems/04-realtime-session-orchestrator.md`
**Sequences:** `docs/sequences/04-realtime/*.sequence.mmd`
**Owning service(s):** `RealtimeService`, `Orchestrator`, `ControlPlane`, `RetentionScheduler`
**Lane:** D (worker-3, Phase 2)
**Status:** entities extracted (Phase 2 complete).

## Entities

| Entity | DBML | Markdown | Retention | State machine |
|---|---|---|---|---|
| `sessions` | [sessions.dbml](./sessions.dbml) | [sessions.md](./sessions.md) | coppa-180d (90d operational policy) | sys-04 §11.1 |
| `session_turns` | [session_turns.dbml](./session_turns.dbml) | [session_turns.md](./session_turns.md) | coppa-180d (30d operational policy) | sys-04 §7 |
| `session_transcripts` | [session_transcripts.dbml](./session_transcripts.dbml) | [session_transcripts.md](./session_transcripts.md) | coppa-180d (24h text-NULL, 30d hard-delete) | none — `cleared_at` marker |
| `phrase_cache_entries` | [phrase_cache_entries.dbml](./phrase_cache_entries.dbml) | [phrase_cache_entries.md](./phrase_cache_entries.md) | hard | `@inline` |
| `provider_failover_records` | [provider_failover_records.dbml](./provider_failover_records.dbml) | [provider_failover_records.md](./provider_failover_records.md) | 30d | none |

## COPPA hard-gate (AC-4)

- `sessions`, `session_turns`, `session_transcripts` carry `retention:` frontmatter — all reference COPPA §312.10 outer 180-day cap; production policy is shorter (24h text-clear / 30d turn / 90d session) and the retention worker enforces the tighter window.
- `safety_pii_redactions` (Lane D / 05-safety) also retention-bound.
- `phrase_cache_entries` holds no child PII (curated asset) → `retention: hard`.

## Cross-domain FKs (Phase 3 reconcile)

| Column on this side | Target | Owning lane |
|---|---|---|
| `sessions.device_id` | `devices.id` | Lane C / 02-device |
| `sessions.household_id` | `households.id` | Lane B / 01-identity |
| `sessions.child_profile_id` | `children.id` | Lane B / 01-identity |
| `session_transcripts.child_profile_id` | `children.id` | Lane B / 01-identity |
| `session_turns.prompt_version_id` | `prompt_template_versions.id` | (sys-05 governance — Phase 3 promote) |
| `session_turns.safety_policy_version_id` | `safety_policy_versions.id` | (sys-05 governance — Phase 3 promote) |
| `session_turns.blocklist_version_id` | `blocklist_versions.id` | (sys-05 governance — Phase 3 promote) |
| `phrase_cache_entries.created_by_admin_user_id` | `admin_users.id` | Lane B / 12-admin |

Columns are declared on this side with `// cross-domain ref → <OwnerService>` comment per `CONVENTIONS.md` §3. `Ref:` lines live in the owning lane's files.

## Stateless service annotations

- `@stateless: PhraseCache` — in-process / Redis-backed cache of pre-rendered phrases; persistence on rows of `phrase_cache_entries` owned above.
- `@stateless: RetentionScheduler` — cron-style scheduler; writes nothing of its own (mutates session / transcript rows owned above + emits sys-14 jobs).
