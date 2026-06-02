# TJBot-mobile — Task Execution

Coding standards, commit format, and stop conditions for all agents working
in `/Users/manhhodinh/Documents/TJBot/TJBot-mobile/`.

---

## TypeScript standards (hard rules)

1. `strict: true` is non-negotiable. `tsconfig.json` enforces it via `expo/tsconfig.base`.
2. Forbidden type suppressions — any of these triggers an immediate PARTIAL:
   - `any` (use `unknown` + type narrowing)
   - `@ts-ignore`
   - `@ts-expect-error` (only permitted if a GitHub issue for the platform bug
     is linked in the same comment line)
   - `unknown as T` casts without a runtime type guard function
3. No implicit returns in async functions — every path must `return` or `throw`.
4. No `console.log` / `console.warn` in `src/` (ESLint rule `no-console: error`).
   Use the observability logger at `src/services/observability/logger.ts`.
   Exception: `console.info` with `__DEV__` guard (stripped by Metro in prod bundles).
5. Imports: use path aliases (`@/*` → `src/*`) where tsconfig allows. Never
   use `../../../` relative imports crossing feature boundaries — import from
   `@/services/`, `@/design-system/`, `@/store/`.
6. No barrel re-exports that pull in unrelated feature code. Each feature slice
   is isolated: `src/features/<feature>/index.ts` exports only what navigators need.

---

## React Native standards

1. No web-only APIs: `document`, `window`, `localStorage`, CSS modules, `className`.
   ESLint `globals.node` config excludes browser globals.
2. No `Platform.OS` branches in shared voice/audio layers (enforced by
   `TJBot-voice/no-voice-timing-in-shared` ESLint rule).
3. All UI components must be accessible: `accessibilityLabel` and `accessibilityRole`
   on interactive elements. Missing accessibility props fail code review.
4. State machines for complex flows: purchase, lesson-session, and device-pairing
   use XState v5. Do not replace with ad-hoc useState chains.
5. Zustand stores: one store per domain (`src/store/*.store.ts`). Do not put
   server state in Zustand — use TanStack Query for cached server data.
6. No `React.FC` type annotation — use explicit return types instead.
7. Screens must be memoised (`React.memo`) only when profiling evidence shows
   unnecessary re-renders. Do not memo speculatively.

---

## Testing standards

### Unit tests (`tests/unit/`)

- Framework: Jest 29 + `@testing-library/react-native@13`
- Run: `npm test` (selects `unit` project)
- Required for: all service modules, custom hooks, Zustand store actions,
  utility functions, API modules
- Do NOT test: screen render snapshots (brittle), navigation logic (use e2e)
- Mock strategy: mock external libs at `tests/__mocks__/`. Mock SecureStore,
  BLE, audio, notifications, haptics, device. Never mock axios — use MSW or
  write integration tests.

### Integration tests (`tests/integration/`)

- Run: `npm run test:integration`
- Required from PR4 onwards: API module integration tests hit real local server
  or MSW interceptors (no mocked axios)
- Global setup/teardown in `tests/integration/__setup__/`

### Detox e2e (`tests/e2e/`)

- Run: `npm run detox:test:ios` / `npm run detox:test:android`
- Required from PR5 onwards: auth login flow, onboarding flow
- Required from PR7 onwards: device pairing flow
- Required at PR8 final: full suite
- Route names in Detox specs must reference constants from `src/app/navigation/routes.ts`,
  not string literals. Refactoring route names without updating specs fails CI.

### Test policy on PARTIAL signals

- Tests green but coverage for changed code is 0% → PARTIAL
- Test modified to make it pass (instead of fixing code) → immediate PARTIAL
- Silent catch swallowing an error in tested code → PARTIAL

---

## Stop conditions (Challenge Mode gates)

An agent MUST stop and ask the user before writing any code if:

1. **ACs < 1** — no testable acceptance criteria identified from the task record
2. **Ambiguities > 0** — unresolved interpretation gaps exist
3. **Ownership unclear** — the change may touch files outside sys-16 without
   cross-repo approval
4. **Contradictions > 0** — the task spec contradicts a system contract or
   this file

These are not suggestions — they are HARD STOPs.

---

## Commit format

Conventional commits. Format:

```
<type>(<scope>): <imperative description>

<optional body: why, not what>

Refs: <task-id or adhoc-YYYY-MM-DD-slug>
```

Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `perf`
Scope: feature or system area (e.g. `auth`, `lesson-session`, `ble`, `services-http`)

PR title format for the 8-PR migration:
`migration/PR<N>: <scope summary>`
Example: `migration/PR1: docs workspace move + agent infra`

**Branch naming for migration PRs:**
`migration/pr<N>-<short-description>`
Example: `migration/pr1-docs-and-agent-infra`

---

## PR gate (linear order)

Migration PRs must merge in order: PR1 → PR2 → ... → PR8.
`migration/pr<N>` branch MUST NOT merge until `migration/pr<N-1>` is merged.
CI enforces this via branch protection rules.

---

## Anti-patterns (FAIL conditions)

Any of these in your change marks the task as FAIL (not PARTIAL — FAIL means start over):

1. Coding before reading the 7 mandatory docs (Step 3 of AGENT_ENTRYPOINT.md)
2. Shallow happy-path-only changes with no error/edge case handling
3. Updating task state to DONE without runtime evidence
4. Cross-repo edit without cross-repo approval
5. Leaving docs drift unresolved after a behavior change
6. Treating any TJBot-design stub/prototype path as the primary code path
   (TJBot-design content is being promoted, not legacy-preserved)
7. Bypassing validation scripts or CI gates (`--no-verify`, `--skip-validation`)
8. Marking PARTIAL work as DONE to close a task quickly
9. Inventing acceptance criteria not specified in the task record
10. Suppressing type errors (`any`, `@ts-ignore`, `unknown as T`)
11. Rewriting a failing test to make it pass instead of fixing the code
12. Adding `// TODO` / `// FIXME` / `// HACK` comments in production code paths

---

## Task state transitions

Only these transitions are agent-allowed in
`packages/shared-data/src/content/tasks.json`:

| From | To | Condition |
|---|---|---|
| NOT_STARTED | IN_PROGRESS | Agent picks up task |
| IN_PROGRESS | REVIEW | Implementation done, validation passed, critique passed |
| IN_PROGRESS | BLOCKED | Dependency missing or external blocker |
| REVIEW | IN_PROGRESS | Reviewer requests changes |
| BLOCKED | IN_PROGRESS | Blocker resolved |

Agents NEVER set DONE. Only human reviewer sets DONE (REVIEW → DONE).
PARTIAL is represented as IN_PROGRESS with a comment naming the gap.

---

## Validation command reference

Run these from `/Users/manhhodinh/Documents/TJBot/TJBot-mobile/`:

| Gate | Command | Required from |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | Always |
| Lint | `npm run lint` | Always |
| Unit tests | `npm test` | Always |
| Integration tests | `npm run test:integration` | PR4+ |
| Flow validator | `npm run flows:validate` | PR1+ |
| Sequences validator | `npm run sequences:fast` | PR1+ |
| ERD validator | `npm run erd:validate` | PR1+ |
| Use-case checker | `npm run usecases:check` | PR1+ |
| Route coverage | `npm run check:route-coverage` | PR3+ |
| Token parity | `npm run check:token-parity` | PR2+ |
| Screen prop types | `npm run check:screen-prop-types` | PR3+ |
| Detox build | `npm run detox:build:ios` | PR3+ |
| Detox e2e iOS | `npm run detox:test:ios` | PR5+, PR8 final |
| Detox e2e Android | `npm run detox:test:android` | PR8 final |

**Silent-green is a fail (Risk R1):** each doc validator must emit a
non-zero file count to stdout. If a validator exits 0 with no output,
it has no-op'd due to a path error — investigate before calling it green.
