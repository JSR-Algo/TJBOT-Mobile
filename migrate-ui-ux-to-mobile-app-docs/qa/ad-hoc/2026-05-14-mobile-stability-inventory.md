# Mobile Stability Inventory

Date: 2026-05-14
Scope: Goal 0 from `docs/superpowers/plans/2026-05-14-mobile-stability-goals.md`
System: sys-16, tbot-mobile

## Result

This inventory is the serial contract handoff for later parallel mobile
stability sessions. It records current domain ownership, route/state/API/test
surfaces, shared-file collision risks, blockers, and verification commands.

## Source Evidence Read

- `tbot-mobile/AGENTS.md`
- `tbot-mobile/.agent/AGENT_ENTRYPOINT.md`
- `tbot-mobile/.agent/AGENT_CONTEXT.md`
- `tbot-mobile/.agent/SYSTEM_CONTRACTS.md`
- `tbot-mobile/.agent/TASK_EXECUTION.md`
- `tbot-mobile/.agent/VALIDATION_CHECKLIST.md`
- `tbot-mobile/.agent/DOC_SYNC_RULES.md`
- `tbot-mobile/migrate-ui-ux-to-mobile-app-docs/AGENTS.md`
- `docs/superpowers/plans/2026-05-14-mobile-stability-goals.md`
- `docs/superpowers/plans/2026-05-14-mobile-stability-master-prompts.md`
- `tbot-mobile/package.json`
- `tbot-mobile/migrate-ui-ux-to-mobile-app-docs/README.md`
- `tbot-mobile/migrate-ui-ux-to-mobile-app-docs/architecture/TEST_MATRIX.md`
- `tbot-mobile/migrate-ui-ux-to-mobile-app-docs/architecture/navigation-audit.md`
- `tbot-mobile/migrate-ui-ux-to-mobile-app-docs/migration/state-machines-mobile-ux.audit.md`

Notes:

- Root `/Users/manhhodinh/Documents/TBOT/AGENTS.md` was requested but is absent.
- Boot doc task path `/Users/manhhodinh/Documents/TBOT/packages/shared-data/src/content/tasks.json` is stale; actual path found is `docs/packages/shared-data/src/content/tasks.json`.
- Root `/Users/manhhodinh/Documents/TBOT/PRODUCTION-ARCHITECTURE.md` is absent.

## Mobile Domain Inventory

Route counts come from `migrate-ui-ux-to-mobile-app-docs/architecture/route-mapping.json`.

| Domain | Routes | Route ownership | State machine / states | API client surface | Primary goal | Parallel owner |
| --- | ---: | --- | --- | --- | --- | --- |
| auth | 2 | `src/features/auth/domain.meta.json`, `src/features/auth/navigation.ts`, `src/navigation/AuthNavigator.tsx` | `src/features/auth/states.ts` | `src/services/api/auth.ts`, `src/services/http/client.ts`, `src/services/http/tokens.ts`, `src/services/storage/secureStore.ts` | Goal 1 | auth/session |
| onboarding | 10 | `src/features/onboarding/domain.meta.json`, `src/features/onboarding/navigation.ts`, `src/navigation/OnboardingNavigator.tsx` | `src/features/onboarding/states.ts`, `src/state/machines/onboarding.machine.ts` | `src/services/api/households.ts`, `src/services/api/parent.api.ts` | Goal 3 | onboarding/parent |
| home | 1 | `src/features/home/domain.meta.json`, `src/features/home/navigation.ts` | `src/features/home/states.ts` | `src/services/api/home.api.ts`, dashboard/learning clients as imported | Goal 4 | learning |
| course | 7 | `src/features/course/domain.meta.json`, `src/features/course/navigation.ts` | `src/features/course/states.ts` | `src/services/api/course.api.ts` | Goal 4 | learning |
| course-library | 12 | `src/features/course-library/domain.meta.json`, `src/features/course-library/navigation.ts` | `src/features/course-library/states.ts` | `src/services/api/course-library.api.ts` | Goal 4 | learning |
| progress | 5 | `src/features/progress/domain.meta.json`, `src/features/progress/navigation.ts` | `src/features/progress/states.ts` | `src/services/api/progress.api.ts` | Goal 4 | learning/progress |
| purchase | 12 | `src/features/purchase/domain.meta.json`, `src/features/purchase/navigation.ts` | `src/features/purchase/states.ts` | `src/services/api/purchase.api.ts`, `src/services/api/account.ts` | Goal 5 | purchase |
| lesson-session | 24 | `src/features/lesson-session/domain.meta.json`, `src/features/lesson-session/navigation.ts` | `src/features/lesson-session/states.ts`, `src/state/machines/lessonSession.machine.ts` | `src/services/api/lesson-session.api.ts`, `src/services/ws/realtime.ts`, `src/services/ai/liveMessageAudio.ts`, `src/services/audio/PcmStreamPlayer.ts` | Goal 6 | lesson/voice |
| device | 20 | `src/features/device/domain.meta.json`, `src/features/device/navigation.ts` | `src/features/device/states.ts`, `src/state/machines/devicePairing.machine.ts` | `src/services/api/device.api.ts`, `src/services/api/devices.ts`, `src/services/ble/**` | Goal 7 | device/BLE |
| robot-mgmt | 12 | `src/features/robot-mgmt/domain.meta.json`, `src/features/robot-mgmt/navigation.ts` | `src/features/robot-mgmt/states.ts` | `src/services/api/robot-mgmt.api.ts`, `src/services/api/support.api.ts` | Goal 7 | device/BLE |
| parent | 7 | `src/features/parent/domain.meta.json`, `src/features/parent/navigation.ts` | `src/features/parent/states.ts`, `src/state/machines/parentApproval.machine.ts` | `src/services/api/parent.api.ts`, `src/services/api/households.ts` | Goal 3 | onboarding/parent |
| fallback | 10 | `src/features/fallback/domain.meta.json`, `src/features/fallback/navigation.ts` | `src/features/fallback/states.ts` | `src/services/observability/**`, `src/utils/errors.ts`, API error normalization | Goal 8 | fallback/observability |

## Navigation And State Surfaces

Current navigation architecture files:

- `src/navigation/AppNavigator.tsx`
- `src/navigation/RootStackNavigator.tsx`
- `src/navigation/AuthNavigator.tsx`
- `src/navigation/OnboardingNavigator.tsx`
- `src/navigation/MainTabNavigator.tsx`
- `src/navigation/ModalNavigator.tsx`
- `src/navigation/routes.ts`
- `src/navigation/featureRegistry.ts`
- `src/navigation/featureRouteEntries.ts`
- `src/navigation/routeOwnership.ts`
- `src/navigation/routeMap.ts`
- `src/navigation/linking.ts`
- `src/navigation/inventory.ts`

Current state-machine files:

- `src/state/machines/onboarding.machine.ts`
- `src/state/machines/lessonSession.machine.ts`
- `src/state/machines/devicePairing.machine.ts`
- `src/state/machines/parentApproval.machine.ts`
- `src/state/voiceAssistantStore.ts`
- `src/contracts/robot-state.ts`
- `src/features/*/states.ts` for all 12 domains

Navigation audit status:

- 122 routable screen/modal/overlay files under `src/features/`.
- 122 routes registered in navigators.
- 122 route types declared in `RootStackParamList`.
- 122 feature route registrations.
- 0 orphan screen files.
- 17 dead aliases removed in prior audit.

## API Client Inventory

Core shared clients:

- HTTP/session: `src/services/http/client.ts`, `src/services/http/refresh-queue.ts`, `src/services/http/tokens.ts`
- Storage: `src/services/storage/secureStore.ts`, `src/services/storage/asyncStorage.ts`, `src/services/storage/index.ts`
- Realtime: `src/services/ws/realtime.ts`
- BLE: `src/services/ble/config.ts`, `src/services/ble/permissions.ts`, `src/services/ble/service.ts`, `src/services/ble/types.ts`
- AI/audio: `src/services/ai/liveMessageAudio.ts`, `src/services/audio/PcmStreamPlayer.ts`
- Observability: `src/services/observability/RootErrorBoundary.tsx`, `src/services/observability/analytics.ts`, `src/services/observability/sentry.ts`, `src/services/observability/voice-telemetry.ts`
- I18n: `src/services/i18n/i18n.ts`, `src/services/i18n/resources.ts`

Domain API modules:

- `src/services/api/account.ts`
- `src/services/api/ai.ts`
- `src/services/api/auth.ts`
- `src/services/api/controls.ts`
- `src/services/api/course-library.api.ts`
- `src/services/api/course.api.ts`
- `src/services/api/dashboard.ts`
- `src/services/api/device.api.ts`
- `src/services/api/devices.ts`
- `src/services/api/home.api.ts`
- `src/services/api/households.ts`
- `src/services/api/learning.ts`
- `src/services/api/lesson-session.api.ts`
- `src/services/api/notifications.ts`
- `src/services/api/parent.api.ts`
- `src/services/api/progress.api.ts`
- `src/services/api/purchase.api.ts`
- `src/services/api/robot-mgmt.api.ts`
- `src/services/api/support.api.ts`

## Existing Test Suites Mapped To Goals

Every current mobile test suite is assigned to one primary stability goal.

| Test suite | Primary goal |
| --- | --- |
| `tests/App.test.tsx` | Goal 10 |
| `tests/ai/liveMessageAudio.test.ts` | Goal 6 |
| `tests/ai/vietnamese-voice-corpus.test.ts` | Goal 6 |
| `tests/api/account-entitlements.test.ts` | Goal 5 |
| `tests/api/config.test.ts` | Goal 1 |
| `tests/api/course-progress-normalization.test.ts` | Goal 4 |
| `tests/api/errors-stability.test.ts` | Goal 8 |
| `tests/api/http-client.test.ts` | Goal 1 |
| `tests/api/purchase-billing.test.ts` | Goal 5 |
| `tests/api/refresh-queue.test.ts` | Goal 1 |
| `tests/api/storage.test.ts` | Goal 1 |
| `tests/audio/PcmStreamPlayer.test.ts` | Goal 6 |
| `tests/ble/permissions.test.ts` | Goal 7 |
| `tests/ble/service.test.ts` | Goal 7 |
| `tests/components/robot-body.test.tsx` | Goal 7 |
| `tests/contexts/auth-invalidation.test.tsx` | Goal 1 |
| `tests/contexts/household-context-race.test.tsx` | Goal 3 |
| `tests/contracts/parity.test.ts` | Goal 10 |
| `tests/e2e/auth.test.tsx` | Goal 1 |
| `tests/e2e/course-progress-stability.test.tsx` | Goal 4 |
| `tests/e2e/onboarding.test.tsx` | Goal 3 |
| `tests/e2e/parent-settings.test.tsx` | Goal 3 |
| `tests/eslint-rules/no-voice-timing-in-shared.test.ts` | Goal 6 |
| `tests/hooks/lesson-session-voice-stability.test.ts` | Goal 6 |
| `tests/hooks/use-streaming-transcript.test.ts` | Goal 6 |
| `tests/hooks/use-voice-activity.test.ts` | Goal 6 |
| `tests/hooks/useGeminiConversation-bargein-ordering.test.ts` | Goal 6 |
| `tests/hooks/useGeminiConversation-bi7.test.ts` | Goal 6 |
| `tests/hooks/useGeminiConversation-bi8-fuzz.test.ts` | Goal 6 |
| `tests/hooks/useGeminiConversation-budget.test.ts` | Goal 6 |
| `tests/hooks/useGeminiConversation-cancel-unack.test.ts` | Goal 6 |
| `tests/hooks/useGeminiConversation-language.test.ts` | Goal 6 |
| `tests/hooks/useGeminiConversation-p0.test.ts` | Goal 6 |
| `tests/hooks/useGeminiConversation-reconnect.test.ts` | Goal 6 |
| `tests/hooks/useGeminiConversation-timers.test.ts` | Goal 6 |
| `tests/hooks/useGeminiConversation-voice-stability.test.ts` | Goal 6 |
| `tests/hooks/useGeminiConversation-x1x2x3.test.ts` | Goal 6 |
| `tests/hooks/useLatencyBudget.test.ts` | Goal 6 |
| `tests/integration/auth-isolation.test.ts` | Goal 1 |
| `tests/lib/suka-prompt-language.test.ts` | Goal 9 |
| `tests/modules/voice-native.test.ts` | Goal 6 |
| `tests/native/VoiceMic.test.ts` | Goal 6 |
| `tests/native/voice-session-events.test.ts` | Goal 6 |
| `tests/navigation/back-stack-consistency.test.ts` | Goal 2 |
| `tests/navigation/device-pairing-route-params.test.ts` | Goal 7 |
| `tests/navigation/feature-owned-navigation.test.ts` | Goal 2 |
| `tests/navigation/feature-state-alignment.test.ts` | Goal 2 |
| `tests/navigation/flow-script-typescript-source.test.ts` | Goal 2 |
| `tests/navigation/mobile-safe-transitions.test.ts` | Goal 2 |
| `tests/navigation/modal-usage.test.ts` | Goal 2 |
| `tests/navigation/navigation-architecture.test.ts` | Goal 2 |
| `tests/navigation/no-circular-forward-navigation.test.ts` | Goal 2 |
| `tests/navigation/no-phantom-routes.test.ts` | Goal 2 |
| `tests/navigation/no-placeholder-navigation.test.ts` | Goal 2 |
| `tests/navigation/root-branch-isolation.test.ts` | Goal 2 |
| `tests/navigation/root-navigator.test.tsx` | Goal 2 |
| `tests/navigation/route-coverage-script.test.ts` | Goal 2 |
| `tests/navigation/route-map.test.ts` | Goal 2 |
| `tests/navigation/route-ownership.test.ts` | Goal 2 |
| `tests/navigation/route-params.test.ts` | Goal 2 |
| `tests/navigation/route-reachability.test.ts` | Goal 2 |
| `tests/navigation/state-machine-executable-alignment.test.ts` | Goal 2 |
| `tests/navigation/state-machine-route-alignment.test.ts` | Goal 2 |
| `tests/navigation/type-safe-feature-navigation.test.ts` | Goal 2 |
| `tests/observability/RootErrorBoundary.test.tsx` | Goal 8 |
| `tests/observability/analytics.test.ts` | Goal 8 |
| `tests/observability/sentry.test.ts` | Goal 8 |
| `tests/observability/voice-telemetry.test.ts` | Goal 8 |
| `tests/purchase/billing-screens.test.tsx` | Goal 5 |
| `tests/security/gemini-api-key.test.ts` | Goal 6 |
| `tests/state/machines/devicePairing.machine.test.ts` | Goal 7 |
| `tests/state/machines/lessonSession.machine.test.ts` | Goal 6 |
| `tests/state/machines/onboarding.machine.test.ts` | Goal 3 |
| `tests/state/machines/parentApproval.machine.test.ts` | Goal 3 |
| `tests/state/machines/setup.test.ts` | Goal 2 |
| `tests/state/voiceAssistantStore.test.ts` | Goal 6 |
| `tests/ui-validation/accessibility-primitives.test.tsx` | Goal 9 |
| `tests/ui-validation/app-ui.test.tsx` | Goal 9 |
| `tests/ui-validation/fallback-offline.test.tsx` | Goal 8 |
| `tests/utils/errors.test.ts` | Goal 8 |

Coverage status from refreshed inventory:

- Goal 4 now has dedicated API and E2E-style Jest proof via `tests/api/course-progress-normalization.test.ts` and `tests/e2e/course-progress-stability.test.tsx`.
- Goal 5 now has dedicated API and screen proof via `tests/api/account-entitlements.test.ts`, `tests/api/purchase-billing.test.ts`, and `tests/purchase/billing-screens.test.tsx`.
- Goal 9 has dedicated accessibility/UI proof via `tests/ui-validation/accessibility-primitives.test.tsx` and `tests/ui-validation/app-ui.test.tsx`; keep `npm run i18n:check` in Goal 9 and release gates.
- Goal 10 is release-gate aggregation, not a feature proof.

## Shared-File Collision Risks

Treat these as serial or single-owner files during parallel sessions:

| Risk | Shared files | Impact | Owner / mitigation |
| --- | --- | --- | --- |
| Navigation registry collision | `src/navigation/routes.ts`, `src/navigation/featureRegistry.ts`, `src/navigation/featureRouteEntries.ts`, `src/navigation/routeOwnership.ts`, `src/navigation/ModalNavigator.tsx`, `src/navigation/MainTabNavigator.tsx`, `src/navigation/RootStackNavigator.tsx` | Two feature sessions can register, rename, or delete routes inconsistently. | Goal 2 owns structural navigation. Other goals edit only feature-owned `navigation.ts` unless Goal 2 coordinates. |
| Auth/session collision | `src/services/http/**`, `src/contexts/AuthContext.tsx`, `src/services/storage/**`, `tests/setup.ts` | Token refresh, auth invalidation, and test mocks can break unrelated feature tests. | Goal 1 owns HTTP/auth/storage. Other goals consume public clients only. |
| Household/parent collision | `src/contexts/HouseholdContext.tsx`, `src/services/api/households.ts`, `src/services/api/parent.api.ts`, parent and onboarding screens | Onboarding and parent-gate sessions can race on household reset and lockout semantics. | Goal 3 owns these files. |
| Voice runtime collision | `src/hooks/useGeminiConversation*.ts`, `src/services/ws/**`, `src/services/ai/**`, `src/services/audio/**`, `src/native/**`, `src/state/voiceAssistantStore.ts` | Reconnect/cancel ordering, timers, and audio setup can invalidate many existing tests. | Goal 6 owns voice/realtime/audio. |
| Device/BLE collision | `src/services/ble/**`, `src/services/api/device.api.ts`, `src/services/api/devices.ts`, `src/features/device/**`, `src/features/robot-mgmt/**` | BLE protocol is sys-18 consumer surface; schema changes need escalation. | Goal 7 owns BLE/device. Do not change UUIDs or payload schemas without firmware/backend approval. |
| Observability/error collision | `src/services/observability/**`, `src/utils/errors.ts`, `src/components/ErrorBoundary/**`, `src/components/OfflineBanner.tsx` | Error normalization and PII rules can affect all goals. | Goal 8 owns fallback/observability. Other goals pass normalized errors through. |
| Docs matrix collision | `migrate-ui-ux-to-mobile-app-docs/architecture/TEST_MATRIX.md` | All goals may want to update proof rows. | Goal 0 creates baseline; Goal 10 owns final release-gate update. Intermediate goals write feature evidence in `qa/ad-hoc/` unless explicitly assigned. |
| Global test harness collision | `tests/setup.ts`, Jest config in `package.json` | Mock changes can invalidate every suite. | Single-owner per active branch; no cross-goal harness edits without coordination. |

## Blockers And Risks

| Blocker / risk | Owner goal | Current evidence | Next verification |
| --- | --- | --- | --- |
| Full git worktrees are already dirty in both `tbot-mobile` and `docs`; parallel sessions must not assume a clean base. | Goal 0 / all | `git status --short` reports many modified and untracked files. | Each session records touched files before edits and avoids reverting unrelated work. |
| Goal 4 backend/provider proof remains limited. | Goal 4 | Dedicated mobile tests now exist, but integration/API backend enforcement is still marked limited in `TEST_MATRIX.md`. | Keep API normalization tests green; rely on backend stability goals for provider/data enforcement. |
| Goal 5 provider/device runtime proof remains limited. | Goal 5 | Dedicated mobile purchase tests now exist, but Stripe/provider/device runtime proof is outside local mobile unit gates. | Keep purchase API/screen tests green; pair with backend billing/provider proof before production release. |
| Use-case backend sentinel rows for parent-summary and progress were drifted. | Goal 3 / Goal 4 | Initial `npm run usecases:check` exited 1 with 9 failures: `getParentSummary`, `getParentToday`, `getParentHistory`, `getSafetyConfig`, `getSettings`, `getTodayProgress`, `getWordsPracticed`, `getLessonSummary`, `getReviewQueue`. Rows now use `BACKEND_NOT_DESIGNED`; candidate function refs live in notes. | Closed in this continuation; rerun `npm run usecases:check` before Goal 3/4 edits. |
| BLE is a cross-system contract. | Goal 7 | System contracts mark BLE UUID/message schema edits as sys-18 escalation. | Keep BLE tests/client behavior inside existing protocol; escalate schema changes. |
| COPPA legal copy is cross-repo/legal reviewed. | Goal 3 | System contracts forbid consent text edits without approval. | Keep onboarding parent consent copy unchanged unless user provides approval. |
| Root boot paths have drift. | Goal 0 / infra | `packages/shared-data` and `PRODUCTION-ARCHITECTURE.md` requested by boot docs are absent at root. | Keep note in inventory; avoid broad agent-doc edits outside assigned scope. |

## Verification Commands

Goal 0 requested verification:

```sh
cd /Users/manhhodinh/Documents/TBOT/tbot-mobile && npm run typecheck
cd /Users/manhhodinh/Documents/TBOT/tbot-mobile && npm run flows:fast
cd /Users/manhhodinh/Documents/TBOT/tbot-mobile && npm run usecases:check
```

Observed Goal 0 results:

| Command | Exit | Key output | Result |
| --- | ---: | --- | --- |
| `npm run typecheck` | 0 | no TypeScript errors | PASS |
| `npm run flows:fast` | 0 | `[flows:extract] {"states":127,"edges":0,"groups":15,"dynamicCalls":0,"orphanSubcomponents":0}`; `[flows:generate] wrote=0 files (check=false); total=27`; `[validate] generated-sha(15 files): OK`; `[validate] ALL CHECKS PASSED` | PASS |
| `npm run usecases:check` | 0 | `check-uc-sections: checked=154, skeletons=0, failures=0`; `check-edge-case-enum: checked=154, failures=0`; `check-backend-sentinel: checked=154, failures=0` | PASS |

Continuation rerun after closing backend-sentinel drift:

| Command | Exit | Key output | Result |
| --- | ---: | --- | --- |
| `npm run typecheck -- --pretty false` | 0 | no TypeScript errors | PASS |
| `npm run flows:fast` | 0 | `[flows:extract] {"states":127,"edges":0,"groups":15,"dynamicCalls":0,"orphanSubcomponents":0}`; `[flows:generate] wrote=0 files (check=false); total=27`; `[validate] ALL CHECKS PASSED` | PASS |
| `npm run usecases:check` | 0 | `check-uc-sections: checked=154, skeletons=0, failures=0`; `check-backend-sentinel: checked=154, failures=0` | PASS |

Recommended follow-up gates for later goals:

```sh
cd /Users/manhhodinh/Documents/TBOT/tbot-mobile && npm test
cd /Users/manhhodinh/Documents/TBOT/tbot-mobile && npm run lint
cd /Users/manhhodinh/Documents/TBOT/tbot-mobile && npm run i18n:check
cd /Users/manhhodinh/Documents/TBOT/tbot-mobile && npm run sequences:fast
cd /Users/manhhodinh/Documents/TBOT/tbot-mobile && npm run erd:fast
```
