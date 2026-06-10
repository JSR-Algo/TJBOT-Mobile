# AD-HOC: mobile app i18n toggle

Date: 2026-05-30
Owner: TJBot-mobile / sys-16

## Acceptance criteria

1. Default app UI language is Vietnamese when no saved preference exists.
2. Parent Settings exposes Vietnamese and English choices and persists the selected language.
3. Targeted screen copy has English/Vietnamese resource parity.
4. Dynamic user, device, network, date, and backend values are not mistranslated.
5. Malformed parent/provisioning payloads fail explicitly instead of rendering misleading empty states.

## Implementation evidence

- Added app language preference support in `src/services/i18n/i18n.ts` with default `vi`, persisted key `tjbot.app.language`, `setAppLanguage`, `loadAppLanguagePreference`, `useAppLanguage`, and shared copy/template helpers.
- Typed locale resources in `src/services/i18n/resources.ts`; updated `en.json` and `vi.json` to parity.
- Auto-translated design-system `Text` string children with `i18n={false}` opt-out for dynamic values.
- Added translated derived accessibility labels in shared row/button/shell helpers.
- Added Settings language controls in `src/features/parent/screens/ParentSettingsScreen.tsx`.
- Localized parent summary, progress, device home, and pairing dynamic copy.
- Added explicit malformed-payload handling for parent summary and provisioning status.
- Added regression coverage in scoped service, feature, and e2e-style Jest tests.

## Verification

| Gate | Command | Exit | Evidence | Result |
|---|---:|---:|---|---|
| Red regression | `npm test -- --runInBand tests/features/device/device-home-screen.test.tsx` | 1 | Missing Vietnamese DeviceRow accessibility label before fix | PASS (expected fail) |
| Green regression | `npm test -- --runInBand tests/features/device/device-home-screen.test.tsx` | 0 | 1 suite, 5 tests passed | PASS |
| I18n scan/parity | `npm run i18n:check` | 0 | hardcoded 0; EN keys 1292; VI keys 1292; delta 0 | PASS |
| TypeScript | `npx tsc --noEmit` | 0 | no output | PASS |
| ESLint | `npm run lint` | 0 | 0 errors, 58 existing warnings | PASS |
| Diff whitespace | `git diff --check` | 0 | no output | PASS |
| Focused Jest | `npm test -- --runInBand tests/e2e/parent-settings.test.tsx tests/features/device/device-home-screen.test.tsx tests/services/i18n-app-language.test.ts tests/e2e/course-progress-stability.test.tsx tests/e2e/ux-redesign-accessibility.test.tsx tests/features/parent/parent-summary-screen.test.tsx` | 0 | 6 suites, 101 tests passed | PASS |
| Full Jest | `npm test -- --runInBand` | 0 | 135/136 suites passed; 1076/1095 tests passed; 19 skipped | PASS |
| Integration | `npm run test:integration` | 0 | 1 suite, 3 tests passed | PASS |

## Notes

- No BLE wire-protocol, API contract, auth-token, infrastructure, or COPPA legal-copy changes were made.
- `PRODUCTION-ARCHITECTURE.md` was not present under `/Users/manhhodinh/Documents/TBOT/docs/` during boot-read.
- Worktree contains broad pre-existing mobile/native/BLE edits outside this i18n task; they were preserved and excluded from the scoped review.
- Native Detox was not used as final proof; prior local run was blocked by simulator/local-service prerequisites unrelated to i18n. JS/static/integration evidence is the completion proof for this scoped feature.
