# 12-admin — Support + admin operations

**System spec:** `docs/site/software/systems/12-support-admin-operations.md`
**Sequences:** `docs/sequences/12-admin/*.sequence.mmd`
**Owning service(s):** `AdminAuthService`, `AdminCommandService`, `SafetyInvestigationService`, `DeviceTransferService`
**Lane:** B (worker-1, Phase 2)
**Status:** pending entity extraction.

## Planned entities (from plan §3 manifest)

| Entity | Role |
|---|---|
| `admin_users` | Admin operators (distinct from end-user `users`). |
| `admin_sessions` | Admin session records (MFA-bound). |
| `admin_commands` | Audit log of admin actions. |
| `safety_investigations` | Investigation case file. |
| `admin_role_assignments` | RBAC mapping. |

## Stateless service annotations

- `@stateless: DeviceTransferService` — admin-mediated transfer helper; writes `device_transfers` rows owned by Lane C, plus `admin_commands` audit rows owned here.
