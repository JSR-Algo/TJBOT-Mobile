# 16-mobile — ParentApp (Consumer Surface)

**System spec:** `docs/site/software/systems/16-parent-mobile-application.md`
**Owning service(s):** `ParentApp` (consumer surface only)
**Lane:** G (worker-6, Phase 2)

@stateless — No backend entities owned by this lane. ParentApp is a projection of entities from other lanes.

## Contents

- `mobile-projection-views.md` — documents which entities from other lanes ParentApp reads and writes via the API Gateway, and the access pattern for each.
