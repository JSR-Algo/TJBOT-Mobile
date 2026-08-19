# T5.4 H1 Parent Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Parent Today consume monotonically newer lesson projections, reconcile a healthy-but-silent realtime connection, and remain mounted across household refreshes so one fresh strict H1 physical assignment can capture s1-s9.

**Architecture:** Keep the existing backend HTTP and WebSocket contracts. Add a small projection-revision arbitration helper at the TanStack Query boundary, opt Parent Today into the existing 10-second active-assignment reconciliation timer even when the socket is healthy, and prevent post-boot household refreshes from unmounting the protected navigator. Each behavior is introduced by a failing regression test before production code changes.

**Tech Stack:** React Native 0.83, React 19, TypeScript strict, TanStack Query, React Navigation 7, Jest 29, Testing Library React Native, Android Gradle release build, ADB, TBOT physical capture scripts.

---

## File Map

- Modify `tests/features/parent/use-parent-learning-status-query.test.tsx`: stale HTTP and healthy-silent-socket regressions.
- Modify `src/features/parent/hooks/useParentLearningStatusQuery.ts`: revision arbitration and opt-in foreground reconciliation.
- Modify `tests/features/parent/parent-today-screen.test.tsx`: Parent Today focus opt-in and no imperative terminal navigation.
- Modify `src/features/parent/screens/ParentTodayScreen.tsx`: pass navigation focus into the query hook.
- Modify `tests/navigation/root-navigator.test.tsx`: protected-stack mount preservation regression.
- Modify `src/navigation/RootStackNavigator.tsx`: distinguish initial household bootstrap from later refreshes.
- Create `docs/qa/ad-hoc/2026-08-19-t54-h1-parent-reconciliation.md`: RED/GREEN, validation, build, install, and physical evidence record.
- Update `/Users/manhhodinh/Documents/TBOT/lesson-prod/t54-e2e-live.md` only after the physical run, preserving `IN_PROGRESS` unless every strict acceptance item passes.
- Update `/Users/manhhodinh/Documents/TBOT/robot/docs/qa/ad-hoc/2026-08-16-t54-e2e-live.md` only with frozen physical evidence from the new assignment.

### Task 1: Reject stale HTTP and realtime projections

**Files:**
- Modify: `tests/features/parent/use-parent-learning-status-query.test.tsx`
- Modify: `src/features/parent/hooks/useParentLearningStatusQuery.ts`

- [ ] **Step 1: Write the failing stale-HTTP regression**

Add a test immediately after `merges a partial realtime update without losing active-learning identity`:

```tsx
it('keeps a newer realtime projection when an older HTTP refresh resolves later', async () => {
  const view = setup();
  await waitFor(() => expect(sockets).toHaveLength(1));

  let resolveRefresh!: (status: ParentLearningStatus) => void;
  mockStatus.mockImplementationOnce(() => new Promise(resolve => { resolveRefresh = resolve; }));
  const callsBeforeUpdate = mockStatus.mock.calls.length;

  act(() => sockets[0].message({
    type: 'lesson.progress.updated', childId: 'child-1', sessionId: 'session-1', projectionRevision: '2',
    occurredAt: '2026-08-19T00:00:00Z', publishedAt: '2026-08-19T00:00:01Z',
    activeLearning: {
      state: 'RUNNING', positionPercent: 44, activeDurationSec: 20,
      currentStep: { stepId: 'step-4', stepNumber: 4, total: 9, activityTitle: 'Name the feeling', phase: 'practice', subject: 'sad' },
    },
  }));

  await waitFor(() => expect(mockStatus).toHaveBeenCalledTimes(callsBeforeUpdate + 1));
  act(() => resolveRefresh(active));

  await waitFor(() => expect(view.result.current.isFetching).toBe(false));
  expect(view.result.current.data).toMatchObject({
    projectionRevision: '2',
    activeLearning: { positionPercent: 44, currentStep: { stepNumber: 4 } },
  });
  view.unmount();
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
npx jest --selectProjects unit --runInBand tests/features/parent/use-parent-learning-status-query.test.tsx -t 'keeps a newer realtime projection'
```

Expected: FAIL because revision `1` from the delayed HTTP response replaces revision `2`.

- [ ] **Step 3: Add one revision-arbitration helper and use it at every query-cache ingress**

Import `compareProjectionRevisions` from `parentProgressRealtime.ts`, then add:

```ts
function newestParentLearningStatus(
  current: ParentLearningStatus | undefined,
  incoming: ParentLearningStatus,
): ParentLearningStatus {
  if (!current) return incoming;
  return compareProjectionRevisions(incoming.projectionRevision, current.projectionRevision) < 0
    ? current
    : incoming;
}
```

Change the query function to compare the HTTP result against the current cache before returning it:

```ts
const query = useQuery<ParentLearningStatus, Error>({
  queryKey: parentLearningStatusKey(childId ?? ''),
  queryFn: async () => {
    const incoming = await getParentLearningStatus(childId!);
    const current = queryClient.getQueryData<ParentLearningStatus>(parentLearningStatusKey(childId!));
    return newestParentLearningStatus(current, incoming);
  },
  enabled,
});
```

Change the realtime snapshot callback to use the same helper:

```ts
onStatus: (status) => {
  queryClient.setQueryData<ParentLearningStatus>(
    parentLearningStatusKey(childId),
    current => newestParentLearningStatus(current, status),
  );
  invalidateDependentProgress(queryClient, childId);
},
```

At the beginning of the `mergeRealtimeUpdate` cache updater, reject a frame older than the cached projection:

```ts
if (compareProjectionRevisions(frame.projectionRevision, current.projectionRevision) < 0) return current;
```

Do not coerce revisions to `Number`, do not synthesize missing revisions, and preserve all existing invalidation behavior.

- [ ] **Step 4: Run focused GREEN verification**

Run:

```bash
npx jest --selectProjects unit --runInBand tests/features/parent/use-parent-learning-status-query.test.tsx tests/services/parent-progress-realtime.test.ts
```

Expected: both suites PASS, including the new stale-HTTP regression.

- [ ] **Step 5: Commit the monotonic projection change**

```bash
git add src/features/parent/hooks/useParentLearningStatusQuery.ts tests/features/parent/use-parent-learning-status-query.test.tsx
git commit -m "fix(parent): keep learning projections monotonic" -m "Refs: T5.4"
```

### Task 2: Reconcile an active Parent Today assignment when the socket is healthy but silent

**Files:**
- Modify: `tests/features/parent/use-parent-learning-status-query.test.tsx`
- Modify: `tests/features/parent/parent-today-screen.test.tsx`
- Modify: `src/features/parent/hooks/useParentLearningStatusQuery.ts`
- Modify: `src/features/parent/screens/ParentTodayScreen.tsx`

- [ ] **Step 1: Extend the test harness with an explicit reconciliation option**

Change `setup` to accept a boolean and pass it as hook options:

```tsx
function setup(childId = 'child-1', reconcileWhileActive = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const wrapper = ({ children }: React.PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return {
    client,
    ...renderHook<ReturnType<typeof useParentLearningStatusQuery>, { id: string; reconcile: boolean }>(
      ({ id, reconcile }) => useParentLearningStatusQuery(id, { reconcileWhileActive: reconcile }),
      { initialProps: { id: childId, reconcile: reconcileWhileActive }, wrapper },
    ),
  };
}
```

- [ ] **Step 2: Write the failing healthy-silent-socket regression**

```tsx
it('reconciles an active Parent Today assignment while the socket remains healthy', async () => {
  const view = setup('child-1', true);
  await waitFor(() => expect(sockets).toHaveLength(1));
  const afterInitialLoad = mockStatus.mock.calls.length;

  await act(async () => { await jest.advanceTimersByTimeAsync(10_000); });

  await waitFor(() => expect(mockStatus).toHaveBeenCalledTimes(afterInitialLoad + 1));
  view.rerender({ id: 'child-1', reconcile: false });
  const afterBlur = mockStatus.mock.calls.length;
  await act(async () => { await jest.advanceTimersByTimeAsync(20_000); });
  expect(mockStatus).toHaveBeenCalledTimes(afterBlur);
  view.unmount();
});
```

- [ ] **Step 3: Run the test and verify RED**

Run:

```bash
npx jest --selectProjects unit --runInBand tests/features/parent/use-parent-learning-status-query.test.tsx -t 'socket remains healthy'
```

Expected: FAIL because polling currently requires `socketExhausted`.

- [ ] **Step 4: Add the narrow hook option and reuse the existing 10-second timer**

Add:

```ts
type ParentLearningStatusQueryOptions = {
  reconcileWhileActive?: boolean;
};
```

Change the hook signature and polling predicate:

```ts
export function useParentLearningStatusQuery(
  childId: string | undefined,
  options: ParentLearningStatusQueryOptions = {},
): UseQueryResult<ParentLearningStatus, Error> {
  // existing setup
  const shouldPoll = Boolean(
    active
    && !TERMINAL_STATES.has(active.state)
    && foreground
    && (socketExhausted || options.reconcileWhileActive),
  );
```

Keep the existing 10-second interval and cleanup. Other consumers remain unchanged because the option defaults to false.

- [ ] **Step 5: Make Parent Today opt in only while focused**

Import `useIsFocused` and change the hook call:

```tsx
const isFocused = useIsFocused();
const query = useParentLearningStatusQuery(activeChild?.id, { reconcileWhileActive: isFocused });
```

In `parent-today-screen.test.tsx`, mock `useIsFocused` as true and assert:

```tsx
expect(mockStatus).toHaveBeenCalledWith('child-1', { reconcileWhileActive: true });
```

Add a terminal rerender assertion that `navigation.navigate` and `navigation.replace` remain uncalled.

- [ ] **Step 6: Run focused GREEN verification**

```bash
npx jest --selectProjects unit --runInBand tests/features/parent/use-parent-learning-status-query.test.tsx tests/features/parent/parent-today-screen.test.tsx tests/features/progress/t33-parent-realtime-catchup.test.tsx
```

Expected: all suites PASS; inactive, terminal, background, and unfocused cases perform no safety poll.

- [ ] **Step 7: Commit foreground reconciliation**

```bash
git add src/features/parent/hooks/useParentLearningStatusQuery.ts src/features/parent/screens/ParentTodayScreen.tsx tests/features/parent/use-parent-learning-status-query.test.tsx tests/features/parent/parent-today-screen.test.tsx
git commit -m "fix(parent): reconcile active lessons while foregrounded" -m "Refs: T5.4"
```

### Task 3: Preserve the protected navigator during household refreshes

**Files:**
- Modify: `tests/navigation/root-navigator.test.tsx`
- Modify: `src/navigation/RootStackNavigator.tsx`

- [ ] **Step 1: Make the mocked protected navigator expose mount identity**

Add `let protectedMounts = 0;` beside the other test globals. Replace the mock body with a component whose state initializer increments it once per mount:

```tsx
ModalNavigator: ({ initialRouteName, initialRouteParams }: { initialRouteName?: string; initialRouteParams?: unknown }) => {
  const { ROUTES: mockRoutes } = jest.requireActual('@/navigation/routes');
  const [mountId] = React.useState(() => {
    protectedMounts += 1;
    return protectedMounts;
  });
  return mockCreateElement(
    'Text',
    { testID: 'protected-stack', initialRouteParams, mountId },
    initialRouteName ?? mockRoutes.HomeHubScreen,
  );
},
```

Reset `protectedMounts = 0` in `beforeEach`.

- [ ] **Step 2: Write the failing refresh-remount regression**

```tsx
it('keeps the protected stack mounted during a later household refresh', async () => {
  mockAuthState.isAuthenticated = true;
  mockHouseholdState.onboardingComplete = true;
  mockHouseholdState.activeHousehold = { id: 'household-1' };
  mockHouseholdState.children = [{ id: 'child-1' }];
  const api = await renderRoot();
  const firstMountId = (await screen.findByTestId('protected-stack')).props.mountId;

  mockHouseholdState.isLoading = true;
  api.rerender(<RootStackNavigator />);
  expect(screen.getByTestId('protected-stack').props.mountId).toBe(firstMountId);

  mockHouseholdState.isLoading = false;
  api.rerender(<RootStackNavigator />);
  expect(screen.getByTestId('protected-stack').props.mountId).toBe(firstMountId);
});
```

- [ ] **Step 3: Run the test and verify RED**

```bash
npx jest --selectProjects unit --runInBand tests/navigation/root-navigator.test.tsx -t 'later household refresh'
```

Expected: FAIL because `householdLoading` replaces the protected navigator with the loading view.

- [ ] **Step 4: Gate only the initial household bootstrap**

Add a ref near the existing state declarations:

```ts
const protectedBranchMounted = React.useRef(false);
```

Reset it when the user is outside the protected branch:

```ts
if (!isAuthenticated || !onboardingComplete) protectedBranchMounted.current = false;
```

Change the loading condition:

```ts
if (
  ageGate.status === 'loading'
  || isLoading
  || (isAuthenticated && householdLoading && !protectedBranchMounted.current)
) {
```

Immediately before returning `ModalNavigator`, set:

```ts
protectedBranchMounted.current = true;
```

This preserves the already-mounted protected stack during background household reconciliation while retaining the cold-start loading gate and auth/onboarding reset semantics.

- [ ] **Step 5: Run navigation GREEN verification**

```bash
npx jest --selectProjects unit --runInBand tests/navigation/root-navigator.test.tsx tests/navigation/root-branch-isolation.test.ts tests/navigation/navigation-architecture.test.ts
```

Expected: all suites PASS; auth/logout still reset their stacks and later household refreshes do not remount protected navigation.

- [ ] **Step 6: Commit navigator preservation**

```bash
git add src/navigation/RootStackNavigator.tsx tests/navigation/root-navigator.test.tsx
git commit -m "fix(navigation): preserve protected stack on refresh" -m "Refs: T5.4"
```

### Task 4: Record implementation evidence and run all mobile gates

**Files:**
- Create: `docs/qa/ad-hoc/2026-08-19-t54-h1-parent-reconciliation.md`

- [ ] **Step 1: Create the evidence record**

Record the pass 14 reproduction, root cause for each of the three fixes, RED output, GREEN output, changed files, and a gate table. Keep task status `IN_PROGRESS`; do not claim physical success yet.

- [ ] **Step 2: Run focused tests together**

```bash
npx jest --selectProjects unit --runInBand \
  tests/features/parent/use-parent-learning-status-query.test.tsx \
  tests/features/parent/parent-today-screen.test.tsx \
  tests/features/progress/t33-parent-realtime-catchup.test.tsx \
  tests/services/parent-progress-realtime.test.ts \
  tests/navigation/root-navigator.test.tsx \
  tests/navigation/root-branch-isolation.test.ts \
  tests/navigation/navigation-architecture.test.ts
```

- [ ] **Step 3: Run strict type and lint gates**

```bash
npx tsc --noEmit
npm run lint
```

- [ ] **Step 4: Run full test gates**

```bash
npm test -- --runInBand
npm run test:integration -- --runInBand
```

- [ ] **Step 5: Run repository validators with nonzero output**

```bash
npm run flows:validate
npm run sequences:fast
npm run erd:validate
npm run usecases:check
npm run check:token-parity
npm run check:route-coverage
npm run check:screen-prop-types
```

Treat a validator that exits 0 without reporting nonzero coverage as a failure.

- [ ] **Step 6: Run source hygiene and diff checks**

```bash
git diff --check
git diff -- src tests | rg -n '(@ts-ignore|@ts-expect-error|unknown as|\bany\b|TODO|FIXME|HACK)' && exit 1 || true
git status --short --branch
```

- [ ] **Step 7: Build the Android release APK**

```bash
cd android
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
test -s app/build/outputs/apk/release/app-release.apk
shasum -a 256 app/build/outputs/apk/release/app-release.apk
```

Expected: `BUILD SUCCESSFUL`; preserve APK SHA-256 in the evidence record.

- [ ] **Step 8: Commit the implementation evidence**

```bash
git add docs/qa/ad-hoc/2026-08-19-t54-h1-parent-reconciliation.md
git commit -m "docs(parent): record H1 mobile verification" -m "Refs: T5.4"
```

### Task 5: Install the verified APK and establish exclusive physical readiness

**Files:**
- Evidence directory: `/Users/manhhodinh/Documents/TBOT/robot/docs/evidence/t54-live-20260819-final-closeout/final-parent-sla-pass-15/`

- [ ] **Step 1: Reconfirm exclusivity and identities without mutation**

```bash
/Users/manhhodinh/Library/Android/sdk/platform-tools/adb devices -l
lsof /dev/cu.usbmodem* || true
ssh -i /Users/manhhodinh/.ssh/tbot_vps_ed25519 -p 22701 -o BatchMode=yes root@160.187.240.56 \
  "docker inspect current-tbot-esp32-server-1 --format '{{.Config.Image}} {{.State.Status}} {{.State.Health.Status}}'"
```

Require authorized ADB serial `efc5314f`, an unowned robot serial, and healthy image `t54-phaseless-step-started-20260817094323`. Stop and preserve evidence on mismatch.

- [ ] **Step 2: Install only the verified APK**

```bash
/Users/manhhodinh/Library/Android/sdk/platform-tools/adb -s efc5314f install -r \
  /Users/manhhodinh/Documents/TBOT/tbot-mobile/.worktrees/t54-parent-realtime-physical-repro/android/app/build/outputs/apk/release/app-release.apk
```

Expected: `Success`.

- [ ] **Step 3: Open Parent Today and run the route gate**

Use the production deep link already proven by pass 14:

```bash
/Users/manhhodinh/Library/Android/sdk/platform-tools/adb -s efc5314f shell am start \
  -a android.intent.action.VIEW -d 'tjbot://parent/parent-today' com.TJBotmobile
```

Start the four-worker collector with a fresh output directory and verify `check-ready` before dwell:

```bash
export T54_COLLECTOR_OUT=/Users/manhhodinh/Documents/TBOT/robot/docs/evidence/t54-live-20260819-final-closeout/final-parent-sla-pass-15/parent-progress
export T54_COLLECTOR_WORKERS=4
export T54_COLLECTOR_ADB_SERIAL=efc5314f
bash /Users/manhhodinh/Documents/TBOT/t54-parent-collector-pass9.sh > /Users/manhhodinh/Documents/TBOT/robot/docs/evidence/t54-live-20260819-final-closeout/final-parent-sla-pass-15/collector.log 2>&1 &
T54_COLLECTOR_MODE=check-ready bash /Users/manhhodinh/Documents/TBOT/t54-parent-collector-pass9.sh
```

- [ ] **Step 4: Complete a continuous foreground dwell longer than 15 minutes**

Reuse the pass 14 focus sampler, recording `dumpsys window` focus observations to `parent-foreground-dwell.tsv`. Require more than 900 seconds continuously focused on `com.TJBotmobile`; restart the timer after any focus loss. Preserve the final `DWELL_OK` line.

- [ ] **Step 5: Start capture before the controlled reset**

```bash
python3 /Users/manhhodinh/Documents/TBOT/robot/scripts/lesson_e2e_live_capture.py \
  --device-id 14:c1:9f:d1:ac:20 \
  --expected-lesson-id w02-feelings \
  --expected-lesson-version 7 \
  --expected-course-id english-6month-4-6 \
  --expected-backend-url https://tbot-backend-8wmh.onrender.com/v1 \
  --expected-child-id 2bbcd940-f9da-47cf-8a99-f1eaf2380e8c \
  --expected-device-binding 91deb5af-c1c0-416b-956d-266d510eac5e \
  --expected-renderer-version teebot-lesson-renderer.v5 \
  --require-lesson-version \
  --require-assignment-version \
  --reset-on-start \
  --container current-tbot-esp32-server-1 \
  --serial-mode pyserial \
  --out-dir /Users/manhhodinh/Documents/TBOT/robot/docs/evidence/t54-live-20260819-final-closeout/final-parent-sla-pass-15/live-capture
```

Wait for robot Wi-Fi, passive WebSocket/Google Live, and cached SD sync readiness before creating the assignment.

### Task 6: Run exactly one fresh assignment and freeze strict acceptance evidence

**Files:**
- Update: `/Users/manhhodinh/Documents/TBOT/lesson-prod/t54-e2e-live.md`
- Update: `/Users/manhhodinh/Documents/TBOT/robot/docs/qa/ad-hoc/2026-08-16-t54-e2e-live.md`
- Create evidence under: `/Users/manhhodinh/Documents/TBOT/robot/docs/evidence/t54-live-20260819-final-closeout/final-parent-sla-pass-15/`

- [ ] **Step 1: Recheck route readiness immediately before assignment**

```bash
T54_COLLECTOR_MODE=check-ready bash /Users/manhhodinh/Documents/TBOT/t54-parent-collector-pass9.sh
```

Require four live workers, fresh `READY`, zero UiAutomator collisions, and no route violation.

- [ ] **Step 2: Create one direct no-PIN assignment through the supported admin endpoint**

Use the already-authenticated production admin session and send exactly this body to `POST /v1/admin/lesson-assignments`:

```json
{
  "deviceId": "91deb5af-c1c0-416b-956d-266d510eac5e",
  "lessonId": "w02-feelings",
  "lessonVersion": 7,
  "childId": "2bbcd940-f9da-47cf-8a99-f1eaf2380e8c",
  "profile": "espTft"
}
```

Preserve the raw response as `assignment-create-response.json`. Require `created=true`, a fresh assignment ID, version 7, and the expected device/child/checksum identity. Do not create a second assignment.

- [ ] **Step 3: Start the answer helper and use the normal spoken trigger**

```bash
export T54_ANSWER_LOG=/Users/manhhodinh/Documents/TBOT/robot/docs/evidence/t54-live-20260819-final-closeout/final-parent-sla-pass-15/live-capture/esp-server.log
bash /Users/manhhodinh/Documents/TBOT/t54-answer-helper-pass9.sh > /Users/manhhodinh/Documents/TBOT/robot/docs/evidence/t54-live-20260819-final-closeout/final-parent-sla-pass-15/answer-helper.log 2>&1 &
```

Speak `bắt đầu bài học` normally. Record the documented 30-second automatic handoff window. Use the protected nudge once only if no automatic start marker exists after the full timeout.

- [ ] **Step 4: Let the physical lesson and collector finish without manual intervention**

Do not navigate Android, refresh Parent, synthesize events, skip screenshots, reset hardware again, or deploy any component. On any failure, stop further assignment mutation and freeze all artifacts.

- [ ] **Step 5: Validate Parent capture artifacts exactly**

```bash
test "$(find "$T54_COLLECTOR_OUT" -maxdepth 1 -name 's[1-9].png' | wc -l | tr -d ' ')" = 9
test "$(find "$T54_COLLECTOR_OUT" -maxdepth 1 -name 's[1-9].xml' | wc -l | tr -d ' ')" = 9
test "$(wc -l < "$T54_COLLECTOR_OUT/captures.tsv" | tr -d ' ')" = 9
cut -f3 "$T54_COLLECTOR_OUT/captures.tsv" | paste -sd, - | grep -Fx '11,22,33,44,56,67,78,89,100'
```

- [ ] **Step 6: Extract canonical timestamps and raw latency values**

From the fresh ESP log, require exactly one canonical `LessonRuntime event step_started` for each `s1` through `s9`. Join those raw timestamps with the corresponding `observed_ms` values in `captures.tsv`, calculate `observed_ms - canonical_step_started_ms` for every step, and preserve the raw table. Do not invent or apply an SLA threshold not present in T5.4.

- [ ] **Step 7: Validate terminal and renderer evidence**

Require the fresh logs/read-back to show:

```text
lesson_completed stepsCompleted=9
backend post lesson_completed persisted=true
assignment/current ... state=COMPLETED
session_mode_changed mode=CONVERSATION reason=lesson_completed
```

Also preserve audio output, three declared/rendered layers, applied MCP motion, and the normal conversation face after completion.

Run the independent retained renderer verifier and production probe; require `101/101` and exit `0`:

```bash
TBOT_BACKEND_URL=https://tbot-backend-8wmh.onrender.com \
TBOT_ESP_SERVER_URL=https://esp.tjbot.vn \
TBOT_OTA_URL=https://esp.tjbot.vn/tbot/ota/ \
TBOT_WS_URL=wss://esp.tjbot.vn/tbot/v1/ \
bash /Users/manhhodinh/Documents/TBOT/robot/scripts/tbot_live_e2e_probe.sh
```

- [ ] **Step 8: Write the closeout truthfully**

If every strict item passes, fill assignment/session IDs and the raw nine-row latency table, check the Parent SLA box, and move T5.4 only to the repository-allowed review state; do not merge, clean worktrees, or claim human-only `DONE` from this mobile session.

If any item fails, preserve the exact evidence, route a new or updated finding, keep the Parent SLA box unchecked, and leave T5.4 `IN_PROGRESS`.

## Plan Self-Review

- Spec coverage: monotonic arbitration, healthy-silent reconciliation, navigation preservation, mobile gates, APK install, exclusive dwell, one assignment, and all original strict physical acceptance items are mapped to tasks.
- Placeholder scan: no implementation placeholder remains; production identities and commands are explicit, while credentials stay in their existing authenticated stores and are not copied into the plan.
- Type consistency: the new hook option is optional and defaults false, so `useChildProgressDashboardQuery` and existing consumers remain source-compatible.
- Scope: mobile sys-16 behavior changes only; backend, ESP, firmware, assignment semantics, and progress contracts remain unchanged.
