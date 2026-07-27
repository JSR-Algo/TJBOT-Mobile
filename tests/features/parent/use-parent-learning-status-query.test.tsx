import React from 'react';
import { AppState } from 'react-native';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { parentLearningStatusKey, useParentLearningStatusQuery } from '@/features/parent/hooks/useParentLearningStatusQuery';
import { getParentLearningStatus } from '@/services/api/parentLearning.api';
import { openParentProgressRealtime } from '@/services/ws/parentProgressRealtime';

jest.mock('@/services/api/parentLearning.api', () => ({ getParentLearningStatus: jest.fn() }));
jest.mock('@/services/ws/parentProgressRealtime', () => ({ openParentProgressRealtime: jest.fn() }));
const mockStatus = getParentLearningStatus as jest.MockedFunction<typeof getParentLearningStatus>;
const mockRealtime = openParentProgressRealtime as jest.MockedFunction<typeof openParentProgressRealtime>;
let appStateChange: ((state: string) => void) | undefined;

const active = { activeLearning: { assignmentId: 'a', sessionId: null, deviceId: 'd', courseId: 'c', courseTitle: 'C', lessonId: 'l', lessonTitle: 'L', state: 'READY', startedAt: null, currentStep: null, positionPercent: 0, activeDurationSec: 0 }, recentSessions: { items: [], nextCursor: null }, courseProgress: [], projectionRevision: '1' } as Awaited<ReturnType<typeof getParentLearningStatus>>;

describe('useParentLearningStatusQuery', () => {
  beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); appStateChange = undefined; (AppState as unknown as { currentState: string }).currentState = 'active'; (AppState.addEventListener as jest.Mock).mockImplementation((_event: string, listener: (state: string) => void) => { appStateChange = listener; return { remove: jest.fn() }; }); mockStatus.mockResolvedValue(active); mockRealtime.mockResolvedValue({ url: 'wss://x/parent-progress', close: jest.fn(), send: jest.fn() }); });
  afterEach(() => jest.useRealTimers());

  it('uses the canonical key and fetches immediately on mount', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    const wrapper = ({ children }: React.PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    expect(parentLearningStatusKey('child-1')).toEqual(['parent-learning-status', 'child-1']);
    renderHook(() => useParentLearningStatusQuery('child-1'), { wrapper });
    await waitFor(() => expect(mockStatus).toHaveBeenCalledWith('child-1'));
  });

  it('polls every 10 seconds only after three reconnect failures and stops in background', async () => {
    let callbacks: Parameters<typeof openParentProgressRealtime>[2] | undefined;
    mockRealtime.mockImplementation(async (_child, _revision, nextCallbacks) => { callbacks = nextCallbacks; return { url: 'wss://x', close: jest.fn(), send: jest.fn() }; });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    const wrapper = ({ children }: React.PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    renderHook(() => useParentLearningStatusQuery('child-1'), { wrapper });
    await waitFor(() => expect(callbacks).toBeDefined());
    await act(async () => { callbacks?.onReconnectExhausted(); await Promise.resolve(); });
    for (let count = 0; count < 3; count += 1) await act(async () => { await jest.advanceTimersByTimeAsync(10_000); });
    await waitFor(() => expect(mockStatus.mock.calls.length).toBeGreaterThanOrEqual(4));
    const beforeBackground = mockStatus.mock.calls.length;
    act(() => { (AppState as unknown as { currentState: string }).currentState = 'background'; appStateChange?.('background'); });
    jest.advanceTimersByTime(20_000);
    expect(mockStatus).toHaveBeenCalledTimes(beforeBackground);
  });
});
