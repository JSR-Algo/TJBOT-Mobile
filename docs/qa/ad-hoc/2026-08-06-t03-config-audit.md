# adhoc-2026-08-06-t03-config-audit — Verification Matrix

**Repo:** tbot-mobile · **Date:** 2026-08-06 · **Task:** T0.3 (lesson-prod config/env/secrets audit) · **Status:** DONE

Full four-repo audit report (config matrix, ESP/VPS verification, findings routing):
`robot/docs/qa/ad-hoc/2026-08-06-t03-config-audit.md` in the TBOT umbrella tree.
This file records the single tbot-mobile change made under T0.3.

## Problem

`tests/config/env.test.ts` (added as a checked-in-state guard) failed on main:
the generated `src/__env__.ts` was committed with production service URLs baked
in, so every fresh clone ships prod endpoints inside the bundle source and the
"generated-clean" invariant is violated (finding routed from the T0.1 baseline).

Repro (main, 2026-08-06):

```
● generated mobile environment defaults › does not check production service URLs into the generated source

  > 10 |     expect(source).not.toMatch(/\.onrender\.com/i);
  Tests:       1 failed, 1 total
```

`src/__env__.ts` at HEAD contained
`TBOT_API_URL: "https://tbot-backend-8wmh.onrender.com"`,
`TBOT_AI_URL: "https://tbot-backend-8wmh.onrender.com/api/ai"`, and
`EXPO_PUBLIC_VOICE_TEST_HARNESS: "true"` — the by-product of a developer's
local `.env` at the time `metro.config.js` regenerated the file before a commit.

## Changes

| File | Change |
|---|---|
| `src/__env__.ts` | Reset to the generated-clean form: every key `""` (exactly what `metro.config.js` emits with no `.env` and no overriding process env) |

No behavior change for builds: `metro.config.js` regenerates this file on every
bundle from `.env`/process env, and `src/config.ts` keeps its documented
fallback chain (explicit env → dev-server host detection → hosted Render URL as
final production fallback), so an empty checked-in file is safe for both dev and
release builds.

## Acceptance criteria

| # | AC | Verdict | Evidence |
|---|---|---|---|
| 1 | `npx jest tests/config/env.test.ts` passes | PASS | `Tests: 1 passed, 1 total` (worktree `lesson-prod/t03-config-audit`, 2026-08-06) |
| 2 | `npx tsc --noEmit` clean | PASS | exit 0, no diagnostics |
| 3 | No secrets tracked in tbot-mobile | PASS | `git grep` secret-pattern scan clean; only `.env.example` / `.env.production.example` tracked |
