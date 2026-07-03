# AD-HOC: Voice Consent Settings

Date: 2026-07-02

## Scope

- Mobile Parent Settings now exposes explicit actions to allow or pause AI voice lessons.
- The actions use the existing OpenAPI-documented endpoints:
  - `POST /v1/identity/ai-voice-consent`
  - `POST /v1/identity/ai-voice-consent/withdraw`
- Robot Google Live voice consent enforcement was verified unchanged.

## Acceptance Criteria

1. Parent can grant AI voice consent from mobile settings.
2. Parent can withdraw AI voice consent from mobile settings.
3. Save failure shows retry copy and does not show saved state.
4. Robot keeps denying live voice with `voice_consent_required` until consent is active.

## Evidence

- `npx tsc --noEmit --pretty false` -> exit 0
- `npm run lint` -> exit 0
- `npm test -- --runInBand` -> 192 passed, 1 skipped suites; 2052 passed, 19 skipped tests
- `npm run test:integration -- --runInBand` -> 1 passed suite, 3 passed tests
- `npx jest --selectProjects unit --runInBand tests/e2e/parent-settings.test.tsx` -> 43 passed
- `npx jest --selectProjects unit --runInBand tests/api/auth-ai-voice-consent.test.ts` -> 2 passed
- `npm run flows:validate` -> ALL CHECKS PASSED
- `npm run sequences:fast` -> 102 sequence files parsed, index up to date
- `npm run erd:validate` -> ALL CHECKS PASSED
- `npm run usecases:check` -> checked 154, failures 0
- `npm run check:token-parity && npm run check:route-coverage && npm run check:screen-prop-types` -> all OK
- `npm run i18n:parity` -> EN keys 1719, VI keys 1719, delta 0
- `./.venv311/bin/python -m pytest tests/test_voice_consent_gate.py tests/test_google_live_provider_edges.py -q` -> 54 passed

## Known Non-Blocking Output

- `npm run i18n:scan` still reports 32 pre-existing hardcoded strings outside this change. The new voice setup strings are present in both locale catalogs.
- Detox was not run; this patch is covered by unit/integration/API tests and does not add navigation, native modules, BLE schema, or route changes.

## Userflow Alignment Addendum

- `ParentSettingsScreen` remains registered as `stateMachineId: parent_settings` in `src/features/parent/navigation.ts`.
- Hand-curated parent flow docs now state that AI voice consent allow/pause actions live inside `parent_settings`, with no separate post-onboarding voice setup route.
- UC-PR06 now names the AI voice consent actions as part of Configure Parent Settings.
- `npm run flows:validate` -> ALL CHECKS PASSED
- `npm run usecases:check` -> checked 154, failures 0
- `npm run check:route-coverage` -> 133 screen files, 125 routes registered, 0 duplicate screen registrations
- `npx jest --selectProjects unit --runInBand tests/e2e/parent-settings.test.tsx --testNamePattern='AI voice|voice setup'` -> 3 passed
