# 08-config — Config fleet management

**System spec:** `docs/site/software/systems/08-config-fleet-management.md`
**Sequences:** `docs/sequences/08-config/*.sequence.mmd`
**Owning service(s):** `ConfigService`, `ConfigAssembler`, `ConfigSigner`, `CohortResolver`, `SchemaTransformer`
**Lane:** F (worker-5, Phase 2)
**Status:** complete — 6 entities.

## Entities

| Entity | Role |
|---|---|
| `config_documents` | 1:1-per-device handle pointing at the active signed config blob. |
| `config_versions` | Append-only audit trail of every signed config ever issued (immutable record). |
| `config_cohorts` | Named device groups for template targeting; shared with sys-09 OTA rollouts. |
| `config_assignments` | Explicit (cohort, device) membership rows — highest-precedence resolution path. |
| `config_signing_keys` | KMS-backed ECDSA P-256 keys + rotation lifecycle (current/next/decommissioning/retired). |
| `config_push_events` | MQTT push + HTTPS fetch + apply telemetry; drives reconciliation + propagation-status dashboard. |

## Stateless service annotations

- `@stateless: ConfigAssembler` — assembles `config_versions` rows from inputs.
- `@stateless: ConfigSigner` — KMS-backed signer; writes signatures into `config_versions`.
- `@stateless: CohortResolver` — resolves cohort membership at fetch time.
- `@stateless: SchemaTransformer` — schema migration helper; no own entity.
