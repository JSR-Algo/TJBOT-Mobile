import React from 'react';
import { AppState } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import RunningScreen from '@/features/course-library/screens/RunningScreen';
import LessonResumeScreen from '@/features/fallback/screens/LessonResumeScreen';
import LessonDoneScreen from '@/features/lesson-session/screens/LessonDoneScreen';
import { ROUTES } from '@/navigation/routes';
import { getAssignmentReadback, getCurrentAssignment, type CurrentAssignment } from '@/services/api/course-library.api';
import { clearRecoveryCheckpoint, writeRecoveryCheckpoint } from '@/features/fallback/recoveryCheckpointStore';
import { openRealtime } from '@/services/ws/realtime';
import type { LessonCheckpoint } from '@/features/fallback/recoveryTypes';

jest.mock('@/services/api/course-library.api', () => ({
  ...jest.requireActual('@/services/api/course-library.api'),
  getCurrentAssignment: jest.fn(), getAssignmentReadback: jest.fn(),
}));
jest.mock('@/features/fallback/recoveryCheckpointStore', () => ({ clearRecoveryCheckpoint: jest.fn(), writeRecoveryCheckpoint: jest.fn() }));
jest.mock('@/services/ws/realtime', () => ({ openRealtime: jest.fn() }));
jest.mock('@/services/observability/sentry', () => ({ captureError: jest.fn() }));

const A: CurrentAssignment = {
  assignmentId: '44444444-4444-4444-8444-444444444444', assignmentVersion: 2, childId: '11111111-1111-4111-8111-111111111111',
  lessonId: 'w01', lessonVersion: 1, lessonTitle: 'Greetings', manifestChecksum: 'a'.repeat(64), profile: 'espTft', state: 'RUNNING', sessionId: null,
};
const deviceId = '22222222-2222-4222-8222-222222222222';
const navigation = { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() };
async function flush() { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); }
async function poll() { await act(async () => { jest.advanceTimersByTime(2500); await Promise.resolve(); await Promise.resolve(); }); }
function checkpoint(overrides: Partial<LessonCheckpoint> = {}): LessonCheckpoint {
  return { version: 1, lessonTitle: 'Greetings', progressLabel: '2 of 5', resumeTarget: ROUTES.RunningScreen, reason: 'voice_failed', phase: 'speaking',
    sessionState: 'active', authState: 'authenticated', deviceId, assignmentId: A.assignmentId, ...overrides };
}
beforeEach(() => {
  jest.resetAllMocks(); jest.useFakeTimers();
  jest.mocked(AppState.addEventListener).mockReturnValue({ remove: jest.fn() });
  jest.mocked(writeRecoveryCheckpoint).mockResolvedValue(undefined); jest.mocked(clearRecoveryCheckpoint).mockResolvedValue(undefined);
  jest.mocked(getAssignmentReadback).mockResolvedValue({ kind: 'none' });
  jest.mocked(openRealtime).mockResolvedValue({ url: 'inert', close: jest.fn(), send: jest.fn() });
});
afterEach(() => { jest.useRealTimers(); });

it('Running on a legacy route without a version does not attribute a terminal current record until the version is learned', async () => {
  jest.mocked(getCurrentAssignment)
    .mockResolvedValueOnce({ ...A, state: 'COMPLETED' })
    .mockResolvedValueOnce(A)
    .mockResolvedValue({ ...A, state: 'COMPLETED' });
  render(<RunningScreen navigation={navigation as never} route={{ key: 'run', name: 'RunningScreen', params: { deviceId, childId: A.childId, assignmentId: A.assignmentId } } as never} />);
  await flush();
  expect(screen.queryByText(/Finished!/)).not.toBeOnTheScreen();
  expect(clearRecoveryCheckpoint).not.toHaveBeenCalled();
  expect(writeRecoveryCheckpoint).not.toHaveBeenCalled();
  await poll();
  expect(writeRecoveryCheckpoint).toHaveBeenCalledWith(expect.objectContaining({ assignmentId: A.assignmentId, assignmentVersion: 2 }));
  expect(screen.queryByText(/Finished!/)).not.toBeOnTheScreen();
  await poll();
  expect(screen.getByText(/Finished!/)).toBeOnTheScreen();
  expect(clearRecoveryCheckpoint).toHaveBeenCalledTimes(1);
  expect(getCurrentAssignment).toHaveBeenCalledTimes(3);
});

it('a same-frame double tap on Try again re-verifies the lesson once', async () => {
  jest.mocked(getCurrentAssignment).mockRejectedValueOnce(new Error('offline')).mockResolvedValue(A);
  render(<LessonResumeScreen navigation={navigation as never} route={{ key: 'resume', name: ROUTES.LessonResumeScreen, params: { checkpoint: checkpoint() } } as never} />);
  await flush();
  const retry = screen.getByText('Try again');
  act(() => { fireEvent.press(retry); fireEvent.press(retry); });
  await flush();
  expect(getCurrentAssignment).toHaveBeenCalledTimes(2);
  expect(screen.getByText('Keep going')).toBeOnTheScreen();
  expect(clearRecoveryCheckpoint).not.toHaveBeenCalled();
});

it('a persisted progress label whose percent overflows renders an empty progress bar instead of failing', async () => {
  jest.mocked(getCurrentAssignment).mockResolvedValue(A);
  render(<LessonResumeScreen navigation={navigation as never} route={{ key: 'resume', name: ROUTES.LessonResumeScreen, params: { checkpoint: checkpoint({ progressLabel: `${'9'.repeat(400)}%` }) } } as never} />);
  await flush();
  expect(screen.getByText('Keep going')).toBeOnTheScreen();
  expect(screen.getByText(`${'9'.repeat(400)}%`)).toBeOnTheScreen();
  expect(JSON.stringify(screen.toJSON())).toContain('{"width":"0%"}');
});

it('Done shows the real practiced word count only when the lesson reports a positive count', () => {
  const { rerender } = render(<LessonDoneScreen navigation={navigation as never} route={{ key: 'done', name: ROUTES.LessonDoneScreen, params: { wordsLearned: 4 } } as never} />);
  expect(screen.getByText(/You practiced 4 words today/)).toBeOnTheScreen();
  rerender(<LessonDoneScreen navigation={navigation as never} route={{ key: 'done', name: ROUTES.LessonDoneScreen, params: { wordsLearned: 0 } } as never} />);
  expect(screen.queryByText(/You practiced/)).not.toBeOnTheScreen();
  expect(screen.getByText(/Robot saved today's progress/)).toBeOnTheScreen();
});
