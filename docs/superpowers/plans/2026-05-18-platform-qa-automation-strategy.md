# TJBot Platform QA Automation Strategy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish verified automated QA gates across mobile, backend, AI service, database, API contracts, navigation, and CI/CD.

**Architecture:** Use existing repo-native test runners first: Jest for mobile, Vitest for backend, Pytest/Ruff for AI, and GitHub Actions for gates. Add missing tests only where they lock a real gate or contract and do not cross product ownership boundaries without per-repo boot rules.

**Tech Stack:** React Native/Jest/Detox, Node/NestJS/Vitest/Prisma/Postgres/Redis, FastAPI/Pytest/Ruff, GitHub Actions.

---

### Task 1: Audit Test Surfaces

**Files:**
- Read: `package.json`
- Read: `.github/workflows/ci.yml`
- Read: `tests/**`
- Create/modify only audit notes in final report unless a concrete gap is proven.

- [ ] **Step 1: Enumerate mobile scripts and test files**

Run: `npm pkg get scripts && find tests -maxdepth 3 -type f | sort`

Expected: scripts include typecheck, lint, unit, integration, navigation validators, Detox, and mobile local E2E.

- [ ] **Step 2: Enumerate backend scripts and test files**

Run from `../tbot-backend`: `npm pkg get scripts && find tests -maxdepth 3 -type f | sort`

Expected: scripts include typecheck, lint, unit, integration, e2e, OpenAPI, migration, and modular Docker tests.

- [ ] **Step 3: Enumerate AI scripts and test files**

Run from `../TJBot-ai-services`: `find . -maxdepth 3 -type f \( -name 'pyproject.toml' -o -name 'requirements*.txt' \) -print && find tests -maxdepth 3 -type f | sort`

Expected: pyproject/requirements define pytest and ruff; tests include health, learning, LLM prompt, metrics language, simulator bilingual, and STT language checks.

### Task 2: Lock Mobile CI Gate Coverage

**Files:**
- Create: `tests/ci/mobile-ci-gates.test.ts`
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Write failing test**

Create a Jest test that reads `.github/workflows/ci.yml` and asserts the validate job includes:

```ts
const requiredCommands = [
  'npm run test:integration',
  'npm run flows:validate',
  'npm run sequences:fast',
  'npm run erd:validate',
  'npm run usecases:check',
  'npm run check:token-parity',
  'npm run check:route-coverage',
  'npm run check:screen-prop-types',
  'SIMULATION_MODE=true npm run e2e:mobile -- --plan-json',
];
```

- [ ] **Step 2: Verify red**

Run: `npx jest --selectProjects unit tests/ci/mobile-ci-gates.test.ts --runInBand`

Expected: FAIL because current mobile CI lacks these commands.

- [ ] **Step 3: Update workflow**

Add validate-job steps after unit tests so PR CI runs the required validators and local E2E plan gate.

- [ ] **Step 4: Verify green**

Run: `npx jest --selectProjects unit tests/ci/mobile-ci-gates.test.ts --runInBand`

Expected: PASS.

### Task 3: Run Verification Matrix

**Files:**
- Read: test outputs
- Modify: none unless root-caused failures require TDD fixes.

- [ ] **Step 1: Mobile gates**

Run:

```bash
npx tsc --noEmit
npm run lint
npm test -- --runInBand
npm run test:integration
npm run flows:validate
npm run sequences:fast
npm run erd:validate
npm run usecases:check
npm run check:token-parity
npm run check:route-coverage
npm run check:screen-prop-types
SIMULATION_MODE=true npm run e2e:mobile -- --plan-json
```

- [ ] **Step 2: Backend gates**

Run from `../tbot-backend` with local Postgres/Redis env:

```bash
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run test:e2e
npm run test:integration:modular:docker
npm run openapi:check
```

- [ ] **Step 3: AI gates**

Run from `../TJBot-ai-services`:

```bash
python -m pytest tests -v
ruff check src tests
```

### Task 4: Readiness Report

**Files:**
- Final answer only, unless user asks for persistent QA report.

- [ ] **Step 1: Report strategy**

Include unit, integration, API E2E, mobile E2E, CI/CD gates.

- [ ] **Step 2: Report gaps**

Name uncovered areas: true Detox simulator runs, cross-repo root pipeline execution, AI red-team directory absence, coverage thresholds if absent.

- [ ] **Step 3: Report pass/fail criteria**

Every command exit 0, nonzero test/validator counts, no backend 5xx, no schema drift, no worker startup errors, no unresolved routes, no flaky quarantines without issue/expiry.
