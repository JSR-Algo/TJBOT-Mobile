import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ROUTES } from '@/navigation/routes';
import CourseScreen from '../../src/features/course/screens/CourseScreen';
import LessonListScreen from '../../src/features/course/screens/LessonListScreen';
import CourseLibraryScreen from '../../src/features/course-library/screens/CourseLibraryScreen';
import UnlockConfirmModal from '../../src/features/course-library/UnlockConfirmModal';
import CourseDetailScreen from '../../src/features/course-library/screens/CourseDetailScreen';
import BuyCourseScreen from '../../src/features/course-library/screens/BuyCourseScreen';
import SubscriptionsScreen from '../../src/features/purchase/screens/SubscriptionsScreen';
import CelebrationScreen from '../../src/features/progress/screens/CelebrationScreen';
import LessonSummaryScreen from '../../src/features/progress/screens/LessonSummaryScreen';
import ReviewNeededScreen from '../../src/features/progress/screens/ReviewNeededScreen';
import TodayProgressScreen from '../../src/features/progress/screens/TodayProgressScreen';
import WordsPracticedScreen from '../../src/features/progress/screens/WordsPracticedScreen';
import {
  listCourseCatalog,
  getLessonList,
} from '../../src/services/api/course.api';
import {
  listLibrary,
  unlockCourse,
} from '../../src/services/api/course-library.api';
import { getChildLessonProgress, type AssignmentProgress } from '../../src/services/api/progress.api';
import { useHousehold } from '@/contexts/HouseholdContext';
import { getBillingProviderStatus } from '../../src/services/api/purchase.api';
import { setAppLanguage } from '../../src/services/i18n/i18n';

jest.mock('@/config/feature-flags', () => ({
  __esModule: true,
  FEATURE_SUBSCRIPTION: true,
  isSubscriptionFeatureEnabled: () => true,
  FEATURE_SUBSCRIPTION_DISABLED_CODE: 'FEATURE_SUBSCRIPTION_DISABLED',
  FeatureSubscriptionDisabledError: class FeatureSubscriptionDisabledError extends Error {
    readonly code = 'FEATURE_SUBSCRIPTION_DISABLED';
    constructor(operation: string) {
      super(`FEATURE_SUBSCRIPTION_DISABLED: ${operation} is disabled in this build`);
      this.name = 'FeatureSubscriptionDisabledError';
    }
  },
}));

jest.mock('../../src/services/api/course.api', () => ({
  listCourseCatalog: jest.fn(),
  getLessonList: jest.fn(),
}));

jest.mock('../../src/services/api/course-library.api', () => ({
  listLibrary: jest.fn(),
  unlockCourse: jest.fn(),
  // P4: CourseDetailScreen overlays the published catalog onto static metadata.
  // Empty list → static fallback renders (preserves the c_animals assertion).
  getCourses: jest.fn(() => Promise.resolve([])),
  getCourseLessons: jest.fn(() => Promise.resolve([])),
}));

jest.mock('../../src/services/api/progress.api', () => ({
  getChildLessonProgress: jest.fn(),
}));

jest.mock('@/contexts/HouseholdContext', () => ({
  __esModule: true,
  useHousehold: jest.fn(),
}));

jest.mock('../../src/services/api/purchase.api', () => ({
  getBillingProviderStatus: jest.fn(),
  listBillingPlans: jest.fn(() => Promise.resolve([])),
  getCurrentBillingPlan: jest.fn(() => Promise.resolve(null)),
  getCurrentSubscription: jest.fn(() => Promise.resolve(null)),
  subscribeToPlan: jest.fn(),
  cancelSubscription: jest.fn(),
  pauseSubscription: jest.fn(),
  resumeSubscription: jest.fn(),
  reactivateSubscription: jest.fn(),
  cancelOrder: jest.fn(),
  requestReturn: jest.fn(),
  createCheckoutSession: jest.fn(),
}));

const mockListCourseCatalog = listCourseCatalog as jest.MockedFunction<typeof listCourseCatalog>;
const mockGetLessonList = getLessonList as jest.MockedFunction<typeof getLessonList>;
const mockListLibrary = listLibrary as jest.MockedFunction<typeof listLibrary>;
const mockUnlockCourse = unlockCourse as jest.MockedFunction<typeof unlockCourse>;
const mockGetChildLessonProgress = getChildLessonProgress as jest.MockedFunction<typeof getChildLessonProgress>;
const mockedUseHousehold = useHousehold as jest.MockedFunction<typeof useHousehold>;
const mockGetBillingProviderStatus = getBillingProviderStatus as jest.MockedFunction<typeof getBillingProviderStatus>;

const mockNavigate = jest.fn();
const route = { key: 'test', name: 'TestRoute', params: undefined };
const lessonRoute = { key: 'lesson-list', name: ROUTES.LessonListScreen, params: { unitId: 'unit-how-are-you' } };
const unlockRoute = { key: 'unlock', name: ROUTES.UnlockConfirmScreen, params: { courseId: 'course-open' } };
const navigation = {
  navigate: mockNavigate,
  replace: jest.fn(),
  goBack: jest.fn(),
  setParams: jest.fn(),
  reset: jest.fn(),
  dispatch: jest.fn(),
  setOptions: jest.fn(),
  isFocused: () => true,
  canGoBack: () => true,
  getId: () => 'Goal4Nav',
  getParent: () => undefined,
  getState: () => ({}),
  addListener: jest.fn(() => jest.fn()),
  removeListener: jest.fn(),
};

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolveFn: (value: T) => void = () => undefined;
  const promise = new Promise<T>((resolve) => {
    resolveFn = resolve;
  });
  return { promise, resolve: resolveFn };
}

// TodayProgressScreen now reads the child-scoped lesson-progress feed via
// TanStack Query + HouseholdContext, so it needs both a QueryClientProvider
// and a household with an active child.
function renderProgress() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <TodayProgressScreen navigation={navigation as never} route={route as never} />
    </QueryClientProvider>,
  );
}

function makeAssignment(overrides: Partial<AssignmentProgress> = {}): AssignmentProgress {
  return {
    assignmentId: 'assign-1',
    deviceId: 'device-1',
    childId: 'child-1',
    lessonId: 'lesson-1',
    lessonVersion: 1,
    lessonTitle: 'Greetings',
    profile: 'espTft',
    state: 'RUNNING',
    startedAt: '2026-05-18T10:00:00.000Z',
    completedAt: null,
    stepsCompleted: 3,
    stepsSucceeded: 2,
    lastEventAt: '2026-05-18T10:05:00.000Z',
    createdAt: '2026-05-18T09:59:00.000Z',
    updatedAt: '2026-05-18T10:05:00.000Z',
    ...overrides,
  };
}

describe('course, course-library, and progress stable screen states', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseHousehold.mockReturnValue({ children: [{ id: 'child-1' }] } as never);
  });

  it('renders course catalog loading, empty, error, offline, locked, and unlocked states', async () => {
    const pending = deferred<Awaited<ReturnType<typeof listCourseCatalog>>>();
    mockListCourseCatalog.mockReturnValueOnce(pending.promise);
    const loading = render(<CourseScreen navigation={navigation as never} route={route as never} />);
    expect(loading.getByText('Loading courses')).toBeTruthy();
    pending.resolve([]);
    await waitFor(() => expect(loading.getByText('No courses yet')).toBeTruthy());
    loading.unmount();

    mockListCourseCatalog.mockResolvedValueOnce([]);
    const empty = render(<CourseScreen navigation={navigation as never} route={route as never} />);
    await waitFor(() => expect(empty.getByText('No courses yet')).toBeTruthy());
    empty.unmount();

    mockListCourseCatalog.mockRejectedValueOnce({ code: 'INTERNAL_ERROR', message: 'server down' });
    const error = render(<CourseScreen navigation={navigation as never} route={route as never} />);
    await waitFor(() => expect(error.getByText('Courses unavailable')).toBeTruthy());
    error.unmount();

    mockListCourseCatalog.mockRejectedValueOnce({ code: 'NETWORK_ERROR', message: 'offline' });
    const offline = render(<CourseScreen navigation={navigation as never} route={route as never} />);
    await waitFor(() => expect(offline.getByText('Course catalog offline')).toBeTruthy());
    offline.unmount();

    mockListCourseCatalog.mockResolvedValueOnce([
      {
        id: 'course-open',
        title: 'Hello Friends',
        language: 'en',
        levelCount: 1,
        lessonCount: 10,
        locked: false,
        progress: 0.4,
      },
      {
        id: 'course-locked',
        title: 'Story Time',
        language: 'en',
        levelCount: 1,
        lessonCount: 12,
        locked: true,
        progress: 0,
      },
    ]);
    const ready = render(<CourseScreen navigation={navigation as never} route={route as never} />);
    await waitFor(() => expect(ready.getByText('Hello Friends')).toBeTruthy());
    expect(ready.getByText('Continue')).toBeTruthy();
    expect(ready.getByText('Locked')).toBeTruthy();
  });

  it('renders lesson list loading and empty states without crashing', async () => {
    const missing = render(<LessonListScreen navigation={navigation as never} route={route as never} />);
    await waitFor(() => expect(missing.getByText('Lesson list unavailable')).toBeTruthy());
    expect(mockGetLessonList).not.toHaveBeenCalled();
    missing.unmount();

    mockGetLessonList.mockResolvedValueOnce([]);
    const screen = render(
      <LessonListScreen
        navigation={navigation as never}
        route={lessonRoute as never}
      />,
    );
    expect(screen.getByText('Loading lessons')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('No lessons ready yet')).toBeTruthy());
    screen.unmount();

    mockGetLessonList.mockRejectedValueOnce({ code: 'INTERNAL_ERROR', message: 'server down' });
    const error = render(
      <LessonListScreen
        navigation={navigation as never}
        route={lessonRoute as never}
      />,
    );
    await waitFor(() => expect(error.getByText('Lessons unavailable')).toBeTruthy());
    error.unmount();

    mockGetLessonList.mockRejectedValueOnce({ code: 'NETWORK_ERROR', message: 'offline' });
    const offline = render(
      <LessonListScreen
        navigation={navigation as never}
        route={lessonRoute as never}
      />,
    );
    await waitFor(() => expect(offline.getByText('Lesson list offline')).toBeTruthy());
    offline.unmount();

    mockGetLessonList.mockResolvedValueOnce([{
      id: 'lesson-how-are-you',
      unitId: 'unit-how-are-you',
      title: 'How are you?',
      durationMinutes: 5,
      wordsCount: 4,
      state: 'current',
      stars: 0,
    }]);
    const ready = render(
      <LessonListScreen
        navigation={navigation as never}
        route={lessonRoute as never}
      />,
    );
    await waitFor(() => expect(ready.getByText('How are you?')).toBeTruthy());
    fireEvent.press(ready.getByText('How are you?'));
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.LessonDetailScreen, { lessonId: 'lesson-how-are-you' });
  });

  it('renders specific backend failure states with retry affordances', async () => {
    mockListCourseCatalog.mockRejectedValueOnce({
      status: 429,
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'limited',
      retryAfterSeconds: 45,
    });
    const rateLimited = render(<CourseScreen navigation={navigation as never} route={route as never} />);
    await waitFor(() => expect(rateLimited.getByText('Course refresh limited')).toBeTruthy());
    expect(rateLimited.getByText('Try again in 45 seconds.')).toBeTruthy();
    fireEvent.press(rateLimited.getByLabelText('Retry Course refresh limited'));
    await waitFor(() => expect(mockListCourseCatalog).toHaveBeenCalledTimes(2));
    rateLimited.unmount();

    mockGetLessonList.mockRejectedValueOnce({ status: 410, code: 'LESSON_GONE', message: 'gone' });
    const gone = render(
      <LessonListScreen
        navigation={navigation as never}
        route={lessonRoute as never}
      />,
    );
    await waitFor(() => expect(gone.getByText('Lesson list changed')).toBeTruthy());
    expect(gone.getByText('Refresh to continue with the latest state.')).toBeTruthy();
    gone.unmount();

    mockListLibrary.mockRejectedValueOnce({ status: 502, code: 'INTERNAL_ERROR', message: 'bad gateway' });
    const outage = render(<CourseLibraryScreen navigation={navigation as never} route={route as never} />);
    await waitFor(() => expect(outage.getByText('Library service unavailable')).toBeTruthy());
    expect(outage.getByText('Retry in a moment.')).toBeTruthy();
  });

  it('renders course-library loading, empty, error, offline, unlocked, and locked states', async () => {
    const pending = deferred<Awaited<ReturnType<typeof listLibrary>>>();
    mockListLibrary.mockReturnValueOnce(pending.promise);
    const loading = render(<CourseLibraryScreen navigation={navigation as never} route={route as never} />);
    expect(loading.getByText('Loading library')).toBeTruthy();
    pending.resolve([]);
    await waitFor(() => expect(loading.getByText('No library courses yet')).toBeTruthy());
    loading.unmount();

    mockListLibrary.mockResolvedValueOnce([]);
    const empty = render(<CourseLibraryScreen navigation={navigation as never} route={route as never} />);
    await waitFor(() => expect(empty.getByText('No library courses yet')).toBeTruthy());
    empty.unmount();

    mockListLibrary.mockRejectedValueOnce({ code: 'INTERNAL_ERROR', message: 'server down' });
    const error = render(<CourseLibraryScreen navigation={navigation as never} route={route as never} />);
    await waitFor(() => expect(error.getByText('Library unavailable')).toBeTruthy());
    error.unmount();

    mockListLibrary.mockResolvedValueOnce([
      {
        courseId: 'course-open',
        title: 'Hello Friends',
        language: 'en',
        price: 0,
        owned: true,
        syncedToDevice: true,
      },
      {
        courseId: 'course-locked',
        title: 'Story Time',
        language: 'en',
        price: 2400,
        owned: false,
        syncedToDevice: false,
        locked: true,
      },
    ]);
    const library = render(<CourseLibraryScreen navigation={navigation as never} route={route as never} />);
    await waitFor(() => expect(library.getByText('Hello Friends')).toBeTruthy());
    expect(library.getByLabelText('Open Hello Friends course')).toBeTruthy();
    expect(library.getByLabelText('Open Story Time locked course')).toBeTruthy();
    expect(library.getByText('On Robot')).toBeTruthy();
    expect(library.getByText('Locked')).toBeTruthy();
    library.unmount();

    mockListLibrary.mockRejectedValueOnce({ code: 'NETWORK_ERROR', message: 'offline' });
    const offline = render(<CourseLibraryScreen navigation={navigation as never} route={route as never} />);
    await waitFor(() => expect(offline.getByText('Library offline')).toBeTruthy());
  });

  it('prevents duplicate unlock actions while entitlement request is pending', async () => {
    const pending = deferred<void>();
    mockUnlockCourse.mockReturnValueOnce(pending.promise);

    const screen = render(<UnlockConfirmModal navigation={navigation as never} route={unlockRoute as never} />);
    for (const key of ['7', '3', '5', '1']) {
      fireEvent.press(screen.getByText(key));
    }

    fireEvent.press(screen.getByText('Confirm add'));
    fireEvent.press(screen.getByText('Adding...'));

    expect(mockUnlockCourse).toHaveBeenCalledTimes(1);
    expect(mockUnlockCourse).toHaveBeenCalledWith('course-open');

    pending.resolve(undefined);
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith(ROUTES.CourseAddedScreen, { courseId: 'course-open' }));
  });

  it('renders the latest lesson with real step counts', async () => {
    mockGetChildLessonProgress.mockResolvedValueOnce([makeAssignment({ stepsSucceeded: 2, stepsCompleted: 3 })]);

    const screen = renderProgress();
    expect(screen.getByText('Loading progress')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('Greetings')).toBeTruthy());
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('In progress')).toBeTruthy();
  });

  it('renders progress empty and failed refresh states without showing stale metrics', async () => {
    mockGetChildLessonProgress.mockResolvedValueOnce([]);
    const empty = renderProgress();
    await waitFor(() => expect(empty.getByText('No lessons yet')).toBeTruthy());
    empty.unmount();

    mockGetChildLessonProgress.mockRejectedValueOnce({ code: 'NETWORK_ERROR', message: 'timeout of 30000ms exceeded' });
    const failed = renderProgress();
    await waitFor(() => expect(failed.getByText('Progress unavailable')).toBeTruthy());
    expect(failed.queryByText('steps right')).toBeNull();
  });

  it('labels purchase plan controls for assistive technology', async () => {
    mockGetBillingProviderStatus.mockResolvedValueOnce({ providerAvailable: true, message: null });

    const buy = render(<BuyCourseScreen navigation={navigation as never} route={route as never} />);
    expect(buy.getByTestId('buyCourseFreeMode')).toBeTruthy();
    expect(buy.queryByText('Choose a plan')).toBeNull();
    expect(buy.queryByText('Confirm & continue')).toBeNull();
    buy.unmount();

    const subscriptions = render(<SubscriptionsScreen navigation={navigation as never} route={route as never} />);
    expect(subscriptions.getByLabelText('Choose no subscription')).toBeTruthy();
    expect(subscriptions.getByLabelText('Choose All Courses subscription')).toBeTruthy();
    expect(subscriptions.getByLabelText('Choose Starter pack one-time purchase')).toBeTruthy();
    await waitFor(() => expect(subscriptions.getByText('Manage billing')).toBeTruthy());
  });

  it('preserves selected course id through detail, buy, and unlock handoff', () => {
    const detail = render(
      <CourseDetailScreen
        navigation={navigation as never}
        route={{ key: 'detail', name: ROUTES.CourseDetailScreen, params: { courseId: 'c_animals' } } as never}
      />,
    );
    fireEvent.press(detail.getByText('Add to Robot'));
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.UnlockConfirmScreen, { courseId: 'c_animals' });
    detail.unmount();
  });

  it('preserves selected course id when backing out of unlock modal', () => {
    const unlock = render(
      <UnlockConfirmModal
        navigation={navigation as never}
        route={{ key: 'unlock', name: ROUTES.UnlockConfirmScreen, params: { courseId: 'c_animals' } } as never}
      />,
    );

    fireEvent.press(unlock.getByLabelText('Go back'));
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.CourseDetailScreen, { courseId: 'c_animals' });
  });

  it('renders the error state without showing stale metrics, regardless of error code', async () => {
    mockGetChildLessonProgress.mockRejectedValueOnce({ code: 'INTERNAL_ERROR', message: 'server down' });
    const error = renderProgress();
    await waitFor(() => expect(error.getByText('Progress unavailable')).toBeTruthy());
    expect(error.queryByText('No lessons yet')).toBeNull();
    error.unmount();

    mockGetChildLessonProgress.mockRejectedValueOnce({ code: 'NETWORK_ERROR', message: 'offline' });
    const offline = renderProgress();
    await waitFor(() => expect(offline.getByText('Progress unavailable')).toBeTruthy());
    expect(offline.queryByText('No lessons yet')).toBeNull();
  });

  it('translates the lesson state label in Vietnamese', async () => {
    await setAppLanguage('vi');
    mockGetChildLessonProgress.mockResolvedValueOnce([makeAssignment({ state: 'RUNNING' })]);

    const screen = renderProgress();

    // 'In progress' → vi key 'Đang tiến hành'; proves the real data flows
    // through the i18n layer (not the deleted hardcoded weekly-bar copy).
    await waitFor(() => expect(screen.getByText('Đang tiến hành')).toBeTruthy());
  });

  it('renders remaining progress screens with missing route data', () => {
    const screens = [
      render(<WordsPracticedScreen navigation={navigation as never} route={route as never} />),
      render(<LessonSummaryScreen navigation={navigation as never} route={route as never} />),
      render(<ReviewNeededScreen navigation={navigation as never} route={route as never} />),
      render(<CelebrationScreen navigation={navigation as never} route={route as never} />),
    ];

    expect(screens[0].getByText('Words Practiced')).toBeTruthy();
    expect(screens[1].getByText('Great effort!')).toBeTruthy();
    expect(screens[2].getByText("Let's visit again")).toBeTruthy();
    expect(screens[3].getByText('You did it!')).toBeTruthy();

    screens.forEach(screen => screen.unmount());
  });
});
