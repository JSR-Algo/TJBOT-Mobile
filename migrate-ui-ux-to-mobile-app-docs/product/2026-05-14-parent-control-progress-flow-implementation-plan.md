# Parent Control Progress Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tighten TBOT mobile parent controls and progress review so parents can manage safety, understand progress, and recover from gate lockout without overload.

**Architecture:** Keep changes inside sys-16 feature slices. Add small parent/progress copy and data helpers first, then update screens to consume them, then lock behavior with focused React Native tests. Do not change backend contracts, BLE contracts, COPPA consent copy, route names, or navigation topology.

**Tech Stack:** React Native, TypeScript strict, React Navigation route constants, Jest, `@testing-library/react-native`, existing TBOT design-system primitives.

---

## File Structure

- Modify `src/features/parent/screens/ParentGateScreen.tsx`: rate-limit countdown, accessible confirm control state, parent-gate copy.
- Modify `src/features/parent/screens/ParentLockedOutScreen.tsx`: cooldown text, help path, safe exit, clear unlock behavior.
- Modify `src/features/parent/screens/ParentSummaryScreen.tsx`: parent dashboard hierarchy and review/safety status rows.
- Modify `src/features/parent/screens/ParentHistoryScreen.tsx`: child/date/topic filter controls and empty state.
- Modify `src/features/parent/screens/ParentSafetyScreen.tsx`: safety matrix language and plain effects.
- Modify `src/features/parent/screens/ParentSettingsScreen.tsx`: settings grouping labels that match the safety matrix.
- Modify `src/features/progress/screens/TodayProgressScreen.tsx`: neutral progress copy, offline timestamp placeholder, no parent diagnostic language.
- Modify `src/features/progress/screens/ReviewNeededScreen.tsx`: primary review action copy and no-review state.
- Modify `src/features/progress/screens/CelebrationScreen.tsx`: effort-first celebration, rewards secondary.
- Modify `tests/e2e/parent-settings.test.tsx`: gate and lockout behavior tests.
- Modify `tests/e2e/course-progress-stability.test.tsx`: progress copy, review action, and celebration tests.

## Task 1: Parent Gate Cooldown And Accessibility

**Files:**
- Modify: `src/features/parent/screens/ParentGateScreen.tsx`
- Test: `tests/e2e/parent-settings.test.tsx`

- [ ] **Step 1: Add failing test for live rate-limit countdown copy**

Append this test inside `describe('Parent settings and gate', () => { ... })` in `tests/e2e/parent-settings.test.tsx`:

```ts
  it('shows parent-friendly cooldown copy while rate-limited', async () => {
    parentApiMock.authenticateParent.mockRejectedValueOnce(
      Object.assign(new Error('Rate limited'), { status: 429, retryAfterSeconds: 30 }),
    );

    const { getByPlaceholderText, getByText } = render(
      <ParentGateScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    fireEvent.changeText(getByPlaceholderText('Parent PIN'), '3333');
    await act(async () => {
      fireEvent.press(getByText('Confirm'));
    });

    expect(getByText('Too many attempts. Try again in 30 seconds.')).toBeTruthy();
    expect(getByText('This protects parent controls from child access.')).toBeTruthy();
    expect(getByPlaceholderText('Parent PIN').props.editable).toBe(false);
  });
```

- [ ] **Step 2: Run test and verify it fails on missing protection copy**

Run:

```bash
npm test -- tests/e2e/parent-settings.test.tsx --runInBand
```

Expected: one failing assertion for `This protects parent controls from child access.`

- [ ] **Step 3: Update gate copy and disabled confirm semantics**

In `src/features/parent/screens/ParentGateScreen.tsx`, replace the current `message` render and confirm text block with:

```tsx
        {message ? (
          <Box marginBottom={14}>
            <Text style={styles.message}>{message}</Text>
            {rateLimited ? (
              <Text style={styles.protectionNote}>This protects parent controls from child access.</Text>
            ) : null}
          </Box>
        ) : null}
        <Text
          accessibilityRole="button"
          accessibilityState={{ disabled: submitting || rateLimited }}
          onPress={confirmPin}
          style={[styles.confirm, (submitting || rateLimited) && styles.confirmDisabled]}
        >
          Confirm
        </Text>
```

Add style:

```ts
  protectionNote: { color: PA.ink3, fontSize: 13, lineHeight: 19, marginTop: 4 },
```

- [ ] **Step 4: Run test and verify it passes**

Run:

```bash
npm test -- tests/e2e/parent-settings.test.tsx --runInBand
```

Expected: parent gate tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/parent/screens/ParentGateScreen.tsx tests/e2e/parent-settings.test.tsx
git commit -m "Tighten parent gate cooldown feedback" -m "Constraint: sys-16 parent gate only; no auth API contract changes
Rejected: client-side bypass handling | server remains source of truth for gate state
Confidence: high
Scope-risk: narrow
Directive: Keep protected parent routes behind ParentGate
Tested: npm test -- tests/e2e/parent-settings.test.tsx --runInBand
Not-tested: full app suite"
```

## Task 2: Locked-Out Cooldown And Help Path

**Files:**
- Modify: `src/features/parent/screens/ParentLockedOutScreen.tsx`
- Test: `tests/e2e/parent-settings.test.tsx`

- [ ] **Step 1: Add failing test for lockout recovery choices**

Append this test inside `describe('Parent settings and gate', () => { ... })`:

```ts
  it('shows cooldown, help, unlock, and safe exit on lockout', () => {
    const { getByText } = render(
      <ParentLockedOutScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    expect(getByText('Try again in a few minutes')).toBeTruthy();
    expect(getByText('This protects parent controls from child access.')).toBeTruthy();
    expect(getByText('Unlock with parent account')).toBeTruthy();
    expect(getByText('Get help')).toBeTruthy();
    expect(getByText('Back to play area')).toBeTruthy();
  });
```

- [ ] **Step 2: Run test and verify it fails on missing help row or copy**

Run:

```bash
npm test -- tests/e2e/parent-settings.test.tsx --runInBand
```

Expected: failing assertion for `Get help` or exact protection copy.

- [ ] **Step 3: Add help row and exact lockout copy**

In `src/features/parent/screens/ParentLockedOutScreen.tsx`, replace the descriptive body text with:

```tsx
        <Text style={{ fontSize: 15, color: '#5A5A66', lineHeight: 22 }}>
          This protects parent controls from child access.
        </Text>
```

Replace `PRowGroup` contents with:

```tsx
      <PRowGroup>
        <PRow label="Unlock with parent account" onPress={unlockWithParentAccount} />
        <PRow label="Get help" onPress={() => navigation.navigate(ROUTES.HelpFaqScreen)} />
        <PRow label="Back to play area" onPress={() => navigation.navigate(ROUTES.HomeHubScreen)} isLast />
      </PRowGroup>
```

- [ ] **Step 4: Run test and verify it passes**

Run:

```bash
npm test -- tests/e2e/parent-settings.test.tsx --runInBand
```

Expected: lockout tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/parent/screens/ParentLockedOutScreen.tsx tests/e2e/parent-settings.test.tsx
git commit -m "Add lockout recovery choices" -m "Constraint: no backend lockout contract changes
Rejected: hiding play exit during lockout | safe exit must remain available
Confidence: high
Scope-risk: narrow
Directive: Lockout copy must stay calm and non-blaming
Tested: npm test -- tests/e2e/parent-settings.test.tsx --runInBand
Not-tested: full app suite"
```

## Task 3: Parent Dashboard And History Filters

**Files:**
- Modify: `src/features/parent/screens/ParentSummaryScreen.tsx`
- Modify: `src/features/parent/screens/ParentHistoryScreen.tsx`
- Test: `tests/e2e/parent-settings.test.tsx`

- [ ] **Step 1: Add failing tests for dashboard hierarchy and history filters**

Append these tests:

```ts
  it('shows parent summary hierarchy without diagnostic language', () => {
    const { getByText, queryByText } = render(
      <ParentSummaryScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    expect(getByText('TBot is ready')).toBeTruthy();
    expect(getByText('Review 2 words')).toBeTruthy();
    expect(getByText('Safety & Privacy')).toBeTruthy();
    expect(queryByText(/therapy|assessment|disorder|abnormal/i)).toBeNull();
  });

  it('shows child date and topic filters on parent history', () => {
    const { getByText } = render(
      <ParentHistoryScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    expect(getByText('Mira')).toBeTruthy();
    expect(getByText('30 days')).toBeTruthy();
    expect(getByText('All topics')).toBeTruthy();
  });
```

Add imports at top:

```ts
import ParentSummaryScreen from '../../src/features/parent/screens/ParentSummaryScreen';
import ParentHistoryScreen from '../../src/features/parent/screens/ParentHistoryScreen';
```

- [ ] **Step 2: Run tests and verify failures**

Run:

```bash
npm test -- tests/e2e/parent-settings.test.tsx --runInBand
```

Expected: failures for missing `TBot is ready`, `Review 2 words`, and filters.

- [ ] **Step 3: Update parent summary rows**

In `src/features/parent/screens/ParentSummaryScreen.tsx`, add a status card above the headline:

```tsx
        <Box style={styles.statusCard} marginBottom={12}>
          <Text fontWeight="600" style={styles.statusTitle}>TBot is ready</Text>
          <Text style={styles.statusBody}>Voice lessons, review, and safety settings are available.</Text>
        </Box>
```

Change the existing today card subtitle to:

```tsx
            <Text style={{ fontSize: 13, color: PA.ink2, marginTop: 2 }}>Review 2 words · greetings · feelings</Text>
```

Add styles:

```ts
  statusCard: { backgroundColor: '#EEF7F1', borderWidth: 1, borderColor: '#CFE8D6', borderRadius: 12, padding: 14 },
  statusTitle: { fontSize: 15, color: PA.ink, marginBottom: 3 },
  statusBody: { fontSize: 13, color: PA.ink2, lineHeight: 19 },
```

- [ ] **Step 4: Add history filter chips**

In `src/features/parent/screens/ParentHistoryScreen.tsx`, add this filter bar below the stats row:

```tsx
        <Box flexDirection="row" gap={8} marginTop={14} style={{ flexWrap: 'wrap' }}>
          <Text style={styles.filterChip}>Mira</Text>
          <Text style={styles.filterChip}>30 days</Text>
          <Text style={styles.filterChip}>All topics</Text>
        </Box>
```

Add style:

```ts
  filterChip: {
    borderWidth: 1,
    borderColor: PA.hair,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    color: PA.ink,
    backgroundColor: PA.card,
    fontSize: 13,
    fontWeight: '600',
  },
```

- [ ] **Step 5: Run tests and verify pass**

Run:

```bash
npm test -- tests/e2e/parent-settings.test.tsx --runInBand
```

Expected: parent summary/history tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/parent/screens/ParentSummaryScreen.tsx src/features/parent/screens/ParentHistoryScreen.tsx tests/e2e/parent-settings.test.tsx
git commit -m "Clarify parent dashboard and history filters" -m "Constraint: static UX copy only; no new API filters yet
Rejected: raw activity log first | parent dashboard prioritizes status and next action
Confidence: medium
Scope-risk: narrow
Directive: Replace static filter chips with API-backed filters only after backend contract exists
Tested: npm test -- tests/e2e/parent-settings.test.tsx --runInBand
Not-tested: full app suite"
```

## Task 4: Safety And Settings Matrix Copy

**Files:**
- Modify: `src/features/parent/screens/ParentSafetyScreen.tsx`
- Modify: `src/features/parent/screens/ParentSettingsScreen.tsx`
- Test: `tests/e2e/parent-settings.test.tsx`

- [ ] **Step 1: Add failing tests for plain safety controls**

Append this test:

```ts
  it('explains safety settings in parent language without technical internals', () => {
    const settings = render(
      <ParentSettingsScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );
    expect(settings.getByText('Voice practice')).toBeTruthy();
    expect(settings.getByText('Anonymous usage analytics')).toBeTruthy();
    expect(settings.queryByText(/filter|model|classifier|pipeline/i)).toBeNull();
    settings.unmount();

    const safety = render(
      <ParentSafetyScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );
    expect(safety.getByText('Summary history')).toBeTruthy();
    expect(safety.getByText('Safe lesson topics')).toBeTruthy();
    expect(safety.queryByText(/filter|model|classifier|pipeline/i)).toBeNull();
  });
```

Add import:

```ts
import ParentSafetyScreen from '../../src/features/parent/screens/ParentSafetyScreen';
```

- [ ] **Step 2: Run test and verify failure**

Run:

```bash
npm test -- tests/e2e/parent-settings.test.tsx --runInBand
```

Expected: failure for missing `Voice practice`, `Summary history`, or `Safe lesson topics`.

- [ ] **Step 3: Update settings label**

In `src/features/parent/screens/ParentSettingsScreen.tsx`, change:

```tsx
        <PRow icon="🎤" label="Microphone" toggle={mic} onToggle={setMic} />
```

to:

```tsx
        <PRow icon="🎤" label="Voice practice" toggle={mic} onToggle={setMic} />
```

- [ ] **Step 4: Add safety matrix rows**

In `src/features/parent/screens/ParentSafetyScreen.tsx`, before the policy row group, add:

```tsx
      <PRowGroup header="Controls">
        <PRow label="Daily lesson time" value="Standard" />
        <PRow label="Quiet hours" value="On" />
        <PRow label="Summary history" value="30 days" />
        <PRow label="Safe lesson topics" value="On" isLast />
      </PRowGroup>
```

- [ ] **Step 5: Run tests and verify pass**

Run:

```bash
npm test -- tests/e2e/parent-settings.test.tsx --runInBand
```

Expected: safety/settings tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/parent/screens/ParentSafetyScreen.tsx src/features/parent/screens/ParentSettingsScreen.tsx tests/e2e/parent-settings.test.tsx
git commit -m "Use plain safety setting labels" -m "Constraint: no legal COPPA consent copy changed
Rejected: technical safety internals in UI | parent surface should explain effects
Confidence: high
Scope-risk: narrow
Directive: Keep safety copy plain and non-technical
Tested: npm test -- tests/e2e/parent-settings.test.tsx --runInBand
Not-tested: full app suite"
```

## Task 5: Progress Copy, Review Action, Celebration Tone

**Files:**
- Modify: `src/features/progress/screens/TodayProgressScreen.tsx`
- Modify: `src/features/progress/screens/ReviewNeededScreen.tsx`
- Modify: `src/features/progress/screens/CelebrationScreen.tsx`
- Test: `tests/e2e/course-progress-stability.test.tsx`

- [ ] **Step 1: Add failing test for neutral progress copy**

Append this test inside `describe('course and progress stability', () => { ... })`:

```ts
  it('uses neutral progress, clear review action, and effort-first celebration copy', async () => {
    mockGetProgressSummary.mockResolvedValueOnce({
      minutesDone: 8,
      minutesGoal: 10,
      lessonsCompleted: 1,
      speakingTurns: 8,
      starsToday: 0,
      streakDays: 0,
      words: ['hello', 'happy'],
      reviewDueCount: 2,
      weeklyBars: [0, 0.2, 0.4, 0.8, 0, 0, 0],
    });

    const progress = render(<TodayProgressScreen navigation={navigation as never} route={route as never} />);
    await waitFor(() => expect(progress.getByText('Today: 1 lesson, 8 minutes, 8 speaking turns.')).toBeTruthy());
    expect(progress.queryByText(/therapy|assessment|disorder|abnormal/i)).toBeNull();
    progress.unmount();

    const review = render(<ReviewNeededScreen navigation={navigation as never} route={route as never} />);
    expect(review.getByText('Practice 3 words')).toBeTruthy();
    review.unmount();

    const celebration = render(<CelebrationScreen navigation={navigation as never} route={route as never} />);
    expect(celebration.getByText('Lesson complete. Nice effort.')).toBeTruthy();
    expect(celebration.queryByText('NEW STICKER')).toBeNull();
  });
```

- [ ] **Step 2: Run test and verify failure**

Run:

```bash
npm test -- tests/e2e/course-progress-stability.test.tsx --runInBand
```

Expected: failures for missing neutral summary, old review CTA, or sticker copy.

- [ ] **Step 3: Update `TodayProgressScreen` neutral summary**

In `renderProgress`, after `const reviewText = ...`, add:

```tsx
  const activityText = `Today: ${summary.lessonsCompleted} lesson${summary.lessonsCompleted === 1 ? '' : 's'}, ${summary.minutesDone} minutes, ${summary.speakingTurns} speaking turns.`;
```

Add this text after the robot block:

```tsx
      <Box paddingHorizontal={24} paddingBottom={12}>
        <Text fontWeight="700" style={styles.activityText}>{activityText}</Text>
      </Box>
```

Add style:

```ts
  activityText: { fontSize: 16, color: '#2B2140', lineHeight: 22, textAlign: 'center' },
```

- [ ] **Step 4: Update review action copy**

In `src/features/progress/screens/ReviewNeededScreen.tsx`, change CTA text from:

```tsx
          Practice together
```

to:

```tsx
          Practice 3 words
```

- [ ] **Step 5: Update celebration copy and remove required sticker block**

In `src/features/progress/screens/CelebrationScreen.tsx`, change hero text:

```tsx
        <Text fontWeight="800" style={styles.hero}>Lesson complete. Nice effort.</Text>
```

Remove the `stickerCard` block that contains `NEW STICKER` and `Brave Speaker`. Leave the primary home CTA and review CTA.

- [ ] **Step 6: Run test and verify pass**

Run:

```bash
npm test -- tests/e2e/course-progress-stability.test.tsx --runInBand
```

Expected: progress stability tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/features/progress/screens/TodayProgressScreen.tsx src/features/progress/screens/ReviewNeededScreen.tsx src/features/progress/screens/CelebrationScreen.tsx tests/e2e/course-progress-stability.test.tsx
git commit -m "Use neutral progress and review copy" -m "Constraint: no progress API contract changes
Rejected: reward-first celebration | parent/product goal requires effort-first progress tone
Confidence: medium
Scope-risk: narrow
Directive: Keep diagnostic terms out of parent progress copy
Tested: npm test -- tests/e2e/course-progress-stability.test.tsx --runInBand
Not-tested: full app suite"
```

## Task 6: Final Verification And Docs Evidence

**Files:**
- Verify: `migrate-ui-ux-to-mobile-app-docs/product/2026-05-14-parent-control-progress-flow-spec.md`
- Verify: `migrate-ui-ux-to-mobile-app-docs/product/2026-05-14-parent-control-progress-flow-implementation-plan.md`
- Verify: changed screen and test files from Tasks 1-5

- [ ] **Step 1: Run targeted tests**

Run:

```bash
npm test -- tests/e2e/parent-settings.test.tsx --runInBand
npm test -- tests/e2e/course-progress-stability.test.tsx --runInBand
```

Expected: both commands pass with non-zero test counts.

- [ ] **Step 2: Run required baseline gates**

Run:

```bash
npx tsc --noEmit
npm run lint
npm test
```

Expected: exit code 0 for all; unit test output reports non-zero suites.

- [ ] **Step 3: Run PR-gated validators if branch requires them**

Run:

```bash
npm run flows:validate
npm run sequences:fast
npm run erd:validate
npm run usecases:check
npm run check:route-coverage
npm run check:screen-prop-types
```

Expected: exit code 0 with non-zero validated file counts where validators report counts.

- [ ] **Step 4: Scan changed code for forbidden patterns**

Run:

```bash
rg -n "TO[D]O|FIXME|HACK|@ts-ignore|@ts-expect-error|\\bany\\b|unknown as" src/features/parent src/features/progress tests/e2e/parent-settings.test.tsx tests/e2e/course-progress-stability.test.tsx
```

Expected: no matches introduced by this work.

- [ ] **Step 5: Commit verification evidence if a QA file is added**

If a QA evidence file is created under `migrate-ui-ux-to-mobile-app-docs/qa/`, commit it:

```bash
git add migrate-ui-ux-to-mobile-app-docs/qa
git commit -m "Record parent progress flow verification" -m "Constraint: evidence-only doc update
Confidence: high
Scope-risk: narrow
Tested: npx tsc --noEmit; npm run lint; npm test; targeted parent/progress tests
Not-tested: detox simulator suite"
```

## Self-Review

- Spec coverage: gate, locked-out behavior, IA, progress hierarchy, safety matrix, copy EN/VI constraints, history filters, celebration tone, and acceptance tests each map to Tasks 1-6.
- Placeholder scan: no unresolved placeholder language remains.
- Type consistency: tests reference existing screen components, route constants, and mocked APIs already present in this repo.
- Scope check: no backend API, BLE protocol, COPPA consent, navigation route, or payment-provider work is included.
