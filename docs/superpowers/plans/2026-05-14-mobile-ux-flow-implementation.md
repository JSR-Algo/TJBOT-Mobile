# TJBot Mobile UX Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the route-grounded UX flow spec into tested React Native behavior without widening route, API, BLE, or COPPA scope.

**Architecture:** Implement one shippable slice first: Learning Flow (`course` + `lesson-session`), because it carries the highest persona/safety/back-behavior risk. Add a small UX contract module and tests so later domain PRs can reuse the same route/state/CTA checks instead of duplicating ad hoc assertions.

**Tech Stack:** React Native 0.83, React Navigation 7, TypeScript strict, Jest, `@testing-library/react-native`, existing feature `navigation.ts` route registry.

---

## Scope Split

The source spec covers 12 domains, which is too broad for one safe code PR. Split implementation into these follow-up plans after this Learning Flow slice lands:

1. Entry Flow: auth + onboarding.
2. Learning Flow: course + lesson-session. This plan implements this slice.
3. Library/Purchase Flow: course-library + purchase.
4. Parent/Progress Flow: parent + progress.
5. Device Flow: device + robot-mgmt.
6. Fallback Flow: fallback plus cross-domain recovery hooks.

Source spec: `migrate-ui-ux-to-mobile-app-docs/product/2026-05-14-mobile-ux-flow-spec.md`

## File Structure

- Create: `src/features/lesson-session/uxContract.ts`
  - Owns Learning Flow screen copy, CTA labels, accessibility labels, and valid target routes.
- Modify: `src/features/lesson-session/screens/ReconnectingScreen.tsx`
  - Replace hardcoded copy/CTA route with contract-backed state and retry/exit behavior.
- Modify: `src/features/lesson-session/screens/ExitConfirmScreen.tsx`
  - Make cancel/end CTAs explicit and accessible.
- Modify: `src/features/lesson-session/screens/SafetyScreen.tsx`
  - Route parent-help CTA to `ParentGateScreen` instead of home, preserving parent boundary.
- Modify: `src/features/lesson-session/screens/LessonDoneScreen.tsx`
  - Make summary/home CTAs accessible and contract-backed.
- Create: `tests/ux/lesson-session-ux-contract.test.ts`
  - Locks route validity, 44 pt minimum button height signals, safety copy, reconnect copy, and exit-confirm behavior.
- Modify: `migrate-ui-ux-to-mobile-app-docs/qa/ad-hoc/2026-05-14-mobile-ux-learning-flow.md`
  - Record evidence after verification.

## Task 1: Add Learning Flow UX Contract Tests

**Files:**
- Create: `tests/ux/lesson-session-ux-contract.test.ts`
- Create: `src/features/lesson-session/uxContract.ts`

- [ ] **Step 1: Write the failing UX contract test**

```typescript
import { ROUTES, type RootStackParamList } from '@/navigation/routes';
import { LESSON_SESSION_UX } from '@/features/lesson-session/uxContract';

describe('lesson-session UX contract', () => {
  it('maps every CTA to a real route constant', () => {
    const routeValues = new Set(Object.values(ROUTES));

    for (const state of Object.values(LESSON_SESSION_UX)) {
      for (const cta of state.ctas) {
        expect(routeValues.has(cta.route)).toBe(true);
      }
    }
  });

  it('keeps recovery and safety copy calm and non-punitive', () => {
    expect(LESSON_SESSION_UX.reconnecting.body).toBe('One sec. TJBot is reconnecting.');
    expect(LESSON_SESSION_UX.retry.body).toContain('try that together');
    expect(LESSON_SESSION_UX.offtopic.body).toContain('come back');
    expect(LESSON_SESSION_UX.safety.body).toBe('Pause here. A grown-up can help.');
  });

  it('keeps parent-only help behind the parent gate', () => {
    const safetyRoutes = LESSON_SESSION_UX.safety.ctas.map(cta => cta.route);

    expect(safetyRoutes).toContain(ROUTES.ParentGateScreen);
    expect(safetyRoutes).not.toContain(ROUTES.ParentSummaryScreen);
  });

  it('defines minimum touch target metadata for every CTA', () => {
    for (const state of Object.values(LESSON_SESSION_UX)) {
      for (const cta of state.ctas) {
        expect(cta.minHeight).toBeGreaterThanOrEqual(44);
        expect(cta.accessibilityLabel.length).toBeGreaterThan(0);
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/ux/lesson-session-ux-contract.test.ts
```

Expected:

```text
Cannot find module '@/features/lesson-session/uxContract'
```

## Task 2: Add Learning Flow UX Contract Module

**Files:**
- Create: `src/features/lesson-session/uxContract.ts`
- Test: `tests/ux/lesson-session-ux-contract.test.ts`

- [ ] **Step 1: Add the contract module**

```typescript
import { ROUTES } from '@/navigation/routes';

export type LessonSessionUxCta = {
  readonly label: string;
  readonly route: keyof RootStackParamList;
  readonly minHeight: number;
  readonly accessibilityLabel: string;
};

type LessonSessionUxState = {
  readonly title: string;
  readonly body: string;
  readonly ctas: readonly LessonSessionUxCta[];
};

export const LESSON_SESSION_UX = {
  reconnecting: {
    title: 'Reconnecting',
    body: 'One sec. TJBot is reconnecting.',
    ctas: [
      {
        label: 'Keep waiting',
        route: ROUTES.RobotListeningScreen,
        minHeight: 60,
        accessibilityLabel: 'Keep waiting for TJBot to reconnect',
      },
      {
        label: 'Stop lesson',
        route: ROUTES.ExitConfirmScreen,
        minHeight: 44,
        accessibilityLabel: 'Open stop lesson confirmation',
      },
    ],
  },
  retry: {
    title: 'Try again',
    body: 'Let us try that together.',
    ctas: [
      {
        label: 'Try again',
        route: ROUTES.RobotListeningScreen,
        minHeight: 60,
        accessibilityLabel: 'Try the lesson prompt again',
      },
    ],
  },
  offtopic: {
    title: 'Back to the lesson',
    body: 'That was interesting. Let us come back to this activity.',
    ctas: [
      {
        label: 'Continue',
        route: ROUTES.RobotListeningScreen,
        minHeight: 60,
        accessibilityLabel: 'Continue the lesson',
      },
    ],
  },
  safety: {
    title: 'Pause',
    body: 'Pause here. A grown-up can help.',
    ctas: [
      {
        label: 'Take a break',
        route: ROUTES.HomeHubScreen,
        minHeight: 72,
        accessibilityLabel: 'Take a break and return home',
      },
      {
        label: 'Get a grown-up',
        route: ROUTES.ParentGateScreen,
        minHeight: 44,
        accessibilityLabel: 'Ask a grown-up for help',
      },
    ],
  },
  exitConfirm: {
    title: 'Stop the lesson?',
    body: 'Progress is saved.',
    ctas: [
      {
        label: 'Keep going',
        route: ROUTES.RobotListeningScreen,
        minHeight: 72,
        accessibilityLabel: 'Keep going with the lesson',
      },
      {
        label: 'Stop for now',
        route: ROUTES.LessonDoneScreen,
        minHeight: 56,
        accessibilityLabel: 'Stop the lesson for now',
      },
    ],
  },
  lessonDone: {
    title: 'Lesson complete',
    body: 'Nice work. Your grown-up can see the summary.',
    ctas: [
      {
        label: 'See summary',
        route: ROUTES.LessonSummaryScreen,
        minHeight: 72,
        accessibilityLabel: 'See the lesson summary',
      },
      {
        label: 'Back home',
        route: ROUTES.HomeHubScreen,
        minHeight: 44,
        accessibilityLabel: 'Go back home',
      },
    ],
  },
} as const satisfies Record<string, LessonSessionUxState>;
```

- [ ] **Step 2: Run test to verify it passes**

Run:

```bash
npm test -- tests/ux/lesson-session-ux-contract.test.ts
```

Expected:

```text
PASS tests/ux/lesson-session-ux-contract.test.ts
```

## Task 3: Wire High-Risk Lesson Session Screens To Contract

**Files:**
- Modify: `src/features/lesson-session/screens/ReconnectingScreen.tsx`
- Modify: `src/features/lesson-session/screens/ExitConfirmScreen.tsx`
- Modify: `src/features/lesson-session/screens/SafetyScreen.tsx`
- Modify: `src/features/lesson-session/screens/LessonDoneScreen.tsx`
- Test: `tests/ux/lesson-session-ux-contract.test.ts`

- [ ] **Step 1: Update `ReconnectingScreen.tsx`**

Replace hardcoded body and CTA label with:

```typescript
import { LESSON_SESSION_UX } from '../uxContract';
```

Inside component:

```typescript
const ux = LESSON_SESSION_UX.reconnecting;
```

Use:

```tsx
<SpeechBubble>{ux.body}</SpeechBubble>
<TouchableOpacity
  style={styles.waitBtn}
  accessibilityRole="button"
  accessibilityLabel={ux.ctas[0].accessibilityLabel}
  onPress={() => navigation.navigate(ux.ctas[0].route)}
>
  <Text fontWeight="700" style={styles.waitText}>{ux.ctas[0].label}</Text>
</TouchableOpacity>
```

- [ ] **Step 2: Update `ExitConfirmScreen.tsx`**

Add:

```typescript
import { LESSON_SESSION_UX } from '../uxContract';
```

Inside component:

```typescript
const ux = LESSON_SESSION_UX.exitConfirm;
```

Use:

```tsx
<Text fontWeight="800" style={styles.title}>{ux.title}</Text>
<Text fontWeight="600" style={styles.sub}>{ux.body}</Text>
<PrimaryCTA
  onPress={() => navigation.navigate(ux.ctas[0].route)}
  color="#7BD389"
  accessibilityLabel={ux.ctas[0].accessibilityLabel}
  accessibilityRole="button"
>
  {ux.ctas[0].label}
</PrimaryCTA>
<TouchableOpacity
  style={styles.stopBtn}
  accessibilityRole="button"
  accessibilityLabel={ux.ctas[1].accessibilityLabel}
  onPress={() => navigation.navigate(ux.ctas[1].route)}
>
  <Text fontWeight="700" style={styles.stopText}>{ux.ctas[1].label}</Text>
</TouchableOpacity>
```

- [ ] **Step 3: Update `SafetyScreen.tsx`**

Add:

```typescript
import { LESSON_SESSION_UX } from '../uxContract';
```

Inside component:

```typescript
const ux = LESSON_SESSION_UX.safety;
```

Use:

```tsx
<SpeechBubble>{ux.body}</SpeechBubble>
<PrimaryCTA
  onPress={() => navigation.navigate(ux.ctas[0].route)}
  color="#9B8FB8"
  accessibilityLabel={ux.ctas[0].accessibilityLabel}
  accessibilityRole="button"
>
  {ux.ctas[0].label}
</PrimaryCTA>
<TouchableOpacity
  accessibilityRole="button"
  accessibilityLabel={ux.ctas[1].accessibilityLabel}
  onPress={() => navigation.navigate(ux.ctas[1].route)}
>
  <Text fontWeight="700" style={styles.grownUpText}>{ux.ctas[1].label}</Text>
</TouchableOpacity>
```

- [ ] **Step 4: Update `LessonDoneScreen.tsx`**

Add:

```typescript
import { LESSON_SESSION_UX } from '../uxContract';
```

Inside component:

```typescript
const ux = LESSON_SESSION_UX.lessonDone;
```

Use:

```tsx
<Text fontWeight="800" style={styles.title}>{ux.title}</Text>
<Text fontWeight="700" style={styles.summaryText}>{ux.body}</Text>
<PrimaryCTA
  onPress={() => navigation.navigate(ux.ctas[0].route)}
  color="#FF6F61"
  accessibilityLabel={ux.ctas[0].accessibilityLabel}
  accessibilityRole="button"
>
  {ux.ctas[0].label}
</PrimaryCTA>
<TouchableOpacity
  accessibilityRole="button"
  accessibilityLabel={ux.ctas[1].accessibilityLabel}
  onPress={() => navigation.navigate(ux.ctas[1].route)}
>
  <Text fontWeight="700" style={styles.homeText}>{ux.ctas[1].label}</Text>
</TouchableOpacity>
```

- [ ] **Step 5: Run targeted tests**

Run:

```bash
npm test -- tests/ux/lesson-session-ux-contract.test.ts tests/state/machines/lessonSession.machine.test.ts
```

Expected:

```text
PASS tests/ux/lesson-session-ux-contract.test.ts
PASS tests/state/machines/lessonSession.machine.test.ts
```

## Task 4: Add Screen Render Tests For Persona And CTA Routes

**Files:**
- Create: `tests/ui-validation/lesson-session-screens.test.tsx`

- [ ] **Step 1: Write render tests**

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ReconnectingScreen from '@/features/lesson-session/screens/ReconnectingScreen';
import SafetyScreen from '@/features/lesson-session/screens/SafetyScreen';
import ExitConfirmScreen from '@/features/lesson-session/screens/ExitConfirmScreen';
import LessonDoneScreen from '@/features/lesson-session/screens/LessonDoneScreen';
import { ROUTES } from '@/navigation/routes';

function navigation() {
  return { navigate: jest.fn() };
}

function propsFor<TScreen extends React.ComponentType<unknown>>(
  screenName: string,
  nav: ReturnType<typeof navigation>,
): React.ComponentProps<TScreen> {
  return {
    navigation: nav,
    route: { key: `${screenName}-test`, name: screenName },
  } as React.ComponentProps<TScreen>;
}

describe('lesson-session screen UX', () => {
  it('routes safety grown-up help through parent gate', () => {
    const nav = navigation();
    const screen = render(<SafetyScreen {...propsFor<typeof SafetyScreen>(ROUTES.SafetyScreen, nav)} />);

    fireEvent.press(screen.getByLabelText('Ask a grown-up for help'));

    expect(nav.navigate).toHaveBeenCalledWith(ROUTES.ParentGateScreen);
  });

  it('keeps reconnect CTA in the lesson loop', () => {
    const nav = navigation();
    const screen = render(<ReconnectingScreen {...propsFor<typeof ReconnectingScreen>(ROUTES.ReconnectingScreen, nav)} />);

    fireEvent.press(screen.getByLabelText('Keep waiting for TJBot to reconnect'));

    expect(nav.navigate).toHaveBeenCalledWith(ROUTES.RobotListeningScreen);
  });

  it('makes exit confirm cancel and stop routes explicit', () => {
    const nav = navigation();
    const screen = render(<ExitConfirmScreen {...propsFor<typeof ExitConfirmScreen>(ROUTES.ExitConfirmScreen, nav)} />);

    fireEvent.press(screen.getByLabelText('Keep going with the lesson'));
    fireEvent.press(screen.getByLabelText('Stop the lesson for now'));

    expect(nav.navigate).toHaveBeenCalledWith(ROUTES.RobotListeningScreen);
    expect(nav.navigate).toHaveBeenCalledWith(ROUTES.LessonDoneScreen);
  });

  it('keeps lesson done next actions valid', () => {
    const nav = navigation();
    const screen = render(<LessonDoneScreen {...propsFor<typeof LessonDoneScreen>(ROUTES.LessonDoneScreen, nav)} />);

    fireEvent.press(screen.getByLabelText('See the lesson summary'));
    fireEvent.press(screen.getByLabelText('Go back home'));

    expect(nav.navigate).toHaveBeenCalledWith(ROUTES.LessonSummaryScreen);
    expect(nav.navigate).toHaveBeenCalledWith(ROUTES.HomeHubScreen);
  });
});
```

- [ ] **Step 2: Run render tests**

Run:

```bash
npm test -- tests/ui-validation/lesson-session-screens.test.tsx
```

Expected:

```text
PASS tests/ui-validation/lesson-session-screens.test.tsx
```

## Task 5: Regenerate Navigation Docs If Route Metadata Changes

**Files:**
- Modify only if generated output changes: `nav-graph-data.json`
- Modify only if generated output changes: `migrate-ui-ux-to-mobile-app-docs/flows/domains/lesson-session.generated.mmd`

- [ ] **Step 1: Run generators**

Run:

```bash
npm run flows:generate
npm run navigation:route-map
npm run navigation:tree
```

Expected:

```text
lesson-session generated with non-zero route count
```

- [ ] **Step 2: If generated files changed, inspect diff**

Run:

```bash
git diff -- nav-graph-data.json migrate-ui-ux-to-mobile-app-docs/flows/domains/lesson-session.generated.mmd
```

Expected: either no diff, or diff only reflects route metadata already changed by previous tasks.

## Task 6: Full Verification And Evidence

**Files:**
- Create: `migrate-ui-ux-to-mobile-app-docs/qa/ad-hoc/2026-05-14-mobile-ux-learning-flow.md`

- [ ] **Step 1: Run required gates**

Run:

```bash
npx tsc --noEmit
npm run lint
npm test
npm run flows:validate
npm run sequences:fast
npm run erd:validate
npm run usecases:check
npm run check:route-coverage
npm run check:screen-prop-types
```

Expected: every command exits 0. Doc validators must report non-zero file counts.

- [ ] **Step 2: Write QA evidence**

Create `migrate-ui-ux-to-mobile-app-docs/qa/ad-hoc/2026-05-14-mobile-ux-learning-flow.md` with:

```markdown
# Mobile UX Learning Flow Evidence

Date: 2026-05-14
Scope: course + lesson-session UX contract and high-risk lesson-session screens

## Files Changed

- `src/features/lesson-session/uxContract.ts`
- `src/features/lesson-session/screens/ReconnectingScreen.tsx`
- `src/features/lesson-session/screens/ExitConfirmScreen.tsx`
- `src/features/lesson-session/screens/SafetyScreen.tsx`
- `src/features/lesson-session/screens/LessonDoneScreen.tsx`
- `tests/ux/lesson-session-ux-contract.test.ts`
- `tests/ui-validation/lesson-session-screens.test.tsx`

## Acceptance Criteria

1. CTA routes use valid route constants: PASS
2. Recovery/safety copy is calm and non-punitive: PASS
3. Parent help routes through `ParentGateScreen`: PASS
4. Exit confirm prevents accidental loss: PASS
5. Required validation gates pass: PASS

## Verification

- `npx tsc --noEmit`: PASS
- `npm run lint`: PASS
- `npm test`: PASS
- `npm run flows:validate`: PASS
- `npm run sequences:fast`: PASS
- `npm run erd:validate`: PASS
- `npm run usecases:check`: PASS
- `npm run check:route-coverage`: PASS
- `npm run check:screen-prop-types`: PASS
```

- [ ] **Step 3: Commit**

Use Lore-compatible commit body:

```bash
git add src/features/lesson-session tests/ux tests/ui-validation migrate-ui-ux-to-mobile-app-docs/qa/ad-hoc/2026-05-14-mobile-ux-learning-flow.md
git commit -m "feat(lesson-session): enforce learning flow ux contract" -m "Anchor lesson-session recovery and completion screens to route-valid, accessible CTA contracts.

Constraint: sys-16 only; no route, API, BLE, or COPPA contract changes.
Rejected: Implementing all 12 UX domains in one PR | too broad for safe verification.
Confidence: high
Scope-risk: moderate
Directive: Keep future domain UX work on the same route-contract pattern.
Tested: npx tsc --noEmit; npm run lint; npm test; doc validators; route checks.
Not-tested: Detox simulator flow."
```

## Self-Review

- Spec coverage: this plan covers Learning Flow requirements from `course` and `lesson-session`; remaining domains are intentionally split into later plans.
- Placeholder scan: clean; each code-touching task includes exact snippets.
- Type consistency: `LessonSessionUxCta`, `LessonSessionUxState`, and `LESSON_SESSION_UX` are defined before tests and screens consume them.
