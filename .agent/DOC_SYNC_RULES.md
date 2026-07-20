# tjbot-mobile — Doc Sync Rules

When code behavior or contracts change, these docs must be updated in the
same PR (or in the same commit batch). Leaving drift is a FAIL condition.

Docs workspace root:
`/Users/manhhodinh/Documents/tjbot/migrate-ui-ux-to-mobile-app-docs/`

---

## Rule 1 — New route added to `routes.ts`

Trigger: any new constant in `src/app/navigation/routes.ts`

Required doc updates:
1. Regenerate `nav-graph-data.json` at repo root (run flow generator)
2. Regenerate `migrate-ui-ux-to-mobile-app-docs/flows/domains/<feature>.generated.mmd`
   (run `npm run flows:generate`, not hand-edited)
3. If the route introduces a new stateful screen: add or update the feature's
   entry in `migrate-ui-ux-to-mobile-app-docs/state-machines/<feature>.state.mmd`
4. Update `src/features/<feature>/domain.meta.json` with the new screen
5. If the screen is referenced in a use-case: update
   `migrate-ui-ux-to-mobile-app-docs/usecases/domains/<domain>/use-cases.md`
6. Run `npm run check:route-coverage` — must be green before PR

---

## Rule 2 — New API endpoint consumed (new call in any `src/services/api/*.ts`)

Trigger: new `client.get/post/put/patch/delete` call in any API module

Required doc updates:
1. Verify the endpoint is documented in `migrate-ui-ux-to-mobile-app-docs/api/openapi.json`
   — if not, escalate to tjbot-backend before writing the call
2. If the endpoint maps to an existing use-case, update the backend-mapping:
   `migrate-ui-ux-to-mobile-app-docs/usecases/domains/<domain>/backend-mapping.md`
3. If the endpoint represents a new flow, add a sequence diagram:
   `migrate-ui-ux-to-mobile-app-docs/sequences/<NN>-<system>/<flow>.sequence.mmd`

---

## Rule 3 — State machine modified (XState machine or Zustand store behavior)

Trigger: change to any `src/store/*.store.ts` or XState machine in
`src/features/{purchase,lesson-session,device}/`

Required doc updates:
1. Update `migrate-ui-ux-to-mobile-app-docs/state-machines/<feature>.state.mmd`
   to match the new state/transition graph
2. Update `migrate-ui-ux-to-mobile-app-docs/erd/_global/state-machine-alignment.md`
   if the state machine touches a shared entity (e.g. `LessonSession`, `DevicePairing`)
3. If transitions changed: update use-case edge-cases doc:
   `migrate-ui-ux-to-mobile-app-docs/usecases/domains/<domain>/edge-cases.md`

---

## Rule 4 — BLE message schema change

**THIS IS A CROSS-REPO ESCALATION — HARD STOP**

Trigger: any change to service UUIDs, characteristic UUIDs, or message
payload shapes in `src/services/ble/`

Action:
1. STOP. Do not commit.
2. Open cross-repo issue tagging tjbot-firmware and tjbot-backend.
3. Read `migrate-ui-ux-to-mobile-app-docs/sequences/18-wire-protocol/` and
   `docs/site/software/systems/18-*.md`.
4. Only proceed after explicit approval from tjbot-firmware agent/team.
5. When approved: update `migrate-ui-ux-to-mobile-app-docs/sequences/18-wire-protocol/<flow>.sequence.mmd`
   to reflect the new protocol.

---

## Rule 5 — COPPA copy change

**THIS IS A CROSS-REPO ESCALATION — HARD STOP**

Trigger: any text change in consent screens:
- `src/features/auth/screens/CoppaScreen.tsx`
- `src/features/onboarding/screens/CoppaConsentScreen.tsx`

Action:
1. STOP. Do not commit.
2. Request legal review via user. Reference `docs/site/legal/coppa-*.md`.
3. After approval: update `migrate-ui-ux-to-mobile-app-docs/decisions/ADR-0001`
   (or whichever ADR governs COPPA) with the change rationale and reviewer sign-off.

---

## Rule 6 — New PostHog event name

Trigger: new `posthog.capture(...)` call anywhere in `src/`

Required doc updates:
1. Event name MUST follow `<domain>_<verb>_<noun>` snake_case convention.
2. Add to the event glossary:
   `migrate-ui-ux-to-mobile-app-docs/usecases/reference/use-case-index.json`
   (the `analytics_events` section, if present, or add a comment block)
3. Check PostHog dashboard for name collision before adding.

---

## Rule 7 — New Sentry event or changed tag schema

Trigger: new `Sentry.captureException/captureMessage` call, or change to
the `feature`/`screen` tag values

Required doc updates:
1. Ensure `feature` tag matches the feature slice dir name.
2. Ensure `screen` tag matches the screen component name.
3. No doc file to update — but record the event in the task-close evidence block.

---

## Rule 8 — Deleting a `.js` state file (dual .js + .ts resolution)

Trigger: deleting any `*.store.js` or `*State.js` file in a feature slice

Required checks before delete:
1. Run: `diff <feature>/state/<name>.js <feature>/state/<name>.ts`
   (or equivalent — compare field-by-field)
2. If `.ts` is missing any fields from `.js`: port missing fields first
3. Run `grep -r "require.*<name>\.store\.js" src/` — must return empty
4. Run `grep -r "import.*<name>State\.js" src/` — must return empty
5. Record diff in task-close evidence block

---

## Rule 9 — Validator path changes (e.g. scripts refactor)

Trigger: any change to `scripts/_lib/paths.mjs` or validator scripts

Required checks:
1. Run all four validators and confirm non-zero file counts in stdout:
   `npm run flows:validate && npm run sequences:fast && npm run erd:validate && npm run usecases:check`
2. Silent-green (exit 0, no output) = path misconfiguration = FAIL
3. Update `migrate-ui-ux-to-mobile-app-docs/validation/README.md` if the
   validator command names changed

---

## Rule 10 — Architecture decision changed (new ADR needed)

Trigger: a locked decision from the migration plan is reversed, or a new
significant architectural choice is made that wasn't in the original 12.

Action:
1. Create new ADR: `migrate-ui-ux-to-mobile-app-docs/decisions/ADR-00<NN>.md`
   using the existing ADR template
2. Update `migrate-ui-ux-to-mobile-app-docs/decisions/` index if one exists
3. Cross-reference in the relevant use-case or backend-mapping doc
4. Note the ADR number in the commit message and PR description

---

## Drift-check reminder

At task close, invoke the `drift-check` skill. It verifies:
1. Docs drift: code behavior changed but docs not updated
2. Task drift: task record diverged from what was actually implemented
3. Scope drift: implementation exceeded or missed the stated scope
4. AC drift: acceptance criteria silently changed during implementation
5. Legacy drift: an old code path was preserved instead of replaced

All five drift types must be zero for DONE. Any unresolved drift → PARTIAL.
