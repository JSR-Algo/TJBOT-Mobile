# 21-testing — Integration Test Infrastructure

**System spec:** `docs/site/software/systems/21-integration-test-infrastructure.md`
**Owning service(s):** `CI`
**Lane:** G (worker-6, Phase 2)

@stateless — No production database tables. Test fixtures live in the `fixtures/` tree within the test infrastructure repo, not in the production schema.

## Rationale

Integration test infrastructure (sys-21) provides seed data, mock responses, and fixture injection for CI runs. All test state is ephemeral:

- Fixture datasets are loaded per test run and rolled back via transaction isolation.
- No fixture registry table exists in production PostgreSQL — fixture discovery is file-system-based (`fixtures/<domain>/*.json`).
- Test databases are provisioned fresh per CI pipeline run via `scripts/ci/seed-test-db.mjs`.

Any entity that CI tests write to is a production entity owned by its respective lane (B through G). CI never owns schema.
