import React from 'react';
import { Text } from 'react-native';
import { useChildLessonProgressQuery, childLessonProgressQueryKey } from '@/features/progress/hooks/useChildLessonProgressQuery';
import { getChildLessonProgress } from '@/services/api/progress.api';
jest.mock('@/services/api/progress.api', () => ({ ...jest.requireActual('@/services/api/progress.api'), getChildLessonProgress: jest.fn() }));
import { act, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { NavigationContext } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CourseLibraryScreen from '@/features/course-library/screens/CourseLibraryScreen';
import TodayProgressScreen from '@/features/progress/screens/TodayProgressScreen';
import { listLibrary, normalizeCourseLibraryPayload, type LibraryItem } from '@/services/api/course-library.api';
import { getParentLearningHistory, getParentLearningStatus, normalizeParentLearningStatus } from '@/services/api/parentLearning.api';
import { parentLearningStatusKey } from '@/features/parent/hooks/useParentLearningStatusQuery';
import { parentLearningHistoryKey } from '@/features/parent/hooks/useParentLearningHistoryQuery';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useRoute: () => ({ params: {} }),
}));
jest.mock('@/services/api/course-library.api', () => ({
  ...jest.requireActual('@/services/api/course-library.api'), listLibrary: jest.fn(),
}));
jest.mock('@/services/api/parentLearning.api', () => ({
  ...jest.requireActual('@/services/api/parentLearning.api'),
  getParentLearningStatus: jest.fn(), getParentLearningHistory: jest.fn(),
}));
jest.mock('@/services/ws/parentProgressRealtime', () => ({
  ...jest.requireActual('@/services/ws/parentProgressRealtime'),
  openParentProgressRealtime: jest.fn(async () => ({ url: 'wss://test/parent-progress', close: jest.fn(), send: jest.fn() })),
}));
const mockHousehold: { activeChild: { id: string; name: string } | null } = { activeChild: { id: 'child-a', name: 'A' } };
jest.mock('@/contexts/HouseholdContext', () => ({ useHousehold: () => mockHousehold }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function library(title = 'Farm animals', language = 'en') {
  return normalizeCourseLibraryPayload({ courses: [{ courseId: 'farm', title, language, price: 0, owned: true, locked: false, syncedToDevice: false }] });
}
function status(childId = 'child-a', revision = '10', completed = 2) {
  return normalizeParentLearningStatus({
    activeLearning: null, projectionRevision: revision, courseModeWords: [],
    recentSessions: { items: [{ childId, assignmentId: 'assignment-1', sessionId: 'session-1', courseId: 'farm', courseTitle: 'Farm animals', lessonId: 'lesson-1', lessonTitle: 'Barn', terminalState: 'COMPLETED', startedAt: '2026-09-14T16:20:00Z', completedAt: '2026-09-14T16:25:00Z', durationSec: 300, reportAvailable: true }], nextCursor: null },
    courseProgress: [{ courseId: 'farm', title: 'Farm animals', currentLessonPosition: completed + 1, completedLessonCount: completed, totalLessonCount: 4, positionPercent: completed * 25, suggestedNextLesson: { lessonId: 'lesson-3', lessonTitle: 'Duck' } }],
  });
}
function refreshedHistory() {
  return { items: [{ ...status().recentSessions.items[0], sessionId: 'session-2', completedAt: '2026-09-14T16:27:00Z', durationSec: 420 }], nextCursor: null };
}

it.each([
  ['initial status and history', () => status().recentSessions],
  ['refreshed history', refreshedHistory],
] as const)('%s fixture obeys the producer elapsed-time bound', (_name, history) => {
  // The producer subtracts nonnegative inactive time before flooring/clamping.
  // Check the fixture independently; deriving its timestamps from duration would hide mistakes.
  for (const item of history().items) {
    expect(Number.isInteger(item.durationSec)).toBe(true);
    expect(item.durationSec).toBeGreaterThanOrEqual(0);
    if (item.startedAt == null) {
      expect(item.durationSec).toBe(0);
    } else {
      const elapsedMs = Date.parse(item.completedAt) - Date.parse(item.startedAt);
      expect(Number.isFinite(elapsedMs)).toBe(true);
      expect(item.durationSec).toBeLessThanOrEqual(Math.max(0, Math.floor(elapsedMs / 1000)));
    }
  }
});

function ProgressProbe() {
  const query = useChildLessonProgressQuery(mockHousehold.activeChild?.id);
  return <Text>{query.isSuccess ? 'Progress loaded' : 'Progress waiting'}</Text>;
}
function mount(target: 'library' | 'dashboard' | 'progress') {
  let focused = true;
  const listeners = new Map<string, Set<() => void>>();
  const navigation = {
    navigate: jest.fn(), goBack: jest.fn(), isFocused: () => focused,
    addListener: (event: string, listener: () => void) => {
      const set = listeners.get(event) ?? new Set<() => void>();
      listeners.set(event, set); set.add(listener);
      return () => { set.delete(listener); };
    },
  };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const element = () => <NavigationContext.Provider value={navigation as never}>
    <QueryClientProvider client={client}>{target === 'progress' ? <ProgressProbe /> : target === 'library'
      ? <CourseLibraryScreen navigation={navigation as never} route={{ key: 'library', name: 'CourseLibraryScreen' } as never} />
      : <TodayProgressScreen navigation={navigation as never} route={{ key: 'today', name: 'TodayProgressScreen' } as never} />}
    </QueryClientProvider>
  </NavigationContext.Provider>;
  const view = render(element());
  return {
    client, navigation,
    rerender: () => view.rerender(element()),
    focus: async (value: boolean) => { await act(async () => { focused = value; listeners.get(value ? 'focus' : 'blur')?.forEach(fn => fn()); }); },
    unmount: () => { view.unmount(); client.clear(); expect([...listeners.values()].every(set => set.size === 0)).toBe(true); },
  };
}
beforeEach(() => {
  jest.clearAllMocks(); jest.useFakeTimers(); jest.setSystemTime(new Date('2026-09-14T16:59:00Z'));
  mockHousehold.activeChild = { id: 'child-a', name: 'A' };
  jest.mocked(getChildLessonProgress).mockReset().mockResolvedValue([]);
  jest.mocked(listLibrary).mockReset().mockResolvedValue(library());
  jest.mocked(getParentLearningStatus).mockReset().mockResolvedValue(status());
  jest.mocked(getParentLearningHistory).mockReset().mockResolvedValue(status().recentSessions);
});
afterEach(() => { jest.useRealTimers(); });

it('library retry stays busy, rejects a second press, then opens the recovered course', async () => {
  const pending = deferred<LibraryItem[]>();
  jest.mocked(listLibrary).mockRejectedValueOnce({ code: 'NETWORK_ERROR', message: 'Network unavailable' }).mockReturnValueOnce(pending.promise);
  const view = mount('library'); const user = userEvent.setup();
  expect(await screen.findByText('Library offline')).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Try again' }));
  expect(screen.getByRole('button', { name: 'Try again', busy: true })).toBeDisabled();
  await user.press(screen.getByRole('button', { name: 'Try again' }));
  expect(listLibrary).toHaveBeenCalledTimes(2);
  await act(async () => pending.resolve(library()));
  await user.press(await screen.findByRole('button', { name: 'Open Farm animals course' }));
  expect(view.navigation.navigate).toHaveBeenCalledWith('CourseDetailScreen', { courseId: 'farm' });
  view.unmount();
});

it('library retry failure restores an enabled action and recovers on the next explicit retry', async () => {
  jest.mocked(listLibrary).mockRejectedValueOnce({ code: 'HTTP_ERROR', status: 503, message: 'Service unavailable' }).mockRejectedValueOnce({ code: 'NETWORK_ERROR', message: 'Network unavailable' });
  const view = mount('library'); const user = userEvent.setup();
  expect(await screen.findByText('Retry in a moment.')).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('Library offline')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled();
  await user.press(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('Farm animals')).toBeOnTheScreen();
  expect(listLibrary).toHaveBeenCalledTimes(3); view.unmount();
});

it.each(['resolve', 'reject'] as const)('library focus replaces pending retry and ignores its late %s', async outcome => {
  const pending = deferred<LibraryItem[]>();
  jest.mocked(listLibrary).mockRejectedValueOnce({ code: 'NETWORK_ERROR', message: 'Network unavailable' }).mockReturnValueOnce(pending.promise).mockResolvedValue(library('Updated animals'));
  const view = mount('library'); const user = userEvent.setup();
  await user.press(await screen.findByRole('button', { name: 'Try again' }));
  await view.focus(false); await view.focus(true);
  expect(await screen.findByText('Updated animals')).toBeOnTheScreen();
  await act(async () => { if (outcome === 'resolve') pending.resolve(library('Old animals')); else pending.reject({ code: 'NETWORK_ERROR', message: 'Old failure' }); });
  expect(screen.getByText('Updated animals')).toBeOnTheScreen();
  expect(screen.queryByText('Old animals')).toBeNull(); expect(screen.queryByText('Library offline')).toBeNull();
  expect(listLibrary).toHaveBeenCalledTimes(3); view.unmount();
});

it('library duplicate focus does not refetch, while return to focus refreshes a supported locale', async () => {
  const view = mount('library');
  expect(await screen.findByText('Farm animals')).toBeOnTheScreen();
  await view.focus(true); expect(listLibrary).toHaveBeenCalledTimes(1);
  await view.focus(false); jest.mocked(listLibrary).mockResolvedValue(library('Animaux', 'fr'));
  await view.focus(true);
  expect(await screen.findByText('Animaux')).toBeOnTheScreen(); expect(screen.getByText('fr')).toBeOnTheScreen();
  expect(screen.queryByText('Farm animals')).toBeNull(); expect(listLibrary).toHaveBeenCalledTimes(2); view.unmount();
});

it('R2: cached history keeps error Retry disabled until its refetch settles', async () => {
  const pendingStatus = deferred<Awaited<ReturnType<typeof getParentLearningStatus>>>();
  const pendingHistory = deferred<Awaited<ReturnType<typeof getParentLearningHistory>>>();
  jest.mocked(getParentLearningStatus).mockRejectedValueOnce(new Error('offline')).mockReturnValueOnce(pendingStatus.promise);
  jest.mocked(getParentLearningHistory).mockResolvedValueOnce(status().recentSessions).mockReturnValueOnce(pendingHistory.promise);
  const view = mount('dashboard'); const user = userEvent.setup();
  try {
    expect(await screen.findByText('Progress unavailable')).toBeOnTheScreen();
    await waitFor(() => expect(view.client.isFetching()).toBe(0));
    expect(screen.getByRole('button', { name: 'Tap to try again.' })).toBeEnabled();
    const cachedHistory = view.client.getQueryData(parentLearningHistoryKey('child-a'));
    expect(cachedHistory).toEqual({ pages: [status().recentSessions], pageParams: [null] });
    await user.press(screen.getByRole('button', { name: 'Tap to try again.' }));
    expect(await screen.findByText('Loading progress')).toBeOnTheScreen();
    await act(async () => pendingStatus.reject(new Error('still offline')));
    expect(await screen.findByText('Progress unavailable')).toBeOnTheScreen();
    expect(screen.queryByText('Loading progress')).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Tap to try again.' })).toBeDisabled();
    expect(view.client.getQueryData(parentLearningHistoryKey('child-a'))).toBe(cachedHistory);
    expect(getParentLearningStatus).toHaveBeenCalledTimes(2);
    expect(getParentLearningHistory).toHaveBeenCalledTimes(2);
    await user.press(screen.getByRole('button', { name: 'Tap to try again.' }));
    expect(getParentLearningStatus).toHaveBeenCalledTimes(2);
    expect(getParentLearningHistory).toHaveBeenCalledTimes(2);
    await act(async () => pendingHistory.resolve(status().recentSessions));
    expect(await screen.findByRole('button', { name: 'Tap to try again.', disabled: false })).toBeEnabled();
    expect(screen.getByText('Progress unavailable')).toBeOnTheScreen();
    expect(getParentLearningStatus).toHaveBeenCalledTimes(2);
    expect(getParentLearningHistory).toHaveBeenCalledTimes(2);
    await user.press(screen.getByRole('button', { name: 'Tap to try again.' }));
    expect(await screen.findByText('2 of 4 lessons')).toBeOnTheScreen();
    expect(screen.getByText('5 min')).toBeOnTheScreen();
    expect(screen.queryByText('Progress unavailable')).not.toBeOnTheScreen();
    expect(jest.mocked(getParentLearningStatus).mock.calls).toEqual([['child-a'], ['child-a'], ['child-a']]);
    expect(jest.mocked(getParentLearningHistory).mock.calls).toEqual([['child-a', null], ['child-a', null], ['child-a', null]]);
    expect(view.navigation.navigate).not.toHaveBeenCalled();
  } finally {
    view.unmount();
  }
});

it('dashboard visible retry fetches both projections and waits for pending history', async () => {
  const history = deferred<Awaited<ReturnType<typeof getParentLearningHistory>>>();
  jest.mocked(getParentLearningStatus).mockRejectedValueOnce(new Error('offline'));
  jest.mocked(getParentLearningHistory).mockRejectedValueOnce(new Error('offline')).mockReturnValueOnce(history.promise);
  const view = mount('dashboard'); const user = userEvent.setup();
  await user.press(await screen.findByRole('button', { name: 'Tap to try again.' }));
  expect(await screen.findByText('Loading progress')).toBeOnTheScreen();
  expect(getParentLearningStatus).toHaveBeenCalledTimes(2); expect(getParentLearningHistory).toHaveBeenCalledTimes(2);
  await act(async () => history.resolve(status().recentSessions));
  expect(await screen.findByText('2 of 4 lessons')).toBeOnTheScreen(); expect(screen.getByText('5 min')).toBeOnTheScreen(); view.unmount();
});

it('dashboard focus refreshes both status and history without a duplicate mount fetch', async () => {
  const view = mount('dashboard');
  expect(await screen.findByText('2 of 4 lessons')).toBeOnTheScreen();
  await view.focus(true);
  expect(getParentLearningStatus).toHaveBeenCalledTimes(1); expect(getParentLearningHistory).toHaveBeenCalledTimes(1);
  await view.focus(false);
  jest.mocked(getParentLearningStatus).mockResolvedValue(status('child-a', '11', 3));
  jest.mocked(getParentLearningHistory).mockResolvedValue(refreshedHistory());
  await view.focus(true);
  expect(await screen.findByText('3 of 4 lessons')).toBeOnTheScreen(); expect(await screen.findByText('7 min')).toBeOnTheScreen();
  expect(getParentLearningStatus).toHaveBeenCalledTimes(2); expect(getParentLearningHistory).toHaveBeenCalledTimes(2); view.unmount();
});

it('dashboard focus after household midnight resets today while unchanged projections retain lifetime totals', async () => {
  const view = mount('dashboard');
  expect(await screen.findByText('5 min')).toBeOnTheScreen();
  const cached = view.client.getQueryData(parentLearningStatusKey('child-a'));
  await view.focus(false); jest.setSystemTime(new Date('2026-09-14T17:01:00Z')); await view.focus(true);
  await waitFor(() => expect(view.client.isFetching()).toBe(0));
  expect(await screen.findByText('0 min')).toBeOnTheScreen();
  expect(screen.getByText('2 of 4 lessons')).toBeOnTheScreen();
  expect(view.client.getQueryData(parentLearningStatusKey('child-a'))).toBe(cached);
  expect(getParentLearningStatus).toHaveBeenCalledTimes(2); expect(getParentLearningHistory).toHaveBeenCalledTimes(2); view.unmount();
});

it('dashboard without a selected child makes no reads and fetches when selection becomes available', async () => {
  mockHousehold.activeChild = null;
  const view = mount('dashboard');
  expect(screen.getByText('Add a child to see progress')).toBeOnTheScreen();
  await view.focus(false); await view.focus(true);
  expect(getParentLearningStatus).not.toHaveBeenCalled(); expect(getParentLearningHistory).not.toHaveBeenCalled();
  mockHousehold.activeChild = { id: 'child-a', name: 'A' }; view.rerender();
  expect(await screen.findByText('2 of 4 lessons')).toBeOnTheScreen();
  expect(getParentLearningStatus).toHaveBeenCalledTimes(1); expect(getParentLearningHistory).toHaveBeenCalledTimes(1); view.unmount();
});

it('dashboard changing children ignores late A responses and focus refreshes only B', async () => {
  const oldStatus = deferred<Awaited<ReturnType<typeof getParentLearningStatus>>>();
  const oldHistory = deferred<Awaited<ReturnType<typeof getParentLearningHistory>>>();
  jest.mocked(getParentLearningStatus).mockReturnValueOnce(oldStatus.promise).mockResolvedValue(status('child-b', '20', 3));
  jest.mocked(getParentLearningHistory).mockReturnValueOnce(oldHistory.promise).mockResolvedValue({ items: [], nextCursor: null });
  const view = mount('dashboard');
  mockHousehold.activeChild = { id: 'child-b', name: 'B' }; view.rerender();
  expect(await screen.findByText('3 of 4 lessons')).toBeOnTheScreen();
  await act(async () => { oldStatus.resolve(status()); oldHistory.resolve(status().recentSessions); });
  expect(screen.queryByText('2 of 4 lessons')).toBeNull(); expect(screen.getByText('0 min')).toBeOnTheScreen();
  const before = jest.mocked(getParentLearningStatus).mock.calls.length;
  await view.focus(false); await view.focus(true);
  await waitFor(() => expect(view.client.isFetching()).toBe(0));
  expect(jest.mocked(getParentLearningStatus).mock.calls.slice(before)).toEqual([['child-b']]);
  expect(view.client.getQueryData(parentLearningHistoryKey('child-b'))).toBeDefined(); view.unmount();
});


it('run15 A1: Today Back home leaves without opening a lesson', async () => {
  const view = mount('dashboard');
  expect(await screen.findByText('2 of 4 lessons')).toBeOnTheScreen();
  await userEvent.setup().press(screen.getByRole('button', { name: 'Back home' }));
  expect(view.navigation.navigate.mock.calls).toEqual([['HomeHubScreen']]);
  view.unmount();
});

it('run15 A4: normalized blank title displays Untitled course while preserving its ID', async () => {
  jest.mocked(listLibrary).mockResolvedValue(library(''));
  const view = mount('library');
  await userEvent.setup().press(await screen.findByRole('button', { name: 'Open Untitled course course' }));
  expect(view.navigation.navigate.mock.calls).toEqual([['CourseDetailScreen', { courseId: 'farm' }]]);
  expect(listLibrary).toHaveBeenCalledTimes(1);
  view.unmount();
});

it('run15 A4: disabled lesson progress stays idle across focus and selected child enables exact refresh', async () => {
  mockHousehold.activeChild = null;
  const view = mount('progress');
  await view.focus(false); await view.focus(true);
  expect(screen.getByText('Progress waiting')).toBeOnTheScreen();
  expect(getChildLessonProgress).not.toHaveBeenCalled();
  view.client.setQueryData(parentLearningStatusKey('child-a'), status());
  view.client.setQueryData(parentLearningHistoryKey('child-a'), status().recentSessions);
  view.client.setQueryData(parentLearningStatusKey('child-b'), status('child-b'));
  mockHousehold.activeChild = { id: 'child-a', name: 'A' }; view.rerender();
  expect(await screen.findByText('Progress loaded')).toBeOnTheScreen();
  expect(jest.mocked(getChildLessonProgress).mock.calls).toEqual([['child-a']]);
  expect(view.client.getQueryData(childLessonProgressQueryKey('child-a'))).toEqual([]);
  await view.focus(true);
  expect(getChildLessonProgress).toHaveBeenCalledTimes(1);
  await view.focus(false); await view.focus(true);
  await waitFor(() => expect(view.client.isFetching()).toBe(0));
  expect(jest.mocked(getChildLessonProgress).mock.calls).toEqual([['child-a'], ['child-a']]);
  expect(view.client.getQueryState(parentLearningStatusKey('child-a'))?.isInvalidated).toBe(true);
  expect(view.client.getQueryState(parentLearningHistoryKey('child-a'))?.isInvalidated).toBe(true);
  expect(view.client.getQueryState(parentLearningStatusKey('child-b'))?.isInvalidated).toBe(false);
  expect(view.navigation.navigate).not.toHaveBeenCalled();
  view.unmount();
});
