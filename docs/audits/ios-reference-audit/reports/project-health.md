# project-health Audit

## Scope
Dependency bloat, version risks, duplicate tooling, build config, script sprawl, and project hygiene for the TJBot-mobile React Native app (from `audit-manifest.json` area `project-health`).

## Files reviewed

### Mobile project
- `package.json`
- `package-lock.json`
- `app.json`
- `eas.json`
- `metro.config.js`
- `babel.config.js`
- `tsconfig.json`
- `eslint.config.js`
- `react-native.config.js`
- `nav-graph-data.json`
- `.detoxrc.js`
- `scripts/` — 61 files, ~7,159 lines across `runtime/`, `i18n/`, `flows/`, `sequences/`, `erd/`, `usecases/`, `navigation/`, plus root check scripts
- `src/config.ts` (cross-checked for env-variable consumption)

### Reference cards
- `docs/reference/ios/extractions/pointfreeco__swift-composable-architecture.md`
- `docs/reference/ios/extractions/adessoTurkey__ios-sample-app-swiftui.md`
- `docs/reference/ios/extractions/FaridSafi__react-native-gifted-chat.md`
- `docs/reference/ios/extractions/oblador__react-native-vector-icons.md`
- `docs/reference/ios/extractions/react-native-maps__react-native-maps.md`
- `docs/reference/ios/extractions/TheWidlarzGroup__react-native-video.md`

## Reference benchmarks

| Reference | What it does well | Relevant takeaway for TJBot |
|---|---|---|
| **pointfreeco/swift-composable-architecture** | Strict feature boundaries, dependency injection via `Dependencies`, `Package.resolved`, benchmarks, test plans, environment-aware entry points (e.g., `UITesting` → in-memory storage). | Separate build/test environments explicitly; keep dependency boundaries narrow; add benchmarks/perf gates for hot paths. |
| **adessoTurkey/ios-sample-app-swiftui** | Tuist-generated project, single package manager (SPM), SwiftLint, Maestro, git hooks, build-environment configs in `Tuist/`, clear branch/CI discipline. | Prefer one project generator/lock strategy; lint and UI-test gates should live in the repo; keep build config declarative. |
| **FaridSafi/react-native-gifted-chat** | Focused `package.json`, minimal runtime deps (`dayjs`, action-sheet), clear peer deps, simple Expo example scripts. | Trim runtime deps to what the app actually needs; avoid heavy dev-only tools in the mobile package. |
| **oblador/react-native-vector-icons** | Per-icon-set packages, generated glyphmaps, `/static` imports for smaller bundles, codemods for migrations. | If icon fonts grow, split into scoped imports rather than pulling entire sets; keep asset generation automated. |
| **react-native-maps/react-native-maps** | Explicit React Native compatibility matrix, `engines` field in `package.json`. | Declare Node/RN version ranges; document supported architecture combinations. |
| **TheWidlarzGroup/react-native-video** | Plugin architecture, centralized native lifecycle (`VideoManager`), engines field, clear v5/v6/v7 support policy. | Centralize native-module lifecycle (audio, BLE, analytics) and version-support policies. |

## Findings

### Improvements
- **`eas.json` lines 17–23**: the `production` profile sets `EXPO_PUBLIC_API_BASE_URL` and `EXPO_PUBLIC_DEMO_SCREEN`, but `src/config.ts` only reads `TBOT_API_URL`/`TBOT_AI_URL` and no source file references `EXPO_PUBLIC_DEMO_SCREEN`. Production EAS builds therefore silently fall back to the hard-coded Cloudflare URL in `src/config.ts`. **Recommended change:** align EAS env keys with `src/config.ts`, or update `src/config.ts` to read the `EXPO_PUBLIC_*` keys.
- **`app.json`**: the Expo config is bare — no `plugins`, no `orientation`, no iOS/Android background modes, no `expo-notifications` configuration. EAS will not add push-notification entitlements or sound/alert categories. **Recommended change:** add a `plugins` block for `expo-notifications` and required capabilities, plus `orientation`/`scheme`/`backgroundColor`.
- **`react-native.config.js` lines 24–31**: `react-native-ble-plx` is opted out of Android autolinking because its codegen spec is incompatible with React Native 0.83’s new architecture. This disables BLE on Android, a core robot-pairing flow. **Recommended change:** upgrade `react-native-ble-plx` to a RN 0.83-compatible release, or consolidate BLE/provisioning onto a single supported library.
- **`package.json` lines 63–66**: both `@react-navigation/native-stack` and `@react-navigation/stack` are installed. Native-stack is preferred on iOS for performance; keeping both increases bundle size and navigation API inconsistency. **Recommended change:** remove `@react-navigation/stack` unless it is strictly required for a specific modal transition.
- **`package.json` lines 69, 91–92**: both `xstate`/`@xstate/react` and `zustand` are dependencies. Grep shows both are used across the codebase, which risks architectural drift if the boundary is not explicit. **Recommended change:** document the rule (e.g., XState for async/voice machines, Zustand for lightweight UI state) or consolidate where overlap exists.
- **`package.json` lines 59, 84**: two overlapping device-communication libraries are installed: `@orbital-systems/react-native-esp-idf-provisioning` and `react-native-ble-plx`. This doubles native-module surface area and build fragility. **Recommended change:** choose one primary abstraction and wrap the other as a thin fallback.
- **`package.json` lines 143–145, 157–159**: Jest `transformIgnorePatterns` only whitelists `react-native`, `@react-native`, `@react-navigation`, `react-native-screens`, `react-native-safe-area-context`, `react-native-gesture-handler`, `expo-secure-store`, and `expo`. It omits `@orbital-systems/react-native-esp-idf-provisioning`, `@google/genai`, `lucide-react-native`, `posthog-react-native`, `@sentry/react-native`, and `axios`. **Recommended change:** generate the ignore list from `@expo/metro-config` or explicitly add the ESM packages used at runtime.
- **`package.json` line 127**: the Jest `moduleNameMapper` maps `expo-av` to a mock, but `expo-av` is not a dependency (only `expo-audio` at line 72). This stale mapper can mask missing dependency errors. **Recommended change:** remove the `expo-av` mapping or replace it with `expo-audio`.
- **`eslint.config.js` line 42**: `@typescript-eslint/no-require-imports` is disabled globally because `metro.config.js` uses `require`. This weakens linting across `src/` and `tests/`. **Recommended change:** scope the rule override to `metro.config.js` and `babel.config.js` only.
- **`package.json`**: there is no `engines` field and no `browserslist`. Reference projects such as `react-native-maps` and `react-native-video` declare `engines.node`. **Recommended change:** add `engines.node` and a `browserslist` to lock the Node/pnpm version and bundle targets.
- **`scripts/check-api-contract-sync.mjs` lines 1–5**: the script is a stub that always exits `0`. The `api:contract-sync:check` npm script therefore passes without verifying backend/mobile drift. **Recommended change:** implement the OpenAPI-vs-client comparison or remove the gate until it is real.
- **`nav-graph-data.json` line 804**: the graph contains 134 states but `"edges": []`. A navigation graph with no edges cannot validate transitions or coverage. **Recommended change:** populate edges from the actual navigators, or retire the graph until it is maintained.

### Simplifications
- **`package.json` lines 10–11**: `build` and `typecheck` are both `tsc --noEmit`. Two names for the same command is unnecessary. **Recommended change:** keep one (`typecheck`) and delete the other.
- **`package.json` scripts**: there are 50 npm scripts across build, test, i18n, flows, sequences, ERD, use-cases, and navigation. Many of these are documentation/contract generators rather than mobile build/test tasks. **Recommended change:** move documentation-quality scripts to a separate `tbot-docs` package or repo to reduce mobile-project surface area.
- **`metro.config.js` lines 31–49**: the config parses `.env` and writes `src/__env__.ts` at load time. This side effect mutates the source tree, can dirty git, races in CI/EAS, and ties env injection to the build machine. **Recommended change:** use Expo’s built-in `EXPO_PUBLIC_*` env handling, or load env into `process.env` without writing a source file.
- **`scripts/runtime/mobile-run.mjs` lines 39–55**: the `build-ios` command hardcodes `xcodebuild` with `iPhone 17` and a Debug simulator path. If that simulator is missing, the build fails. **Recommended change:** use `react-native run-ios` or EAS build for local iOS builds; keep xcodebuild invocation only in CI where the device is guaranteed.
- **`.detoxrc.js` line 16**: Detox config requires `./metro.config.js`, which triggers the `src/__env__.ts` write during Detox build. **Recommended change:** remove the direct `require` or refactor `metro.config.js` into a pure resolver factory so Detox does not generate source files.

### Bottlenecks
- **`package.json` dependency load**: 35 runtime dependencies and 20 dev dependencies, including multiple heavy native modules (`@sentry/react-native`, `posthog-react-native`, `react-native-reanimated`, `react-native-worklets`, two BLE stacks). This increases binary size, build time, and Metro resolution cost. Consider a binary-size budget and feature-flagged native modules.
- **`react-native.config.js` BLE opt-out**: Android builds currently lack BLE autolinking. As the project scales, this becomes a hard blocker for Android device provisioning and must be resolved before production.
- **`scripts/` sprawl**: 61 files and ~7,159 lines of tooling script code, plus dev dependencies like `mermaid` and `@mermaid-js/parser`. This grows CI time and maintenance burden faster than app code.
- **`metro.config.js` env generation**: every Metro start re-parses `.env` and rewrites `src/__env__.ts`. If `.env` changes while the bundler is cached, the bundle may hold stale env values, leading to nondeterministic backend targeting.
- **`.detoxrc.js` env mismatch**: Detox `launchArgs` pass `TBOT_API_URL`/`TBOT_AI_URL` to the app process, but the app reads `ENV` from `src/__env__.ts` generated at Metro bundle time. E2E runs may therefore target the wrong backend unless the bundle is rebuilt with the intended env file.

## Top 3 quick wins
1. **Align `eas.json` production env keys with `src/config.ts`** (or vice versa). This fixes silent production misconfiguration with low effort and high impact.
2. **Remove the stale `expo-av` Jest mapper, deduplicate `build`/`typecheck`, and scope the `no-require-imports` override** to config files only. These are small hygiene fixes that reduce confusion.
3. **Expand Jest `transformIgnorePatterns`** to include the actual ESM packages used at runtime (`@orbital-systems`, `@google/genai`, `lucide-react-native`, etc.) so unit tests stop failing on untransformed imports.

## Risk / effort estimates
| Recommendation | Risk | Effort |
|---|---|---|
| Align EAS env keys with `src/config.ts` | HIGH (production misconfig) | LOW |
| Add `engines`/`browserslist` to `package.json` | LOW | LOW |
| Remove duplicate `@react-navigation/stack` | MEDIUM | LOW |
| Clarify/consolidate XState vs Zustand boundary | MEDIUM | LOW–MEDIUM |
| Resolve BLE Android autolinking | HIGH | MEDIUM |
| Expand Jest transform-ignore list | MEDIUM | LOW |
| Replace Metro side-effect env generation | HIGH | MEDIUM |
| Move documentation scripts out of mobile repo | MEDIUM | MEDIUM |
| Implement real API contract sync script | MEDIUM | MEDIUM |
| Populate `nav-graph-data.json` edges or retire the file | LOW | LOW |
| Add Expo plugins/capabilities to `app.json` | HIGH (push/feature parity) | LOW |
