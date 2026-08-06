# TJBot-mobile — Agents.md (Codex / Gemini CLI Shim)

You are in `TJBot-mobile` — the TJBot React Native mobile application (sys-16).

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

Do not edit: tbot-backend, TJBot-firmware, TJBot-ai-services, TJBot-infra,
root `/Users/manhhodinh/Documents/TJBot/docs/` (separate git repo).

Cross-repo escalation triggers:
- BLE wire protocol (sys-18) → escalate to TJBot-firmware + tbot-backend
- Auth / COPPA (sys-01) → escalate to tbot-backend
- Safety filters (sys-05) → escalate to TJBot-ai-services
- Infrastructure (sys-13) → escalate to TJBot-infra
- Realtime session (sys-04) → escalate to tbot-backend + TJBot-ai-services

---

## Key paths

| What | Path |
|---|---|
| Docs workspace | `/Users/manhhodinh/Documents/TJBot/migrate-ui-ux-to-mobile-app-docs/` |
| HTTP client | `src/api/client.ts` (pre-PR4), `src/services/http/client.ts` (post-PR4) |
| Route constants | `src/app/navigation/routes.ts` |
| Custom ESLint rule | `eslint-rules/no-voice-timing-in-shared.js` |
| Path helper for scripts | `scripts/_lib/paths.mjs` |
| Tasks canonical source | `/Users/manhhodinh/Documents/TJBot/packages/shared-data/src/content/tasks.json` |

---

## Validation commands

Run from `/Users/manhhodinh/Documents/TJBot/TJBot-mobile/`:

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

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **TJBOT-Mobile** (6656 symbols, 15914 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "feature/mobile-backend-first"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/TJBOT-Mobile/context` | Codebase overview, check index freshness |
| `gitnexus://repo/TJBOT-Mobile/clusters` | All functional areas |
| `gitnexus://repo/TJBOT-Mobile/processes` | All execution flows |
| `gitnexus://repo/TJBOT-Mobile/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->

<!-- ipad-qa:start -->
# iPad Physical-Device QA & Backend Reality (2026-06-26)

## Backend URL (READ FIRST — this caused "nothing works")
- **Working backend:** `https://tbot-backend-8wmh.onrender.com/v1` (Render; `/health`=200; `/auth/login` works). `.env` uses this — **local builds work.**
- **`https://api.TJBot.io` does NOT exist (DNS NXDOMAIN).** It was hardcoded in `eas.json` (production + staging-device) and `src/constants/ownedBackend.ts`, so **every EAS/production build was bricked** — every call → `ENOTFOUND` → `NETWORK_ERROR` → "Check your internet connection" → login fails → robot can't get a Gemini token → "nothing works."
- **TEMPORARY fix applied (user-approved):** those configs now point at onrender. **Revert to `api.TJBot.io` only after** the owned domain is registered + DNS'd + backend deployed there. Grep `api.TJBot.io` before any production build.
- Demo account: `demo@tbot.com` / `Demo@123123` (COPPA pre-verified).

## What a HUMAN must do for physical-iPad QA (agents cannot do these)
1. **Tap interactions** — the Mac cannot drive a physical iPad (CoreDevice tunnel exposes no input injection; QuickTime mirror is display-only). The human taps; the agent observes.
2. **Screenshots of the real device** — `idevicescreenshot` fails on modern iOS over the CoreDevice tunnel ("mount Developer disk image / Invalid service"). To let an agent SEE the device: USB-connect + QuickTime Player → New Movie Recording → select the iPad as source → leave the window open; the agent screenshots that window. Otherwise the human uses the iPad's own screenshot (side+volume-up) and shares it.
3. **Keep the iPad unlocked & awake** during install/launch (CoreDevice Wi-Fi tunnel drops when locked).

## Diagnostics → Telegram (TEMPORARY, remove before production)
- Every warn+error diagnostic on-device is sent **directly** to Telegram (`@vpsclaude0_bot`, chat `760353533`), bypassing the backend — so backend-unreachable failures still report the exact `axiosCode`/url. Creds reused from `~/.config/voiceflow/telegram.env`.
- Files + removal checklist: `docs/TEMP-DIAGNOSTICS-REMOVAL.md`. Env flags: `EXPO_PUBLIC_DIAG_DIRECT_TO_TELEGRAM` / `EXPO_PUBLIC_DIAG_TELEGRAM_BOT_TOKEN` / `EXPO_PUBLIC_DIAG_TELEGRAM_CHAT_ID` (gitignored `.env`).
- **Decisive functional test:** human taps Log In on the iPad → the exact failure (if any) lands in Telegram.

## Build / deploy gotchas (verified this session)
- **Concurrent `xcodebuild` OOM:** two full builds on this Mac get SIGKILL'd (exit 137). When another project is building, **don't** run a second `expo run:ios`. Use `-jobs 3` to cap RAM, or the surgical path below.
- **Surgical JS-only redeploy (no native rebuild, no OOM):** re-bundle JS → compile to Hermes bytecode with the project's `ios/Pods/hermes-engine/destroot/bin/hermesc` (`-emit-binary -O -out <hbc> <plain.js>`; never pipe it through `head` — SIGPIPE kills it mid-write) → swap into `*.app/main.jsbundle` → re-sign device app (`codesign -f -s <identity> --entitlements <ent.plist>`) or just reinstall on sim → `devicectl`/`simctl install`. The bundle is Hermes bytecode (magic `c6 1f bc 03`), NOT plain JS — a plain-JS swap won't run.
- **Direct `xcodebuild` does NOT inject `.env`** the way `expo run:ios` does → the bundle falls back to the wrong URL (sim → `localhost:3000`; device → owned-backend fallback). Force env on the bundle step: `EXPO_PUBLIC_TBOT_API_URL=… npx expo export:embed …`, or use `expo run:ios`.
- **iOS-Simulator keychain (`expo-secure-store`) needs an entitlement:** an unsigned/adhoc sim build throws `errSecMissingEntitlement (-34018)` (e.g. age-gate "Could not save your answer" — a SIM artifact, not a device bug). Build the sim app WITH `keychain-access-groups` (`CODE_SIGN_ENTITLEMENTS`); **re-signing an adhoc/linker-signed sim app after the fact breaks SpringBoard launch** ("SBMainWorkspace denied").
<!-- ipad-qa:end -->
