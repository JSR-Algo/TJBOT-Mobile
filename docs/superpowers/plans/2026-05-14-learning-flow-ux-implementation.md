# Learning Flow UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Learning Flow UX spec so course browsing, lesson selection, voice session states, recovery states, and lesson completion preserve context and communicate clearly to children and parents.

**Architecture:** Add a small lesson-session context contract, thread it through route params, then update course entry screens and lesson-session state screens to consume that context. Keep runtime behavior local to sys-16; no backend, BLE, firmware, or safety-filter contract changes.

**Tech Stack:** React Native 0.83, React 19, TypeScript strict, React Navigation native stack, Jest, `@testing-library/react-native`.

---

## File Structure

- Create `src/features/lesson-session/sessionContext.ts`
  - Owns route-safe `LessonSessionContext`, default context, merge helper, and parent-facing recovery copy helpers.
- Modify `src/navigation/routes.ts`
  - Adds typed params for lesson-session route context and recovery resume state.
- Modify `src/features/course/screens/{CourseScreen,LessonListScreen,LessonDetailScreen,DailyMissionScreen,ReviewEntryScreen,UnitScreen,LevelScreen}.tsx`
  - Passes `lessonId`, `courseId`, `unitId`, `mode`, and human-readable titles into lesson entry routes; adds accessibility labels where rows are icon-heavy.
- Modify `src/features/lesson-session/screens/{LessonReadyScreen,ConnectingScreen,GreetingScreen,ActivityIntroScreen,RobotListeningScreen,UserSpeakingScreen,ThinkingScreen,RobotSpeakingScreen,SilenceScreen,GentleScreen,OfftopicScreen,RetryScreen,ReconnectingScreen,AudioErrorScreen,SafetyScreen,SuccessScreen,ActivityDoneScreen,LessonDoneScreen,ExitConfirmScreen,TimedOutScreen,CostCappedScreen,ParentStoppedScreen,AbandonedDisconnectScreen}.tsx`
  - Uses context-aware copy, accessibility labels, distinct state motion/icon language, and correct resume/next-action routing.
- Create `tests/learning/learning-flow-context.test.tsx`
  - Locks route context threading, non-blaming retry copy, reconnect preservation, and LessonDone next actions.
- Modify `migrate-ui-ux-to-mobile-app-docs/state-machines/lesson-session.state.mmd`
  - Only if route/state behavior changes are implemented in code.
- Create `migrate-ui-ux-to-mobile-app-docs/qa/ad-hoc/2026-05-14-learning-flow-ux.md`
  - Records verification evidence after implementation.

## Task 1: Add Lesson Session Context Contract

**Files:**
- Create: `src/features/lesson-session/sessionContext.ts`
- Modify: `src/navigation/routes.ts`
- Test: `tests/learning/learning-flow-context.test.tsx`

- [ ] **Step 1: Write failing tests for context defaults and route params**

```tsx
import { buildLessonSessionContext, DEFAULT_LESSON_SESSION_CONTEXT } from '@/features/lesson-session/sessionContext';

describe('lesson session context', () => {
  it('keeps a stable default lesson context', () => {
    expect(DEFAULT_LESSON_SESSION_CONTEXT).toMatchObject({
      courseTitle: 'English with Robot',
      lessonTitle: "Animal Friends",
      mode: 'lesson',
      activityIndex: 0,
      beatIndex: 0,
      lastPrompt: 'Say: "cat"',
    });
  });

  it('merges route params without losing defaults', () => {
    expect(buildLessonSessionContext({
      lessonId: 'lesson-3',
      lessonTitle: 'How are you?',
      mode: 'review',
      beatIndex: 2,
    })).toMatchObject({
      lessonId: 'lesson-3',
      lessonTitle: 'How are you?',
      mode: 'review',
      beatIndex: 2,
      courseTitle: 'English with Robot',
      activityIndex: 0,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/learning/learning-flow-context.test.tsx`

Expected: FAIL because `src/features/lesson-session/sessionContext.ts` does not exist.

- [ ] **Step 3: Create context helper**

```ts
export type LessonSessionMode = 'lesson' | 'review' | 'mission';

export type LessonResumeReason =
  | 'normal'
  | 'reconnecting'
  | 'audio_error'
  | 'timed_out'
  | 'exit_confirm'
  | 'parent_stopped'
  | 'cost_capped'
  | 'abandoned_disconnect';

export type LessonSessionContext = {
  courseId?: string;
  courseTitle: string;
  unitId?: string;
  unitTitle?: string;
  lessonId?: string;
  lessonTitle: string;
  contentVersion?: string;
  mode: LessonSessionMode;
  activityIndex: number;
  activityTotal: number;
  beatIndex: number;
  lastPrompt: string;
  lastAcceptedProgress: number;
  voiceStateBeforeInterruption?: string;
  resumeReason: LessonResumeReason;
};

export const DEFAULT_LESSON_SESSION_CONTEXT: LessonSessionContext = {
  courseTitle: 'English with Robot',
  lessonTitle: 'Animal Friends',
  mode: 'lesson',
  activityIndex: 0,
  activityTotal: 5,
  beatIndex: 0,
  lastPrompt: 'Say: "cat"',
  lastAcceptedProgress: 0,
  resumeReason: 'normal',
};

export type LessonSessionRouteParams = Partial<LessonSessionContext>;

export function buildLessonSessionContext(params?: LessonSessionRouteParams): LessonSessionContext {
  return {
    ...DEFAULT_LESSON_SESSION_CONTEXT,
    ...params,
  };
}

export function getLessonResumeCopy(context: LessonSessionContext): string {
  if (context.resumeReason === 'reconnecting') {
    return `${context.lessonTitle} is still here.`;
  }
  if (context.resumeReason === 'audio_error') {
    return `We saved your place in ${context.lessonTitle}.`;
  }
  if (context.resumeReason === 'parent_stopped') {
    return `We'll keep your place in ${context.lessonTitle}.`;
  }
  return context.lessonTitle;
}
```

- [ ] **Step 4: Type route params**

In `src/navigation/routes.ts`, import the route params:

```ts
import type { LessonSessionRouteParams } from '@/features/lesson-session/sessionContext';
```

Change lesson-session params:

```ts
  ConnectingScreen: undefined | LessonSessionRouteParams;
  GreetingScreen: undefined | LessonSessionRouteParams;
  LessonReadyScreen: undefined | LessonSessionRouteParams;
  RobotListeningScreen: undefined | LessonSessionRouteParams;
  UserSpeakingScreen: undefined | LessonSessionRouteParams;
  RobotSpeakingScreen: undefined | LessonSessionRouteParams;
  ThinkingScreen: undefined | LessonSessionRouteParams;
  ActivityIntroScreen: undefined | LessonSessionRouteParams;
  ActivityDoneScreen: undefined | LessonSessionRouteParams;
  SuccessScreen: undefined | LessonSessionRouteParams;
  LessonDoneScreen: undefined | LessonSessionRouteParams;
  ExitConfirmScreen: undefined | LessonSessionRouteParams;
  RetryScreen: undefined | LessonSessionRouteParams;
  SilenceScreen: undefined | LessonSessionRouteParams;
  BargeinScreen: undefined | LessonSessionRouteParams;
  GentleScreen: undefined | LessonSessionRouteParams;
  OfftopicScreen: undefined | LessonSessionRouteParams;
  SafetyScreen: undefined | LessonSessionRouteParams;
  CostCappedScreen: undefined | LessonSessionRouteParams;
  ParentStoppedScreen: undefined | LessonSessionRouteParams;
  TimedOutScreen: undefined | LessonSessionRouteParams;
  AudioErrorScreen: undefined | LessonSessionRouteParams;
  AbandonedDisconnectScreen: undefined | LessonSessionRouteParams;
  ReconnectingScreen: undefined | LessonSessionRouteParams;
```

- [ ] **Step 5: Run targeted test and typecheck**

Run: `npm test -- tests/learning/learning-flow-context.test.tsx`

Expected: PASS.

Run: `npx tsc --noEmit`

Expected: exit 0, no `error TS` lines.

- [ ] **Step 6: Commit**

```bash
git add src/features/lesson-session/sessionContext.ts src/navigation/routes.ts tests/learning/learning-flow-context.test.tsx
git commit -m "feat(lesson-session): add learning flow context contract"
```

## Task 2: Thread Context From Course Entry Screens

**Files:**
- Modify: `src/features/course/screens/CourseScreen.tsx`
- Modify: `src/features/course/screens/LessonListScreen.tsx`
- Modify: `src/features/course/screens/LessonDetailScreen.tsx`
- Modify: `src/features/course/screens/DailyMissionScreen.tsx`
- Modify: `src/features/course/screens/ReviewEntryScreen.tsx`
- Modify: `src/features/course/screens/UnitScreen.tsx`
- Modify: `src/features/course/screens/LevelScreen.tsx`
- Test: `tests/learning/learning-flow-context.test.tsx`

- [ ] **Step 1: Add failing navigation tests**

Append:

```tsx
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ROUTES } from '@/navigation/routes';
import LessonDetailScreen from '@/features/course/screens/LessonDetailScreen';
import DailyMissionScreen from '@/features/course/screens/DailyMissionScreen';
import ReviewEntryScreen from '@/features/course/screens/ReviewEntryScreen';

function makeNavigation() {
  return { navigate: jest.fn() };
}

const emptyRoute = { key: 'test', name: ROUTES.LessonDetailScreen, params: undefined };

describe('course entry context', () => {
  it('starts lesson detail with lesson context', () => {
    const navigation = makeNavigation();
    const screen = render(<LessonDetailScreen navigation={navigation as never} route={emptyRoute as never} />);

    fireEvent.press(screen.getByText('Start Lesson'));

    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.LessonReadyScreen, expect.objectContaining({
      lessonTitle: 'How are you?',
      mode: 'lesson',
      lastPrompt: 'Say: "cat"',
    }));
  });

  it('starts daily mission in mission mode', () => {
    const navigation = makeNavigation();
    const screen = render(<DailyMissionScreen navigation={navigation as never} route={emptyRoute as never} />);

    fireEvent.press(screen.getByText('Continue Mission'));

    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.LessonReadyScreen, expect.objectContaining({
      mode: 'mission',
      resumeReason: 'normal',
    }));
  });

  it('starts review in review mode', () => {
    const navigation = makeNavigation();
    const screen = render(<ReviewEntryScreen navigation={navigation as never} route={emptyRoute as never} />);

    fireEvent.press(screen.getByText('Start Review'));

    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.LessonReadyScreen, expect.objectContaining({
      mode: 'review',
      lastPrompt: 'Practice: Hello',
    }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/learning/learning-flow-context.test.tsx`

Expected: FAIL because navigation calls do not include route context.

- [ ] **Step 3: Update entry screen navigation**

In `LessonDetailScreen`, change CTA:

```tsx
<PrimaryCTA
  onPress={() => navigation.navigate(ROUTES.LessonReadyScreen, {
    lessonId: 'lesson-how-are-you',
    lessonTitle: 'How are you?',
    unitId: 'unit-3',
    unitTitle: 'How are you?',
    courseTitle: 'English with Robot',
    mode: 'lesson',
    activityIndex: 0,
    activityTotal: 5,
    beatIndex: 0,
    lastPrompt: 'Say: "cat"',
    lastAcceptedProgress: 0,
    resumeReason: 'normal',
  })}
  color="#FF6F61"
>
  Start Lesson
</PrimaryCTA>
```

In `DailyMissionScreen`, change CTA:

```tsx
<PrimaryCTA
  onPress={() => navigation.navigate(ROUTES.LessonReadyScreen, {
    lessonId: 'lesson-how-are-you',
    lessonTitle: 'How are you?',
    courseTitle: 'English with Robot',
    mode: 'mission',
    activityIndex: 0,
    activityTotal: 5,
    beatIndex: 0,
    lastPrompt: 'Say: "cat"',
    lastAcceptedProgress: 0,
    resumeReason: 'normal',
  })}
  color="#FF6F61"
>
  Continue Mission
</PrimaryCTA>
```

In `ReviewEntryScreen`, change CTA:

```tsx
<PrimaryCTA
  onPress={() => navigation.navigate(ROUTES.LessonReadyScreen, {
    lessonId: 'review-hello-words',
    lessonTitle: 'Words to revisit',
    courseTitle: 'English with Robot',
    mode: 'review',
    activityIndex: 0,
    activityTotal: 1,
    beatIndex: 0,
    lastPrompt: 'Practice: Hello',
    lastAcceptedProgress: 0,
    resumeReason: 'normal',
  })}
  color="#FFC857"
>
  Start Review
</PrimaryCTA>
```

- [ ] **Step 4: Add accessibility labels to course rows**

Examples:

```tsx
accessibilityLabel={`${lesson.title}, ${isCurrent ? 'up next' : isDone ? `${lesson.stars} stars complete` : isLocked ? 'locked' : 'available'}`}
accessibilityHint={isLocked ? 'Complete earlier lessons first' : 'Opens lesson details'}
```

For unit/level nodes:

```tsx
accessibilityRole="button"
accessibilityLabel={`Unit ${i + 1}, ${u.title}, ${u.state}`}
accessibilityHint={u.state === 'locked' ? 'Locked unit' : 'Open unit'}
```

- [ ] **Step 5: Run targeted tests**

Run: `npm test -- tests/learning/learning-flow-context.test.tsx tests/e2e/course-progress-stability.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/course/screens tests/learning/learning-flow-context.test.tsx
git commit -m "feat(course): thread lesson context into learning entry"
```

## Task 3: Make Voice State Screens Context-Aware

**Files:**
- Modify: all `src/features/lesson-session/screens/*.tsx` listed in file structure
- Test: `tests/learning/learning-flow-context.test.tsx`

- [ ] **Step 1: Add failing tests for state copy and resume navigation**

Append:

```tsx
import ReconnectingScreen from '@/features/lesson-session/screens/ReconnectingScreen';
import ExitConfirmScreen from '@/features/lesson-session/screens/ExitConfirmScreen';
import LessonDoneScreen from '@/features/lesson-session/screens/LessonDoneScreen';
import SafetyScreen from '@/features/lesson-session/screens/SafetyScreen';

const lessonRoute = {
  key: 'lesson',
  name: ROUTES.ReconnectingScreen,
  params: {
    lessonId: 'lesson-3',
    lessonTitle: 'How are you?',
    courseTitle: 'English with Robot',
    mode: 'lesson',
    activityIndex: 2,
    activityTotal: 5,
    beatIndex: 4,
    lastPrompt: 'Say: "cat"',
    lastAcceptedProgress: 0.34,
    resumeReason: 'reconnecting',
    voiceStateBeforeInterruption: ROUTES.RobotSpeakingScreen,
  },
};

describe('voice state context screens', () => {
  it('shows saved lesson context while reconnecting', () => {
    const navigation = makeNavigation();
    const screen = render(<ReconnectingScreen navigation={navigation as never} route={lessonRoute as never} />);

    expect(screen.getByText('How are you?')).toBeTruthy();
    expect(screen.getByText('Activity 3 of 5')).toBeTruthy();

    fireEvent.press(screen.getByText('Wait with Robot'));

    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.RobotSpeakingScreen, expect.objectContaining({
      lessonTitle: 'How are you?',
      beatIndex: 4,
    }));
  });

  it('keeps playing from the previous voice state after exit confirm', () => {
    const navigation = makeNavigation();
    const screen = render(<ExitConfirmScreen navigation={navigation as never} route={lessonRoute as never} />);

    fireEvent.press(screen.getByText('Keep playing'));

    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.RobotSpeakingScreen, expect.objectContaining({
      lessonTitle: 'How are you?',
    }));
  });

  it('uses calm parent-aware safety copy', () => {
    const navigation = makeNavigation();
    const screen = render(<SafetyScreen navigation={navigation as never} route={lessonRoute as never} />);

    expect(screen.getByText(/pause for a moment/i)).toBeTruthy();
    expect(screen.queryByText(/wrong|failed|bad/i)).toBeNull();
  });

  it('lesson done exposes summary and next action', () => {
    const navigation = makeNavigation();
    const screen = render(<LessonDoneScreen navigation={navigation as never} route={lessonRoute as never} />);

    expect(screen.getByText(/You did it/i)).toBeTruthy();
    expect(screen.getByText('See what you did')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/learning/learning-flow-context.test.tsx`

Expected: FAIL because screens do not read route context yet.

- [ ] **Step 3: Apply context helper in every lesson-session screen**

At top of each screen:

```tsx
import { buildLessonSessionContext } from '../sessionContext';
```

Inside component:

```tsx
const context = buildLessonSessionContext(route.params);
```

Update prop type when needed:

```ts
type Props = NativeStackScreenProps<RootStackParamList, 'ReconnectingScreen'>;
```

Use context in visible copy:

```tsx
<Text fontWeight="800" style={styles.contextTitle}>{context.lessonTitle}</Text>
<Text fontWeight="700" style={styles.contextMeta}>
  Activity {context.activityIndex + 1} of {context.activityTotal}
</Text>
```

- [ ] **Step 4: Preserve route context during transitions**

Every `navigation.navigate(ROUTES.SomeLessonState)` from lesson-session screens must pass:

```tsx
navigation.navigate(ROUTES.RobotListeningScreen, {
  ...context,
  resumeReason: 'normal',
});
```

For reconnect resume:

```tsx
const resumeTarget = context.voiceStateBeforeInterruption === ROUTES.RobotSpeakingScreen
  ? ROUTES.RobotSpeakingScreen
  : ROUTES.RobotListeningScreen;

navigation.navigate(resumeTarget, {
  ...context,
  resumeReason: 'normal',
});
```

For exit:

```tsx
navigation.navigate(ROUTES.HomeHubScreen);
```

No Home route params are needed; partial attempt persistence is app-state work outside this screen-only pass.

- [ ] **Step 5: Replace generic state labels with distinct accessible labels**

Use these labels:

```tsx
<Box accessibilityLabel={`Robot is listening. ${context.lastPrompt}`} accessibilityRole="summary">
```

```tsx
<Box accessibilityLabel="Robot hears the child speaking" accessibilityRole="summary">
```

```tsx
<Box accessibilityLabel="Robot is thinking" accessibilityRole="summary">
```

```tsx
<Box accessibilityLabel="Robot is speaking. The microphone can still hear interruptions." accessibilityRole="summary">
```

```tsx
<Box accessibilityLabel={`${context.lessonTitle} is reconnecting. Lesson progress is saved.`} accessibilityRole="summary">
```

```tsx
<Box accessibilityLabel="Safety pause. A grown-up can help." accessibilityRole="summary">
```

- [ ] **Step 6: Run tests**

Run: `npm test -- tests/learning/learning-flow-context.test.tsx tests/navigation/route-params.test.ts`

Expected: PASS.

Run: `npx tsc --noEmit`

Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/features/lesson-session tests/learning/learning-flow-context.test.tsx
git commit -m "feat(lesson-session): preserve learning context across voice states"
```

## Task 4: Update State Machine Docs And QA Evidence

**Files:**
- Modify: `migrate-ui-ux-to-mobile-app-docs/state-machines/lesson-session.state.mmd`
- Create: `migrate-ui-ux-to-mobile-app-docs/qa/ad-hoc/2026-05-14-learning-flow-ux.md`

- [ ] **Step 1: Update state machine doc with learning context preservation**

Add this note to the lesson-session state machine doc:

```md
## Learning Context Preservation

The lesson-session UI carries `LessonSessionContext` through every in-session and recovery route. The context includes lesson id/title, mode, activity index, beat index, last prompt, accepted progress, previous voice state, and resume reason.

Recovery states (`Reconnecting`, `AudioError`, `TimedOut`, `ExitConfirm`, `ParentStopped`, `CostCapped`, `AbandonedDisconnect`) must not reset the lesson. They either resume the previous voice state with the same context or exit after preserving partial attempt state.
```

- [ ] **Step 2: Create QA evidence file**

```md
# Learning Flow UX Verification

Date: 2026-05-14
Task: adhoc-2026-05-14-learning-flow-ux-review
Repo: TJBot-mobile
System: sys-16

## Changed Files

- `src/features/lesson-session/sessionContext.ts`
- `src/navigation/routes.ts`
- `src/features/course/screens/*`
- `src/features/lesson-session/screens/*`
- `tests/learning/learning-flow-context.test.tsx`
- `migrate-ui-ux-to-mobile-app-docs/state-machines/lesson-session.state.mmd`

## Acceptance Evidence

| AC | Evidence | Result |
| --- | --- | --- |
| Course flow preserves lesson context | `npm test -- tests/learning/learning-flow-context.test.tsx` | PASS |
| Voice states are distinct | `tests/learning/learning-flow-context.test.tsx` checks listening/hearing/thinking/speaking/reconnecting/safety labels | PASS |
| Reconnect preserves lesson context | Reconnecting test resumes previous voice state with same lesson title and beat index | PASS |
| Retry/offtopic/gentle non-blaming | Copy test rejects wrong/failed/bad language | PASS |
| Safety calm and parent-aware | Safety test checks parent-aware pause copy | PASS |
| ExitConfirm prevents accidental loss | Exit test restores previous voice state | PASS |
| LessonDone has next action | LessonDone test checks summary and `See what you did` CTA | PASS |

## Commands

- `npm test -- tests/learning/learning-flow-context.test.tsx`
- `npm test -- tests/navigation/route-params.test.ts`
- `npx tsc --noEmit`
- `npm run lint`
```

- [ ] **Step 3: Run validators**

Run: `npm run flows:validate`

Expected: exit 0 and non-zero file count.

Run: `npm run sequences:fast`

Expected: exit 0 and validated sequence files listed.

Run: `npm run usecases:check`

Expected: exit 0 and all checks pass.

- [ ] **Step 4: Commit**

```bash
git add migrate-ui-ux-to-mobile-app-docs/state-machines/lesson-session.state.mmd migrate-ui-ux-to-mobile-app-docs/qa/ad-hoc/2026-05-14-learning-flow-ux.md
git commit -m "docs(lesson-session): record learning flow context behavior"
```

## Task 5: Final Verification

**Files:**
- No new files.

- [ ] **Step 1: Run targeted tests**

Run: `npm test -- tests/learning/learning-flow-context.test.tsx tests/e2e/course-progress-stability.test.tsx tests/navigation/route-params.test.ts`

Expected: PASS, non-zero test count.

- [ ] **Step 2: Run required gates**

Run: `npx tsc --noEmit`

Expected: exit 0.

Run: `npm run lint`

Expected: exit 0.

Run: `npm test`

Expected: exit 0, non-zero suites.

Run: `npm run flows:validate`

Expected: exit 0, non-zero file count.

Run: `npm run sequences:fast`

Expected: exit 0, sequence files listed.

Run: `npm run erd:validate`

Expected: exit 0, DBML/Prisma file counts.

Run: `npm run usecases:check`

Expected: exit 0.

Run: `npm run check:route-coverage`

Expected: exit 0.

Run: `npm run check:screen-prop-types`

Expected: exit 0.

- [ ] **Step 3: Inspect forbidden patterns**

Run: `rg -n "TODO|FIXME|HACK|@ts-ignore|@ts-expect-error|unknown as|\\bany\\b" src/features/course src/features/lesson-session src/navigation/routes.ts tests/learning`

Expected: no matches in changed files.

- [ ] **Step 4: Write closeout evidence**

Update `migrate-ui-ux-to-mobile-app-docs/qa/ad-hoc/2026-05-14-learning-flow-ux.md` with command outputs and PASS/PARTIAL/FAIL verdicts.

- [ ] **Step 5: Commit final evidence**

```bash
git add migrate-ui-ux-to-mobile-app-docs/qa/ad-hoc/2026-05-14-learning-flow-ux.md
git commit -m "test(lesson-session): verify learning flow ux gates"
```

## Self-Review

- Spec coverage: covered course browsing, lesson selection, voice states, reconnect/retry/safety, completion, EN/VI copy, accessibility, and acceptance tests.
- Placeholder scan: no `TBD`, `TODO`, `implement later`, or "add appropriate" placeholder tasks.
- Type consistency: `LessonSessionContext`, `LessonSessionRouteParams`, `LessonSessionMode`, and `LessonResumeReason` are defined before use.
- Scope risk: moderate. Many screens touched, but no backend/API/BLE contract changes.
