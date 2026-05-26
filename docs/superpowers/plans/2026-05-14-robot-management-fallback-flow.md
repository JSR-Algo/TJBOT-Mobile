# Robot Management Fallback Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Robot Management and global fallback screens recoverable, specific, bilingual-ready, and safe for child progress/data.

**Architecture:** Add small typed fallback contracts first, then pass those contracts through route params and focused screen props. Keep UI changes inside existing `fallback` and `robot-mgmt` screen files; avoid new backend/BLE protocols. Lock behavior with targeted React Native tests before changing screens.

**Tech Stack:** React Native 0.83, TypeScript strict, React Navigation typed params, Jest 29, `@testing-library/react-native`, existing TJBot design-system primitives.

---

## Scope And File Map

**Modify:**
- `src/navigation/routes.ts` — add typed params for recovery context routes.
- `src/features/fallback/recoveryTypes.ts` — create typed fallback context helpers.
- `src/features/fallback/screens/NetworkErrorScreen.tsx` — specific network copy and route params.
- `src/features/fallback/ReconnectingOverlay.tsx` — attempt state, bounded failure, checkpoint route target.
- `src/features/fallback/screens/VoiceFailedScreen.tsx` — checkpoint-aware copy and CTA.
- `src/features/fallback/screens/LessonResumeScreen.tsx` — render lesson checkpoint and route to target screen.
- `src/features/fallback/screens/AppErrorScreen.tsx` — explicit secret-safe copy and retry/home behavior.
- `src/features/fallback/screens/AudioRecoveryScreen.tsx` — "I fixed it" re-check path and safe copy.
- `src/features/fallback/screens/MicMissingScreen.tsx` — pass audio recovery context.
- `src/features/robot-mgmt/screens/MicTestScreen.tsx` — add visual test states and re-run.
- `src/features/robot-mgmt/screens/SpeakerTestScreen.tsx` — add visual play states and support route topic.
- `src/features/robot-mgmt/screens/FactoryResetScreen.tsx` — add typed final confirmation.
- `src/features/robot-mgmt/screens/SupportScreen.tsx` — read support topic/context params and lock privacy copy.
- `src/services/i18n/locales/en.json` — add EN copy keys used by changed screens.
- `src/services/i18n/locales/vi.json` — add VI copy keys for same keys.
- `tests/ui-validation/fallback-offline.test.tsx` — network, voice, resume, AppError tests.
- `tests/components/robot-body.test.tsx` — mic/speaker/factory reset/support tests.

**Docs:**
- `migrate-ui-ux-to-mobile-app-docs/usecases/domains/fallback-shell/use-cases.md` — update only if route behavior changes from the written UC.
- `migrate-ui-ux-to-mobile-app-docs/usecases/domains/robot-mgmt/use-cases.md` — update only if factory/support/mic/speaker behavior changes from the written UC.
- `migrate-ui-ux-to-mobile-app-docs/qa/ad-hoc/2026-05-14-robot-management-fallback-flow.md` — record verification evidence.

**Do not modify:**
- BLE service UUIDs, message schemas, backend OpenAPI, COPPA legal copy, root docs repo files.

---

### Task 1: Typed Recovery Contracts

**Files:**
- Create: `src/features/fallback/recoveryTypes.ts`
- Modify: `src/navigation/routes.ts`
- Test: `tests/ui-validation/fallback-offline.test.tsx`

- [ ] **Step 1: Write failing route-param test**

Add this import to `tests/ui-validation/fallback-offline.test.tsx`:

```tsx
import { fallbackCheckpoint } from '../../src/features/fallback/recoveryTypes';
```

Add this test block after `createRoute`:

```tsx
it('accepts typed fallback recovery context in route params', () => {
  const checkpoint = fallbackCheckpoint();
  const resumeRoute = {
    key: ROUTES.LessonResumeScreen,
    name: ROUTES.LessonResumeScreen,
    params: {
      checkpoint,
    },
  };

  expect(resumeRoute.params.checkpoint.resumeTarget).toBe(ROUTES.UserSpeakingScreen);
});
```

- [ ] **Step 2: Run test to verify current baseline**

Run:

```bash
npx jest --selectProjects unit tests/ui-validation/fallback-offline.test.tsx --runInBand
```

Expected before implementation: fails because `src/features/fallback/recoveryTypes.ts` does not exist.

- [ ] **Step 3: Add recovery types**

Create `src/features/fallback/recoveryTypes.ts`:

```ts
import { ROUTES, type RootStackParamList } from '@/navigation/routes';

export type RecoveryReason =
  | 'network'
  | 'voice_failed'
  | 'mic_missing'
  | 'audio_recovered'
  | 'safety'
  | 'app_error';

export type ResumeTarget =
  | typeof ROUTES.RobotListeningScreen
  | typeof ROUTES.UserSpeakingScreen
  | typeof ROUTES.RobotSpeakingScreen
  | typeof ROUTES.ActivityIntroScreen;

export type LessonCheckpoint = {
  readonly lessonTitle: string;
  readonly progressLabel: string;
  readonly resumeTarget: ResumeTarget;
  readonly reason: RecoveryReason;
  readonly activityLabel?: string;
  readonly elapsedLabel?: string;
};

export type ReconnectContext = {
  readonly attempt?: number;
  readonly maxAttempts?: number;
  readonly checkpoint?: LessonCheckpoint;
  readonly failureTarget?: keyof RootStackParamList;
};

export type SupportTopic = 'hardware' | 'sound' | 'wifi' | 'lessons' | 'account' | 'app_error' | 'other';

export type SupportContext = {
  readonly topic?: SupportTopic;
  readonly errorFamily?: RecoveryReason | 'robot_offline' | 'factory_reset';
  readonly retryCount?: number;
  readonly robotIdSuffix?: string;
};

export function fallbackCheckpoint(): LessonCheckpoint {
  return {
    lessonTitle: 'How are you?',
    progressLabel: '60%',
    resumeTarget: ROUTES.UserSpeakingScreen,
    reason: 'voice_failed',
    activityLabel: 'Speaking practice',
  };
}
```

- [ ] **Step 4: Add typed params to routes**

Modify these route entries in `src/navigation/routes.ts`:

```ts
  NetworkErrorScreen: undefined | { checkpoint?: import('@/features/fallback/recoveryTypes').LessonCheckpoint; attemptCount?: number };
  AppErrorScreen: undefined | { supportContext?: import('@/features/fallback/recoveryTypes').SupportContext };
  MicMissingScreen: undefined | { checkpoint?: import('@/features/fallback/recoveryTypes').LessonCheckpoint };
  VoiceFailedScreen: undefined | { checkpoint?: import('@/features/fallback/recoveryTypes').LessonCheckpoint };
  AudioRecoveryScreen: undefined | { checkpoint?: import('@/features/fallback/recoveryTypes').LessonCheckpoint };
  SafetyRedirectScreen: undefined | { checkpoint?: import('@/features/fallback/recoveryTypes').LessonCheckpoint };
  LessonResumeScreen: undefined | { checkpoint?: import('@/features/fallback/recoveryTypes').LessonCheckpoint };
  ReconnectingOverlay: undefined | import('@/features/fallback/recoveryTypes').ReconnectContext;
  SupportScreen: undefined | { context?: import('@/features/fallback/recoveryTypes').SupportContext };
```

- [ ] **Step 5: Run typecheck**

Run:

```bash
npx tsc --noEmit
```

Expected: exit 0. If route param imports are rejected by lint style, replace inline imports with top-level `import type` statements and rerun.

- [ ] **Step 6: Commit**

```bash
git add src/features/fallback/recoveryTypes.ts src/navigation/routes.ts tests/ui-validation/fallback-offline.test.tsx
git commit -m "Type fallback recovery context for Robot flows

Constraint: sys-16 owns route params and mobile recovery context only.
Confidence: high
Scope-risk: narrow
Directive: Do not add backend or BLE recovery contracts in this change.
Tested: npx tsc --noEmit
Not-tested: full app runtime"
```

---

### Task 2: Network, Voice, And Resume Recovery

**Files:**
- Modify: `src/features/fallback/screens/NetworkErrorScreen.tsx`
- Modify: `src/features/fallback/ReconnectingOverlay.tsx`
- Modify: `src/features/fallback/screens/VoiceFailedScreen.tsx`
- Modify: `src/features/fallback/screens/LessonResumeScreen.tsx`
- Test: `tests/ui-validation/fallback-offline.test.tsx`

- [ ] **Step 1: Add failing tests for specific recovery**

Replace the voice test in `tests/ui-validation/fallback-offline.test.tsx` with:

```tsx
it('routes voice failure through checkpoint-aware resume copy', () => {
  const voiceNavigation = createNavigation();
  const checkpoint = {
    lessonTitle: 'How are you?',
    progressLabel: '60%',
    resumeTarget: ROUTES.UserSpeakingScreen,
    reason: 'voice_failed' as const,
  };

  const voice = render(
    <VoiceFailedScreen
      navigation={voiceNavigation as never}
      route={{ key: ROUTES.VoiceFailedScreen, name: ROUTES.VoiceFailedScreen, params: { checkpoint } } as never}
    />,
  );

  expect(voice.getByText('Robot voice paused')).toBeTruthy();
  expect(voice.getByText('Your progress is safe. The voice session was interrupted.')).toBeTruthy();
  fireEvent.press(voice.getByText('Resume lesson'));
  expect(voiceNavigation.navigate).toHaveBeenCalledWith(ROUTES.LessonResumeScreen, { checkpoint });
});

it('renders lesson resume from checkpoint and navigates to target', () => {
  const navigation = createNavigation();
  const checkpoint = {
    lessonTitle: 'How are you?',
    progressLabel: '60%',
    resumeTarget: ROUTES.UserSpeakingScreen,
    reason: 'voice_failed' as const,
    activityLabel: 'Speaking practice',
  };

  const screen = render(
    <LessonResumeScreen
      navigation={navigation as never}
      route={{ key: ROUTES.LessonResumeScreen, name: ROUTES.LessonResumeScreen, params: { checkpoint } } as never}
    />,
  );

  expect(screen.getByText('How are you?')).toBeTruthy();
  expect(screen.getByText('60%')).toBeTruthy();
  expect(screen.getByText('Speaking practice')).toBeTruthy();
  fireEvent.press(screen.getByText('Keep going'));
  expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.UserSpeakingScreen);
});

it('does not promise resume when voice checkpoint is missing', () => {
  const navigation = createNavigation();
  const screen = render(
    <VoiceFailedScreen navigation={navigation as never} route={createRoute(ROUTES.VoiceFailedScreen) as never} />,
  );

  expect(screen.getByText('Robot voice paused')).toBeTruthy();
  expect(screen.getByText('Progress is safe. This activity needs to start again.')).toBeTruthy();
  expect(screen.queryByText('Pick up where we left off')).toBeNull();
});
```

- [ ] **Step 2: Run tests to see failure**

Run:

```bash
npx jest --selectProjects unit tests/ui-validation/fallback-offline.test.tsx --runInBand
```

Expected: fails because current copy is static and `LessonResumeScreen` uses static content.

- [ ] **Step 3: Update `VoiceFailedScreen`**

Use this logic inside the component:

```tsx
const checkpoint = route.params?.checkpoint;
const body = checkpoint
  ? 'Your progress is safe. The voice session was interrupted.'
  : 'Progress is safe. This activity needs to start again.';
const primaryLabel = checkpoint ? 'Resume lesson' : 'Start activity again';
const onPrimary = (): void => {
  if (checkpoint) {
    navigation.navigate(ROUTES.LessonResumeScreen, { checkpoint });
    return;
  }
  navigation.navigate(ROUTES.ActivityIntroScreen);
};
```

Render:

```tsx
<SpeechBubble>Robot voice paused{'\n'}{body}</SpeechBubble>
<PrimaryCTA color="#FF6F61" onPress={onPrimary}>{primaryLabel}</PrimaryCTA>
```

- [ ] **Step 4: Update `LessonResumeScreen`**

Use this logic:

```tsx
import { fallbackCheckpoint } from '../recoveryTypes';

const checkpoint = route.params?.checkpoint ?? fallbackCheckpoint();
const resume = (): void => {
  navigation.navigate(checkpoint.resumeTarget);
};
```

Render the dynamic checkpoint:

```tsx
<Text fontWeight="800" style={styles.lessonTitle}>{checkpoint.lessonTitle}</Text>
<Text style={styles.resumeMeta}>{checkpoint.activityLabel ?? 'Saved activity'}</Text>
<Text fontWeight="700" style={styles.progressText}>{checkpoint.progressLabel}</Text>
```

Add styles:

```tsx
resumeMeta: { fontSize: 12, color: '#5C4F77', marginTop: 2 },
progressText: { fontSize: 12, color: '#2B2140', marginTop: 4 },
```

- [ ] **Step 5: Update network retry params**

In `NetworkErrorScreen`, pass checkpoint and attempt count:

```tsx
const checkpoint = route.params?.checkpoint;
const attemptCount = route.params?.attemptCount ?? 1;

<PrimaryCTA
  color="#6B4A9B"
  onPress={() => navigation.navigate(ROUTES.ReconnectingOverlay, { checkpoint, attempt: attemptCount, maxAttempts: 3 })}
>
  Try again
</PrimaryCTA>
```

- [ ] **Step 6: Update reconnect overlay**

Replace fixed success-only timer with bounded branch:

```tsx
const attempt = route.params?.attempt ?? 1;
const maxAttempts = route.params?.maxAttempts ?? 3;
const checkpoint = route.params?.checkpoint;

React.useEffect(() => {
  const timer = setTimeout(() => {
    if (attempt >= maxAttempts) {
      navigation.navigate(ROUTES.NetworkErrorScreen, { checkpoint, attemptCount: attempt + 1 });
      return;
    }

    if (checkpoint) {
      navigation.navigate(checkpoint.resumeTarget);
      return;
    }

    navigation.navigate(ROUTES.RobotListeningScreen);
  }, 2400);

  return () => clearTimeout(timer);
}, [attempt, checkpoint, maxAttempts, navigation]);
```

Render attempt count:

```tsx
<Text style={styles.attemptText}>Attempt {attempt} of {maxAttempts}</Text>
```

- [ ] **Step 7: Run targeted tests**

Run:

```bash
npx jest --selectProjects unit tests/ui-validation/fallback-offline.test.tsx --runInBand
```

Expected: all tests in file pass.

- [ ] **Step 8: Commit**

```bash
git add src/features/fallback/screens/NetworkErrorScreen.tsx src/features/fallback/ReconnectingOverlay.tsx src/features/fallback/screens/VoiceFailedScreen.tsx src/features/fallback/screens/LessonResumeScreen.tsx tests/ui-validation/fallback-offline.test.tsx
git commit -m "Clarify voice and network recovery paths

Constraint: recovery remains client-side and uses existing route targets.
Rejected: fixed reconnect timer as success signal | it can trap users in false resume.
Confidence: high
Scope-risk: moderate
Directive: Keep network, audio, and voice copy distinct.
Tested: npx jest --selectProjects unit tests/ui-validation/fallback-offline.test.tsx --runInBand
Not-tested: real device background resume"
```

---

### Task 3: AppError And Bilingual Copy Keys

**Files:**
- Modify: `src/features/fallback/screens/AppErrorScreen.tsx`
- Modify: `src/services/i18n/locales/en.json`
- Modify: `src/services/i18n/locales/vi.json`
- Test: `tests/ui-validation/fallback-offline.test.tsx`

- [ ] **Step 1: Add failing AppError secrecy test**

Extend the AppError test:

```tsx
expect(queryByText(/database password/i)).toBeNull();
expect(queryByText(/Error:/i)).toBeNull();
expect(queryByText(/at /i)).toBeNull();
expect(getByText('The app hit a problem. We hid the technical details and kept your data safe.')).toBeTruthy();
```

- [ ] **Step 2: Run test**

```bash
npx jest --selectProjects unit tests/ui-validation/fallback-offline.test.tsx --runInBand
```

Expected: fails until copy is updated.

- [ ] **Step 3: Update AppError copy**

In `AppErrorScreen`, replace computed message with constants:

```tsx
const title = 'Something went wrong';
const message = 'The app hit a problem. We hid the technical details and kept your data safe.';
```

Render:

```tsx
<Text fontWeight="800" style={styles.title}>{title}</Text>
<Text style={styles.msg}>{message}</Text>
```

- [ ] **Step 4: Add locale keys**

Add these keys to both locale files, using exact EN key strings:

```json
"Something went wrong": "Something went wrong",
"The app hit a problem. We hid the technical details and kept your data safe.": "The app hit a problem. We hid the technical details and kept your data safe.",
"Robot voice paused": "Robot voice paused",
"Your progress is safe. The voice session was interrupted.": "Your progress is safe. The voice session was interrupted.",
"Progress is safe. This activity needs to start again.": "Progress is safe. This activity needs to start again.",
"Resume lesson": "Resume lesson",
"Start activity again": "Start activity again",
"Trying to reconnect": "Trying to reconnect"
```

For `vi.json`, values:

```json
"Something went wrong": "Có lỗi xảy ra",
"The app hit a problem. We hid the technical details and kept your data safe.": "Ứng dụng gặp sự cố. Chi tiết kỹ thuật đã được ẩn và dữ liệu của bạn vẫn an toàn.",
"Robot voice paused": "Giọng Robot tạm dừng",
"Your progress is safe. The voice session was interrupted.": "Tiến trình vẫn an toàn. Phiên giọng nói bị gián đoạn.",
"Progress is safe. This activity needs to start again.": "Tiến trình vẫn an toàn. Hoạt động này cần bắt đầu lại.",
"Resume lesson": "Tiếp tục bài học",
"Start activity again": "Làm lại hoạt động",
"Trying to reconnect": "Đang kết nối lại"
```

- [ ] **Step 5: Run copy checks**

```bash
npm run i18n:parity
```

Expected: exit 0, no missing EN/VI keys.

- [ ] **Step 6: Commit**

```bash
git add src/features/fallback/screens/AppErrorScreen.tsx src/services/i18n/locales/en.json src/services/i18n/locales/vi.json tests/ui-validation/fallback-offline.test.tsx
git commit -m "Hide technical app errors behind safe recovery copy

Constraint: AppError must never expose stack traces or raw exception messages.
Confidence: high
Scope-risk: narrow
Directive: Keep raw error details in telemetry only, not UI.
Tested: npx jest --selectProjects unit tests/ui-validation/fallback-offline.test.tsx --runInBand; npm run i18n:parity
Not-tested: Sentry event payload review"
```

---

### Task 4: Mic And Speaker Visual Feedback

**Files:**
- Modify: `src/features/robot-mgmt/screens/MicTestScreen.tsx`
- Modify: `src/features/robot-mgmt/screens/SpeakerTestScreen.tsx`
- Test: `tests/components/robot-body.test.tsx`

- [ ] **Step 1: Add failing tests**

Add to `tests/components/robot-body.test.tsx`:

```tsx
it('shows mic test visual phases and allows rerun', async () => {
  const screen = render(<MicTestScreen navigation={navigation} route={emptyRoute} />);

  expect(screen.getByText('Ready to listen')).toBeTruthy();
  fireEvent.press(screen.getByText('Start mic test'));
  expect(await screen.findByText('Listening...')).toBeTruthy();
  expect(await screen.findByText('Robot heard you')).toBeTruthy();
  fireEvent.press(screen.getByText('Run test again'));
  expect(await screen.findByText('Listening...')).toBeTruthy();
  screen.unmount();
});

it('shows speaker sample feedback and routes muffled audio to support', () => {
  const screen = render(<SpeakerTestScreen navigation={navigation} route={emptyRoute} />);

  fireEvent.press(screen.getByText('Robot chime'));
  expect(screen.getByText('Playing chime sample')).toBeTruthy();
  fireEvent.press(screen.getByText('Robot sounds quiet or muffled'));
  expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.SupportScreen, {
    context: { topic: 'sound', errorFamily: 'robot_offline' },
  });
  screen.unmount();
});
```

- [ ] **Step 2: Run test**

```bash
npx jest --selectProjects unit tests/components/robot-body.test.tsx --runInBand
```

Expected: fails on missing visual copy/route params.

- [ ] **Step 3: Update MicTest phases**

Use this phase type:

```tsx
type Phase = 'idle' | 'listening' | 'heard' | 'tooQuiet' | 'failed';
```

Use this transition:

```tsx
const start = (): void => {
  setPhase('listening');
  setTimeout(() => setPhase('heard'), 900);
};
```

Render phase label:

```tsx
const phaseLabel = {
  idle: 'Ready to listen',
  listening: 'Listening...',
  heard: 'Robot heard you',
  tooQuiet: 'A little too quiet',
  failed: 'Mic test could not finish',
}[phase];
```

Use CTA:

```tsx
<DeviceBigBtn onClick={start}>{phase === 'idle' ? 'Start mic test' : 'Run test again'}</DeviceBigBtn>
```

- [ ] **Step 4: Update SpeakerTest feedback**

Use:

```tsx
type Played = 'none' | 'chime' | 'voice';
const feedback = played === 'none'
  ? 'Choose a sample to play'
  : played === 'chime'
    ? 'Playing chime sample'
    : 'Playing voice sample';
```

Change muffled route:

```tsx
<DeviceBigBtn
  secondary
  onClick={() => navigation.navigate(ROUTES.SupportScreen, { context: { topic: 'sound', errorFamily: 'robot_offline' } })}
>
  Robot sounds quiet or muffled
</DeviceBigBtn>
```

- [ ] **Step 5: Run targeted tests**

```bash
npx jest --selectProjects unit tests/components/robot-body.test.tsx --runInBand
```

Expected: tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/robot-mgmt/screens/MicTestScreen.tsx src/features/robot-mgmt/screens/SpeakerTestScreen.tsx tests/components/robot-body.test.tsx
git commit -m "Add visible audio diagnostic feedback

Constraint: diagnostic tests remain UI-only and do not change BLE/audio protocols.
Confidence: medium
Scope-risk: moderate
Directive: Route persistent sound issues to support with scoped context.
Tested: npx jest --selectProjects unit tests/components/robot-body.test.tsx --runInBand
Not-tested: real microphone and speaker hardware"
```

---

### Task 5: Factory Reset Strong Confirmation

**Files:**
- Modify: `src/features/robot-mgmt/screens/FactoryResetScreen.tsx`
- Test: `tests/components/robot-body.test.tsx`

- [ ] **Step 1: Add failing typed-confirm test**

Replace the factory reset action part in the existing reject test with:

```tsx
await waitFor(() => expect(reset.getByText('Type ROB-2A8F to erase')).toBeTruthy());
fireEvent.press(reset.getByText('Yes, erase Robot'));
expect(reset.getByText('Type the Robot name before erasing.')).toBeTruthy();
fireEvent.changeText(reset.getByPlaceholderText('ROB-2A8F'), 'ROB-2A8F');
fireEvent.press(reset.getByText('Yes, erase Robot'));
await waitFor(() => expect(reset.getByText('Factory reset could not start. Try again.')).toBeTruthy());
```

- [ ] **Step 2: Run test**

```bash
npx jest --selectProjects unit tests/components/robot-body.test.tsx --runInBand
```

Expected: fails because final confirm has no text input.

- [ ] **Step 3: Add input state**

In `FactoryResetScreen`:

```tsx
import { TextInput } from 'react-native';

const ROBOT_CONFIRM = 'ROB-2A8F';
const [confirmText, setConfirmText] = React.useState('');
const [confirmError, setConfirmError] = React.useState<string | null>(null);

const onErase = (): void => {
  if (confirmText.trim() !== ROBOT_CONFIRM) {
    setConfirmError('Type the Robot name before erasing.');
    return;
  }
  void factoryReset();
};
```

- [ ] **Step 4: Render final confirm input**

In final step before buttons:

```tsx
<Text fontWeight="600" style={styles.confirmLabel}>Type ROB-2A8F to erase</Text>
<TextInput
  value={confirmText}
  onChangeText={(text) => {
    setConfirmText(text);
    setConfirmError(null);
  }}
  placeholder="ROB-2A8F"
  autoCapitalize="characters"
  style={styles.confirmInput}
/>
{confirmError ? <Text style={styles.errorText}>{confirmError}</Text> : null}
```

Change erase button:

```tsx
<DeviceBigBtn danger onClick={onErase}>Yes, erase Robot</DeviceBigBtn>
```

Add styles:

```tsx
confirmLabel: { fontSize: 13, color: RM.ink2, lineHeight: 20, textAlign: 'center', marginBottom: 8 },
confirmInput: { minHeight: 48, borderRadius: 10, borderWidth: 1, borderColor: RM.hair, paddingHorizontal: 12, backgroundColor: RM.card, color: RM.ink, textAlign: 'center', fontSize: 16, fontWeight: '700' },
```

- [ ] **Step 5: Run targeted tests**

```bash
npx jest --selectProjects unit tests/components/robot-body.test.tsx --runInBand
```

Expected: tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/robot-mgmt/screens/FactoryResetScreen.tsx tests/components/robot-body.test.tsx
git commit -m "Strengthen factory reset confirmation

Constraint: factory reset is destructive and must stay parent-gated.
Rejected: one-button final erase | too easy after parent gate.
Confidence: high
Scope-risk: narrow
Directive: Keep reset copy explicit about erased Robot data and kept account progress.
Tested: npx jest --selectProjects unit tests/components/robot-body.test.tsx --runInBand
Not-tested: successful reset against real Robot"
```

---

### Task 6: Support Context And Final Verification

**Files:**
- Modify: `src/features/robot-mgmt/screens/SupportScreen.tsx`
- Modify: `migrate-ui-ux-to-mobile-app-docs/usecases/domains/fallback-shell/use-cases.md`
- Modify: `migrate-ui-ux-to-mobile-app-docs/usecases/domains/robot-mgmt/use-cases.md`
- Create: `migrate-ui-ux-to-mobile-app-docs/qa/ad-hoc/2026-05-14-robot-management-fallback-flow.md`
- Test: `tests/components/robot-body.test.tsx`

- [ ] **Step 1: Add support context test**

Add:

```tsx
it('renders support context without audio or transcript attachment', () => {
  const route = {
    key: ROUTES.SupportScreen,
    name: ROUTES.SupportScreen,
    params: { context: { topic: 'sound' as const, errorFamily: 'robot_offline' as const, retryCount: 3, robotIdSuffix: '2A8F' } },
  };

  const screen = render(<SupportScreen navigation={navigation} route={route as never} />);

  expect(screen.getByText('Sound or microphone')).toBeTruthy();
  expect(screen.getByText('Retry count: 3')).toBeTruthy();
  expect(screen.getByText('No audio, no transcripts.')).toBeTruthy();
  expect(screen.queryByText(/transcript attached/i)).toBeNull();
  screen.unmount();
});
```

- [ ] **Step 2: Run test**

```bash
npx jest --selectProjects unit tests/components/robot-body.test.tsx --runInBand
```

Expected: fails until support context renders.

- [ ] **Step 3: Update SupportScreen**

Read initial topic and context:

```tsx
const context = route.params?.context;
const [topic, setTopic] = React.useState<TopicId>(context?.topic === 'app_error' ? 'other' : context?.topic ?? 'hardware');
const contextRows = [
  context?.robotIdSuffix ? `Robot: ROB-${context.robotIdSuffix}` : null,
  context?.retryCount ? `Retry count: ${context.retryCount}` : null,
  context?.errorFamily ? `Issue: ${context.errorFamily}` : null,
].filter((value): value is string => value !== null);
```

Render context rows under attachment copy:

```tsx
<Text style={styles.attachNote}>No audio, no transcripts.</Text>
{contextRows.map((row) => (
  <Box key={row} style={styles.tag}><Text fontWeight="600" style={styles.tagText}>{row}</Text></Box>
))}
```

- [ ] **Step 4: Update use cases**

In `fallback-shell/use-cases.md`, revise UC-F04/UC-F05/UC-F06 to mention checkpoint-driven resume and bounded reconnect. Use exact wording:

```md
> Implementation note: recovery should carry a lesson checkpoint when available. Without a checkpoint, the CTA starts the current activity again and must not promise "where we left off."
```

In `robot-mgmt/use-cases.md`, revise UC-RM10/UC-RM12:

```md
> Implementation note: final factory reset confirmation requires the parent to type the Robot identifier after the parent gate. Support payload may include device/app diagnostics but must exclude audio and transcripts.
```

- [ ] **Step 5: Create QA evidence file**

Create `migrate-ui-ux-to-mobile-app-docs/qa/ad-hoc/2026-05-14-robot-management-fallback-flow.md`:

```md
# Robot Management + Fallback Flow Verification

Date: 2026-05-14
Task: AD-HOC robot-management-fallback-flow
Scope: sys-16 fallback + robot-mgmt UI recovery

## Commands

| Gate | Command | Result |
|---|---|---|
| Targeted fallback tests | `npx jest --selectProjects unit tests/ui-validation/fallback-offline.test.tsx --runInBand` | pending until run |
| Targeted robot tests | `npx jest --selectProjects unit tests/components/robot-body.test.tsx --runInBand` | pending until run |
| Typecheck | `npx tsc --noEmit` | pending until run |
| Lint | `npm run lint` | pending until run |
| Unit suite | `npm test` | pending until run |

## Acceptance Mapping

- Network retry: covered by fallback-offline tests.
- Voice resume context: covered by fallback-offline tests.
- AppError stack protection: covered by fallback-offline tests.
- Mic/speaker visual feedback: covered by robot-body tests.
- Factory reset confirmation: covered by robot-body tests.
- Support payload privacy: covered by robot-body tests.
```

- [ ] **Step 6: Run required gates**

Run sequentially:

```bash
npx jest --selectProjects unit tests/ui-validation/fallback-offline.test.tsx --runInBand
npx jest --selectProjects unit tests/components/robot-body.test.tsx --runInBand
npx tsc --noEmit
npm run lint
npm test
npm run flows:validate
npm run sequences:fast
npm run erd:validate
npm run usecases:check
npm run check:token-parity
npm run check:route-coverage
npm run check:screen-prop-types
```

Expected:
- All commands exit 0.
- Doc validators print non-zero file counts or pass summaries.

- [ ] **Step 7: Update QA evidence**

Replace every `pending until run` cell in `migrate-ui-ux-to-mobile-app-docs/qa/ad-hoc/2026-05-14-robot-management-fallback-flow.md` with exit code and key output. Example:

```md
| Targeted fallback tests | `npx jest --selectProjects unit tests/ui-validation/fallback-offline.test.tsx --runInBand` | PASS exit 0; Test Suites: 1 passed |
```

- [ ] **Step 8: Commit**

```bash
git add src/features/robot-mgmt/screens/SupportScreen.tsx migrate-ui-ux-to-mobile-app-docs/usecases/domains/fallback-shell/use-cases.md migrate-ui-ux-to-mobile-app-docs/usecases/domains/robot-mgmt/use-cases.md migrate-ui-ux-to-mobile-app-docs/qa/ad-hoc/2026-05-14-robot-management-fallback-flow.md tests/components/robot-body.test.tsx
git commit -m "Escalate fallback recovery with privacy-safe support context

Constraint: support context may include device diagnostics but no audio, transcripts, raw PII, or tokens.
Confidence: high
Scope-risk: moderate
Directive: Keep support escalation family-specific after bounded retries.
Tested: npx jest --selectProjects unit tests/ui-validation/fallback-offline.test.tsx --runInBand; npx jest --selectProjects unit tests/components/robot-body.test.tsx --runInBand; npx tsc --noEmit; npm run lint; npm test
Not-tested: support backend submission"
```

---

## Self-Review

**Spec coverage:** Covered taxonomy, recovery tree, per-family specs, support escalation, EN/VI copy, and acceptance tests. Factory reset, mic/speaker visuals, voice/network distinction, LessonResume context, and AppError secrecy each map to a task.

**Placeholder scan:** No `TBD`, `TODO`, `FIXME`, `HACK`, "implement later", or unspecified test steps are present.

**Type consistency:** `LessonCheckpoint`, `ReconnectContext`, `SupportContext`, `SupportTopic`, and `RecoveryReason` are defined in Task 1 and reused by later tasks. Route params use those same names.

**Risk notes:** Existing workspace is dirty across many files. Before executing, inspect current diffs in every touched file and preserve user changes. Do not run destructive git commands. If current edits already implement part of a task, adapt tests to current behavior instead of reverting.
