# 05-safety — Conversation intelligence + safety

**System spec:** `docs/site/software/systems/05-conversation-intelligence-and-safety.md`
**Sequences:** `docs/sequences/05-safety/*.sequence.mmd`
**Owning service(s):** `SafetyService`, `BlocklistCache`, `TopicClassifier`, `PIIDetector`, `FallbackTemplateStore`
**Lane:** D (worker-3, Phase 2)
**Status:** entities extracted (Phase 2 complete).

## Entities

| Entity | DBML | Markdown | Retention | State machine |
|---|---|---|---|---|
| `safety_events` | [safety_events.dbml](./safety_events.dbml) | [safety_events.md](./safety_events.md) | coppa-180d | none |
| `safety_blocklist_entries` | [safety_blocklist_entries.dbml](./safety_blocklist_entries.dbml) | [safety_blocklist_entries.md](./safety_blocklist_entries.md) | hard (365d post-retire) | `@inline` |
| `safety_topics` | [safety_topics.dbml](./safety_topics.dbml) | [safety_topics.md](./safety_topics.md) | hard | none |
| `safety_pii_redactions` | [safety_pii_redactions.dbml](./safety_pii_redactions.dbml) | [safety_pii_redactions.md](./safety_pii_redactions.md) | coppa-180d | none |
| `fallback_templates` | [fallback_templates.dbml](./fallback_templates.dbml) | [fallback_templates.md](./fallback_templates.md) | hard (365d post-retire) | `@inline` |

## COPPA hard-gate (AC-4)

- `safety_events` and `safety_pii_redactions` carry `retention: coppa-180d` per §312.10 outer cap (child-linked rows).
- `safety_pii_redactions` MUST never hold raw PII — only the type, offset, length, and SHA-256 hash. A Phase 5 grep gate confirms.
- `safety_blocklist_entries`, `safety_topics`, `fallback_templates` hold curated content with no child PII → `retention: hard` (365d post-retire).

## Naming-collision pre-emption (plan §3 Q-6)

- `safety_topics` (sys-05 — unsafe-evasion topics) is intentionally distinct from `topics` (sys-06 — curriculum tag taxonomy, Lane E). Validator rule `no-cross-domain-name-collision` enforces.

## Cross-domain FKs (Phase 3 reconcile)

| Column on this side | Target | Owning lane |
|---|---|---|
| `safety_events.session_id` | `sessions.id` | Lane D / 04-realtime (intra-lane, declared in Phase 3 in 04-realtime side) |
| `safety_events.session_turn_id` | `session_turns.id` | Lane D / 04-realtime |
| `safety_events.child_profile_id` | `children.id` | Lane B / 01-identity |
| `safety_events.household_id` | `households.id` | Lane B / 01-identity |
| `safety_events.blocklist_version_id` | governance versioning (sys-05 §4 — not modelled here) | sys-05 (future expand) |
| `safety_events.safety_policy_version_id` | governance versioning (sys-05 §4) | sys-05 (future expand) |
| `safety_pii_redactions.session_id` | `sessions.id` | Lane D / 04-realtime |
| `safety_pii_redactions.session_turn_id` | `session_turns.id` | Lane D / 04-realtime |
| `safety_pii_redactions.child_profile_id` | `children.id` | Lane B / 01-identity |
| `safety_pii_redactions.household_id` | `households.id` | Lane B / 01-identity |
| `safety_blocklist_entries.created_by_admin_user_id` | `admin_users.id` | Lane B / 12-admin |
| `fallback_templates.created_by_admin_user_id` | `admin_users.id` | Lane B / 12-admin |

Columns are declared on this side with `// cross-domain ref → <OwnerService>` comment. `Ref:` lines live in the owning lane's files (Phase 3).

## Stateless service annotations

- `@stateless: BlocklistCache` — in-process cache; canonical rows live in `safety_blocklist_entries`.
- `@stateless: TopicClassifier` — classifier service; writes `safety_topics` rows owned above.
- `@stateless: PIIDetector` — detection middleware; writes `safety_pii_redactions` rows owned above.
