# Edge Cases — `parent-gate`

> Per UC, declare a non-empty subset of `{cancel, error, retry, timeout, unauthorized, validation, n/a}` plus rationale ≥ 20 chars per chosen mode. `n/a` rationale must contain a justification keyword from `{stateless, single-step, no-async, view-only, terminal}` (D5/AC6).
>
> `n/a` ratio per domain ≤ 50% (D5).

---

## UC-PR01

- **validation**: Incorrect number entry must keep the user on the gate screen with a visible error message; the gate must not advance on wrong input.
- **cancel**: User tapping "Back to play" must return to `home_hub_idle` without unlocking any parent surface; no partial unlock state must persist.
- **unauthorized**: Repeated incorrect entries (prototype threshold ≥ 3) should surface a cooldown message to deter brute-force guessing, even though the gate is a speed-bump not RBAC (KD4).
