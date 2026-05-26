# TJBot-mobile — Validation Checklist

Hard gates every agent must pass before marking a task REVIEW.
Run from `/Users/manhhodinh/Documents/TJBot/TJBot-mobile/`.

Tick each box with evidence (command + exit code + key output line).
A ticked box without evidence is a FAKE-DONE signal.

---

## Always-required gates (every PR, every task)

### G1 — TypeScript strict typecheck

```bash
npx tsc --noEmit
```

- Expected: exit code 0, no error lines
- Fail signal: any `error TS` line
- PARTIAL trigger: suppressed with `// @ts-ignore` or `any`

### G2 — ESLint (including custom voice rule)

```bash
npm run lint
```

- Expected: exit code 0, no `error` lines
- Fail signal: `TJBot-voice/no-voice-timing-in-shared` fires, or any `error` rule fires
- Custom rule file: `eslint-rules/no-voice-timing-in-shared.js` must exist and load

### G3 — Unit tests

```bash
npm test
```

- Expected: exit code 0, all tests pass
- Expected output: non-zero number of test suites run (silent green = validator no-op = fail)
- Fail signal: any `FAIL` line, any `× ` (failing assertion)
- PARTIAL trigger: test modified to make it pass instead of fixing code

---

## PR1+ gates (doc validators)

### G4 — Flow validator

```bash
npm run flows:validate
```

- Expected: exit code 0, stdout reports N files validated (N > 0)
- Silent green = path misconfiguration (Risk R1) = FAIL
- Paths resolve through `scripts/_lib/paths.mjs` → `migrate-ui-ux-to-mobile-app-docs/flows/`

### G5 — Sequences validator

```bash
npm run sequences:fast
```

- Expected: exit code 0, stdout lists validated `.sequence.mmd` files
- Checks: frontmatter present, participant names on allow-list from `_actors.md`,
  no duplicate sequence IDs
- Silent green = FAIL

### G6 — ERD validator

```bash
npm run erd:validate
```

- Expected: exit code 0, stdout reports DBML + Prisma file counts
- Checks: all DBML files parse, cross-domain references resolve, global ERD is consistent
- Silent green = FAIL

### G7 — Use-case checker

```bash
npm run usecases:check
```

- Runs: `check-backend-sentinel`, `check-edge-case-enum`, `check-index-coverage`,
  `check-lane-coverage`, `check-uc-sections`
- Expected: exit code 0, all checks report pass
- Silent green = FAIL

---

## PR2+ gates

### G8 — Token parity

```bash
npm run check:token-parity
```

- Expected: exit code 0, all design-system tokens present in generated theme
- Fail signal: any `MISSING TOKEN` line
- Silent green = FAIL (validator must report token count)

---

## PR3+ gates

### G9 — Route coverage

```bash
npm run check:route-coverage
```

- Expected: exit code 0, every route constant in `src/app/navigation/routes.ts`
  is reachable from at least one screen file
- Fail signal: any `UNREACHABLE ROUTE` or `MISSING SCREEN` line
- Silent green = FAIL

### G10 — Screen prop types

```bash
npm run check:screen-prop-types
```

- Expected: exit code 0, all screen components have typed `navigation` + `route` props
- Silent green = FAIL

### G11 — Detox compile (iOS)

```bash
npm run detox:build:ios
```

- Expected: exit code 0, `.app` bundle produced without errors
- Fail signal: any compilation error, missing native module linkage

---

## PR4+ gates

### G12 — Integration tests

```bash
npm run test:integration
```

- Expected: exit code 0, all integration tests pass
- Tests hit real local server or MSW interceptors — never mocked axios
- Fail signal: any `FAIL` line, any timeout

---

## PR5+ gates

### G13 — Detox e2e (iOS simulator)

```bash
npm run detox:test:ios
```

- Expected: exit code 0, all e2e suites pass
- PR5 minimum: auth login flow + onboarding flow
- PR7+: device pairing flow
- PR8 final: full suite on both iOS and Android

### G14 — Detox e2e (Android emulator) — PR8 final only

```bash
npm run detox:test:android
```

---

## Evidence format per gate

For each gate in your task-close evidence block, record:

```
Gate: G<N> — <name>
Command: <exact command run>
Exit code: <0 or N>
Key output: <paste the summary line from stdout>
Result: PASS | FAIL | PARTIAL | UNVERIFIABLE (reason)
```

Example:

```
Gate: G1 — TypeScript typecheck
Command: npx tsc --noEmit
Exit code: 0
Key output: (no output = success)
Result: PASS

Gate: G3 — Unit tests
Command: npm test
Exit code: 0
Key output: Test Suites: 14 passed, 14 total | Tests: 47 passed, 47 total
Result: PASS
```

---

## PARTIAL signals (auto-downgrade from DONE)

Any of the following discovered during validation immediately downgrades to PARTIAL:

- G3 passes but coverage for the changed files is 0%
- Any gate was skipped (`# not run` or `not applicable` without justification)
- A `// TODO` / `// FIXME` / `// HACK` appears in changed production code
- An error is caught and silently swallowed (no log, no rethrow)
- A test was modified to make it pass (not the code)
- `@ts-ignore`, `any`, or `unknown as T` appears in changed code
- `--no-verify` or `--skip-validation` used in any command
- A doc validator emitted 0 files validated (silent green = misconfigured path)

---

## Risk register reference

These risks from the migration plan map directly to specific gates:

| Risk | Gate that catches it |
|---|---|
| R1: validator path refactor silently no-ops | G4, G5, G6, G7 — must emit file counts |
| R2: stub useAuth doesn't match AuthContext shape | G1 (typecheck), G12 (integration test) |
| R3: COPPA legal text regresses | PR5 manual review — diff both COPPA screens before merge |
| R4: Detox flaky after route rename | G9 (route coverage), G13/G14 (e2e) |
| R5: dual .js+.ts state files diverge | G1 (typecheck will catch missing fields) |
| R6: BLE/Gemini/Sentry break during services move | G12 (integration), G13/G14 (e2e) |
