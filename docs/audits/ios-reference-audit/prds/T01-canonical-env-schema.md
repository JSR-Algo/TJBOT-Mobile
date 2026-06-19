# T01: Canonical env schema, EAS alignment, and Expo capabilities

## Status
Registry status: **NOT_STARTED** | Priority: **P0** | Blast radius: **HIGH**

## Problem
Production environment keys are fragmented across `eas.json`, `metro.config.js`, `src/config.ts`, `.detoxrc.js`, `app.json`, and `package.json`. The result is that release builds can silently target the wrong backend and E2E runs can test against stale bundles.

Specific issues from the audit:

- `eas.json` production profile (lines 17–23) sets `EXPO_PUBLIC_API_BASE_URL` and `EXPO_PUBLIC_DEMO_SCREEN`, but `src/config.ts` reads `TBOT_API_URL`/`TBOT_AI_URL` from `src/__env__.ts`. The `EXPO_PUBLIC_*` keys are ignored, so production EAS builds fall back to the hosted fallback in `src/config.ts`. The audit originally cited a hard-coded Cloudflare tunnel fallback; the current `src/config.ts` (lines 16–19) already uses the Render fallback, but the key mismatch remains.
- `metro.config.js` (lines 31–49) parses `.env` and writes `src/__env__.ts` at Metro load time. This dirties git, races in CI/EAS, and can embed stale env values in cached bundles (`project-health.md` Improvements, `metro.config.js` lines 31–49).
- `.detoxrc.js` (line 16) `require`s `./metro.config.js`, which triggers the `src/__env__.ts` write during Detox build. Its `launchArgs` (lines 39–43, 51–55) pass `TBOT_API_URL`/`TBOT_AI_URL` but omit a canonical `WS_URL` (`project-health.md` Bottlenecks).
- `app.json` is bare: no `expo-notifications` plugin, no `orientation`, no URL `scheme`, and no iOS/Android background modes (`project-health.md` Improvements).
- `package.json` has no `engines.node` and no `browserslist`, leaving the Node/pnpm version and bundle targets unconstrained (`project-health.md` Improvements).

Audit sources:
- `MASTER_AUDIT.md` §Cross-Cutting Themes 2 (lines 20–24)
- `reports/project-health.md` §Improvements (lines 45–54) and §Bottlenecks (lines 69–70)

## Scope

### In scope
- `eas.json` — production (and staging-device) `env` blocks
- `src/config.ts` — env consumption and fallback policy
- `metro.config.js` — remove source-tree env generation
- `.detoxrc.js` — launchArgs and removal of the Metro require
- `app.json` — Expo plugins, orientation, scheme, background modes
- `package.json` — `engines.node` and `browserslist`
- `src/__env__.ts` — delete and add to `.gitignore`

### Out of scope
- `src/services/ws/realtime.ts` runtime WS URL derivation (owned by T08)
- `.env` file contents (the repo can still keep `.env` for local development)
- `ios/**` and `android/**` native project edits
- Duplicate `build`/`typecheck` scripts, Jest `transformIgnorePatterns`, and ESLint `no-require-imports` scoping (owned by T02)
- Feature code, navigation, screens, hooks, stores

## Proposed solution

1. **Define the canonical env schema.**  
   The canonical keys are:
   - `TBOT_API_URL` — REST API root (should end in `/v1`)
   - `TBOT_AI_URL` — AI proxy root (should end in `/v1/ai` or `/api/ai` per backend contract)
   - `WS_URL` — realtime observer WebSocket root

   Because Expo only embeds `EXPO_PUBLIC_*` variables into the JS bundle, the runtime surface in `src/config.ts` will read `process.env.EXPO_PUBLIC_TBOT_API_URL`, `process.env.EXPO_PUBLIC_TBOT_AI_URL`, and `process.env.EXPO_PUBLIC_WS_URL`. The EAS `env` map and Detox `launchArgs` should expose the base names (`TBOT_API_URL`, `TBOT_AI_URL`, `WS_URL`); a thin adapter in `src/config.ts` can map `EXPO_PUBLIC_*` when present.

2. **Update `eas.json`.**
   - Replace `EXPO_PUBLIC_API_BASE_URL` and `EXPO_PUBLIC_DEMO_SCREEN` in the `production` profile with `EXPO_PUBLIC_TBOT_API_URL`, `EXPO_PUBLIC_TBOT_AI_URL`, and `EXPO_PUBLIC_WS_URL`.
   - Align `staging-device` with the same key names and add `WS_URL`/`EXPO_PUBLIC_WS_URL`.
   - Keep values as Render-hosted endpoints or placeholders (e.g. `https://tbot-backend-8wmh.onrender.com/v1`) until Backend/Infra confirms final canonical URLs.

3. **Update `src/config.ts`.**
   - Remove `import { ENV } from './__env__';`.
   - Read `process.env.EXPO_PUBLIC_TBOT_API_URL`, `process.env.EXPO_PUBLIC_TBOT_AI_URL`, and `process.env.EXPO_PUBLIC_WS_URL`.
   - Keep the existing Render fallback (`HOSTED_API_ROOT = 'https://tbot-backend-8wmh.onrender.com'`) so production builds fail-safe rather than fail-open.
   - Ensure no `trycloudflare.com` or other ad-hoc tunnel URL remains in the fallback path.

4. **Remove Metro source-tree mutation.**
   - Delete the `loadEnv()` function, the `src/__env__.ts` template, and `fs.writeFileSync(envTsPath, envTs)` from `metro.config.js`.
   - Keep the `getDefaultConfig(__dirname)` call and the `@google/genai/web` resolver tweaks (lines 71–73).
   - Delete `src/__env__.ts` and add it to `.gitignore` so it cannot be re-committed accidentally.

5. **Align `.detoxrc.js`.**
   - Remove `const metroConfig = require('./metro.config.js');` (line 16) so Detox no longer triggers the env write.
   - Add `WS_URL` to both `ios.debug` and `android.debug` `launchArgs`.
   - Keep `TBOT_API_URL` and `TBOT_AI_URL` in `launchArgs`; if Detox cannot pass `EXPO_PUBLIC_*` through to the bundle, document that E2E builds should use an `.env` file or EAS env.

6. **Flesh out `app.json`.**
   - Add `expo.plugins` with `expo-notifications` configuration (icon, color, sounds, interceptors if needed).
   - Add `orientation: 'portrait'`.
   - Add `scheme: 'tbot'` for deep links.
   - Add iOS background modes (`UIBackgroundModes`: `audio`, `bluetooth-central`, `fetch`) and Android permissions (`android.permission.POST_NOTIFICATIONS`, `android.permission.BLUETOOTH_SCAN`, `android.permission.BLUETOOTH_CONNECT`, etc.) as required by the lesson-session and BLE flows.

7. **Constrain `package.json`.**
   - Add `engines.node` matching the repo toolchain (e.g. `">=20.0.0"` or the value used by CI).
   - Add a `browserslist` block for React Native (typical: `last 2 iOS versions`, `last 2 Android versions`).
   - Do **not** touch the duplicate `build`/`typecheck` scripts or Jest config here; that is T02.

## Acceptance criteria
1. `eas.json` production profile uses the canonical env keys (`EXPO_PUBLIC_TBOT_API_URL`, `EXPO_PUBLIC_TBOT_AI_URL`, `EXPO_PUBLIC_WS_URL`) that `src/config.ts` consumes.
2. Hardcoded Cloudflare fallback is removed from `src/config.ts`; production fallback is the documented Render URL or fails closed.
3. `metro.config.js` no longer writes `src/__env__.ts`; env injection uses Expo `EXPO_PUBLIC_*` handling or `process.env`.
4. `.detoxrc.js` launchArgs include `TBOT_API_URL`, `TBOT_AI_URL`, and `WS_URL`, and the file no longer requires `./metro.config.js`.
5. `app.json` declares the `expo-notifications` plugin, `orientation`, `scheme`, and iOS/Android background modes.
6. `package.json` declares `engines.node` and a `browserslist`.

## Dependencies
None per registry.

## Exclusions / anti-overlap
- **T02** owns `package.json` script/Jest cleanup (`build` vs `typecheck`, `transformIgnorePatterns`, `moduleNameMapper`, ESLint `no-require-imports`). T01 must not edit those parts of `package.json`.
- **T08** owns runtime WebSocket URL derivation in `src/services/ws/realtime.ts`. T01 only establishes the canonical `WS_URL` env contract; T08 wires it into the observer.
- **T03** owns `react-native.config.js` BLE autolinking. Do not edit that file here.
- Gemini-related env keys (`EXPO_PUBLIC_GEMINI_LIVE_MODEL`, etc.) are out of scope pending T00 decision.

## Verification test plan
- **Test file:** `tests/verification/T01-canonical-env-schema.test.ts`
- **What it proves:** The canonical env schema is present in `eas.json`, `.detoxrc.js`, `app.json`, and `package.json`; `metro.config.js` no longer mutates the source tree; `src/config.ts` no longer imports `src/__env__.ts`; and `src/__env__.ts` is deleted.
- **How to run it:** `npx jest tests/verification/T01-canonical-env-schema.test.ts`
- **Expected state before fix:** FAIL
- **Expected state after fix:** PASS

## Risks & mitigations
| Risk | Mitigation |
|---|---|
| EAS production profile uses the wrong backend URL after key rename | Coordinate with Backend/Infra on final Render URLs; add the verification test as a CI gate; use placeholders only if validated before merge. |
| Removing `src/__env__.ts` breaks local development | Local dev should rely on `.env` with `EXPO_PUBLIC_TBOT_API_URL` etc. and `npx expo start --clear`. Document the new flow in the PR. |
| Detox launchArgs are not consumed by the Expo bundle | Either switch Detox to pass `EXPO_PUBLIC_*` args or ensure E2E builds use a committed `.env.e2e` file. Update E2E docs accordingly. |
| `app.json` plugin/capability changes require native rebuild | Run `npx expo prebuild` and a test EAS build before merge; verify push-notification entitlements are added. |
| `package.json` `engines.node` breaks CI/container that runs an older Node | Pick the Node version already used by the active CI runner; run `npm ci` in a clean environment to validate. |

## Coordination notes
This task is flagged `coordination_required: true`. Before merging:
- **Backend / Infra / Release** must confirm the canonical values for `TBOT_API_URL`, `TBOT_AI_URL`, and `WS_URL` on the Render deployment and in EAS secrets.
- Confirm whether EAS production should hard-code the URLs in `eas.json` or read them from EAS secrets (preferred for production; if secrets are used, `eas.json` can reference `${process.env.TBOT_API_URL}` placeholders).
- Confirm the backend observer WebSocket path so T08 can consume `WS_URL` without fragile string manipulation.

## Implementation hints
- Read `src/config.ts` carefully before editing; the `ensureV1(url)` helper and simulator/emulator branches should remain unchanged.
- Do not import `metro.config.js` anywhere in tests or Detox config after the fix; its remaining purpose is Metro resolver configuration only.
- If `src/__env__.ts` is referenced by any other file besides `src/config.ts`, update that caller too (grep for `from './__env__'` and `from "./__env__"`).
- For `app.json`, refer to the Expo 55 / `expo-notifications` plugin documentation; keep the plugin block minimal to avoid entitlements conflicts.
