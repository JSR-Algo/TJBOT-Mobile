# Edge Cases — `mobile-shell`

> Per UC, declare a non-empty subset of `{cancel, error, retry, timeout, unauthorized, validation, n/a}` plus rationale ≥ 20 chars per chosen mode. `n/a` rationale must contain a justification keyword from `{stateless, single-step, no-async, view-only, terminal}` (D5/AC6).
>
> `n/a` ratio per domain ≤ 50% (D5). This file: 0 n/a out of 1 UC = 0%.
>
> Referenced flow templates are informational: `docs/flows/edge-cases/*.flow.mmd`.

---

## UC-MOBILE01

- **error**: Unknown / malformed deep_link target must route to `app_error` (404 surface) without crashing the cold-start path; the boot continues even if no deep_link applies.
- **unauthorized**: Auth-required target with an anonymous user must route to `onb_login` carrying `nextRoute`; the prior signed-out target must not leak into authenticated screens.
- **validation**: Stale parent_session (idle_until passed) on a `parent_*` target must trigger UC-PR01 with `intendedTarget`, never bypass the gate.
- **timeout**: Optional server-side deep-link validation taking longer than the SLO must fall back to pure client-side routing; the user must never sit on a blank screen waiting for validation.

> Ref: `docs/flows/edge-cases/error.flow.mmd`, `docs/flows/edge-cases/unauthorized.flow.mmd`, `docs/flows/edge-cases/validation.flow.mmd`, `docs/flows/edge-cases/timeout.flow.mmd`
