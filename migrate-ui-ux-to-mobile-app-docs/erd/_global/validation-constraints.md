# Validation & Constraints (§8)

Aggregated index of every validation rule, constraint, and enum across the 102-entity ERD. Sourced from per-entity `.dbml` files (DB-level) and per-entity `.md` "Validation rules" sections (app-level).

## 1. Primary keys (102)

- Every entity has a single `id uuid [pk]`.
- No `serial`, `bigserial`, or composite PKs anywhere — enforced by `entity-has-pk` validator rule.
- Source: every `<entity>.dbml`.

## 2. Unique constraints (64)

Counted by `[unique` matches in `global-erd.dbml`. Cite the producing entity file.

### Identity / auth

- `users.email` (RFC 5321 case-insensitive at app layer) — `docs/erd/01-identity/users.dbml`.
- `(household_id, user_id)` on `household_members` — `docs/erd/01-identity/household_members.dbml`.
- `refresh_tokens.token_hash` — `docs/erd/01-identity/refresh_tokens.dbml`.
- `email_verifications.token_hash` — `docs/erd/01-identity/email_verifications.dbml`.
- `password_reset_tokens.token_hash` — `docs/erd/01-identity/password_reset_tokens.dbml`.

### Admin / security

- `admin_users.email` — `docs/erd/12-admin/admin_users.dbml`.
- `admin_sessions.token_hash` — `docs/erd/12-admin/admin_sessions.dbml`.
- `(admin_user_id, role)` on `admin_role_assignments` (partial — active only) — `docs/erd/12-admin/admin_role_assignments.dbml`.
- `kms_keys.alias` — `docs/erd/13-security/kms_keys.dbml`.
- `(secret_name, version)` on `secret_versions` — `docs/erd/13-security/secret_versions.dbml`.
- `mtls_certificates.certificate_fingerprint` — `docs/erd/13-security/mtls_certificates.dbml`.

### Devices / config / OTA

- `devices.serial`, `devices.cert_serial` (when present) — `docs/erd/02-device/devices.dbml`.
- `(host_alg, fingerprint)` on `mtls_certificates`-like extension — covered above.
- `(document_id, version)` on `config_versions` — `docs/erd/08-config/config_versions.dbml`.
- `config_signing_keys.alias` — `docs/erd/08-config/config_signing_keys.dbml`.
- `(release_id, device_id)` on `ota_assignments` — `docs/erd/09-ota/ota_assignments.dbml`.

### Notifications / billing / shared

- `(user_id, platform, device_install_id)` on `push_tokens` — `docs/erd/10-notifications/push_tokens.dbml`.
- `stripe_customers.user_id` and `stripe_customers.stripe_customer_id` — `docs/erd/19-billing/stripe_customers.dbml`.
- `stripe_webhook_events.stripe_event_id` (idempotency by Stripe event id) — `docs/erd/19-billing/stripe_webhook_events.dbml`.
- `(service_name, request_key)` on `idempotency_keys` — `docs/erd/_shared/idempotency_keys.dbml`.
- `(key, locale)` on `i18n_strings` — `docs/erd/_shared/i18n_strings.dbml`.
- `(key, scope, scope_target_id)` on `feature_flags` — `docs/erd/_shared/feature_flags.dbml`.

(Truncated to high-signal subset; the validator enforces the complete list.)

## 3. Foreign-key constraints

75 LIVE `Ref:` lines (declared in the relevant `<entity>.dbml`). 56 cross-folder column-level FKs stay commented and are documented in `_shared/cross-domain-data-flow.md`.

`fk-reachable` validator rule is GREEN across the global ERD — every LIVE Ref's target column exists.

Notable cascade conventions (see `relationships.md` for the complete table):

- `cascade-delete-coppa` — every entity child-anchored at `children.id` cascades on COPPA hard-delete. Scope-anchor entity: `docs/erd/01-identity/children.md`.
- `cascade-soft-delete` — households / devices propagate scheduled deletion to dependent entities.
- `restrict` — audit / immutable / append-only tables (admin_commands, audit_log, factory_records, device_decommissions, ota_crash_reports, ota_pause_decisions, deletion_requests, deletion_jobs, publication_records, content_revisions, key_rotations, audit_events, mutation_log, notification_receipts).
- `nullify` — `devices.assigned_child_id` and `cost_attributions.household_id` (preserve row, null the column).

## 4. Enum constraints (109)

109 `enum` declarations. Status enums (49) drive `state-machine-alignment` rule. Categorical enums (60) carry typed taxonomy (e.g. `device_capability`, `push_token_platform`, `mfa_method`, `notification_channel`, `pii_type`, `kms_key_purpose`, etc.). Every enum is referenced by at least one column.

See `state-machine-alignment.md` for the full status-enum index.

## 5. Business validation rules (app-layer, by entity)

Synthesised from `Validation rules` sections in entity `.md`. Grouped by category.

### Email + identifier validation

- `users.email` — lower-cased + trimmed + RFC 5321 length cap (`varchar(254)`). Sanitization per sys-01 §4.10.
- `admin_users.email` — corporate-domain allow-list at app layer.
- `i18n_strings.locale` — BCP-47 regex.
- `households.timezone` — IANA tzdata.
- `households.locale` — BCP-47.

### Password / token policy

- `users.password_hash` — zxcvbn ≥3, argon2id/bcrypt at rest.
- `admin_users.password_hash` — ≥14 chars, 12-month reuse window.
- `refresh_tokens.token_hash` — constant-time comparison; SHA-256 / argon2.
- `mtls_certificates.certificate_fingerprint` — SHA-256 colon-hex.
- `media_assets.checksum_sha256` — 64 hex chars.

### COPPA / retention

- `children` — `retention: coppa-on-deletion` mandatory (validator hard-gate).
- `sessions`, `session_turns`, `session_transcripts` — propagate child retention.
- `daily_summaries`, `weekly_summaries`, `topic_decay_state`, `content_personalization_snapshots`, `safety_events`, `safety_pii_redactions`, `telemetry_events` (child-scoped), `entitlements` — all carry COPPA-bound retention.

### State-machine transitions (app-enforced)

Forward-only transitions on:

- `safety_investigations` (open → investigating → resolved | escalated).
- `deletion_requests`, `deletion_jobs`.
- `ota_releases`, `ota_assignments`.
- `content_drafts`, `review_assignments`, `publication_records`.

`refresh_tokens.status='rotated' → 'replayed'` triggers session revoke (sys-01 §7.4).

### Cardinality invariants

- Exactly one `(owner, active)` row per household in `household_members` (partial unique index in DDL emitter).
- Exactly one `active` `secret_versions` row per `secret_name`.
- At most one `pending` `email_verifications` / `password_reset_tokens` per `(user_id, purpose)`.
- At most one `active` `auth_session_status` per `(user_id, client_type)` is **not** enforced — concurrent devices allowed.

### File / URL / format validation

- `media_assets.s3_uri` — `^s3://[a-z0-9.-]+/.+$` + bucket policy per `kind`.
- `media_assets.content_type` — MIME allow-list per `kind`.
- `notification_templates.body` — Mustache placeholders validated against same set across locales.
- `audit_log.action` — `^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$` (verb.noun).

### Money + cost

- All currency columns are `bigint cents` per CONVENTIONS §5; exception: `bigint micros` for sub-cent LLM cost attribution (sys-04 + sys-11) with explicit DBML `Note:` declaring the unit.
- `invoices.amount_due_cents`, `orders.total_cents`, `subscription_plans.price_cents`, `entitlements.cap_cents` — all cents.
- `cost_attributions.cost_micros`, `provider_failover_records.cost_micros` — micros (annotated).

### Polymorphic columns (app-validated)

- `audit_log.target_table` ∈ generated allow-list (every table name in the platform).
- `audit_log.actor_type` ∈ {`user`, `admin_user`, `service`, `system`, `device`}.
- `idempotency_keys.actor_type` ∈ {`user`, `admin`, `device`, `service`}.
- `feature_flags.scope_target_id` validated per `scope`.
- `api_keys.owner_id` validated per `type` (device / service / partner).

## 6. Hot-path constraints (composite indexes)

258 composite-index declarations across the ERD. The `index-justified` validator rule (WARN) requires composite indexes to cite the motivating sequence file in a DBML `Note:`. **4 advisory WARNs remain** — non-blocking. See `indexes.md` for the full catalogue.

## 7. Cross-cutting validators (Phase 1 + Phase 3 tooling)

The validator at `scripts/erd/validate-erd.mjs` enforces:

| Rule | Severity | Enforces |
|---|---|---|
| `dbml-syntax` | FAIL | no `serial`, no `varchar()` w/o length, no naive `timestamp`, no inline `[ref:]`, no `numeric` for money |
| `entity-has-pk` | FAIL | every table has `[pk]` |
| `entity-has-timestamps` | FAIL | every table has `created_at` + `updated_at` (unless `@stateless`) |
| `fk-reachable` | FAIL | every `Ref:` resolves |
| `no-cross-domain-name-collision` | FAIL | unique table names across all folders |
| `entity-md-required` | FAIL | every `.dbml` has a sibling `.md` |
| `entity-md-frontmatter` | FAIL | entity `.md` has `entity`, `domain`, `service_owner`, `retention` |
| `entity-md-sequences-referenced` | WARN | `sequences_referenced_in` ≥ 1 (or `@no-sequence`) |
| `service-has-entities` | WARN | every backend actor owns ≥ 1 entity (or `@stateless`) |
| `state-machine-alignment` | WARN | entity with `<entity>_status` enum has `state_machine:` in frontmatter |
| `index-justified` | WARN | composite index cites motivating sequence |
| `cross-domain-fk-documented` | WARN | cross-folder ref mentioned in `_shared/cross-domain-data-flow.md` |

## 8. Build-time global validation

`npm run erd:full` runs the full validator + concatenates the global DBML + renders Mermaid. Phase 3 exit: 0, no FAILs, 28 advisory WARNs.
