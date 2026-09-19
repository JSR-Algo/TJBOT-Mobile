import React from 'react';
import { Pressable, Text } from 'react-native';
import { act, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { NavigationContext } from '@react-navigation/native';
import NetInfo, { type NetInfoStateType, type NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onlineManager } from '@tanstack/react-query';
import { QueryProvider } from '@/app/providers/QueryProvider';
import { appQueryClient } from '@/services/query/queryClient';
import { HouseholdProvider, useHousehold } from '@/contexts/HouseholdContext';
import * as householdsApi from '@/services/api/households';
import { getParentLearningHistory, getParentLearningStatus, normalizeParentLearningStatus } from '@/services/api/parentLearning.api';
import { parentLearningStatusKey } from '@/features/parent/hooks/useParentLearningStatusQuery';
import { parentLearningHistoryKey } from '@/features/parent/hooks/useParentLearningHistoryQuery';
import TodayProgressScreen from '@/features/progress/screens/TodayProgressScreen';
import ParentHistoryScreen from '@/features/parent/screens/ParentHistoryScreen';

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true, isLoading: false, user: { id: 'account-a' } }),
}));
jest.mock('@/services/api/households', () => ({ list: jest.fn(), listChildren: jest.fn() }));
jest.mock('@/services/api/parentLearning.api', () => ({
  ...jest.requireActual('@/services/api/parentLearning.api'),
  getParentLearningStatus: jest.fn(), getParentLearningHistory: jest.fn(),
}));
jest.mock('@/services/ws/parentProgressRealtime', () => ({
  ...jest.requireActual('@/services/ws/parentProgressRealtime'),
  openParentProgressRealtime: jest.fn(async () => ({ url: 'wss://test/parent-progress', close: jest.fn(), send: jest.fn() })),
}));
// Provider mounting/reconnect invokes this unrelated external boundary.
jest.mock('@/features/rewards/offline/rewardSeenQueue', () => ({
  replayRewardSeenQueue: jest.fn(async () => undefined), setRewardQueueScope: jest.fn(),
}));

function projection(populated = true, childId = 'child-a') {
  return normalizeParentLearningStatus({
    activeLearning: null, projectionRevision: '10',
    recentSessions: { items: populated ? [{
      childId, assignmentId: `assignment-${childId}`, sessionId: `session-${childId}`,
      courseId: 'farm', courseTitle: 'Farm animals', lessonId: 'barn', lessonTitle: 'Barn',
      terminalState: 'COMPLETED', startedAt: '2026-09-14T16:20:00Z',
      completedAt: '2026-09-14T16:25:00Z', durationSec: 300, reportAvailable: true,
    }] : [], nextCursor: null },
    courseProgress: populated ? [{ courseId: 'farm', title: 'Farm animals', currentLessonPosition: 3,
      completedLessonCount: 2, totalLessonCount: 4, positionPercent: 50, suggestedNextLesson: null }] : [],
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

const navigation = {
  navigate: jest.fn(), isFocused: () => true,
  addListener: (_event: string, callback: () => void) => {
    navigationListeners.add(callback);
    return () => { navigationListeners.delete(callback); };
  },
};
const navigationListeners = new Set<() => void>();
const networkListeners = new Set<(state: NetInfoState) => void>();
let unsubscribe: jest.Mock;
let priorOnline: boolean;
let view: ReturnType<typeof render> | undefined;

function Harness({ target }: { target: 'dashboard' | 'history' }) {
  const { children, activeChild, setActiveChild } = useHousehold();
  const [open, setOpen] = React.useState(false);
  return <>
    <Text>{activeChild?.name ?? 'Selecting child'}</Text>
    {children.map(child => <Pressable key={child.id} accessibilityRole="button"
      accessibilityLabel={`Select ${child.name}`} onPress={() => setActiveChild(child.id)}><Text>{child.name}</Text></Pressable>)}
    <Pressable accessibilityRole="button" accessibilityLabel="Open progress" onPress={() => setOpen(true)}><Text>Open progress</Text></Pressable>
    {open ? target === 'history'
      ? <ParentHistoryScreen navigation={navigation as never} route={{ key: 'history', name: 'ParentHistoryScreen' }} />
      : <TodayProgressScreen navigation={navigation as never} route={{ key: 'today', name: 'TodayProgressScreen' }} /> : null}
  </>;
}

async function network(online: boolean) {
  const state: NetInfoState = online
    ? { type: 'other' as NetInfoStateType.other, isConnected: true, isInternetReachable: true, details: { isConnectionExpensive: false } }
    : { type: 'none' as NetInfoStateType.none, isConnected: false, isInternetReachable: false, details: null };
  await act(async () => { networkListeners.forEach(listener => listener(state)); });
}

async function mount(online = true, target: 'dashboard' | 'history' = 'dashboard') {
  view = render(<QueryProvider><HouseholdProvider><NavigationContext.Provider value={navigation as never}>
    <Harness target={target} />
  </NavigationContext.Provider></HouseholdProvider></QueryProvider>);
  expect(await screen.findByRole('button', { name: 'Select Child A' })).toBeEnabled();
  expect(networkListeners.size).toBe(1);
  await network(online);
  await userEvent.setup().press(screen.getByRole('button', { name: 'Open progress' }));
}

function expectNeutral() {
  expect(screen.queryByText('No practice yet')).not.toBeOnTheScreen();
  expect(screen.getByText('Learning progress')).toBeOnTheScreen();
}

beforeEach(async () => {
  jest.clearAllMocks(); jest.useFakeTimers(); jest.setSystemTime(new Date('2026-09-14T16:59:00Z'));
  priorOnline = onlineManager.isOnline();
  await appQueryClient.cancelQueries(); appQueryClient.clear();
  await AsyncStorage.clear();
  unsubscribe = jest.fn();
  jest.spyOn(NetInfo, 'addEventListener').mockImplementation(listener => {
    networkListeners.add(listener);
    return () => { networkListeners.delete(listener); unsubscribe(); };
  });
  jest.mocked(householdsApi.list).mockResolvedValue([{ id: 'household-a', name: 'Family', owner_id: 'account-a', created_at: '2026-01-01T00:00:00Z' }]);
  jest.mocked(householdsApi.listChildren).mockResolvedValue(['a', 'b'].map(id => ({
    id: `child-${id}`, name: `Child ${id.toUpperCase()}`, household_id: 'household-a',
    birth_year: 2020, age_gate_passed: true, created_at: '2026-01-01T00:00:00Z',
  })));
  jest.mocked(getParentLearningStatus).mockReset().mockImplementation(async id => projection(true, id));
  jest.mocked(getParentLearningHistory).mockReset().mockImplementation(async id => projection(true, id).recentSessions);
});

afterEach(async () => {
  view?.unmount(); view = undefined;
  await appQueryClient.cancelQueries(); appQueryClient.clear();
  const calls = [jest.mocked(getParentLearningStatus).mock.calls.length, jest.mocked(getParentLearningHistory).mock.calls.length];
  try {
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(networkListeners.size).toBe(0);
    expect(navigationListeners.size).toBe(0);
    await network(true);
    await act(async () => { await jest.advanceTimersByTimeAsync(8000); });
    expect([jest.mocked(getParentLearningStatus).mock.calls.length, jest.mocked(getParentLearningHistory).mock.calls.length]).toEqual(calls);
    expect(appQueryClient.getQueryCache().getAll()).toEqual([]);
    expect(appQueryClient.isFetching()).toBe(0);
  } finally {
    onlineManager.setOnline(priorOnline);
    jest.restoreAllMocks(); jest.useRealTimers();
  }
});

it('offline entry stays neutral, then reconnects once to the selected child projection', async () => {
  const status = deferred<Awaited<ReturnType<typeof getParentLearningStatus>>>();
  const history = deferred<Awaited<ReturnType<typeof getParentLearningHistory>>>();
  jest.mocked(getParentLearningStatus).mockReturnValueOnce(status.promise);
  jest.mocked(getParentLearningHistory).mockReturnValueOnce(history.promise);
  await mount(false);
  expect(appQueryClient.getQueryState(parentLearningStatusKey('child-a'))).toMatchObject({ status: 'pending', fetchStatus: 'paused' });
  expect(appQueryClient.getQueryState(parentLearningHistoryKey('child-a'))).toMatchObject({ status: 'pending', fetchStatus: 'paused' });
  expect(getParentLearningStatus).not.toHaveBeenCalled(); expect(getParentLearningHistory).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Back home' })).toBeEnabled();
  expectNeutral();
  await network(true);
  expect(await screen.findByText('Loading progress')).toBeOnTheScreen(); expectNeutral();
  await act(async () => { status.resolve(projection()); history.resolve(projection().recentSessions); });
  expect(await screen.findByText('2 of 4 lessons')).toBeOnTheScreen();
  expect(screen.getByText('5 min')).toBeOnTheScreen(); expectNeutral();
  await userEvent.setup().press(screen.getByRole('button', { name: 'Back home' }));
  expect(navigation.navigate.mock.calls).toEqual([['HomeHubScreen']]);
  expect(jest.mocked(getParentLearningStatus).mock.calls).toEqual([['child-a']]);
  expect(jest.mocked(getParentLearningHistory).mock.calls).toEqual([['child-a', null]]);
});

it('initial loading cannot claim empty history', async () => {
  const status = deferred<Awaited<ReturnType<typeof getParentLearningStatus>>>();
  jest.mocked(getParentLearningStatus).mockReturnValueOnce(status.promise);
  await mount();
  expect(screen.getByText('Loading progress')).toBeOnTheScreen(); expectNeutral();
});

it('initial status failure cannot claim empty history after native query retries', async () => {
  jest.mocked(getParentLearningStatus).mockRejectedValue(new Error('offline'));
  await mount();
  expect(await screen.findByText('Progress unavailable', {}, { timeout: 10000 })).toBeOnTheScreen();
  expect(getParentLearningStatus).toHaveBeenCalledTimes(4);
  expect(screen.getByRole('button', { name: 'Tap to try again.' })).toBeEnabled(); expectNeutral();
});

it.each([false, true])('successful projection preserves the populated=%s headline', async populated => {
  jest.mocked(getParentLearningStatus).mockResolvedValue(projection(populated));
  jest.mocked(getParentLearningHistory).mockResolvedValue(projection(populated).recentSessions);
  await mount();
  expect(await screen.findByText(populated ? '2 of 4 lessons' : 'No course path yet')).toBeOnTheScreen();
  expect(screen.getByText(populated ? 'Learning progress' : 'No practice yet')).toBeOnTheScreen();
  expect(screen.getByText(populated ? '5 min' : '0 min')).toBeOnTheScreen();
});

it('empty status waits for the initial nonempty history before deciding the headline', async () => {
  const history = deferred<Awaited<ReturnType<typeof getParentLearningHistory>>>();
  jest.mocked(getParentLearningStatus).mockResolvedValue(projection(false));
  jest.mocked(getParentLearningHistory).mockReturnValueOnce(history.promise);
  await mount();
  expect(appQueryClient.getQueryState(parentLearningStatusKey('child-a'))?.status).toBe('success');
  expect(screen.getByText('Loading progress')).toBeOnTheScreen(); expectNeutral();
  await act(async () => history.resolve(projection().recentSessions));
  expect(await screen.findByText('5 min')).toBeOnTheScreen(); expectNeutral();
  expect(getParentLearningHistory).toHaveBeenCalledTimes(1);
});

it('initial history retry paused by NetInfo remains unknown after empty status succeeds', async () => {
  const history = deferred<Awaited<ReturnType<typeof getParentLearningHistory>>>();
  jest.mocked(getParentLearningStatus).mockResolvedValue(projection(false));
  jest.mocked(getParentLearningHistory).mockReturnValueOnce(history.promise);
  await mount(); await network(false);
  await act(async () => history.reject(new Error('connection lost')));
  await waitFor(() => expect(appQueryClient.getQueryState(parentLearningHistoryKey('child-a'))?.fetchStatus).toBe('paused'), { timeout: 3000 });
  expect(appQueryClient.getQueryData(parentLearningHistoryKey('child-a'))).toBeUndefined();
  await waitFor(() => expect(screen.queryByText('Loading progress')).not.toBeOnTheScreen()); expectNeutral();
  await network(true);
  expect(await screen.findByText('5 min')).toBeOnTheScreen(); expectNeutral();
  expect(getParentLearningHistory).toHaveBeenCalledTimes(2);
});

it('exhausted initial history failure cannot verify empty progress', async () => {
  jest.mocked(getParentLearningStatus).mockResolvedValue(projection(false));
  jest.mocked(getParentLearningHistory).mockRejectedValue(new Error('history unavailable'));
  await mount();
  await waitFor(() => expect(appQueryClient.getQueryState(parentLearningHistoryKey('child-a'))?.status).toBe('error'), { timeout: 10000 });
  expect(getParentLearningHistory).toHaveBeenCalledTimes(4);
  expect(await screen.findByText('No course path yet')).toBeOnTheScreen(); expectNeutral();
});

it.each([false, true])('successful same-child populated=%s cache survives offline and refetch failure', async populated => {
  jest.mocked(getParentLearningStatus).mockResolvedValue(projection(populated));
  jest.mocked(getParentLearningHistory).mockResolvedValue(projection(populated).recentSessions);
  await mount();
  expect(await screen.findByText(populated ? '2 of 4 lessons' : 'No course path yet')).toBeOnTheScreen();
  const cached = appQueryClient.getQueryData(parentLearningHistoryKey('child-a'));
  await network(false);
  expect(screen.getByText(populated ? 'Learning progress' : 'No practice yet')).toBeOnTheScreen();
  expect(getParentLearningHistory).toHaveBeenCalledTimes(1);
  jest.mocked(getParentLearningStatus).mockRejectedValue(new Error('status unavailable'));
  jest.mocked(getParentLearningHistory).mockRejectedValue(new Error('history unavailable'));
  await network(true);
  await waitFor(() => expect(appQueryClient.getQueryState(parentLearningHistoryKey('child-a'))?.status).toBe('error'), { timeout: 10000 });
  await waitFor(() => expect(appQueryClient.isFetching()).toBe(0));
  expect(appQueryClient.getQueryData(parentLearningHistoryKey('child-a'))).toBe(cached);
  expect(screen.getByText(populated ? 'Learning progress' : 'No practice yet')).toBeOnTheScreen();
  expect(screen.getByText(populated ? '5 min' : '0 min')).toBeOnTheScreen();
  expect(getParentLearningStatus).toHaveBeenCalledTimes(5); expect(getParentLearningHistory).toHaveBeenCalledTimes(5);
});

it('public household selection cannot use a previous child projection for offline entry', async () => {
  await mount();
  expect(await screen.findByText('2 of 4 lessons')).toBeOnTheScreen();
  await network(false);
  await userEvent.setup().press(screen.getByRole('button', { name: 'Select Child B' }));
  expect(appQueryClient.getQueryState(parentLearningStatusKey('child-b'))).toMatchObject({ status: 'pending', fetchStatus: 'paused' });
  expect(screen.queryByText('2 of 4 lessons')).not.toBeOnTheScreen();
  expect(screen.queryByText('5 min')).not.toBeOnTheScreen(); expectNeutral();
  jest.mocked(getParentLearningStatus).mockResolvedValue(projection(false, 'child-b'));
  jest.mocked(getParentLearningHistory).mockResolvedValue(projection(false, 'child-b').recentSessions);
  await network(true);
  expect(await screen.findByText('No practice yet')).toBeOnTheScreen();
  expect(screen.getByText('0 min')).toBeOnTheScreen();
  expect(jest.mocked(getParentLearningStatus).mock.calls).toEqual([['child-a'], ['child-b']]);
  expect(jest.mocked(getParentLearningHistory).mock.calls).toEqual([['child-a', null], ['child-b', null]]);
});

it('parent history offline entry stays unknown and reconnects to an exact child report', async () => {
  const history = deferred<Awaited<ReturnType<typeof getParentLearningHistory>>>();
  jest.mocked(getParentLearningHistory).mockReturnValueOnce(history.promise);
  await mount(false, 'history');
  expect(appQueryClient.getQueryState(parentLearningHistoryKey('child-a'))).toMatchObject({ status: 'pending', fetchStatus: 'paused' });
  expect(getParentLearningHistory).not.toHaveBeenCalled();
  expect(getParentLearningStatus).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Go back' })).toBeEnabled();
  expect(screen.queryByText('No completed lessons yet')).not.toBeOnTheScreen();
  expect(screen.getByText('Loading lesson history')).toBeOnTheScreen();
  await userEvent.setup().press(screen.getByRole('button', { name: 'Go back' }));
  expect(navigation.navigate.mock.calls).toEqual([['ParentSummaryScreen']]);
  await network(true);
  expect(screen.getByText('Loading lesson history')).toBeOnTheScreen();
  await act(async () => history.resolve(projection().recentSessions));
  expect(await screen.findByRole('button', { name: 'Open report for Barn' })).toBeEnabled();
  expect(screen.getByText('Farm animals')).toBeOnTheScreen();
  expect(screen.getByText(/5 min/)).toBeOnTheScreen();
  await userEvent.setup().press(screen.getByRole('button', { name: 'Open report for Barn' }));
  expect(navigation.navigate.mock.calls).toEqual([
    ['ParentSummaryScreen'], ['ParentSessionReportScreen', { childId: 'child-a', sessionId: 'session-child-a' }],
  ]);
  expect(jest.mocked(getParentLearningHistory).mock.calls).toEqual([['child-a', null]]);
  expect(getParentLearningStatus).not.toHaveBeenCalled();
});

it('parent history ordinary loading remains neutral', async () => {
  const history = deferred<Awaited<ReturnType<typeof getParentLearningHistory>>>();
  jest.mocked(getParentLearningHistory).mockReturnValueOnce(history.promise);
  await mount(true, 'history');
  expect(screen.getByText('Loading lesson history')).toBeOnTheScreen();
  expect(screen.queryByText('No completed lessons yet')).not.toBeOnTheScreen();
});

it('parent history successful empty response preserves the verified empty message', async () => {
  jest.mocked(getParentLearningHistory).mockResolvedValue(projection(false).recentSessions);
  await mount(true, 'history');
  expect(await screen.findByText('No completed lessons yet')).toBeOnTheScreen();
  expect(screen.queryByText('Loading lesson history')).not.toBeOnTheScreen();
  expect(getParentLearningHistory).toHaveBeenCalledTimes(1);
});

it('parent history keeps initial error and explicit Retry recovery', async () => {
  jest.mocked(getParentLearningHistory).mockRejectedValue(new Error('history offline'));
  await mount(true, 'history');
  expect(await screen.findByText('Lesson history is offline', {}, { timeout: 10000 })).toBeOnTheScreen();
  expect(screen.queryByText('Loading lesson history')).not.toBeOnTheScreen();
  expect(screen.queryByText('No completed lessons yet')).not.toBeOnTheScreen();
  expect(getParentLearningHistory).toHaveBeenCalledTimes(4);
  jest.mocked(getParentLearningHistory).mockResolvedValue(projection().recentSessions);
  await userEvent.setup().press(screen.getByRole('button', { name: 'Retry lesson history' }));
  expect(await screen.findByRole('button', { name: 'Open report for Barn' })).toBeEnabled();
  expect(getParentLearningHistory).toHaveBeenCalledTimes(5);
});

it.each([false, true])('parent history same-child populated=%s cache preserves offline and error priority', async populated => {
  jest.mocked(getParentLearningHistory).mockResolvedValue(projection(populated).recentSessions);
  await mount(true, 'history');
  expect(await screen.findByText(populated ? 'Barn' : 'No completed lessons yet')).toBeOnTheScreen();
  const cached = appQueryClient.getQueryData(parentLearningHistoryKey('child-a'));
  await network(false);
  expect(screen.getByText(populated ? 'Barn' : 'No completed lessons yet')).toBeOnTheScreen();
  expect(getParentLearningHistory).toHaveBeenCalledTimes(1);
  jest.mocked(getParentLearningHistory).mockRejectedValue(new Error('history offline'));
  await network(true);
  expect(await screen.findByText('Lesson history is offline', {}, { timeout: 10000 })).toBeOnTheScreen();
  expect(appQueryClient.getQueryData(parentLearningHistoryKey('child-a'))).toBe(cached);
  expect(screen.getByRole('button', { name: 'Retry lesson history' })).toBeEnabled();
  expect(screen.queryByText('Loading lesson history')).not.toBeOnTheScreen();
  expect(getParentLearningHistory).toHaveBeenCalledTimes(5);
});
