# tbot-mobile — Claude Code Sub-repo Shim

You are in `tbot-mobile` — the TBOT React Native mobile application (sys-16).

**Before any Edit/Write call, read `.agent/AGENT_ENTRYPOINT.md` first.**
That file is the authoritative boot sequence for this repo and supersedes
the root `/Users/manhhodinh/Documents/TBOT/CLAUDE.md` wherever they differ.

---

## Boot order (mandatory)

1. Read `/Users/manhhodinh/Documents/TBOT/tbot-mobile/.agent/AGENT_ENTRYPOINT.md`
2. Read `/Users/manhhodinh/Documents/TBOT/tbot-mobile/.agent/AGENT_CONTEXT.md`
3. Read `/Users/manhhodinh/Documents/TBOT/tbot-mobile/.agent/SYSTEM_CONTRACTS.md`
4. Read `/Users/manhhodinh/Documents/TBOT/tbot-mobile/.agent/TASK_EXECUTION.md`
5. Read `/Users/manhhodinh/Documents/TBOT/tbot-mobile/.agent/VALIDATION_CHECKLIST.md`
6. Read `/Users/manhhodinh/Documents/TBOT/tbot-mobile/.agent/DOC_SYNC_RULES.md`

Then follow `AGENT_ENTRYPOINT.md` Steps 3–9.

---

## Quick reference

| What | Where |
|---|---|
| Ownership | sys-16 (mobile UX shell) only |
| Docs workspace | `/Users/manhhodinh/Documents/TBOT/migrate-ui-ux-to-mobile-app-docs/` |
| Scripts | `scripts/` (paths resolved via `scripts/_lib/paths.mjs`) |
| Typecheck | `npx tsc --noEmit` |
| Lint | `npm run lint` |
| Unit tests | `npm test` |
| All doc validators | `npm run flows:validate && npm run sequences:fast && npm run erd:validate && npm run usecases:check` |
| Cross-repo escalation | See `AGENT_CONTEXT.md` table |

---

## Forbidden without user approval

- Edits outside `/Users/manhhodinh/Documents/TBOT/tbot-mobile/`
- `any`, `@ts-ignore`, `@ts-expect-error`, `unknown as T`
- COPPA text changes
- BLE message schema changes
- Setting task status to DONE in `tasks.json`
