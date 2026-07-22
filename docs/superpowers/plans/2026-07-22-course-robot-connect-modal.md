# Course Robot Connect Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the native unavailable-Robot alert on Course Detail with a polished TBOT modal that can open Robot setup or dismiss in place.

**Architecture:** Keep status ownership in `CourseDetailScreen`, but move the visual overlay into a focused `RobotConnectionModal` component. The screen controls visibility and navigation; the modal only renders localized presentation and invokes `onConnect` / `onDismiss` callbacks.

**Tech Stack:** React Native `Modal`, TypeScript strict mode, React Navigation, existing TBOT design primitives, `RobotDevice`, Jest, `@testing-library/react-native`.

---

### Task 1: Lock Modal Recovery Behavior With Failing Tests

**Files:**
- Modify: `tests/e2e/course-library-flow.test.tsx`

- [ ] **Step 1: Replace native Alert assertions with visible modal assertions**

Remove the `Alert` import and spies. Update the offline and status-failure tests to assert:

```tsx
expect(screen.getByText('Robot chưa sẵn sàng')).toBeTruthy();
expect(screen.getByText('Kết nối Robot để gửi bài học và bắt đầu chơi cùng bé.')).toBeTruthy();
expect(screen.getByText('Chỉ mất khoảng 3 phút.')).toBeTruthy();
expect(navigation.navigate).not.toHaveBeenCalledWith(
  ROUTES.UnlockConfirmScreen,
  expect.anything(),
);
```

- [ ] **Step 2: Add connect and dismiss interaction tests**

In the offline test, press the modal primary action and assert the recovery route:

```tsx
fireEvent.press(screen.getByText('Kết nối Robot'));
expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.PairAddScreen);
expect(screen.queryByText('Robot chưa sẵn sàng')).toBeNull();
```

Add a separate offline-status test that presses `Để sau`, asserts the modal closes, and confirms no pairing or unlock navigation occurred:

```tsx
fireEvent.press(screen.getByText('Để sau'));
expect(screen.queryByText('Robot chưa sẵn sàng')).toBeNull();
expect(navigation.navigate).not.toHaveBeenCalledWith(ROUTES.PairAddScreen);
expect(navigation.navigate).not.toHaveBeenCalledWith(
  ROUTES.UnlockConfirmScreen,
  expect.anything(),
);
```

- [ ] **Step 3: Run focused tests and verify RED**

Run:

```bash
npx jest --selectProjects unit --runInBand tests/e2e/course-library-flow.test.tsx \
  --testNamePattern='free add path|robot is offline|status check fails|dismisses the robot connection modal'
```

Expected: FAIL because the current implementation calls native `Alert.alert` and renders no custom modal actions.

- [ ] **Step 4: Commit the RED checkpoint**

```bash
git add tests/e2e/course-library-flow.test.tsx
git commit -m "test(course-library): require robot connection recovery modal" \
  -m "Refs: adhoc-2026-07-22-course-robot-connection-gate"
```

### Task 2: Build The TBOT Robot Connection Modal

**Files:**
- Create: `src/features/course-library/components/RobotConnectionModal.tsx`
- Modify: `src/services/i18n/locales/en.json`
- Modify: `src/services/i18n/locales/vi.json`

- [ ] **Step 1: Add the new localized modal copy**

Add these catalog entries:

```json
// en.json
"Connect Robot to send lessons and start playing with your child.": "Connect Robot to send lessons and start playing with your child.",
"It only takes about 3 minutes.": "It only takes about 3 minutes."
```

```json
// vi.json
"Connect Robot to send lessons and start playing with your child.": "Kết nối Robot để gửi bài học và bắt đầu chơi cùng bé.",
"It only takes about 3 minutes.": "Chỉ mất khoảng 3 phút."
```

Reuse the existing `Connect Robot` and `Not now` keys for the two actions.

- [ ] **Step 2: Create the focused modal component**

Create `RobotConnectionModal.tsx` with this public interface:

```tsx
type Props = {
  visible: boolean;
  onConnect: () => void;
  onDismiss: () => void;
};
```

Use `Modal` with:

```tsx
<Modal
  visible={visible}
  transparent
  animationType="fade"
  statusBarTranslucent
  onRequestClose={onDismiss}
>
```

Render a pressable scrim, a centered rounded card, a coral-tinted illustration area containing:

```tsx
<RobotDevice emotion="offline" size={104} accent="#FF6F61" />
```

Render localized title/body/reassurance copy, then:

```tsx
<DeviceBigBtn onClick={onConnect}>Connect Robot</DeviceBigBtn>
<DeviceBigBtn secondary onClick={onDismiss}>Not now</DeviceBigBtn>
```

The card uses `accessibilityRole="alert"`, `accessibilityLabel={t("Robot isn't ready yet")}`, and `accessibilityViewIsModal`.

- [ ] **Step 3: Keep styling aligned with TBOT**

Use existing `DV` colors with these modal-specific values:

```tsx
scrim: { flex: 1, backgroundColor: 'rgba(20, 24, 32, 0.52)', justifyContent: 'center', paddingHorizontal: 20 },
card: { backgroundColor: DV.card, borderRadius: 24, borderWidth: 1, borderColor: DV.hair, padding: 20, overflow: 'hidden' },
hero: { backgroundColor: '#FFF2ED', borderRadius: 18, minHeight: 138, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
title: { color: DV.ink, fontSize: 24, lineHeight: 30, textAlign: 'center' },
body: { color: DV.ink2, fontSize: 15, lineHeight: 23, textAlign: 'center', marginTop: 10 },
reassurance: { color: DV.ink3, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 8 },
actions: { marginTop: 20, gap: 10 },
```

Prevent card presses from bubbling to the scrim; scrim press invokes `onDismiss`.

### Task 3: Wire Modal State And Pairing Navigation

**Files:**
- Modify: `src/features/course-library/screens/CourseDetailScreen.tsx`
- Test: `tests/e2e/course-library-flow.test.tsx`

- [ ] **Step 1: Replace native Alert state with modal visibility**

Remove `Alert` and `useAppLanguage` from `CourseDetailScreen`. Add:

```tsx
import RobotConnectionModal from '../components/RobotConnectionModal';

const [robotConnectionModalVisible, setRobotConnectionModalVisible] = React.useState(false);
const showRobotConnectionModal = React.useCallback(() => {
  setRobotConnectionModalVisible(true);
}, []);
```

Replace every `showRobotConnectionAlert()` call with `showRobotConnectionModal()` while preserving the existing fail-closed status logic.

- [ ] **Step 2: Add modal callbacks and rendering**

Before the closing `DeviceShell`, render:

```tsx
<RobotConnectionModal
  visible={robotConnectionModalVisible}
  onDismiss={() => setRobotConnectionModalVisible(false)}
  onConnect={() => {
    setRobotConnectionModalVisible(false);
    navigation.navigate(ROUTES.PairAddScreen);
  }}
/>
```

Keep online navigation unchanged:

```tsx
navigation.navigate(ROUTES.UnlockConfirmScreen, { courseId });
```

- [ ] **Step 3: Run focused tests and verify GREEN**

Run:

```bash
npx jest --selectProjects unit --runInBand tests/e2e/course-library-flow.test.tsx \
  --testNamePattern='free add path|robot is offline|status check fails|dismisses the robot connection modal'
```

Expected: all online, offline, failure, connect, and dismiss cases pass.

- [ ] **Step 4: Run adjacent Course Detail suites**

Run:

```bash
npx jest --selectProjects unit --runInBand \
  tests/e2e/course-library-flow.test.tsx \
  tests/e2e/course-progress-stability.test.tsx \
  tests/features/course-robot-screen-coverage-round1.test.tsx
```

Expected: 3 suites pass.

- [ ] **Step 5: Commit implementation**

```bash
git add \
  src/features/course-library/components/RobotConnectionModal.tsx \
  src/features/course-library/screens/CourseDetailScreen.tsx \
  src/services/i18n/locales/en.json \
  src/services/i18n/locales/vi.json \
  tests/e2e/course-library-flow.test.tsx
git commit -m "feat(course-library): add robot connection recovery modal" \
  -m "Refs: adhoc-2026-07-22-course-robot-connection-gate"
```

### Task 4: Synchronize Use Case And Validate

**Files:**
- Modify: `migrate-ui-ux-to-mobile-app-docs/usecases/domains/course-library/use-cases.md`

- [ ] **Step 1: Document modal recovery actions**

Update UC-CL02 alternate flow to state that unavailable Robot status opens the custom connection modal; **Connect Robot** routes to `PairAddScreen`, while **Not now**, scrim press, and Android back dismiss it and remain on Course Detail.

- [ ] **Step 2: Run documentation validator**

```bash
npm run usecases:check
```

Expected: all use-case checks pass.

- [ ] **Step 3: Commit documentation**

```bash
git add migrate-ui-ux-to-mobile-app-docs/usecases/domains/course-library/use-cases.md
git commit -m "docs(course-library): record robot recovery modal" \
  -m "Refs: adhoc-2026-07-22-course-robot-connection-gate"
```

### Task 5: Verify, Build, Install, And Inspect On Android

**Files:**
- Verify only: repository gates and Android APK

- [ ] **Step 1: Run code gates**

```bash
npx tsc --noEmit
npm run lint
npm run test:integration
```

Expected: typecheck, lint, and integration command exit zero. Run `npm test` and report the known production-env contract or backend-auth integration failures accurately if they recur; do not modify user-owned `src/__env__.ts`.

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

Expected: all validators exit zero.

- [ ] **Step 3: Build and install Android**

```bash
npm run build:android
ADB="$HOME/Library/Android/sdk/platform-tools/adb"
APK="android/app/build/outputs/apk/debug/app-debug.apk"
"$ADB" install -r -d "$APK"
"$ADB" shell am force-stop com.TJBotmobile
"$ADB" shell monkey -p com.TJBotmobile -c android.intent.category.LAUNCHER 1
```

Expected: `BUILD SUCCESSFUL`, install reports `Success`, and `pidof com.TJBotmobile` returns a process.

- [ ] **Step 4: Verify the physical modal**

With Robot offline, open Course Detail and press **Thêm vào Robot**. Confirm the TBOT-styled overlay appears instead of the native Android alert. Press **Để sau** and confirm Course Detail remains visible. Reopen the modal, press **Kết nối Robot**, and confirm `PairAddScreen` appears with new-pairing and offline-reconnect choices.

- [ ] **Step 5: Review final scope**

```bash
git diff --check
git status --short
git log -8 --oneline
```

Expected: only the user-owned `src/__env__.ts` remains dirty and task commits are visible.
