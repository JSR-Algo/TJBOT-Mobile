# Remove Assignment PIN Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the parent PIN prompt from mobile lesson/course assignment while preserving course enrollment confirmation, error handling, cache invalidation, and navigation.

**Architecture:** Keep `UnlockConfirmScreen` as the confirmation boundary for free-course enrollment, but make it an ordinary authenticated-app confirmation instead of a second parent-authentication gate. Direct lesson assignment and `SendToRobotScreen` course assignment stay unchanged because they already submit without PIN.

**Tech Stack:** React Native 0.83, React 19, TypeScript strict mode, TanStack Query, React Navigation, Jest, Testing Library React Native.

---

## File Map

- Modify `tests/e2e/course-library-flow.test.tsx`: replace PIN-entry assertions with PIN-free confirmation behavior while retaining assignment error coverage.
- Modify `tests/e2e/course-progress-stability.test.tsx`: update duplicate-submit coverage and remove the course-flow parent-auth mock.
- Modify `src/features/course-library/UnlockConfirmModal.tsx`: remove PIN UI/authentication while retaining device resolution and enrollment behavior.
- Create `migrate-ui-ux-to-mobile-app-docs/qa/ad-hoc/2026-08-18-remove-assignment-pin.md`: record verification evidence.

### Task 1: Lock In PIN-Free Confirmation

**Files:**
- Modify: `tests/e2e/course-library-flow.test.tsx:1-370`
- Modify: `tests/e2e/course-library-flow.test.tsx:850-890`
- Modify: `tests/e2e/course-progress-stability.test.tsx:1-140`
- Modify: `tests/e2e/course-progress-stability.test.tsx:380-420`

- [ ] **Step 1: Replace the successful PIN test with a PIN-free confirmation test**

Remove the `authenticateParent` import, its Jest mock, and `mockedAuthenticateParent` from `tests/e2e/course-library-flow.test.tsx`. Rename the success case to `adds a course without requesting a parent PIN and forwards assignment metadata`, then use:

```tsx
expect(screen.queryByText('Parent PIN required')).toBeNull();
expect(screen.queryByText('PARENT PIN')).toBeNull();
expect(screen.queryByLabelText('Enter digit 2')).toBeNull();

await act(async () => {
  fireEvent.press(screen.getByRole('button', { name: 'Add to Robot' }));
});

expect(mockedGetDeviceStatus).toHaveBeenCalledWith('primary', 'ch-1');
expect(mockedEnrollCourse).toHaveBeenCalledWith('c_food', {
  childId: 'ch-1',
  deviceId: 'dev-1',
});
```

Delete `blocks course enrollment when the parent PIN is wrong`; that behavior is intentionally removed from this flow.

- [ ] **Step 2: Update the remaining modal tests to press the confirmation CTA directly**

For missing-course, lesson-not-playable, asset-pack-not-ready, and robot-busy tests, remove keypad loops and use:

```tsx
await act(async () => {
  fireEvent.press(screen.getByRole('button', { name: 'Add to Robot' }));
});
```

Assert missing-course copy with:

```tsx
expect(screen.getByText('Choose a course before adding it to Robot.')).toBeTruthy();
```

Replace `labels parent unlock keypad controls` with:

```tsx
it('exposes an accessible course assignment action without PIN controls', () => {
  const navigation = navigationFor();
  render(
    <UnlockConfirmModal
      navigation={navigation as never}
      route={{ key: 'unlock', name: ROUTES.UnlockConfirmScreen, params: { courseId: 'c_food' } } as never}
    />,
  );

  expect(screen.getByRole('button', { name: 'Add to Robot' })).toBeTruthy();
  expect(screen.queryByLabelText('Enter digit 7')).toBeNull();
  expect(screen.queryByLabelText('Delete last digit')).toBeNull();
});
```

- [ ] **Step 3: Update duplicate-submit coverage**

Remove the course-flow `authenticateParent` import/mock/constant from `tests/e2e/course-progress-stability.test.tsx`. Rename the test to `prevents duplicate course assignment actions while enrollment is pending`, then use:

```tsx
fireEvent.press(screen.getByRole('button', { name: 'Add to Robot' }));
await waitFor(() => expect(screen.getByText('Adding...')).toBeTruthy());
fireEvent.press(screen.getByRole('button', { name: 'Adding...' }));

await waitFor(() => expect(mockEnrollCourse).toHaveBeenCalledTimes(1));
expect(mockEnrollCourse).toHaveBeenCalledWith('course-open', {
  childId: 'child-1',
  deviceId: 'device-1',
});
```

- [ ] **Step 4: Run focused tests and verify RED**

```bash
npx jest --selectProjects unit --runTestsByPath tests/e2e/course-library-flow.test.tsx tests/e2e/course-progress-stability.test.tsx --runInBand
```

Expected: FAIL because the current modal still renders PIN controls and has no accessible `Add to Robot` action.

- [ ] **Step 5: Commit the failing tests**

```bash
git add tests/e2e/course-library-flow.test.tsx tests/e2e/course-progress-stability.test.tsx
git commit -m "test(course-library): require PIN-free assignment confirmation" -m "Refs: adhoc-2026-08-18-remove-assignment-pin"
```

### Task 2: Remove The PIN Gate

**Files:**
- Modify: `src/features/course-library/UnlockConfirmModal.tsx:1-230`

- [ ] **Step 1: Remove PIN-only code**

Remove `TouchableOpacity`, `Svg`, `Path`, `Rect`, `authenticateParent`, `KEYS`, `getErrorStatus`, `vals`, `filled`, and `handleKey`. Keep `pending`, `error`, Query Client access, household resolution, and enrollment imports.

- [ ] **Step 2: Submit confirmation without parent authentication**

Start `handleConfirm` with:

```tsx
const handleConfirm = async () => {
  if (pending) return;
  setError(null);
  if (!courseId) {
    setError('Choose a course before adding it to Robot.');
    return;
  }
  if (!childId) {
    setError('Add a child to this account before adding a course to Robot.');
    return;
  }
  setPending(true);
  try {
    let deviceId: string | undefined;
    let deviceName: string | undefined;
    try {
      const device = await getDeviceStatus('primary', childId);
      if (device.id) {
        deviceId = device.id;
        deviceName = device.name;
      }
    } catch (deviceError) {
      const normalized = normalizeError(deviceError);
      if (normalized.code === 'NETWORK_ERROR') {
        setError('Could not check Robot right now. Check connection and try again.');
        return;
      }
      deviceId = undefined;
    }
    if (!deviceId) {
      setError('No Robot yet — connect Robot before adding a course.');
      return;
    }
    try {
      const { assignment } = await enrollCourse(courseId, { childId, deviceId });
      void queryClient?.invalidateQueries({ queryKey: ['lesson-progress', 'child', childId] });
      void queryClient?.invalidateQueries({ queryKey: ['enrollments', 'child', childId] });
      void queryClient?.invalidateQueries({ queryKey: ['assignment', 'device', deviceId, 'current'] });
      navigation.replace(ROUTES.CourseAddedScreen, {
        courseId,
        deviceId: assignment.deviceId,
        assignmentId: assignment.id,
        assignmentVersion: assignment.assignmentVersion,
        manifestChecksum: assignment.manifestChecksum,
      });
    } catch (err) {
      const normalized = normalizeError(err);
      if (normalized.code === 'LESSON_NOT_PLAYABLE') {
        setError('This course is still preparing on the server. Try again in a moment.');
        return;
      }
      setError(formatLessonCopy(getErrorMessage(normalized.code), { robot: deviceName }));
    }
  } finally {
    setPending(false);
  }
};
```

Delete the nested `authenticateParent` branch. Preserve `getDeviceStatus('primary', childId)`, `enrollCourse(courseId, { childId, deviceId })`, query invalidations, route params, and all normalized assignment error branches exactly.

- [ ] **Step 3: Replace the keypad with a confirmation card**

Use this screen body:

```tsx
<DeviceShell title="Add course to Robot" onBack={handleBack}>
  <Box paddingTop={30} paddingHorizontal={24} alignItems="center">
    <Text fontWeight="600" style={styles.heading}>Ready to add this course?</Text>
    <Text style={styles.sub}>Robot will prepare the first lesson for your child.</Text>
  </Box>

  <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30}>
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
    <DeviceBigBtn
      onClick={() => { void handleConfirm(); }}
      disabled={pending}
      accessibilityLabel={pending ? 'Adding...' : 'Add to Robot'}
    >
      {pending ? 'Adding...' : 'Add to Robot'}
    </DeviceBigBtn>
  </Box>
</DeviceShell>
```

Delete the PIN/key styles: `lockIcon`, `pinLabel`, `digit`, `digitText`, `key`,
and `keyText`. Keep `heading`, `sub`, and `errorText` so the confirmation follows
the existing course-library visual language without adding a new component.

- [ ] **Step 4: Run focused tests and verify GREEN**

```bash
npx jest --selectProjects unit --runTestsByPath tests/e2e/course-library-flow.test.tsx tests/e2e/course-progress-stability.test.tsx --runInBand
```

Expected: both suites PASS; no PIN UI/auth call remains and enrollment is single-submit.

- [ ] **Step 5: Run changed-file static checks**

```bash
npx eslint src/features/course-library/UnlockConfirmModal.tsx tests/e2e/course-library-flow.test.tsx tests/e2e/course-progress-stability.test.tsx --max-warnings=0
npx tsc --noEmit
```

Expected: exit 0 for both commands.

- [ ] **Step 6: Commit the implementation**

```bash
git add src/features/course-library/UnlockConfirmModal.tsx tests/e2e/course-library-flow.test.tsx tests/e2e/course-progress-stability.test.tsx
git commit -m "fix(course-library): remove assignment PIN gate" -m "Refs: adhoc-2026-08-18-remove-assignment-pin"
```

### Task 3: Verify Scope And Record Evidence

**Files:**
- Create: `migrate-ui-ux-to-mobile-app-docs/qa/ad-hoc/2026-08-18-remove-assignment-pin.md`

- [ ] **Step 1: Confirm unrelated parent PIN flows remain**

```bash
rg -n "authenticateParent|Parent PIN" src/features/parent tests/e2e/parent-settings.test.tsx
rg -n "authenticateParent|Parent PIN|PARENT PIN" src/features/course-library tests/e2e/course-library-flow.test.tsx tests/e2e/course-progress-stability.test.tsx
```

Expected: parent settings/gate matches remain; course-library production and focused assignment tests have no PIN dependency.

- [ ] **Step 2: Run the validation ladder**

Run separately and capture exit code plus summary:

```bash
npx tsc --noEmit
npm run lint
npm test
npm run test:integration
npm run flows:validate
npm run sequences:fast
npm run erd:validate
npm run usecases:check
npm run check:token-parity
npm run check:route-coverage
npm run check:screen-prop-types
```

Expected: exit 0; tests report non-zero suites and validators report non-zero counts/files.

- [ ] **Step 3: Write the evidence record with actual results**

Create the QA file with this structure after the commands finish; copy the real exit code and summary from each command into its row:

```markdown
# Remove Assignment PIN Verification

- Task: `adhoc-2026-08-18-remove-assignment-pin`
- Scope: `sys-16` mobile course-library assignment confirmation

## Acceptance Criteria

1. Assignment confirmation renders no PIN prompt and makes no parent-auth API call.
2. Course enrollment remains single-submit and preserves errors, cache invalidation, and navigation.
3. Parent Settings PIN behavior remains unchanged.

## Evidence

| Check | Command | Exit | Evidence |
| --- | --- | ---: | --- |
| Focused Jest | `npx jest ...` | 0 | `2 suites passed` |
| TypeScript | `npx tsc --noEmit` | 0 | `no errors` |
| ESLint | `npm run lint` | 0 | `no warnings or errors` |
```

Add one row for every command run in Step 2 and a scope-scan note listing retained parent-flow matches.

- [ ] **Step 4: Review the final diff**

```bash
git diff --check
git status --short
rg -n "TODO|FIXME|HACK|@ts-ignore|@ts-expect-error|unknown as|\bany\b" src/features/course-library/UnlockConfirmModal.tsx
```

Expected: no whitespace errors, only planned files changed, and no forbidden patterns introduced.

- [ ] **Step 5: Commit the verification record**

```bash
git add migrate-ui-ux-to-mobile-app-docs/qa/ad-hoc/2026-08-18-remove-assignment-pin.md
git commit -m "docs(course-library): record assignment PIN removal evidence" -m "Refs: adhoc-2026-08-18-remove-assignment-pin"
```
