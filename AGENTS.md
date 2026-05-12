# tbot-mobile — Agents.md (Codex / Gemini CLI Shim)

You are in `tbot-mobile` — the TBOT React Native mobile application (sys-16).

This file mirrors `CLAUDE.md` for agent runtimes that read `AGENTS.md` instead
of `CLAUDE.md` (Codex, Gemini CLI, and similar tools).

**Before any file modification, read `.agent/AGENT_ENTRYPOINT.md` first.**
That file is the authoritative boot sequence for this repo.

---

## Boot order (mandatory)

1. Read `.agent/AGENT_ENTRYPOINT.md` — full boot sequence, Steps 1–9
2. Read `.agent/AGENT_CONTEXT.md` — ownership, forbidden actions, dependency graph
3. Read `.agent/SYSTEM_CONTRACTS.md` — API, WebSocket, BLE, auth, observability contracts
4. Read `.agent/TASK_EXECUTION.md` — TypeScript standards, commit format, anti-patterns
5. Read `.agent/VALIDATION_CHECKLIST.md` — hard gates per PR
6. Read `.agent/DOC_SYNC_RULES.md` — what docs to update when code changes

Produce a READ-BEFORE-CODE SUMMARY block before the first file write.

---

## Ownership

**This repo owns sys-16 (mobile UX shell) only.**

Do not edit: tbot-backend, tbot-firmware, tbot-ai-services, tbot-infra,
root `/Users/manhhodinh/Documents/TBOT/docs/` (separate git repo).

Cross-repo escalation triggers:
- BLE wire protocol (sys-18) → escalate to tbot-firmware + tbot-backend
- Auth / COPPA (sys-01) → escalate to tbot-backend
- Safety filters (sys-05) → escalate to tbot-ai-services
- Infrastructure (sys-13) → escalate to tbot-infra
- Realtime session (sys-04) → escalate to tbot-backend + tbot-ai-services

---

## Key paths

| What | Path |
|---|---|
| Docs workspace | `/Users/manhhodinh/Documents/TBOT/migrate-ui-ux-to-mobile-app-docs/` |
| HTTP client | `src/api/client.ts` (pre-PR4), `src/services/http/client.ts` (post-PR4) |
| Route constants | `src/app/navigation/routes.ts` |
| Custom ESLint rule | `eslint-rules/no-voice-timing-in-shared.js` |
| Path helper for scripts | `scripts/_lib/paths.mjs` |
| Tasks canonical source | `/Users/manhhodinh/Documents/TBOT/packages/shared-data/src/content/tasks.json` |

---

## Validation commands

Run from `/Users/manhhodinh/Documents/TBOT/tbot-mobile/`:

```bash
# Always required
npx tsc --noEmit
npm run lint
npm test

# PR1+
npm run flows:validate
npm run sequences:fast
npm run erd:validate
npm run usecases:check

# PR2+
npm run check:token-parity

# PR3+
npm run check:route-coverage
npm run check:screen-prop-types

# PR4+
npm run test:integration

# PR5+
npm run detox:test:ios
```

Silent-green (exit 0, no file count in stdout) means a validator no-op'd —
treat as FAIL and investigate the path configuration.

---

## Hard rules

1. No `any`, `@ts-ignore`, `@ts-expect-error`, `unknown as T`
2. No `// TODO` / `// FIXME` / `// HACK` in production code paths
3. No silent error swallowing
4. No test modifications to make a failing test pass
5. No `--no-verify` bypass of CI hooks
6. Agents never set task status to DONE (only human reviewer sets DONE)
7. Challenge Mode block required before first file write (see `AGENT_ENTRYPOINT.md` Step 4)

---

## 8-PR migration context

This repo is undergoing an 8-PR phased migration (plan at
`/Users/manhhodinh/.claude/plans/merry-hatching-sun.md`).
PRs must merge in order: PR1 → PR2 → ... → PR8.
Current PR branches follow `migration/pr<N>-<description>` naming.
Each PR must pass all required gates from `VALIDATION_CHECKLIST.md` before merge.
