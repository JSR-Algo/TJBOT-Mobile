# Mobile Robot Rewards UI — Verification Matrix

Task: `adhoc-2026-07-13-mobile-robot-rewards-ui`
System: `sys-16`
Status: implementation evidence for human review; agents do not mark tasks DONE.

| Acceptance criterion | Implementation evidence | Automated evidence |
|---|---|---|
| Persisted unseen reward celebration only | `CelebrationScreen.tsx`, `LessonSummaryScreen.tsx` select Task 10 inbox DTOs and render waiting-to-sync when absent | `tests/features/rewards/reward-surfaces.test.tsx` |
| Once-only seen acknowledgement and reduced motion | Stable reward ID mutation, scoped retry queue from Task 10, static accessible alternative | reward surface and seen-queue suites |
| Private grouped/filterable reward history | `ParentRewardsView.tsx` groups ledger receipts and filters with stable child/robot IDs | `tests/features/rewards/parent-rewards-screen.test.tsx` |
| Cached offline/stale reads | Existing query cache remains visible with explicit stale label and retry | parent rewards stale-data test |
| Weekly/all-time bounded leaderboard | Fixed page size, explicit page controls, refresh, owned-row merge, private/refreshing labels | `tests/features/rewards/leaderboard-screen.test.tsx` |
| Child rename and active selection | `ParentSettingsScreen.tsx` uses authoritative mobile rename and waits for active-child server confirmation | `tests/e2e/parent-settings.test.tsx` |
| Per-robot public preference | `MyRobotScreen.tsx` derives preference from authoritative owned rows and never queues the mutation | `tests/features/rewards/robot-preference.test.tsx` |
| Accessibility and vi/en parity | Interactive controls include role/label/hint/state; live regions cover sync, reward, and stale states | `npm run i18n:check`, targeted screen suites |
| Navigation and documentation drift | Existing singly owned routes retained; domain metadata, generated flows, use cases, mapping, edge cases, and sequence updated | flow, sequence, use-case, route, and screen-prop validators |
| Assignment/session correlation | Reward DTO requires assignment and session IDs; summary never falls back to an older unseen reward for the same child/robot | API malformed-receipt tests and older-receipt screen regression |
| Complete leaderboard rows | Public and owned rows expose lesson count, nullable/refreshing streak, badge summary, and equivalent accessibility wording | leaderboard screen tests |
| All-owned privacy management | Robot management maps every backend-owned row to its own device-scoped preference mutation and contains no static device-health truth | robot preference screen tests and i18n scan |
| Bilingual dynamic summaries | Rank, lesson count, nullable streak, badge summary, owned visibility, and accessibility labels use exact vi/en templates without constructed English fragments | bilingual leaderboard and robot preference tests; i18n parity |
| Independent switch focus | Owned robot card container is not accessible; a non-interactive header owns the summary label and each switch remains separately focusable with checked state, label, and hint | structural accessibility test in `robot-preference.test.tsx` |
| Nullable celebration truth | `CelebrationScreen.tsx` distinguishes an absent streak, a nullable current day count, and an explicit backend zero; no nullish value is coerced to zero | bilingual null-versus-zero cases in `tests/features/rewards/reward-surfaces.test.tsx` |
| Localized reward values and reasons | Celebration and private history use vi/en templates for visible and screen-reader XP, coins, streak state, and canonical lesson-completion reason | bilingual reward-surface and parent-history assertions |
| Authoritative robot status | `RobotStatusScreen.tsx` renders only household-device name, optional serial, and online/offline; loading, retry, unavailable, and unsupported telemetry copy are translated | `tests/features/rewards/robot-status-screen.test.tsx` plus i18n scan/parity |
| Unsupported diagnostics remain unreachable | Battery, storage, firmware, microphone-test, and speaker-test prototypes are marked `productionVisible: false` with `backend-contract-unavailable`; reachability ignores only explicitly hidden routes | production-hidden, route-reachability, route-coverage, and use-case validators |

## Manual / environment-dependent evidence

- Detox iOS build/test is attempted during closeout. If Xcode, simulator, or native dependencies are unavailable, the exact command output is recorded as the residual blocker.
- No hardware-facing behavior is claimed by this UI task.
