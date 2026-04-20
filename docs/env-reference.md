# Mobile Env Reference — v1 Alpha

**Purpose:** Authoritative table of all environment and runtime flags the mobile alpha reads. Prevents drift between build-time and runtime flag semantics (see plan §3.5 + system design §5.4).

**Scope:** TBOT Mobile v1 internal alpha.
**Owners:** Mobile lead, infra lead.
**Source of truth:** this file. Any flag added to code without a row here is a CI failure (see §5).

---

## 1. Why this exists

Plan v0.2 critic review found a drift between Principle 5 ("single feature flag without rebuild") and the actual two-tier flag design (build-time + runtime). This reference exists so no future reader can be confused again. When you add a new flag, add a row here **first**, then land the code.

## 2. Flag table

| Name | Layer | Type | Default | Scope | Effect | Flip procedure |
|---|---|---|---|---|---|---|
| `EXPO_PUBLIC_V1_ROBOT` | Build-time (Expo env) | `"true"` / unset | unset | All users of the built app | When `"true"` at build time, `RobotScreen` is compiled into the bundle and registered at the home tab position. When unset, legacy `InteractionScreen` is home. **Changing it requires a rebuild + redistribution.** | `eas build --platform all` with the new env. Alpha builds ship with `"true"`. |
| `EXPO_PUBLIC_DEMO_SCREEN` | Build-time (Expo env) | `"true"` / unset | unset | Dev/demo | When `"true"`, dev-only `RobotDemoScreen` (twin debug grids) registered. Never shipped in alpha. | Same as above; alpha ships unset. |
| `EXPO_PUBLIC_API_BASE_URL` | Build-time | URL | `https://api.staging.tbot.internal` | All | Base for `/auth/*`, `/v1/*` API calls. | Build with the desired URL. |
| `EXPO_PUBLIC_TELEMETRY_ENDPOINT` | Build-time | URL | derived from API_BASE_URL | All | Where mobile posts telemetry events (§8.1 of system design). | Build-time override only. |
| `v1_robot_enabled_remote` | Runtime (backend config, fetched at session start) | `boolean` | `true` in alpha staging | All live sessions | When `false`, mobile refuses to enter `RobotScreen` for **new** sessions; in-flight sessions complete naturally. **The actual kill switch.** | `aws ssm put-parameter --name "/tbot/staging/config/v1_robot_enabled_remote" --value "false"`. Takes effect ≤ 60 s. See rollback runbook §2 Tier 0. |
| `blocklistVersion` | Runtime (backend config) | `"v\d+\.\d+\.\d+"` | `"v1.0.0"` | All live sessions | Mobile compares against its bundled blocklist; mismatch → warning log (does not block session in v1; informational only). | Backend config update. |
| `maxDailySessionsPerChild` | Runtime (backend, not surfaced to UI) | integer 1–100 | `30` | Per child | Backend rate-limiter bucket size. Mobile does not read directly; sees 429 on overflow. | Backend config update. |

## 3. Why two flags for rollback

- **`EXPO_PUBLIC_V1_ROBOT`** decides whether the v1 surface *exists* in a given build. Changing it requires a rebuild because Expo resolves `process.env.EXPO_PUBLIC_*` at bundle time (Metro). This flag is a **build lineage** marker — "was this build alpha-enabled or legacy-only?"
- **`v1_robot_enabled_remote`** decides whether the v1 surface *is active right now*. Changing it is a config flip, no rebuild, no store recall. This is the **runtime kill switch**.

You need both because: we want the alpha to ship behind a build-time gate so legacy users' builds never accidentally show the surface, AND we want to be able to turn the alpha off in ~60 s if safety requires it without shipping a new build.

## 4. Reading order at session start (mobile)

```ts
// pseudocode — tbot-mobile/src/state/session-gate.ts
async function canEnterRobotScreen(): Promise<"enter" | "legacy" | "kill"> {
  if (process.env.EXPO_PUBLIC_V1_ROBOT !== "true") return "legacy";
  const config = await fetchRuntimeConfig();   // GET /v1/config
  if (!config.v1_robot_enabled_remote) return "kill";
  return "enter";
}
```

Error path if `/v1/config` fetch fails:
- **First failure** → retry with 500 ms backoff, max 2 tries.
- **Still failing** → treat as `kill`. Fail-safe. Show "Let's try again in a moment" UI.

## 5. CI guardrail

`scripts/check-env-flags.mjs` (to be added under `task-v1-alpha-release-plumbing`) scans:
- `tbot-mobile/src/**/*.{ts,tsx}` for `process.env.EXPO_PUBLIC_*` references.
- `tbot-mobile/src/**/*.{ts,tsx}` for `config.v1_*` / `config.max*` accessors.
- Any name not listed in this file's §2 table → CI fail.

This prevents someone from adding `EXPO_PUBLIC_SOMETHING_EXPERIMENTAL` without documenting it here.

## 6. What not to do

- **Do not** treat `EXPO_PUBLIC_V1_ROBOT=false` as an emergency kill. It does not work that way — it requires a rebuild. Use `v1_robot_enabled_remote` for emergencies.
- **Do not** cache `config.v1_robot_enabled_remote` for more than one session. Re-fetch each session-start so Tier 0 flips take effect.
- **Do not** log any runtime config values that might contain secrets (none currently do, but future-proof this).
- **Do not** introduce a new `EXPO_PUBLIC_*` without adding a row to §2 in the same PR.

## 7. References

- [Plan §3.5 + Principle 5](../../.omc/plans/mobile-v1-internal-alpha-speech-ai.md)
- [System design §5.4](../../docs/site/releases/v1-alpha-internal.md)
- [Rollback runbook §2 Tier 0](../../docs/runbooks/mobile-v1-alpha-rollback.md)
- [OpenAPI `RuntimeConfig` schema](../../docs/packages/shared-data/openapi/live-alpha.yaml)
