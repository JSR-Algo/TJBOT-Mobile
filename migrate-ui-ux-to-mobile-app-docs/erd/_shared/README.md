# _shared — Cross-cutting tables

**Owner:** Lane A (worker-1, Phases 3-5 only — Phase 2 lanes never touch this folder).

Tables here are used by ≥2 systems and have no single owning domain. The plan reserves the following slots:

| Entity | Used by |
|---|---|
| `audit_log` | nearly every system |
| `idempotency_keys` | sys-10, sys-17, sys-19, others (promoted from sys-17 in Phase 3 per plan §3 / R-2) |
| `outbox_events` | sys-04, sys-05, sys-07, sys-10, sys-19 (transactional outbox) |
| `feature_flags` | platform-wide |
| `i18n_strings` | sys-06, sys-10, sys-16 (if backend-served per plan §3 Q-8) |
| `media_assets` | sys-06, sys-20 (per plan Q-10 — DB row + S3 URI) |

Cross-system data-flow narrative lives in `cross-domain-data-flow.md` (created in Phase 3).
