# Course Library Purchase Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Course Library, purchase, subscription recovery, and send-to-Robot flows transparent, parent-safe, and resilient across locked, checkout, offline, sync failed, running, and complete states.

**Architecture:** Keep commerce and sync decision logic in small pure view-model modules under `src/features/course-library/` and `src/features/purchase/`, then bind existing screens to those models. Do not add new backend calls until the matching OpenAPI routes exist; undocumented course catalog/send/sync routes are contract blockers, not places for invented endpoints. Screen work stays in sys-16 and uses existing React Native, navigation, design-system, Jest, and Testing Library patterns.

**Tech Stack:** React Native, TypeScript strict, React Navigation, existing design-system primitives, Jest, `@testing-library/react-native`, existing `src/services/http/client`.

---

## File Map

Create:
- `src/features/course-library/course-commerce-model.ts` — pure course entitlement, lock reason, CTA, and sync/readiness view models.
- `tests/course-library/course-commerce-model.test.ts` — unit coverage for state mapping and copy decisions.

Modify:
- `src/services/api/course-library.api.ts` — extend types and normalizers only; keep undocumented API functions failing explicitly until OpenAPI supports them.
- `src/services/api/account.ts` — add entitlement fields needed for expired/past-due recovery if backend payload already sends them.
- `src/features/course-library/components/courses.ts` — add fixture fields used by the new model.
- `src/features/course-library/components/CourseCard.tsx` — show full status/accessibility labels from model.
- `src/features/course-library/screens/CourseLibraryScreen.tsx` — route by model-derived action.
- `src/features/course-library/screens/CourseDetailScreen.tsx` — show entitlement and readiness preview.
- `src/features/course-library/screens/CourseLockedScreen.tsx` — data-driven lock reasons and safer course CTA.
- `src/features/course-library/screens/BuyCourseScreen.tsx` — plan copy, route params, and expired-subscription branch.
- `src/features/course-library/UnlockConfirmModal.tsx` — preserve `courseId`, show parent gate copy, handle unavailable unlock.
- `src/features/course-library/screens/SendToRobotScreen.tsx` — readiness check state copy.
- `src/features/course-library/screens/RobotReadyScreen.tsx` — readiness checklist.
- `src/features/course-library/screens/NeedsSyncScreen.tsx` — split offline, storage, entitlement, timeout states.
- `src/features/course-library/screens/RunningScreen.tsx` — no transcript/audio privacy copy stays visible.
- `src/features/course-library/screens/CompanionScreen.tsx` — no transcript/audio privacy copy stays visible.
- `src/features/course-library/screens/CourseAddedScreen.tsx` — queued/sync copy.
- `src/features/course-library/screens/CourseCompleteScreen.tsx` — pending-sync vs synced summary copy.
- `src/features/purchase/screens/SubscriptionsScreen.tsx` — expired/past-due recovery state.
- `tests/e2e/course-progress-stability.test.tsx` — screen regression coverage for course library and send/sync states.
- `tests/purchase/billing-screens.test.tsx` — subscription recovery and checkout transparency coverage.
- `migrate-ui-ux-to-mobile-app-docs/qa/ad-hoc/2026-05-14-course-library-purchase-flow-review.md` — append implementation evidence after code work.

Do not modify:
- `migrate-ui-ux-to-mobile-app-docs/api/openapi.json`
- BLE protocol files under `src/services/ble/`
- COPPA consent screens
- root `/Users/manhhodinh/Documents/TJBot/docs/`

## Task 1: Contract Gate And Model Tests

**Files:**
- Create: `tests/course-library/course-commerce-model.test.ts`
- Create: `src/features/course-library/course-commerce-model.ts`
- Modify: `src/services/api/course-library.api.ts`

- [ ] **Step 1: Confirm undocumented route blockers**

Run:

```bash
rg -n 'course|content|entitlement|sync|device' migrate-ui-ux-to-mobile-app-docs/api/openapi.json
```

Expected:
- If catalog/detail/send/sync endpoints are absent, keep `listLibrary`, `getCourseDetail`, `sendCourseToRobot`, and `getRobotSyncStatus` explicit failures.
- If endpoints are present, implement only documented paths and payloads.

- [ ] **Step 2: Write failing model tests**

Create `tests/course-library/course-commerce-model.test.ts`:

```typescript
import {
  buildCourseCardModel,
  buildCourseDetailModel,
  buildLockedCourseModel,
  buildSyncModel,
  type CommerceCourse,
  type RobotReadiness,
} from '@/features/course-library/course-commerce-model';

const baseCourse: CommerceCourse = {
  id: 'c_story',
  title: 'Story Time',
  level: 'Confident speaker',
  ages: '6-8',
  teaches: ['Story words', 'Past tense', 'Retelling'],
  lessons: 36,
  weeks: 9,
  completion: 0,
  entitlement: 'subscription',
  lockReason: 'skill_progression',
  syncState: 'not_queued',
};

describe('course commerce model', () => {
  it('explains locked courses without routing directly to checkout', () => {
    const model = buildLockedCourseModel(baseCourse);

    expect(model.title).toBe('Locked for now');
    expect(model.reasonEn).toContain('longer sentences');
    expect(model.reasonVi).toContain('câu dài hơn');
    expect(model.primaryAction.route).toBe('CourseDetailScreen');
    expect(model.secondaryAction.route).toBe('CourseLibraryScreen');
  });

  it('keeps expired subscription recoverable while preserving owned-course fallback', () => {
    const model = buildCourseDetailModel({
      ...baseCourse,
      lockReason: 'subscription_expired',
      entitlement: 'subscription_expired',
    });

    expect(model.primaryAction.label).toBe('Restore access');
    expect(model.secondaryAction.label).toBe('Use owned courses');
    expect(model.parentNoteEn).toContain('Owned courses still work');
  });

  it('maps course cards to explicit status and accessible labels', () => {
    const model = buildCourseCardModel({
      ...baseCourse,
      entitlement: 'owned',
      syncState: 'ready',
    });

    expect(model.statusLabel).toBe('Ready today');
    expect(model.accessibilityLabel).toBe('Open Story Time course, Ready today, ages 6-8');
  });

  it('requires all robot readiness checks before ready state', () => {
    const readiness: RobotReadiness = {
      online: true,
      batteryOk: true,
      wifiOk: true,
      storageOk: false,
      entitlementOk: true,
      packageReady: false,
    };

    const model = buildSyncModel('sync_failed_storage', readiness, baseCourse);

    expect(model.title).toBe('Robot needs more space');
    expect(model.primaryAction.label).toBe('Manage storage');
    expect(model.canStartLesson).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests and confirm failure**

Run:

```bash
npm test -- tests/course-library/course-commerce-model.test.ts --runInBand
```

Expected: FAIL because `course-commerce-model.ts` does not exist.

- [ ] **Step 4: Implement model types and pure builders**

Create `src/features/course-library/course-commerce-model.ts`:

```typescript
import { ROUTES } from '@/navigation/routes';

export type CourseEntitlement =
  | 'included'
  | 'free'
  | 'owned'
  | 'one_time_available'
  | 'subscription'
  | 'subscription_expired';

export type CourseLockReason =
  | 'none'
  | 'skill_progression'
  | 'age_fit'
  | 'prerequisite'
  | 'subscription_expired';

export type CourseSyncState =
  | 'not_queued'
  | 'queued'
  | 'checking_ready'
  | 'ready'
  | 'syncing'
  | 'sync_failed_offline'
  | 'sync_failed_storage'
  | 'sync_failed_entitlement'
  | 'sync_failed_timeout'
  | 'running'
  | 'complete_pending_sync'
  | 'complete_synced';

export interface CommerceCourse {
  id: string;
  title: string;
  level: string;
  ages: string;
  teaches: string[];
  lessons: number;
  weeks: number;
  completion: number;
  entitlement: CourseEntitlement;
  lockReason: CourseLockReason;
  syncState: CourseSyncState;
}

export interface RobotReadiness {
  online: boolean;
  batteryOk: boolean;
  wifiOk: boolean;
  storageOk: boolean;
  entitlementOk: boolean;
  packageReady: boolean;
}

export interface CourseAction {
  label: string;
  route: keyof typeof ROUTES;
}

export interface CourseCardModel {
  statusLabel: string;
  accessibilityLabel: string;
  primaryAction: CourseAction;
}

export interface CourseDetailModel {
  parentNoteEn: string;
  parentNoteVi: string;
  primaryAction: CourseAction;
  secondaryAction: CourseAction;
}

export interface LockedCourseModel {
  title: string;
  reasonEn: string;
  reasonVi: string;
  primaryAction: CourseAction;
  secondaryAction: CourseAction;
}

export interface SyncModel {
  title: string;
  bodyEn: string;
  bodyVi: string;
  primaryAction: CourseAction;
  secondaryAction: CourseAction;
  canStartLesson: boolean;
}

function route(name: keyof typeof ROUTES): keyof typeof ROUTES {
  return name;
}

export function buildCourseCardModel(course: CommerceCourse): CourseCardModel {
  const statusLabel = statusForCourse(course);
  const action = primaryActionForCourse(course);
  return {
    statusLabel,
    accessibilityLabel: `Open ${course.title} course, ${statusLabel}, ages ${course.ages}`,
    primaryAction: action,
  };
}

export function buildCourseDetailModel(course: CommerceCourse): CourseDetailModel {
  if (course.entitlement === 'subscription_expired' || course.lockReason === 'subscription_expired') {
    return {
      parentNoteEn: 'All Courses ended. Owned courses still work.',
      parentNoteVi: 'Gói All Courses đã hết hạn. Khóa đã sở hữu vẫn dùng được.',
      primaryAction: { label: 'Restore access', route: route('SubscriptionsScreen') },
      secondaryAction: { label: 'Use owned courses', route: route('CourseLibraryScreen') },
    };
  }

  return {
    parentNoteEn: 'This course is gentle daily play, not a test. We focus on warm, repeated practice.',
    parentNoteVi: 'Khóa học là luyện tập nhẹ mỗi ngày, không phải bài kiểm tra. Robot ưu tiên lặp lại ấm áp.',
    primaryAction: primaryActionForCourse(course),
    secondaryAction: { label: 'Back to library', route: route('CourseLibraryScreen') },
  };
}

export function buildLockedCourseModel(course: CommerceCourse): LockedCourseModel {
  if (course.lockReason === 'subscription_expired') {
    return {
      title: 'Locked for now',
      reasonEn: 'This course is paused because All Courses ended. Owned courses still work.',
      reasonVi: 'Khóa này tạm dừng vì gói All Courses đã hết hạn. Khóa đã sở hữu vẫn dùng được.',
      primaryAction: { label: 'Restore access', route: route('SubscriptionsScreen') },
      secondaryAction: { label: 'Back to library', route: route('CourseLibraryScreen') },
    };
  }

  return {
    title: 'Locked for now',
    reasonEn: lockReasonEn(course.lockReason),
    reasonVi: lockReasonVi(course.lockReason),
    primaryAction: { label: 'Try this first', route: route('CourseDetailScreen') },
    secondaryAction: { label: 'Back to library', route: route('CourseLibraryScreen') },
  };
}

export function buildSyncModel(
  state: CourseSyncState,
  readiness: RobotReadiness,
  course: CommerceCourse,
): SyncModel {
  if (state === 'sync_failed_storage' || !readiness.storageOk) {
    return {
      title: 'Robot needs more space',
      bodyEn: 'Robot needs more space before this course can sync.',
      bodyVi: 'Robot cần thêm bộ nhớ trước khi đồng bộ khóa này.',
      primaryAction: { label: 'Manage storage', route: route('RobotStorageScreen') },
      secondaryAction: { label: 'Back to library', route: route('CourseLibraryScreen') },
      canStartLesson: false,
    };
  }

  if (state === 'sync_failed_entitlement' || !readiness.entitlementOk) {
    return {
      title: 'Course access needed',
      bodyEn: 'This course needs active access before it can sync.',
      bodyVi: 'Khóa này cần quyền truy cập hợp lệ trước khi đồng bộ.',
      primaryAction: { label: 'Restore access', route: route('SubscriptionsScreen') },
      secondaryAction: { label: 'Use owned courses', route: route('CourseLibraryScreen') },
      canStartLesson: false,
    };
  }

  if (state === 'sync_failed_offline' || !readiness.online || !readiness.wifiOk) {
    return {
      title: 'Robot is offline',
      bodyEn: 'Robot is offline. We will send this when Robot is back on Wi-Fi.',
      bodyVi: 'Robot đang ngoại tuyến. Nội dung sẽ được gửi khi Robot có Wi-Fi lại.',
      primaryAction: { label: 'Retry sync', route: route('NeedsSyncScreen') },
      secondaryAction: { label: 'Later', route: route('DeviceHomeScreen') },
      canStartLesson: false,
    };
  }

  const canStartLesson = readiness.online
    && readiness.batteryOk
    && readiness.wifiOk
    && readiness.storageOk
    && readiness.entitlementOk
    && readiness.packageReady;

  return {
    title: canStartLesson ? 'Robot is ready' : `${course.title} is queued`,
    bodyEn: canStartLesson
      ? 'Lesson loaded. Battery, Wi-Fi, and storage look ready.'
      : 'We will finish sending this when Robot is ready.',
    bodyVi: canStartLesson
      ? 'Bài học đã sẵn sàng. Pin, Wi-Fi và bộ nhớ đều ổn.'
      : 'Ứng dụng sẽ gửi xong khi Robot sẵn sàng.',
    primaryAction: { label: canStartLesson ? 'Hand it to your child' : 'Retry sync', route: route(canStartLesson ? 'RunningScreen' : 'NeedsSyncScreen') },
    secondaryAction: { label: 'Pick a different lesson', route: route('SendToRobotScreen') },
    canStartLesson,
  };
}

function primaryActionForCourse(course: CommerceCourse): CourseAction {
  if (course.lockReason !== 'none') return { label: 'See why locked', route: route('CourseLockedScreen') };
  if (course.syncState === 'ready') return { label: 'Start lesson', route: route('RobotReadyScreen') };
  if (course.entitlement === 'owned' || course.entitlement === 'included' || course.entitlement === 'free') {
    return { label: 'Send to Robot', route: route('SendToRobotScreen') };
  }
  if (course.entitlement === 'one_time_available') return { label: 'Buy this course', route: route('BuyCourseScreen') };
  if (course.entitlement === 'subscription') return { label: 'Choose course plan', route: route('BuyCourseScreen') };
  return { label: 'Restore access', route: route('SubscriptionsScreen') };
}

function statusForCourse(course: CommerceCourse): string {
  if (course.lockReason !== 'none') return 'Locked';
  if (course.syncState === 'ready') return 'Ready today';
  if (course.syncState.startsWith('sync_failed')) return 'Needs sync';
  if (course.syncState === 'complete_synced') return 'Completed';
  if (course.entitlement === 'owned' || course.entitlement === 'included' || course.entitlement === 'free') return 'On Robot';
  return 'Available';
}

function lockReasonEn(reason: CourseLockReason): string {
  if (reason === 'age_fit') return 'This course is designed for older learners. Try the starter course first.';
  if (reason === 'prerequisite') return 'Finish the recommended course first so Robot can build on words your child knows.';
  return 'This course uses longer sentences. Robot will suggest it after your child practices the basics.';
}

function lockReasonVi(reason: CourseLockReason): string {
  if (reason === 'age_fit') return 'Khóa này dành cho bé lớn hơn. Hãy thử khóa khởi đầu trước.';
  if (reason === 'prerequisite') return 'Hãy hoàn thành khóa được gợi ý trước để Robot dựa trên từ bé đã biết.';
  return 'Khóa này dùng câu dài hơn. Robot sẽ gợi ý sau khi bé luyện phần cơ bản.';
}
```

- [ ] **Step 5: Extend API types without inventing endpoints**

Update `src/services/api/course-library.api.ts` types:

```typescript
export type CourseLockReason =
  | 'none'
  | 'skill_progression'
  | 'age_fit'
  | 'prerequisite'
  | 'subscription_expired';

export type CourseEntitlement =
  | 'included'
  | 'free'
  | 'owned'
  | 'one_time_available'
  | 'subscription'
  | 'subscription_expired';

export type CourseSyncState =
  | 'not_queued'
  | 'queued'
  | 'checking_ready'
  | 'ready'
  | 'syncing'
  | 'sync_failed_offline'
  | 'sync_failed_storage'
  | 'sync_failed_entitlement'
  | 'sync_failed_timeout'
  | 'running'
  | 'complete_pending_sync'
  | 'complete_synced';
```

Add these fields to `LibraryItem`, `CourseDetail`, and `RobotSyncStatus`:

```typescript
lockReason: CourseLockReason;
entitlement: CourseEntitlement;
syncState: CourseSyncState;
```

Extend normalizers by reading snake_case and camelCase fields, defaulting to safe values:

```typescript
function asLockReason(value: unknown): CourseLockReason {
  const allowed: readonly CourseLockReason[] = ['none', 'skill_progression', 'age_fit', 'prerequisite', 'subscription_expired'];
  return typeof value === 'string' && allowed.includes(value as CourseLockReason) ? value as CourseLockReason : 'none';
}

function asEntitlement(value: unknown, owned: boolean): CourseEntitlement {
  const allowed: readonly CourseEntitlement[] = ['included', 'free', 'owned', 'one_time_available', 'subscription', 'subscription_expired'];
  if (typeof value === 'string' && allowed.includes(value as CourseEntitlement)) return value as CourseEntitlement;
  return owned ? 'owned' : 'one_time_available';
}

function asSyncState(value: unknown, synced: boolean): CourseSyncState {
  const allowed: readonly CourseSyncState[] = [
    'not_queued',
    'queued',
    'checking_ready',
    'ready',
    'syncing',
    'sync_failed_offline',
    'sync_failed_storage',
    'sync_failed_entitlement',
    'sync_failed_timeout',
    'running',
    'complete_pending_sync',
    'complete_synced',
  ];
  if (typeof value === 'string' && allowed.includes(value as CourseSyncState)) return value as CourseSyncState;
  return synced ? 'ready' : 'not_queued';
}
```

- [ ] **Step 6: Run model tests**

Run:

```bash
npm test -- tests/course-library/course-commerce-model.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 7: Commit Task 1**

```bash
git add src/features/course-library/course-commerce-model.ts src/services/api/course-library.api.ts tests/course-library/course-commerce-model.test.ts
git commit -m "feat(course-library): model course commerce states

Constraint: mobile owns UX projection only; undocumented catalog/send/sync endpoints remain explicit blockers
Confidence: high
Scope-risk: narrow
Directive: do not replace explicit API blockers with guessed endpoints
Tested: npm test -- tests/course-library/course-commerce-model.test.ts --runInBand"
```

## Task 2: Bind Course Library, Detail, Locked, And Buy Screens

**Files:**
- Modify: `src/features/course-library/components/courses.ts`
- Modify: `src/features/course-library/components/CourseCard.tsx`
- Modify: `src/features/course-library/screens/CourseLibraryScreen.tsx`
- Modify: `src/features/course-library/screens/CourseDetailScreen.tsx`
- Modify: `src/features/course-library/screens/CourseLockedScreen.tsx`
- Modify: `src/features/course-library/screens/BuyCourseScreen.tsx`
- Modify: `src/features/course-library/UnlockConfirmModal.tsx`
- Modify: `tests/e2e/course-progress-stability.test.tsx`

- [ ] **Step 1: Add failing screen tests**

Append to `tests/e2e/course-progress-stability.test.tsx`:

```typescript
it('explains locked courses with a reason before parent unlock', () => {
  const locked = render(
    <CourseLockedScreen
      navigation={navigation as never}
      route={{ key: 'locked', name: ROUTES.CourseLockedScreen, params: { courseId: 'c_stories' } } as never}
    />,
  );

  expect(locked.getByText('Locked for now')).toBeTruthy();
  expect(locked.getByText(/longer sentences|older learners|recommended course/i)).toBeTruthy();
  expect(locked.getByText('Try this first')).toBeTruthy();
  expect(locked.getByText('Parent unlock')).toBeTruthy();
});

it('shows non-coercive buy choices and preserves selected course id', () => {
  const buy = render(
    <BuyCourseScreen
      navigation={navigation as never}
      route={{ key: 'buy', name: ROUTES.BuyCourseScreen, params: { courseId: 'c_food' } } as never}
    />,
  );

  expect(buy.getByText('Own this course forever. No subscription.')).toBeTruthy();
  expect(buy.getByText(/Trial ends|7-day free trial/i)).toBeTruthy();
  expect(buy.getByText('Not now')).toBeTruthy();

  fireEvent.press(buy.getByText('Confirm & continue'));
  expect(mockNavigate).toHaveBeenCalledWith(ROUTES.UnlockConfirmScreen, { courseId: 'c_food' });
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run:

```bash
npm test -- tests/e2e/course-progress-stability.test.tsx --runInBand
```

Expected: FAIL on missing updated copy and labels.

- [ ] **Step 3: Extend local fixture shape**

Update `src/features/course-library/components/courses.ts`:

```typescript
import type {
  CourseEntitlement,
  CourseLockReason,
  CourseSyncState,
} from '../course-commerce-model';

export type CourseState = 'installed' | 'not_installed' | 'locked';

export type Course = {
  id: string;
  title: string;
  level: string;
  ages: string;
  teaches: string[];
  lessons: number;
  weeks: number;
  state: CourseState;
  completion: number;
  lcd: string;
  blurb: string;
  entitlement: CourseEntitlement;
  lockReason: CourseLockReason;
  syncState: CourseSyncState;
};
```

Set existing fixtures:
- `c_hello`: `entitlement: 'included'`, `lockReason: 'none'`, `syncState: 'complete_synced'`
- `c_animals`: `entitlement: 'owned'`, `lockReason: 'none'`, `syncState: 'ready'`
- `c_food`: `entitlement: 'one_time_available'`, `lockReason: 'none'`, `syncState: 'not_queued'`
- `c_outside`: `entitlement: 'subscription'`, `lockReason: 'skill_progression'`, `syncState: 'not_queued'`
- `c_stories`: `entitlement: 'subscription'`, `lockReason: 'skill_progression'`, `syncState: 'not_queued'`

- [ ] **Step 4: Bind `CourseCard` to model labels**

In `CourseCard.tsx`, import and use `buildCourseCardModel`:

```typescript
import { buildCourseCardModel } from '../course-commerce-model';
```

Inside component:

```typescript
const model = buildCourseCardModel(course);
```

Set `TouchableOpacity` props:

```tsx
<TouchableOpacity
  onPress={onClick}
  style={[styles.card, { opacity: course.state === 'locked' ? 0.85 : 1 }]}
  activeOpacity={0.8}
  accessibilityRole="button"
  accessibilityLabel={model.accessibilityLabel}
>
```

Render visible status text by passing local mapped state to `CLChip` until `CLChip` accepts all model statuses:

```tsx
<CLChip state={course.state} />
<Text style={styles.statusText}>{model.statusLabel}</Text>
```

Add style:

```typescript
statusText: { fontSize: 11, color: CL.ink3 },
```

- [ ] **Step 5: Route `CourseLibraryScreen` through model action**

Replace ad-hoc routing with model-derived routing:

```typescript
function navigateForCourse(course: Course, navigation: Props['navigation']): void {
  const model = buildCourseCardModel(course);
  navigation.navigate(ROUTES[model.primaryAction.route], { courseId: course.id });
}
```

If TypeScript rejects route param inference, keep route-specific branches but derive branch values from `model.primaryAction.route`:

```typescript
if (model.primaryAction.route === 'CourseLockedScreen') {
  navigation.navigate(ROUTES.CourseLockedScreen, { courseId: course.id });
  return;
}
```

- [ ] **Step 6: Update `CourseDetailScreen` copy and CTAs**

Find selected course from `route.params?.courseId`, then build detail model:

```typescript
const courseId = route.params?.courseId ?? 'c_food';
const c = COURSES.find(course => course.id === courseId) ?? COURSES[2]!;
const model = buildCourseDetailModel(c);
```

Replace static parent note with `model.parentNoteEn`.

Primary CTA:

```tsx
<DeviceBigBtn onClick={() => navigation.navigate(ROUTES[model.primaryAction.route], { courseId: c.id })}>
  {model.primaryAction.label}
</DeviceBigBtn>
```

Secondary CTA:

```tsx
<DeviceBigBtn secondary onClick={() => navigation.navigate(ROUTES.CourseLibraryScreen)}>
  {model.secondaryAction.label}
</DeviceBigBtn>
```

- [ ] **Step 7: Update `CourseLockedScreen` with data-driven reasons**

Use:

```typescript
const courseId = route.params?.courseId ?? 'c_stories';
const c = COURSES.find(course => course.id === courseId) ?? COURSES[4]!;
const model = buildLockedCourseModel(c);
```

Render:

```tsx
<Text fontWeight="600" style={styles.whyTitle}>Why is this locked?</Text>
<Text style={styles.whyBody}>{model.reasonEn}</Text>
```

Button labels:

```tsx
<DeviceBigBtn onClick={() => navigation.navigate(ROUTES.CourseDetailScreen, { courseId: 'c_hello' })}>
  {model.primaryAction.label}
</DeviceBigBtn>
<DeviceBigBtn secondary onClick={() => navigation.navigate(ROUTES.UnlockConfirmScreen, { courseId: c.id })}>
  Parent unlock
</DeviceBigBtn>
```

- [ ] **Step 8: Update `BuyCourseScreen` copy and route params**

Read `courseId`:

```typescript
const courseId = route.params?.courseId ?? 'c_food';
const c = COURSES.find(course => course.id === courseId) ?? COURSES[2]!;
```

Update one-time plan body:

```typescript
body: `${c.title} only. Own this course forever. No subscription.`,
```

Confirm navigation:

```typescript
navigation.navigate(ROUTES.UnlockConfirmScreen, { courseId: c.id });
```

Not now accessibility label:

```tsx
<TouchableOpacity
  onPress={() => navigation.navigate(ROUTES.CourseDetailScreen, { courseId: c.id })}
  style={styles.notNow}
  activeOpacity={0.7}
  accessibilityRole="button"
  accessibilityLabel="Skip adding this course now"
>
```

- [ ] **Step 9: Preserve params in `UnlockConfirmModal` back path**

Update back handler:

```tsx
<DeviceShell
  title="Quick parent check"
  onBack={() => navigation.navigate(ROUTES.BuyCourseScreen, courseId ? { courseId } : undefined)}
>
```

Use button text:

```tsx
{ok ? 'Parent unlock' : filled ? 'Try again' : 'Enter the number'}
```

- [ ] **Step 10: Run focused tests**

Run:

```bash
npm test -- tests/e2e/course-progress-stability.test.tsx --runInBand
npm test -- tests/course-library/course-commerce-model.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 11: Commit Task 2**

```bash
git add src/features/course-library tests/e2e/course-progress-stability.test.tsx tests/course-library/course-commerce-model.test.ts
git commit -m "feat(course-library): explain course access states

Constraint: parent purchase path must avoid dark patterns and preserve course id through modal handoffs
Confidence: medium
Scope-risk: moderate
Directive: keep locked explanations data-driven; do not hardcode one course reason
Tested: npm test -- tests/e2e/course-progress-stability.test.tsx --runInBand; npm test -- tests/course-library/course-commerce-model.test.ts --runInBand"
```

## Task 3: Add Expired Subscription Recovery

**Files:**
- Modify: `src/services/api/account.ts`
- Modify: `src/features/purchase/screens/SubscriptionsScreen.tsx`
- Modify: `tests/api/account-entitlements.test.ts`
- Modify: `tests/purchase/billing-screens.test.tsx`

- [ ] **Step 1: Add failing entitlement normalization test**

Append to `tests/api/account-entitlements.test.ts`:

```typescript
it('normalizes expired subscription recovery fields', async () => {
  jest.resetModules();
  const get = jest.fn().mockResolvedValueOnce({
    data: {
      data: {
        courses: ['hello-friends'],
        subscription_status: 'past_due',
        robot_activated: true,
        recovery_url: 'https://billing.example/recover',
        renewal_notice_at: '2026-05-16T10:00:00Z',
      },
    },
  });

  jest.doMock('@/services/http/client', () => ({
    __esModule: true,
    default: { get },
  }));

  const { refreshEntitlementsAfterPurchase } = require('@/services/api/account') as typeof import('@/services/api/account');

  await expect(refreshEntitlementsAfterPurchase()).resolves.toEqual({
    courses: ['hello-friends'],
    subscriptionStatus: 'past_due',
    robotActivated: true,
    recoveryUrl: 'https://billing.example/recover',
    renewalNoticeAt: '2026-05-16T10:00:00Z',
  });
});
```

- [ ] **Step 2: Add failing subscription screen recovery test**

Append to `tests/purchase/billing-screens.test.tsx`:

```typescript
it('shows expired subscription recovery without blocking owned courses', async () => {
  mockedGetBillingProviderStatus.mockResolvedValueOnce({
    providerAvailable: true,
    message: null,
  });
  mockedRefreshEntitlements.mockResolvedValueOnce({
    courses: ['hello-friends'],
    subscriptionStatus: 'past_due',
    robotActivated: true,
    recoveryUrl: 'https://billing.example/recover',
    renewalNoticeAt: '2026-05-16T10:00:00Z',
  });

  const navigation = navigationFor();
  render(<SubscriptionsScreen navigation={navigation as never} route={{ key: 'subs', name: ROUTES.SubscriptionsScreen } as never} />);

  await screen.findByText('All Courses needs attention');
  expect(screen.getByText('Owned courses still work.')).toBeTruthy();
  expect(screen.getByText('Update payment')).toBeTruthy();
  expect(screen.getByText('Use owned courses')).toBeTruthy();
});
```

- [ ] **Step 3: Run tests and confirm failure**

Run:

```bash
npm test -- tests/api/account-entitlements.test.ts tests/purchase/billing-screens.test.tsx --runInBand
```

Expected: FAIL because entitlement type lacks recovery fields and screen does not render recovery state.

- [ ] **Step 4: Extend account entitlement type**

Update `src/services/api/account.ts`:

```typescript
export interface AccountEntitlements {
  courses: string[];
  subscriptionStatus: 'none' | 'trialing' | 'active' | 'past_due' | 'cancelled';
  robotActivated: boolean;
  recoveryUrl: string | null;
  renewalNoticeAt: string | null;
}
```

Add helper:

```typescript
function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}
```

Return:

```typescript
return {
  courses,
  subscriptionStatus,
  robotActivated: 'robot_activated' in data && data.robot_activated === true,
  recoveryUrl: 'recovery_url' in data ? stringOrNull(data.recovery_url) : null,
  renewalNoticeAt: 'renewal_notice_at' in data ? stringOrNull(data.renewal_notice_at) : null,
};
```

Update existing tests to expect `recoveryUrl: null` and `renewalNoticeAt: null`.

- [ ] **Step 5: Load entitlements in `SubscriptionsScreen`**

Import:

```typescript
import { refreshEntitlementsAfterPurchase, type AccountEntitlements } from '@/services/api/account';
```

Add state:

```typescript
const [entitlements, setEntitlements] = React.useState<AccountEntitlements | null>(null);
```

In existing provider load effect, also refresh entitlements:

```typescript
void refreshEntitlementsAfterPurchase()
  .then(setEntitlements)
  .catch(() => {
    setEntitlements(null);
  });
```

Render recovery card before normal manage billing card when `subscriptionStatus` is `past_due` or `cancelled`:

```tsx
{entitlements?.subscriptionStatus === 'past_due' || entitlements?.subscriptionStatus === 'cancelled' ? (
  <Box style={styles.billingCard}>
    <Text fontWeight="700" style={styles.billingTitle}>All Courses needs attention</Text>
    <Text style={styles.billingBody}>Owned courses still work.</Text>
    <DeviceBigBtn onClick={() => setActionMessage('Open billing recovery from account settings.')}>
      Update payment
    </DeviceBigBtn>
    <DeviceBigBtn secondary onClick={() => navigation.navigate(ROUTES.CourseLibraryScreen)}>
      Use owned courses
    </DeviceBigBtn>
  </Box>
) : null}
```

- [ ] **Step 6: Run focused tests**

Run:

```bash
npm test -- tests/api/account-entitlements.test.ts tests/purchase/billing-screens.test.tsx --runInBand
```

Expected: PASS.

- [ ] **Step 7: Commit Task 3**

```bash
git add src/services/api/account.ts src/features/purchase/screens/SubscriptionsScreen.tsx tests/api/account-entitlements.test.ts tests/purchase/billing-screens.test.tsx
git commit -m "feat(purchase): recover expired course subscriptions

Constraint: expired subscriptions must not block owned courses
Confidence: medium
Scope-risk: moderate
Directive: preserve owned-course fallback in all subscription recovery UI
Tested: npm test -- tests/api/account-entitlements.test.ts tests/purchase/billing-screens.test.tsx --runInBand"
```

## Task 4: Split Send And Sync Failure States

**Files:**
- Modify: `src/features/course-library/screens/SendToRobotScreen.tsx`
- Modify: `src/features/course-library/screens/RobotReadyScreen.tsx`
- Modify: `src/features/course-library/screens/NeedsSyncScreen.tsx`
- Modify: `src/features/course-library/screens/CourseAddedScreen.tsx`
- Modify: `src/features/course-library/screens/RunningScreen.tsx`
- Modify: `src/features/course-library/screens/CompanionScreen.tsx`
- Modify: `src/features/course-library/screens/CourseCompleteScreen.tsx`
- Modify: `tests/e2e/course-progress-stability.test.tsx`

- [ ] **Step 1: Add failing sync screen tests**

Append:

```typescript
it('shows robot readiness checklist before starting a lesson', () => {
  const ready = render(<RobotReadyScreen navigation={navigation as never} route={route as never} />);

  expect(ready.getByText('Battery')).toBeTruthy();
  expect(ready.getByText('Wi-Fi')).toBeTruthy();
  expect(ready.getByText('Storage')).toBeTruthy();
  expect(ready.getByText('Course access')).toBeTruthy();
  expect(ready.getByText('Lesson package')).toBeTruthy();
});

it('shows storage and entitlement sync recovery without losing course context', () => {
  const storage = render(
    <NeedsSyncScreen
      navigation={navigation as never}
      route={{ key: 'needs-sync', name: ROUTES.NeedsSyncScreen, params: { courseId: 'c_food', syncState: 'sync_failed_storage' } } as never}
    />,
  );

  expect(storage.getByText('Robot needs more space')).toBeTruthy();
  expect(storage.getByText('Manage storage')).toBeTruthy();
  storage.unmount();

  const entitlement = render(
    <NeedsSyncScreen
      navigation={navigation as never}
      route={{ key: 'needs-sync', name: ROUTES.NeedsSyncScreen, params: { courseId: 'c_food', syncState: 'sync_failed_entitlement' } } as never}
    />,
  );

  expect(entitlement.getByText('Course access needed')).toBeTruthy();
  expect(entitlement.getByText('Restore access')).toBeTruthy();
});

it('keeps running and companion screens transcript-free', () => {
  const running = render(<RunningScreen navigation={navigation as never} route={route as never} />);
  expect(running.getByText(/Audio is never saved/i)).toBeTruthy();
  running.unmount();

  const companion = render(<CompanionScreen navigation={navigation as never} route={route as never} />);
  expect(companion.getByText(/No transcript/i)).toBeTruthy();
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run:

```bash
npm test -- tests/e2e/course-progress-stability.test.tsx --runInBand
```

Expected: FAIL on missing readiness and split sync states.

- [ ] **Step 3: Update `RobotReadyScreen` checklist**

Replace readiness rows with:

```typescript
const READINESS_ROWS = [
  { ic: '🔋', t: 'Battery', v: 'Ready or charging', good: true },
  { ic: '📶', t: 'Wi-Fi', v: 'Connected', good: true },
  { ic: '💾', t: 'Storage', v: 'Enough space', good: true },
  { ic: '🔐', t: 'Course access', v: 'Active', good: true },
  { ic: '📚', t: 'Lesson package', v: 'Downloaded', good: true },
] as const;
```

- [ ] **Step 4: Update `NeedsSyncScreen` to use sync model**

Read params:

```typescript
const courseId = route.params?.courseId ?? 'c_food';
const syncState = route.params?.syncState ?? 'sync_failed_offline';
const course = COURSES.find(item => item.id === courseId) ?? COURSES[2]!;
const readiness = readinessForSyncState(syncState);
const model = buildSyncModel(syncState, readiness, course);
```

Add local helper:

```typescript
function readinessForSyncState(syncState: CourseSyncState): RobotReadiness {
  return {
    online: syncState !== 'sync_failed_offline',
    batteryOk: true,
    wifiOk: syncState !== 'sync_failed_offline',
    storageOk: syncState !== 'sync_failed_storage',
    entitlementOk: syncState !== 'sync_failed_entitlement',
    packageReady: syncState === 'ready',
  };
}
```

Render `model.title`, `model.bodyEn`, `model.primaryAction.label`, and `model.secondaryAction.label`.

- [ ] **Step 5: Keep privacy copy visible**

Verify `RunningScreen` still renders:

```tsx
<Text fontWeight="600" style={{ color: CL.ink }}>Audio is never saved.</Text>
```

Verify `CompanionScreen` still renders:

```tsx
<Text fontWeight="600" style={{ color: CL.ink }}>No transcript</Text>
```

If copy is nested and hard to query, add a plain adjacent `Text` node while preserving visual style:

```tsx
<Text style={styles.privacyLine}>No transcript. Audio is not saved.</Text>
```

- [ ] **Step 6: Run focused tests**

Run:

```bash
npm test -- tests/e2e/course-progress-stability.test.tsx --runInBand
npm test -- tests/course-library/course-commerce-model.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 7: Commit Task 4**

```bash
git add src/features/course-library tests/e2e/course-progress-stability.test.tsx tests/course-library/course-commerce-model.test.ts
git commit -m "feat(course-library): split robot sync recovery states

Constraint: send-to-robot must show readiness and preserve queued course context
Confidence: medium
Scope-risk: moderate
Directive: keep offline, storage, and entitlement failures separate in UI
Tested: npm test -- tests/e2e/course-progress-stability.test.tsx --runInBand; npm test -- tests/course-library/course-commerce-model.test.ts --runInBand"
```

## Task 5: Checkout Transparency Regression Pass

**Files:**
- Modify: `src/features/purchase/screens/CheckoutScreen.tsx`
- Modify: `src/features/purchase/screens/PrivacyScreen.tsx`
- Modify: `tests/purchase/billing-screens.test.tsx`

- [ ] **Step 1: Add failing copy tests**

Append:

```typescript
it('shows checkout total, return, warranty, and renewal notice before placing order', () => {
  const navigation = navigationFor();
  render(<CheckoutScreen navigation={navigation as never} route={{ key: 'checkout', name: ROUTES.CheckoutScreen } as never} />);

  expect(screen.getByText("Today's total")).toBeTruthy();
  expect(screen.getByText('$149.00')).toBeTruthy();
  expect(screen.getByText(/30-day return/i)).toBeTruthy();
  expect(screen.getByText(/no auto-renew without notice/i)).toBeTruthy();
  expect(screen.getByText(/Subscription begins after free trial/i)).toBeTruthy();
});

it('shows short privacy trust copy before checkout', () => {
  const navigation = navigationFor();
  render(<PrivacyScreen navigation={navigation as never} route={{ key: 'privacy', name: ROUTES.PrivacyScreen } as never} />);

  expect(screen.getByText("Your child's voice stays your child's")).toBeTruthy();
  expect(screen.getByText('No ads, ever')).toBeTruthy();
  expect(screen.getByText('Parent-only purchases')).toBeTruthy();
});
```

- [ ] **Step 2: Run tests and confirm current behavior**

Run:

```bash
npm test -- tests/purchase/billing-screens.test.tsx --runInBand
```

Expected: PASS if existing copy already satisfies tests; otherwise FAIL with missing copy.

- [ ] **Step 3: Repair copy only if tests fail**

If privacy legal copy uses long or overclaiming text, replace row bodies with:

```typescript
const ROWS = [
  { ic: '🚫', t: 'No ads, ever', b: 'Robot never shows or hints at advertising.' },
  { ic: '🔒', t: 'Parent-only purchases', b: 'Buying Robot, adding courses, or upgrading always requires a parent step.' },
  { ic: '📉', t: 'Short lesson data only', b: 'We keep short lesson data so Robot knows what to practice next.' },
] as const;
```

If checkout legal copy is missing, add:

```tsx
<Text style={styles.legalNote}>30-day return · 2-year warranty · no auto-renew without notice</Text>
```

- [ ] **Step 4: Run focused tests**

Run:

```bash
npm test -- tests/purchase/billing-screens.test.tsx --runInBand
```

Expected: PASS.

- [ ] **Step 5: Commit Task 5**

```bash
git add src/features/purchase/screens/CheckoutScreen.tsx src/features/purchase/screens/PrivacyScreen.tsx tests/purchase/billing-screens.test.tsx
git commit -m "test(purchase): lock checkout transparency copy

Constraint: checkout must show total and renewal terms before payment
Confidence: high
Scope-risk: narrow
Directive: keep purchase copy short and parent-only
Tested: npm test -- tests/purchase/billing-screens.test.tsx --runInBand"
```

## Task 6: Documentation Evidence And Validation

**Files:**
- Modify: `migrate-ui-ux-to-mobile-app-docs/qa/ad-hoc/2026-05-14-course-library-purchase-flow-review.md`

- [ ] **Step 1: Append implementation evidence**

Append:

```markdown
## Implementation Evidence

Changed files:
- `src/features/course-library/course-commerce-model.ts`
- `src/services/api/course-library.api.ts`
- `src/services/api/account.ts`
- `src/features/course-library/**`
- `src/features/purchase/screens/SubscriptionsScreen.tsx`
- `src/features/purchase/screens/CheckoutScreen.tsx`
- `src/features/purchase/screens/PrivacyScreen.tsx`
- `tests/course-library/course-commerce-model.test.ts`
- `tests/e2e/course-progress-stability.test.tsx`
- `tests/purchase/billing-screens.test.tsx`
- `tests/api/account-entitlements.test.ts`

Verification:
- `npm test -- tests/course-library/course-commerce-model.test.ts --runInBand`
- `npm test -- tests/e2e/course-progress-stability.test.tsx --runInBand`
- `npm test -- tests/purchase/billing-screens.test.tsx --runInBand`
- `npm test -- tests/api/account-entitlements.test.ts --runInBand`
- `npx tsc --noEmit`
- `npm run lint`
```

- [ ] **Step 2: Run required gates**

Run:

```bash
npm test -- tests/course-library/course-commerce-model.test.ts --runInBand
npm test -- tests/e2e/course-progress-stability.test.tsx --runInBand
npm test -- tests/purchase/billing-screens.test.tsx --runInBand
npm test -- tests/api/account-entitlements.test.ts --runInBand
npx tsc --noEmit
npm run lint
```

Expected: all exit 0.

- [ ] **Step 3: Run PR validators if branch phase requires them**

Run:

```bash
npm run flows:validate
npm run sequences:fast
npm run erd:validate
npm run usecases:check
npm run check:route-coverage
npm run check:screen-prop-types
```

Expected: all exit 0 with non-zero file counts or explicit pass summaries. Silent green is failure.

- [ ] **Step 4: Commit Task 6**

```bash
git add migrate-ui-ux-to-mobile-app-docs/qa/ad-hoc/2026-05-14-course-library-purchase-flow-review.md
git commit -m "docs(course-library): record commerce flow validation

Constraint: docs must capture implementation evidence for sys-16 flow changes
Confidence: high
Scope-risk: narrow
Directive: keep QA artifact aligned with changed tests and screens
Tested: npm test -- tests/course-library/course-commerce-model.test.ts --runInBand; npm test -- tests/e2e/course-progress-stability.test.tsx --runInBand; npm test -- tests/purchase/billing-screens.test.tsx --runInBand; npm test -- tests/api/account-entitlements.test.ts --runInBand; npx tsc --noEmit; npm run lint"
```

## Final Verification Checklist

- [ ] `npm test -- tests/course-library/course-commerce-model.test.ts --runInBand` exits 0.
- [ ] `npm test -- tests/e2e/course-progress-stability.test.tsx --runInBand` exits 0.
- [ ] `npm test -- tests/purchase/billing-screens.test.tsx --runInBand` exits 0.
- [ ] `npm test -- tests/api/account-entitlements.test.ts --runInBand` exits 0.
- [ ] `npx tsc --noEmit` exits 0.
- [ ] `npm run lint` exits 0.
- [ ] Doc validators required by current PR phase exit 0 and are not silent.
- [ ] No type suppressions or placeholder production comments added.
- [ ] No API endpoint invented outside OpenAPI.
- [ ] No BLE protocol or COPPA legal copy changed.

## Self-Review Notes

Spec coverage:
- Commerce flow map: Tasks 2, 3, 4, 5.
- Course card/detail spec: Tasks 1 and 2.
- Locked/buy/checkout matrix: Tasks 2, 3, 5.
- Sync-to-robot states: Tasks 1 and 4.
- EN + VI copy: Tasks 1, 2, 4, 5.
- Acceptance tests: Tasks 1 through 6.

Known blocker:
- Real catalog/detail/send/sync network behavior depends on documented backend/OpenAPI routes. Until those routes exist, implementation must keep explicit contract failures and test local view-model/screen behavior only.
