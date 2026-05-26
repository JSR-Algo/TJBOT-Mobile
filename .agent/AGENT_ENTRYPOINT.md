# TJBot-mobile — Agent Entrypoint

This file is the authoritative boot sequence for any agent working in
`/Users/manhhodinh/Documents/TJBot/TJBot-mobile/`. It supersedes the root
`/Users/manhhodinh/Documents/TJBot/CLAUDE.md` wherever the two disagree.

---

## Step 1 — Confirm repo scope

You are in **TJBot-mobile** (sys-16: mobile UX shell). This repo owns the
React Native application delivered to end-users. It does NOT own backend
APIs, firmware wire protocols, AI safety filters, or infrastructure.

Read this file fully before any Edit/Write call.

---

## Step 2 — Karpathy behavioral principles (mandatory)

1. **Think Before Coding.** State assumptions. Ask when uncertain. Surface
   multiple interpretations. Stop for clarification on anything ambiguous.
2. **Simplicity First.** Minimum code solving the problem. Nothing
   speculative. No unrequested features. Does NOT override
   `.agent/VALIDATION_CHECKLIST.md`.
3. **Surgical Changes.** Touch only what is required. Match existing style.
   Do not refactor unbroken code.
4. **Goal-Driven Execution.** Define success criteria before writing code.
   Loop until verified. No DONE without evidence.

---

## Step 3 — Mandatory reads before first Edit/Write (7 files)

Read in this order. Do not skip any. Mark each complete before proceeding.

1. `/Users/manhhodinh/Documents/TJBot/TJBot-mobile/.agent/AGENT_CONTEXT.md`
   — ownership map, forbidden actions, dependency graph. NEVER SKIP.
2. `/Users/manhhodinh/Documents/TJBot/TJBot-mobile/.agent/SYSTEM_CONTRACTS.md`
   — API, WebSocket, BLE, auth contracts.
3. `/Users/manhhodinh/Documents/TJBot/TJBot-mobile/.agent/TASK_EXECUTION.md`
   — coding standards, commit format, stop conditions. NEVER SKIP.
4. Task record — look up in this order:
   a. `/Users/manhhodinh/Documents/TJBot/packages/shared-data/src/content/tasks.json`
      (canonical, 182 tasks as of 2026-05-06)
   b. `/Users/manhhodinh/Documents/TJBot/docs/site/execution/pipeline-tasks.md`
   c. Per-pipeline: `docs/site/systems/*-pipeline.md`
   d. Root-level ad-hoc: `TASK-EXTRACTION.md` / `TASK-VERIFICATION-MATRIX.md`
5. System spec: `docs/site/software/systems/16-*.md` (sys-16 overview).
   If task also touches sys-18 (BLE wire), read `docs/site/software/systems/18-*.md`.
6. Architecture:
   `/Users/manhhodinh/Documents/TJBot/docs/ARCHITECTURE.md`
   + `PRODUCTION-ARCHITECTURE.md` (cache per session).
7. `/Users/manhhodinh/Documents/TJBot/TJBot-mobile/.agent/VALIDATION_CHECKLIST.md`
   — hard gates you must pass at close. NEVER SKIP.

If the task touches API contracts also read:
`docs/site/development/api-reference.md`

After reading, produce a **READ-BEFORE-CODE SUMMARY** block (1-line
takeaway per file, what-I-learned, what-I'll-do) before the first edit.

---

## Step 4 — Challenge Mode (mandatory before any Edit/Write)

Before the first code change output this block verbatim:

```
## CHALLENGE MODE — task-start
Task ID:             <task-id or AD-HOC: adhoc-YYYY-MM-DD-slug>
Owning repo:         TJBot-mobile
System ID(s):        sys-16 (+ sys-18 if BLE touched)
Files touched:       - <path> (reason)
Acceptance criteria: 1. <testable> 2. <testable>
Ambiguities:         <list or "none">
Contradictions:      <list or "none">
Verification plan:   build: <cmd> | test: <cmd> | validate: <cmd>
Stop-condition:      ACs>=1? | Ambiguities=0? | Ownership clear? | Contradictions=0?
```

**HARD STOP** if any stop-condition is not met. Do not call Edit/Write.
Ask the user. Do not invent ACs. Do not silently pick interpretations.
Do not override ownership.

---

## Step 5 — Implement

Follow `TASK_EXECUTION.md` coding standards. Shallow happy-path-only
changes are an anti-pattern. Add or update tests. If tests cannot be
added, declare `tests not applicable because <reason>` in the
critique-before-close block.

---

## Step 6 — Validate with evidence

Run every gate in `VALIDATION_CHECKLIST.md`. Capture for each AC:
- Files changed (paths + line deltas)
- Build command + output + exit code
- Test command + output + exit code
- Runtime evidence where applicable
- Each AC verdict: `PASS | FAIL | PARTIAL | UNVERIFIABLE (reason)`

No evidence → no DONE.

---

## Step 7 — Critique-before-close (6 honesty questions)

Before marking DONE, answer in writing:
1. Root cause vs symptom — real problem or surface patch?
2. Code vs docs — implementation matches specs from Step 3?
3. Test quality — tests lock in behavior or are ceremonial?
4. Drift status — run drift-check. Unresolved docs/task/scope drift?
5. Principal-engineer cold review — would PE accept closure or ask "what about X?"
6. Reproducibility — someone else can re-run verification and get same result?

Any "I don't know" or "I skipped it" → downgrade to PARTIAL.

**Immediate-PARTIAL signals:**
- Tests green but coverage for changed code is 0%
- Validation checklist skipped or bypassed
- `// TODO` / `// FIXME` / `// HACK` added in changed code
- Error caught and silently swallowed
- Test modified to make it pass (fix the code, not the test)
- Type error suppressed with `any` / `@ts-ignore` / `as any` / `unknown as T`
- CI bypassed with `--no-verify`
- Any `VALIDATION_CHECKLIST.md` hard-gate violated

---

## Step 8 — Docs sync + evidence record

Follow `DOC_SYNC_RULES.md`. If code behavior or contracts changed, propose
doc updates in the same change. Write verification-matrix row in:
`/Users/manhhodinh/Documents/TJBot/migrate-ui-ux-to-mobile-app-docs/qa/`

Ad-hoc work: `migrate-ui-ux-to-mobile-app-docs/qa/<YYYY-MM-DD>-<task-id>.md`

---

## Step 9 — Task state transition

Allowed transitions (update `packages/shared-data/src/content/tasks.json`):
```
NOT_STARTED → IN_PROGRESS  (pick up task)
IN_PROGRESS → REVIEW       (implementation done, validation passed, critique passed)
IN_PROGRESS → BLOCKED      (dependency missing or external blocker)
REVIEW      → DONE         (human reviewer approves — AGENTS NEVER SET THIS)
REVIEW      → IN_PROGRESS  (reviewer requests changes)
BLOCKED     → IN_PROGRESS  (blocker resolved)
```

**Never mark DONE as an agent. Only human review sets DONE.**

---

## Docs workspace location

All docs for TJBot-mobile live at:
`/Users/manhhodinh/Documents/TJBot/migrate-ui-ux-to-mobile-app-docs/`

Subdirs:
- `architecture/` — use-case diagrams, PlantUML
- `api/` — openapi.json symlink + README
- `erd/` — 25 subdirs, dbml + prisma models
- `flows/` — generator-owned `.generated.mmd` (do not hand-edit)
- `sequences/` — hand-authored `.sequence.mmd`, 22 systems + `_cross/`
- `usecases/` — 15 domain subdirs + actors/ + reference/
- `state-machines/` — per-feature state diagrams
- `migration/` — 8-PR migration plans
- `validation/` — validator rule snapshots
- `decisions/` — 12 ADRs
- `qa/` — verification matrices

Scripts that read docs live at:
`/Users/manhhodinh/Documents/TJBot/TJBot-mobile/scripts/`
All validators import paths from `scripts/_lib/paths.mjs`.

---

## Cross-repo escalation

| Change touches | Escalate to | Read first |
|---|---|---|
| Wire protocol (sys-18) | TJBot-firmware + tbot-backend + docs/packages/shared-data | `docs/site/software/systems/18-*.md` |
| Safety filters (sys-05) | TJBot-ai-services | `docs/site/safety/*.md` |
| Auth / COPPA (sys-01) | tbot-backend (legal review may be required) | `docs/site/legal/coppa-*.md` |
| Infra / IAM / KMS (sys-13) | TJBot-infra | `docs/runbooks/staging-*.md` |
| Realtime session (sys-04) | tbot-backend + TJBot-ai-services | `docs/site/architecture/realtime-overview.md` |

Cross-repo edits without cross-repo approval violate `SYSTEM_CONTRACTS.md` — STOP.

---

## Skills available

| Skill | When |
|---|---|
| `task-start` | Every coding task start |
| `read-before-code` | After task-start, before first edit |
| `karpathy-guidelines` | Auto-triggers on coding verbs |
| `drift-check` | Task start + task close |
| `critique-before-close` | Before marking any task DONE |
| `evidence-collect` | After critique passes |
