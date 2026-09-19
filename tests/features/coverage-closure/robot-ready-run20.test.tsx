import React from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import RobotReadyScreen from '@/features/course-library/screens/RobotReadyScreen';
import { getCurrentAssignment, getPreloadStatus, normalizeCurrentAssignmentPayload, type PreloadStatus } from '@/services/api/course-library.api';

jest.mock('@/services/api/course-library.api', () => ({
  ...jest.requireActual('@/services/api/course-library.api'),
  getCurrentAssignment: jest.fn(), getPreloadStatus: jest.fn(),
}));
const deviceId = '22222222-2222-4222-8222-222222222222';
const childId = '11111111-1111-4111-8111-111111111111';
const navigation = { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() };
const listeners = new Set<(state: AppStateStatus) => void>();
const preload = (state: PreloadStatus['state']): PreloadStatus => ({ assignmentId: 'asg-1', state, profile: 'espTft', criticalTotal: 1, criticalReady: 1, assets: [] });
const current = (state: 'READY' | 'RUNNING', sessionId: string | null) => normalizeCurrentAssignmentPayload({ data: { assignment: {
  assignment_id: 'asg-1', assignment_version: 1, child_id: childId, lesson_id: 'w01', lesson_title: 'Greetings', lesson_version: 1, manifest_checksum: 'f'.repeat(64), profile: 'espTft', state, session_id: sessionId,
} } });
async function flush() { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); }
function ready(params: object | undefined) {
  return <RobotReadyScreen navigation={navigation as never} route={{ key: 'ready', name: 'RobotReadyScreen', params } as never} />;
}
beforeEach(() => {
  jest.resetAllMocks(); listeners.clear();
  jest.mocked(AppState.addEventListener).mockImplementation((_type, listener) => { listeners.add(listener as (state: AppStateStatus) => void); return { remove: () => listeners.delete(listener as (state: AppStateStatus) => void) }; });
});

it('opened without any route params it reports the missing robot and never reads the network', async () => {
  render(ready(undefined)); await flush();
  expect(screen.getAllByText("We can't prepare Robot because no device was selected.")).toHaveLength(2);
  expect(getPreloadStatus).not.toHaveBeenCalled();
  expect(getCurrentAssignment).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('button', { name: 'Pick a different lesson' }));
  expect(navigation.navigate.mock.calls).toEqual([['SendToRobotScreen']]);
});

it('a lesson already running without a session hands off to Running without inventing one', async () => {
  jest.mocked(getPreloadStatus).mockResolvedValue(preload('RUNNING'));
  jest.mocked(getCurrentAssignment).mockResolvedValue(current('RUNNING', null));
  render(ready({ deviceId, childId, assignmentId: 'asg-1', assignmentVersion: 1 })); await flush();
  expect(navigation.navigate.mock.calls).toEqual([['RunningScreen', {
    deviceId, childId, assignmentId: 'asg-1', assignmentVersion: 1, sessionId: undefined, lessonTitle: 'Greetings',
  }]]);
  expect(navigation.navigate.mock.calls[0][1]).not.toHaveProperty('sessionId', 'asg-1');
});

it('a hand-off tap in the same frame as backgrounding is ignored and works again after returning', async () => {
  jest.mocked(getPreloadStatus).mockResolvedValue(preload('READY'));
  jest.mocked(getCurrentAssignment).mockResolvedValue(current('READY', null));
  render(ready({ deviceId, childId, assignmentId: 'asg-1', assignmentVersion: 1 })); await flush();
  const handoff = screen.getByRole('button', { name: 'Hand it to your child' });
  expect(handoff).toBeEnabled();
  act(() => { listeners.forEach(listener => listener('background')); fireEvent.press(handoff); });
  expect(navigation.navigate).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Preparing…' })).toBeDisabled();
  await act(async () => { listeners.forEach(listener => listener('active')); }); await flush();
  fireEvent.press(screen.getByRole('button', { name: 'Hand it to your child' }));
  expect(navigation.navigate.mock.calls).toEqual([['RunningScreen', expect.objectContaining({ assignmentId: 'asg-1', childId })]]);
  expect(getPreloadStatus).toHaveBeenCalledTimes(2);
});
