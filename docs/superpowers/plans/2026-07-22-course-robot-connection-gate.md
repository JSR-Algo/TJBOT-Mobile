# Course Robot Connection Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Block **Add to Robot** on Course Detail until the active child's robot is confirmed online, showing a localized alert without leaving the page when it is not connected.

**Architecture:** Keep the gate inside `CourseDetailScreen` because the decision controls that screen's navigation. Reuse `getDeviceStatus('primary', childId)` as the authoritative normalized status read, fail closed for missing/unknown/error states, and use the existing i18n service for native alert copy.

**Tech Stack:** React Native, TypeScript strict mode, React Navigation, Jest, `@testing-library/react-native`, existing household context and device API.

---

### Task 1: Lock The Navigation Gate With Failing Tests

**Files:**
- Modify: `tests/e2e/course-library-flow.test.tsx`

- [ ] **Step 1: Add the native Alert import and online/offline test cases**

Add `Alert` to the React Native test imports, ensure the existing happy-path test awaits the asynchronous press, and add these behaviors around the current `starts the free add path from detail` test:

```tsx
const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

mockedGetDeviceStatus.mockResolvedValueOnce({
  id: 'dev-1',
  name: 'Casa Robot',
  online: false,
  batteryPercent: 80,
  charging: false,
});

await act(async () => {
  fireEvent.press(screen.getByText('Add to Robot'));
});

expect(alertSpy).toHaveBeenCalledWith(
  'Robot chưa sẵn sàng',
  'Hãy kết nối Robot trước nhé. Sau đó bạn có thể thêm bài học ngay.',
  [{ text: 'Đã hiểu' }],
);
expect(navigation.navigate).not.toHaveBeenCalledWith(
  ROUTES.UnlockConfirmScreen,
  expect.anything(),
);
```

Add a rejected-status variant that expects the same alert and no navigation. Update the online variant to mock `online: true`, await the press, and retain the exact `courseId` navigation assertion.

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
npx jest --selectProjects unit --runInBand tests/e2e/course-library-flow.test.tsx \
  --testNamePattern='free add path|robot is offline|status check fails'
```

Expected: FAIL because `CourseDetailScreen` does not call `getDeviceStatus` and navigates immediately.

- [ ] **Step 3: Commit the red test checkpoint**

```bash
git add tests/e2e/course-library-flow.test.tsx
git commit -m "test(course-library): require connected robot before add" \
  -m "Refs: adhoc-2026-07-22-course-robot-connection-gate"
```

### Task 2: Implement The Minimal Screen-Level Gate

**Files:**
- Modify: `src/features/course-library/screens/CourseDetailScreen.tsx`
- Modify: `src/services/i18n/locales/en.json`
- Modify: `src/services/i18n/locales/vi.json`

- [ ] **Step 1: Add localized alert copy**

Add these entries to both translation catalogs:

```json
// en.json
"Robot isn't ready yet": "Robot isn't ready yet",
"Connect Robot first. Then you can add this lesson right away.": "Connect Robot first. Then you can add this lesson right away."
```

```json
// vi.json
"Robot isn't ready yet": "Robot chưa sẵn sàng",
"Connect Robot first. Then you can add this lesson right away.": "Hãy kết nối Robot trước nhé. Sau đó bạn có thể thêm bài học ngay."
```

Reuse the existing `Got it` key for the alert action.

- [ ] **Step 2: Add the guarded press handler**

In `CourseDetailScreen.tsx`, import `Alert`, `getDeviceStatus`, `useOptionalHousehold`, and `useAppLanguage`. Add one request-in-flight state and this handler:

```tsx
const household = useOptionalHousehold();
const childId = household?.activeChild?.id;
const { t } = useAppLanguage();
const [checkingRobot, setCheckingRobot] = React.useState(false);

const showRobotConnectionAlert = React.useCallback(() => {
  Alert.alert(
    t("Robot isn't ready yet"),
    t('Connect Robot first. Then you can add this lesson right away.'),
    [{ text: t('Got it') }],
  );
}, [t]);

const handleAddToRobot = React.useCallback(async () => {
  if (checkingRobot) return;
  if (!childId) {
    showRobotConnectionAlert();
    return;
  }

  setCheckingRobot(true);
  try {
    const robot = await getDeviceStatus('primary', childId);
    if (!robot.id || robot.online !== true) {
      showRobotConnectionAlert();
      return;
    }
    navigation.navigate(ROUTES.UnlockConfirmScreen, { courseId });
  } catch {
    showRobotConnectionAlert();
  } finally {
    setCheckingRobot(false);
  }
}, [checkingRobot, childId, courseId, navigation, showRobotConnectionAlert]);
```

Wire the CTA to `handleAddToRobot` and pass `disabled={checkingRobot}` so repeated taps cannot issue concurrent reads.

- [ ] **Step 3: Run the focused tests and verify GREEN**

Run:

```bash
npx jest --selectProjects unit --runInBand tests/e2e/course-library-flow.test.tsx \
  --testNamePattern='free add path|robot is offline|status check fails'
```

Expected: PASS for the online, offline, and request-failure cases.

- [ ] **Step 4: Run adjacent course flow tests**

Run:

```bash
npx jest --selectProjects unit --runInBand \
  tests/e2e/course-library-flow.test.tsx \
  tests/e2e/course-progress-stability.test.tsx
```

Expected: both suites pass; update only existing Course Detail presses to await the status read and provide an online mock.

- [ ] **Step 5: Commit the implementation**

```bash
git add \
  src/features/course-library/screens/CourseDetailScreen.tsx \
  src/services/i18n/locales/en.json \
  src/services/i18n/locales/vi.json \
  tests/e2e/course-library-flow.test.tsx \
  tests/e2e/course-progress-stability.test.tsx
git commit -m "fix(course-library): require connected robot before add" \
  -m "Refs: adhoc-2026-07-22-course-robot-connection-gate"
```

### Task 3: Synchronize The Course-Library Use Case

**Files:**
- Modify: `migrate-ui-ux-to-mobile-app-docs/usecases/domains/course-library/use-cases.md`

- [ ] **Step 1: Document the new UC-CL02 alternate flow**

Update UC-CL02 so the **Add to Robot** step states that the app checks the active child's robot. Add an alternate flow stating that missing, offline, unknown, or failed status displays the connection-required alert and remains on `CourseDetailScreen`.

- [ ] **Step 2: Run the use-case validator**

Run:

```bash
npm run usecases:check
```

Expected: all use-case checks pass with non-zero coverage output.

- [ ] **Step 3: Commit documentation synchronization**

```bash
git add migrate-ui-ux-to-mobile-app-docs/usecases/domains/course-library/use-cases.md
git commit -m "docs(course-library): record robot connection gate" \
  -m "Refs: adhoc-2026-07-22-course-robot-connection-gate"
```

### Task 4: Validate, Build, And Install On Physical Android

**Files:**
- Verify only: repository gates and Android build output

- [ ] **Step 1: Run required code gates**

```bash
npx tsc --noEmit
npm run lint
npm test
npm run test:integration
```

Expected: zero type/lint errors and all non-empty test suites pass.

- [ ] **Step 2: Run repository validators**

```bash
npm run flows:validate
npm run sequences:fast
npm run erd:validate
npm run usecases:check
npm run check:token-parity
npm run check:route-coverage
npm run check:screen-prop-types
```

Expected: every validator reports non-zero validated artifacts and exits zero.

- [ ] **Step 3: Build Android**

```bash
npm run build:android
```

Expected: `BUILD SUCCESSFUL` and `android/app/build/outputs/apk/debug/app-debug.apk` exists.

- [ ] **Step 4: Install and launch on the connected phone**

```bash
ADB="$HOME/Library/Android/sdk/platform-tools/adb"
APK="android/app/build/outputs/apk/debug/app-debug.apk"
"$ADB" install -r -d "$APK"
"$ADB" shell am force-stop com.TJBotmobile
"$ADB" shell monkey -p com.TJBotmobile -c android.intent.category.LAUNCHER 1
```

Expected: install reports `Success`, `pidof com.TJBotmobile` returns a process, and `mCurrentFocus` is `com.TJBotmobile.MainActivity`.

- [ ] **Step 5: Verify the physical blocked path**

With the robot offline or unavailable, open a course and press **Thêm vào Robot**. Confirm the Vietnamese alert appears and dismissing **Đã hiểu** leaves Course Detail visible. If a physical robot is online during verification, confirm the online path continues to the unlock screen and use the automated offline test as the blocked-path evidence.

- [ ] **Step 6: Review scope and worktree state**

```bash
git diff --check
git status --short
git log -5 --oneline
```

Expected: only task-owned changes/commits plus the pre-existing user-owned `src/__env__.ts` modification remain.
