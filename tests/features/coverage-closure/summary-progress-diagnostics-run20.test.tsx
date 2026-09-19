import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ROUTES } from '@/navigation/routes';
import LessonSummaryScreen from '@/features/progress/screens/LessonSummaryScreen';
import { buildCanonicalProgressDashboard } from '@/features/progress/hooks/useChildProgressDashboardQuery';
import { logParentProgressDiagnostic, setParentProgressDiagnosticsEnabledForTest } from '@/services/observability/parentProgressDiagnostics';
import { compareProjectionRevisions, openParentProgressRealtime } from '@/services/ws/parentProgressRealtime';
import type { ParentLearningStatus } from '@/services/api/parentLearning.api';
import type { RealtimeSocket } from '@/services/ws/realtime';

const inbox = { rewards: [{
  rewardId: 'r-1', assignmentId: 'asg-1', sessionId: 'sess-1', child: { id: 'child-1', displayName: null }, robot: { id: 'dev-1', displayName: null },
  xp: 20, coins: 5,
}], count: 1 };
jest.mock('@/contexts/HouseholdContext', () => ({ useHousehold: () => ({ activeHousehold: { id: 'house-1' } }) }));
jest.mock('@/features/rewards/hooks/useRewards', () => ({ useRewardInboxQuery: () => ({ data: inbox, isError: false, refetch: jest.fn() }) }));

it('Summary celebrates the persisted reward with its exact identity and shows placeholders for unnamed parties', () => {
  const navigation = { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() };
  render(<LessonSummaryScreen navigation={navigation as never} route={{ key: 's', name: ROUTES.LessonSummaryScreen, params: { assignmentId: 'asg-1', sessionId: 'sess-1' } } as never} />);
  expect(screen.getByText('— · —')).toBeOnTheScreen();
  expect(screen.getByText('20 XP · 5 coins')).toBeOnTheScreen();
  fireEvent.press(screen.getByText('Celebrate reward'));
  expect(navigation.navigate.mock.calls).toEqual([[ROUTES.CelebrationScreen, { rewardId: 'r-1', childId: 'child-1', deviceId: 'dev-1', assignmentId: 'asg-1', sessionId: 'sess-1' }]]);
});

it('an invalid dashboard clock attributes no sessions to today, even ones without a valid completion time', () => {
  const status: ParentLearningStatus = {
    activeLearning: null, projectionRevision: '3', courseProgress: [],
    recentSessions: { items: [{ childId: 'c', assignmentId: 'a', sessionId: 's', courseId: 'course', courseTitle: 'English', lessonId: 'l', lessonTitle: 'Farm', terminalState: 'COMPLETED', startedAt: 'never', completedAt: 'not-a-time', durationSec: 60, reportAvailable: false }], nextCursor: null },
  };
  expect(buildCanonicalProgressDashboard(status, undefined, Number.NaN)).toMatchObject({ completedSessions: 1, recentDurationSec: 60, todayLessonsCompleted: 0, todayActiveSec: 0 });
});

describe('diagnostics expiry accepts an ISO timestamp', () => {
  const info = jest.spyOn(console, 'info').mockImplementation(() => undefined);
  const original = { enabled: process.env.EXPO_PUBLIC_PARENT_PROGRESS_DIAGNOSTICS, until: process.env.EXPO_PUBLIC_PARENT_PROGRESS_DIAGNOSTICS_UNTIL };
  afterAll(() => {
    setParentProgressDiagnosticsEnabledForTest(null); info.mockRestore();
    process.env.EXPO_PUBLIC_PARENT_PROGRESS_DIAGNOSTICS = original.enabled; process.env.EXPO_PUBLIC_PARENT_PROGRESS_DIAGNOSTICS_UNTIL = original.until;
  });
  it('emits until a future ISO expiry and stops after a past one', () => {
    setParentProgressDiagnosticsEnabledForTest(null);
    process.env.EXPO_PUBLIC_PARENT_PROGRESS_DIAGNOSTICS = 'true';
    process.env.EXPO_PUBLIC_PARENT_PROGRESS_DIAGNOSTICS_UNTIL = '2999-01-01T00:00:00Z';
    logParentProgressDiagnostic({ source: 'ws', decision: 'receive', childId: 'child-secret', revision: '8' });
    expect(info).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(info.mock.calls[0])).not.toContain('child-secret');
    process.env.EXPO_PUBLIC_PARENT_PROGRESS_DIAGNOSTICS_UNTIL = '2000-01-01T00:00:00Z';
    logParentProgressDiagnostic({ source: 'ws', decision: 'receive', childId: 'child-secret', revision: '9' });
    expect(info).toHaveBeenCalledTimes(1);
  });
});

class FakeSocket implements RealtimeSocket {
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((event: { message?: string }) => void) | null = null;
  onclose: ((event: { code: number; reason: string; wasClean?: boolean }) => void) | null = null;
  sent: string[] = [];
  send(data: string) { this.sent.push(data); }
  close() {}
}

it('a malformed persisted revision resubscribes from zero and still applies the first real snapshot', async () => {
  const socket = new FakeSocket();
  const onStatus = jest.fn();
  const connection = await openParentProgressRealtime('child-1', 'not-a-revision', { onStatus, onInvalidate: jest.fn(), onAuthExpired: jest.fn(), onAccessRevoked: jest.fn(), onReconnectExhausted: jest.fn() },
    { baseUrl: 'https://api.test/v1', createSocket: () => socket, tokenProvider: async () => 'jwt', reconnect: false });
  socket.onopen?.();
  expect(socket.sent).toEqual(['{"type":"subscribe","childId":"child-1","lastProjectionRevision":"0"}']);
  socket.onmessage?.({ data: JSON.stringify({ type: 'lesson.progress.snapshot', childId: 'child-1', projectionRevision: '1', status: { activeLearning: null, recentSessions: { items: [], nextCursor: null }, courseProgress: [], projectionRevision: '1' } }) });
  expect(onStatus).toHaveBeenCalledTimes(1);
  expect(compareProjectionRevisions('not-a-revision', '0')).toBe(0);
  connection.close();
});
