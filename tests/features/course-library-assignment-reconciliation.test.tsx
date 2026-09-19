import React from 'react';
import { AppState } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import RunningScreen from '@/features/course-library/screens/RunningScreen';
import CompanionScreen from '@/features/course-library/screens/CompanionScreen';
import RobotReadyScreen from '@/features/course-library/screens/RobotReadyScreen';
import { getCurrentAssignment, getAssignmentReadback, getPreloadStatus, type CurrentAssignment } from '@/services/api/course-library.api';
import { clearRecoveryCheckpoint, writeRecoveryCheckpoint } from '@/features/fallback/recoveryCheckpointStore';
import { openRealtime } from '@/services/ws/realtime';
import { captureError } from '@/services/observability/sentry';

jest.mock('@/services/api/course-library.api', () => ({
  ...jest.requireActual('@/services/api/course-library.api'),
  getCurrentAssignment: jest.fn(), getPreloadStatus: jest.fn(), getAssignmentReadback: jest.fn(),
}));
jest.mock('@/features/fallback/recoveryCheckpointStore', () => ({
  clearRecoveryCheckpoint: jest.fn(), writeRecoveryCheckpoint: jest.fn(),
}));
jest.mock('@/services/ws/realtime', () => ({ openRealtime: jest.fn() }));
jest.mock('@/services/observability/sentry', () => ({ captureError: jest.fn() }));

const currentRead = jest.mocked(getCurrentAssignment);
const preloadRead = jest.mocked(getPreloadStatus);
const cleared = jest.mocked(clearRecoveryCheckpoint);
const written = jest.mocked(writeRecoveryCheckpoint);
const A: CurrentAssignment = {
  assignmentId: '44444444-4444-4444-8444-444444444444', assignmentVersion: 1,
  childId: '11111111-1111-4111-8111-111111111111', lessonId: 'w01-greetings-politeness',
  lessonVersion: 1, lessonTitle: 'Greetings', manifestChecksum: 'a'.repeat(64),
  profile: 'espTft', state: 'RUNNING', sessionId: '99999999-9999-4999-8999-999999999999',
};
const params = { deviceId: '22222222-2222-4222-8222-222222222222', childId: A.childId,
  assignmentId: A.assignmentId, assignmentVersion: A.assignmentVersion, manifestChecksum: A.manifestChecksum };
const navigation = { navigate: jest.fn(), goBack: jest.fn(), replace: jest.fn() };
async function flush(): Promise<void> {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}
async function poll(): Promise<void> {
  await act(async () => { jest.advanceTimersByTime(2500); await Promise.resolve(); await Promise.resolve(); });
}
beforeEach(() => {
  jest.resetAllMocks(); jest.useFakeTimers();
  jest.mocked(AppState.addEventListener).mockReturnValue({ remove: jest.fn() });
  written.mockResolvedValue(undefined); cleared.mockResolvedValue(undefined);
  jest.mocked(getAssignmentReadback).mockResolvedValue({ kind: 'none' });
  jest.mocked(openRealtime).mockResolvedValue({ url: 'inert', close: jest.fn(), send: jest.fn() });
});
afterEach(() => { jest.useRealTimers(); });

it.each(['RunningScreen', 'CompanionScreen'] as const)('%s does not complete or clear after active A disappears', async (name) => {
  currentRead.mockResolvedValueOnce(A).mockResolvedValue(null);
  const Component = name === 'RunningScreen' ? RunningScreen : CompanionScreen;
  render(<Component navigation={navigation as never} route={{ key: name, name, params } as never} />);
  await flush();
  expect(written).toHaveBeenCalled();
  await poll();
  expect(screen.queryByText(/Finished!/)).not.toBeOnTheScreen();
  expect(cleared).not.toHaveBeenCalled();
});

it('Ready does not navigate replacement B under selected child A', async () => {
  const B = { ...A, assignmentId: '55555555-5555-4555-8555-555555555555', assignmentVersion: 2,
    childId: '33333333-3333-4333-8333-333333333333', state: 'READY' as const };
  currentRead.mockResolvedValue(B);
  preloadRead.mockResolvedValue({ assignmentId: B.assignmentId, state: 'READY', profile: 'espTft', criticalTotal: 1, criticalReady: 1, assets: [] });
  render(<RobotReadyScreen navigation={navigation as never} route={{ key: 'ready', name: 'RobotReadyScreen', params } as never} />);
  await flush();
  const handoff = screen.queryByText('Hand it to your child');
  if (handoff) fireEvent.press(handoff);
  expect(navigation.navigate).not.toHaveBeenCalled();
  expect(handoff).not.toBeOnTheScreen();
});

function mounted(name: 'RunningScreen' | 'CompanionScreen', selected: typeof params | object = params) {
  const Component = name === 'RunningScreen' ? RunningScreen : CompanionScreen;
  return render(<Component navigation={navigation as never} route={{ key: name, name, params: selected } as never} />);
}
const readback = jest.mocked(getAssignmentReadback);
const listeningFrame = { type: 'turn.started', turn_id: 'turn-1', turn_count: 1, phase: 'listening' };
const terminal = (state: 'COMPLETED' | 'FAILED' | 'CANCELLED', version = 1, id = A.assignmentId) =>
  ({ kind: 'terminal' as const, terminal: { assignmentId: id, assignmentVersion: version, state } });

for (const name of ['RunningScreen', 'CompanionScreen'] as const) {
  it(`${name} suppresses duplicate polls and phase checkpoints while retaining terminal clearing`, async () => {
    currentRead.mockResolvedValue(A);
    mounted(name); await flush();
    const onFrame = jest.mocked(openRealtime).mock.calls[0][1]?.onFrame;
    expect(written).toHaveBeenCalledTimes(1);
    await poll(); await poll();
    expect(written).toHaveBeenCalledTimes(1);
    act(() => { onFrame?.(listeningFrame); onFrame?.(listeningFrame); });
    await flush(); await poll();
    expect(written).toHaveBeenCalledTimes(2);
    expect(written).toHaveBeenLastCalledWith(expect.objectContaining({ phase: 'listening', assignmentId: A.assignmentId }));
    act(() => onFrame?.({ type: 'session.end', end_reason: 'completed', summary_available: true }));
    await flush();
    expect(cleared).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Finished!/)).toBeOnTheScreen();
  });

  it(`${name} invalidates an old queued checkpoint before executing the new selection write`, async () => {
    let resolveWrite: () => void = () => { throw new Error('write not started'); };
    written.mockImplementationOnce(() => new Promise(resolve => { resolveWrite = resolve; }));
    currentRead.mockResolvedValue(A);
    const rendered = mounted(name); await flush();
    const onFrame = jest.mocked(openRealtime).mock.calls[0][1]?.onFrame;
    act(() => onFrame?.(listeningFrame)); await flush();
    expect(written).toHaveBeenCalledTimes(1);
    const B = { ...A, assignmentId: '55555555-5555-4555-8555-555555555555', sessionId: '88888888-8888-4888-8888-888888888888' };
    currentRead.mockResolvedValue(B);
    const Component = name === 'RunningScreen' ? RunningScreen : CompanionScreen;
    rendered.rerender(<Component navigation={navigation as never} route={{ key: name, name, params: { ...params, assignmentId: B.assignmentId } } as never} />);
    await flush();
    await act(async () => { resolveWrite(); }); await flush();
    expect(written).toHaveBeenCalledTimes(2);
    expect(written.mock.calls.map(([checkpoint]) => [checkpoint.assignmentId, checkpoint.phase])).toEqual([
      [A.assignmentId, 'speaking'], [B.assignmentId, 'speaking'],
    ]);
    expect(cleared).not.toHaveBeenCalled();
  });

  it.each(['mounted', 'unmounted'] as const)(`${name} handles observer rejection when %s`, async lifetime => {
    const error = new Error('observer connection rejected');
    let rejectOpen: (reason: Error) => void = () => { throw new Error('observer not requested'); };
    jest.mocked(openRealtime).mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectOpen = reject; }));
    currentRead.mockResolvedValue(A);
    const rendered = mounted(name); await flush();
    if (lifetime === 'unmounted') rendered.unmount();
    await act(async () => { rejectOpen(error); });
    if (lifetime === 'mounted') {
      expect(captureError).toHaveBeenCalledWith(error);
      await poll(); expect(currentRead).toHaveBeenCalledTimes(2);
      expect(screen.getByText(A.lessonTitle)).toBeOnTheScreen();
    } else expect(captureError).not.toHaveBeenCalled();
    expect(cleared).not.toHaveBeenCalled();
  });

  it(`${name} closes a removed session and persists the session-free checkpoint`, async () => {
    const close = jest.fn();
    jest.mocked(openRealtime).mockResolvedValue({ url: 'inert', close, send: jest.fn() });
    currentRead.mockResolvedValueOnce(A).mockResolvedValue({ ...A, sessionId: null });
    mounted(name); await flush(); await poll();
    expect(close).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledWith(1000, 'assignment observer changed');
    expect(openRealtime).toHaveBeenCalledTimes(1);
    expect(written).toHaveBeenCalledTimes(2);
    expect(written.mock.calls[1][0]).not.toHaveProperty('sessionId');
    expect(cleared).not.toHaveBeenCalled();
    await poll(); expect(written).toHaveBeenCalledTimes(2);
  });

  it(`${name} closes an observer that resolves after its session was removed`, async () => {
    let resolveOpen: (connection: Awaited<ReturnType<typeof openRealtime>>) => void = () => { throw new Error('observer not requested'); };
    const close = jest.fn();
    jest.mocked(openRealtime).mockImplementationOnce(() => new Promise(resolve => { resolveOpen = resolve; }));
    currentRead.mockResolvedValueOnce(A).mockResolvedValue({ ...A, sessionId: null });
    mounted(name); await flush(); await poll();
    await act(async () => { resolveOpen({ url: 'inert', close, send: jest.fn() }); });
    expect(close).toHaveBeenCalledWith(1000, 'observer no longer selected');
    expect(cleared).not.toHaveBeenCalled();
    expect(written.mock.calls[1][0]).not.toHaveProperty('sessionId');
  });

  it(`${name} retains recovery data for unsupported current state and accepts the next valid read`, async () => {
    currentRead.mockResolvedValueOnce({ ...A, state: 'UNASSIGNED' }).mockResolvedValue(A);
    mounted(name); await flush();
    expect(written).not.toHaveBeenCalled(); expect(cleared).not.toHaveBeenCalled();
    expect(openRealtime).not.toHaveBeenCalled();
    expect(screen.queryByText(A.lessonTitle)).not.toBeOnTheScreen();
    await poll();
    expect(written).toHaveBeenCalledTimes(1); expect(openRealtime).toHaveBeenCalledTimes(1);
    expect(screen.getByText(A.lessonTitle)).toBeOnTheScreen();
  });

  it(`${name} retries a rejected checkpoint write on the next unchanged poll`, async () => {
    const error = new Error('checkpoint storage rejected');
    written.mockRejectedValueOnce(error);
    currentRead.mockResolvedValue(A);
    mounted(name); await flush();
    expect(captureError).toHaveBeenCalledWith(error);
    await poll();
    expect(written).toHaveBeenCalledTimes(2);
    expect(written.mock.calls[1]).toEqual(written.mock.calls[0]);
    expect(cleared).not.toHaveBeenCalled();
  });

  it.each(['COMPLETED', 'FAILED', 'CANCELLED'] as const)(`${name} reconciles minimal %s before any active read`, async (state) => {
    currentRead.mockResolvedValue(null); readback.mockResolvedValue(terminal(state));
    mounted(name); await flush();
    expect(cleared).toHaveBeenCalledTimes(1);
    expect(written).not.toHaveBeenCalled();
    if (state === 'COMPLETED') expect(screen.getByText(/Finished!/)).toBeOnTheScreen();
    else { expect(screen.queryByText(/Finished!/)).toBeNull(); expect(screen.getByText('Robot could not finish this lesson.')).toBeOnTheScreen(); }
    await poll(); expect(cleared).toHaveBeenCalledTimes(1);
    expect(currentRead).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('See lesson reward')).toBeNull();
  });

  it.each(['none', 'other-terminal', 'new-version', 'replacement-active', 'malformed', 'request-error'] as const)(`${name} retains checkpoint and offers bounded retry for %s`, async (scenario) => {
    currentRead.mockResolvedValueOnce(A).mockResolvedValue(null);
    if (scenario === 'other-terminal') readback.mockResolvedValue(terminal('COMPLETED', 1, 'other'));
    if (scenario === 'new-version') readback.mockResolvedValue(terminal('COMPLETED', 2));
    if (scenario === 'replacement-active') readback.mockResolvedValue({ kind: 'active', assignment: { ...A, assignmentId: 'other', lessonTitle: 'Replacement' } });
    if (scenario === 'malformed') readback.mockRejectedValue(new Error('Invalid assignment readback'));
    if (scenario === 'request-error') currentRead.mockResolvedValueOnce(null).mockRejectedValue(new Error('inert read failure'));
    mounted(name); await flush();
    for (let i = 0; i < 18; i += 1) await poll();
    expect(screen.queryByText(/Finished!/)).toBeNull();
    expect(screen.queryByText('Replacement')).toBeNull();
    expect(cleared).not.toHaveBeenCalled();
    expect(screen.getByText('Try again')).toBeOnTheScreen();
    const reads = currentRead.mock.calls.length;
    await poll(); expect(currentRead).toHaveBeenCalledTimes(reads);
    fireEvent.press(screen.getByText('Try again')); await flush();
    expect(currentRead).toHaveBeenCalledTimes(reads + 1);
  });

  it.each([{}, { deviceId: params.deviceId }, { ...params, assignmentVersion: undefined }])(`${name} cannot infer missing identity from terminal %#`, async (selected) => {
    currentRead.mockResolvedValue(null); readback.mockResolvedValue(terminal('COMPLETED'));
    mounted(name, selected); await flush();
    expect(cleared).not.toHaveBeenCalled(); expect(screen.queryByText(/Finished!/)).toBeNull();
  });

  it(`${name} learns a legacy version only from matching active A`, async () => {
    currentRead.mockResolvedValueOnce(A).mockResolvedValue(null); readback.mockResolvedValue(terminal('COMPLETED'));
    mounted(name, { ...params, assignmentVersion: undefined }); await flush(); await poll();
    expect(screen.getByText(/Finished!/)).toBeOnTheScreen(); expect(cleared).toHaveBeenCalledTimes(1);
  });

  it(`${name} fences stale observer identity, duplicates and late live reads`, async () => {
    let resolveLate: ((value: CurrentAssignment) => void) | undefined;
    currentRead.mockResolvedValueOnce(A).mockImplementationOnce(() => new Promise(resolve => { resolveLate = resolve; }));
    mounted(name); await flush(); await poll();
    const onFrame = jest.mocked(openRealtime).mock.calls[0][1]?.onFrame;
    for (const mismatch of [{ session_id: 'old' }, { assignmentId: 'other' }, { assignmentVersion: 2 }]) {
      act(() => onFrame?.({ state: 'COMPLETED', ...mismatch }));
    }
    await flush(); expect(cleared).not.toHaveBeenCalled();
    act(() => { onFrame?.({ state: 'COMPLETED' }); onFrame?.({ state: 'FAILED' }); });
    await flush(); const writes = written.mock.calls.length;
    await act(async () => { resolveLate?.(A); });
    expect(cleared).toHaveBeenCalledTimes(1); expect(written).toHaveBeenCalledTimes(writes);
    expect(screen.getByText(/Finished!/)).toBeOnTheScreen();
  });

  it.each(['change', 'unmount'] as const)(`${name} rejects old terminal response after %s`, async action => {
    let resolveOld: ((value: Awaited<ReturnType<typeof getAssignmentReadback>>) => void) | undefined;
    currentRead.mockResolvedValue(null);
    readback.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; })).mockResolvedValue({ kind: 'none' });
    const rendered = mounted(name); await flush();
    if (action === 'unmount') rendered.unmount();
    else {
      const Component = name === 'RunningScreen' ? RunningScreen : CompanionScreen;
      rendered.rerender(<Component navigation={navigation as never} route={{ key: name, name, params: { ...params, deviceId: 'new-device' } } as never} />);
      await flush();
    }
    await act(async () => { resolveOld?.(terminal('COMPLETED')); });
    expect(cleared).not.toHaveBeenCalled(); expect(written).not.toHaveBeenCalled();
    if (action === 'change') expect(screen.queryByText(/Finished!/)).toBeNull();
  });
}

const readyA = { ...A, state: 'READY' as const };
const preloadA = { assignmentId: A.assignmentId, state: 'READY' as const, profile: A.profile, criticalTotal: 1, criticalReady: 1, assets: [] };
it.each(['matching', 'legacy'] as const)('Ready hands off verified %s identity and version', async scenario => {
  currentRead.mockResolvedValue(readyA); preloadRead.mockResolvedValue(preloadA);
  render(<RobotReadyScreen navigation={navigation as never} route={{ key: 'r', name: 'RobotReadyScreen', params: { ...params, assignmentVersion: scenario === 'legacy' ? undefined : 1 } } as never} />);
  await flush(); fireEvent.press(screen.getByText('Hand it to your child'));
  expect(navigation.navigate).toHaveBeenCalledWith('RunningScreen', {
    deviceId: params.deviceId, childId: A.childId, assignmentId: A.assignmentId, assignmentVersion: 1,
    sessionId: A.sessionId, lessonTitle: A.lessonTitle,
  });
});
it.each(['other-id', 'other-version', 'other-child', 'no-current', 'stale-preload', 'other-profile', 'no-checksum', 'route-checksum', 'not-ready', 'no-child', 'no-id'] as const)('Ready blocks %s', async scenario => {
  let current: CurrentAssignment | null = readyA;
  let selected: typeof params | object = params;
  let preloadValue = preloadA;
  if (scenario === 'other-id') current = { ...readyA, assignmentId: 'other' };
  if (scenario === 'other-version') current = { ...readyA, assignmentVersion: 2 };
  if (scenario === 'other-child') current = { ...readyA, childId: 'other' };
  if (scenario === 'no-current') current = null;
  if (scenario === 'stale-preload') preloadValue = { ...preloadA, assignmentId: 'other' };
  if (scenario === 'other-profile') preloadValue = { ...preloadA, profile: 'other' };
  if (scenario === 'no-checksum') current = { ...readyA, manifestChecksum: null };
  if (scenario === 'route-checksum') selected = { ...params, manifestChecksum: 'old' };
  if (scenario === 'not-ready') current = A;
  if (scenario === 'no-child') selected = { ...params, childId: undefined };
  if (scenario === 'no-id') selected = { ...params, assignmentId: undefined };
  currentRead.mockResolvedValue(current); preloadRead.mockResolvedValue(preloadValue);
  render(<RobotReadyScreen navigation={navigation as never} route={{ key: 'r', name: 'RobotReadyScreen', params: selected } as never} />);
  await flush(); expect(screen.queryByText('Hand it to your child')).toBeNull();
  if (scenario === 'not-ready') {
    // M03 monitors matching RUNNING; it still cannot authorize a READY handoff.
    expect(navigation.navigate).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).toHaveBeenCalledWith('RunningScreen', {
      deviceId: params.deviceId, childId: A.childId, assignmentId: A.assignmentId,
      assignmentVersion: A.assignmentVersion, sessionId: A.sessionId, lessonTitle: A.lessonTitle,
    });
  } else expect(navigation.navigate).not.toHaveBeenCalled();
  expect(screen.getByText('Pick a different lesson')).toBeOnTheScreen();
});
it('Ready ignores a delayed response for the previous device/selection', async () => {
  let resolveOld: ((value: CurrentAssignment) => void) | undefined;
  currentRead.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; })).mockResolvedValue(null);
  preloadRead.mockResolvedValue(preloadA);
  const rendered = render(<RobotReadyScreen navigation={navigation as never} route={{ key: 'r', name: 'RobotReadyScreen', params } as never} />);
  await flush();
  rendered.rerender(<RobotReadyScreen navigation={navigation as never} route={{ key: 'r', name: 'RobotReadyScreen', params: { ...params, deviceId: 'other', assignmentId: 'other' } } as never} />);
  await flush(); await act(async () => { resolveOld?.(readyA); });
  expect(screen.queryByText('Hand it to your child')).toBeNull();
  expect(screen.queryByText(A.lessonTitle)).toBeNull(); expect(navigation.navigate).not.toHaveBeenCalled();
});

for (const name of ['RunningScreen', 'CompanionScreen'] as const) {
  it(`${name} never adopts an active record without a selected assignment ID`, async () => {
    currentRead.mockResolvedValue(A);
    mounted(name, { deviceId: params.deviceId, childId: A.childId }); await flush();
    expect(written).not.toHaveBeenCalled(); expect(jest.mocked(openRealtime)).not.toHaveBeenCalled();
    expect(screen.queryByText(A.lessonTitle)).toBeNull();
  });
  it(`${name} closes a late observer and ignores old frames after selection changes`, async () => {
    let resolveOpen: ((connection: Awaited<ReturnType<typeof openRealtime>>) => void) | undefined;
    const close = jest.fn();
    jest.mocked(openRealtime).mockImplementationOnce(() => new Promise(resolve => { resolveOpen = resolve; }));
    currentRead.mockResolvedValueOnce(A).mockResolvedValue(null);
    const rendered = mounted(name); await flush();
    const oldFrame = jest.mocked(openRealtime).mock.calls[0][1]?.onFrame;
    const Component = name === 'RunningScreen' ? RunningScreen : CompanionScreen;
    rendered.rerender(<Component navigation={navigation as never} route={{ key: name, name, params: { ...params, assignmentId: 'other' } } as never} />);
    await flush(); const writes = written.mock.calls.length;
    await act(async () => { oldFrame?.({ state: 'COMPLETED' }); resolveOpen?.({ close, send: jest.fn(), url: 'inert' }); });
    expect(close).toHaveBeenCalledTimes(1); expect(cleared).not.toHaveBeenCalled();
    expect(written).toHaveBeenCalledTimes(writes);
  });
  it(`${name} keeps new checkpoint after an old pending write settles`, async () => {
    let resolveWrite: (() => void) | undefined;
    written.mockImplementationOnce(() => new Promise(resolve => { resolveWrite = resolve; }));
    const B = { ...A, assignmentId: 'other', sessionId: 'other-session' };
    currentRead.mockResolvedValueOnce(A).mockResolvedValue(B);
    const rendered = mounted(name); await flush();
    const oldFrame = jest.mocked(openRealtime).mock.calls[0][1]?.onFrame;
    const Component = name === 'RunningScreen' ? RunningScreen : CompanionScreen;
    rendered.rerender(<Component navigation={navigation as never} route={{ key: name, name, params: { ...params, assignmentId: B.assignmentId } } as never} />);
    await flush(); expect(written).toHaveBeenCalledTimes(1);
    await act(async () => { oldFrame?.({ state: 'COMPLETED' }); resolveWrite?.(); });
    expect(written).toHaveBeenCalledTimes(2);
    expect(written).toHaveBeenLastCalledWith(expect.objectContaining({ assignmentId: B.assignmentId }));
    expect(cleared).not.toHaveBeenCalled();
  });
}
