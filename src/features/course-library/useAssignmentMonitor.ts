import React from 'react';
import { getCurrentAssignment, getAssignmentReadback, type CurrentAssignment, type TerminalAssignment } from '@/services/api/course-library.api';
import { clearRecoveryCheckpoint, writeRecoveryCheckpoint } from '@/features/fallback/recoveryCheckpointStore';
import { checkpointFromCurrentAssignment, lessonObserverTerminalOutcome, lessonPhaseFromObserverFrame, type LessonPhase } from '@/features/fallback/recoveryTypes';
import { openRealtime, type RealtimeConnection } from '@/services/ws/realtime';
import { captureError } from '@/services/observability/sentry';
import { matchesActive, matchesObserver, matchesTerminal, type AssignmentSelection } from './assignmentReconciliation';

type MonitorState = {
  key: string;
  assignment: CurrentAssignment | null;
  finished: boolean;
  unsuccessful: boolean;
  stale: boolean;
};

export function useAssignmentMonitor(selection: AssignmentSelection) {
  const { deviceId, assignmentId, assignmentVersion, childId, sessionId } = selection;
  const key = JSON.stringify([deviceId, assignmentId, assignmentVersion, childId, sessionId]);
  const [retryNonce, retry] = React.useReducer((n: number) => n + 1, 0);
  const empty: MonitorState = { key, assignment: null, finished: false, unsuccessful: false, stale: false };
  const [state, setState] = React.useState<MonitorState>(empty);
  const queue = React.useRef<Promise<void>>(Promise.resolve());
  // A render with different selection invalidates callbacks before passive cleanup runs.
  const selectedKey = React.useRef(key);
  selectedKey.current = key;

  React.useEffect(() => {
    let active = true;
    let terminal = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let connection: RealtimeConnection | null = null;
    let observerGeneration = 0;
    let observerSession: string | null = null;
    let currentAssignment: CurrentAssignment | null = null;
    let phase: LessonPhase | null = null;
    let expected: AssignmentSelection = { deviceId, assignmentId, assignmentVersion, childId, sessionId };
    let settlingPolls = 0;
    let checkpointKey: string | null = null;
    const valid = () => active && selectedKey.current === key;
    const live = () => valid() && !terminal;
    setState({ key, assignment: null, finished: false, unsuccessful: false, stale: false });

    const enqueue = (nextKey: string, operation: () => Promise<void>) => {
      if (checkpointKey === nextKey) return;
      checkpointKey = nextKey;
      queue.current = queue.current.catch(captureError).then(async () => {
        if (!valid()) return;
        try { await operation(); } catch (error) {
          if (checkpointKey === nextKey) checkpointKey = null;
          captureError(error);
        }
      });
    };
    const persist = (current: CurrentAssignment) => {
      const checkpoint = checkpointFromCurrentAssignment(current, deviceId, phase);
      if (checkpoint) enqueue('write:' + JSON.stringify(checkpoint), () => writeRecoveryCheckpoint(checkpoint));
    };
    // Every caller checks live() synchronously before finishing.
    const finish = (successful: boolean) => {
      terminal = true;
      if (timer) clearTimeout(timer);
      enqueue('clear', clearRecoveryCheckpoint);
      setState((previous) => ({ ...previous, key, finished: successful, unsuccessful: !successful, stale: false }));
    };
    const attach = (current: CurrentAssignment) => {
      const nextSession = current.sessionId?.trim() || null;
      if (nextSession === observerSession) return;
      connection?.close(1000, 'assignment observer changed');
      connection = null;
      observerSession = nextSession;
      const generation = ++observerGeneration;
      if (!nextSession) return;
      void openRealtime(nextSession, { onFrame: (frame) => {
        if (!live() || generation !== observerGeneration || !currentAssignment ||
            !matchesObserver(frame, currentAssignment, nextSession)) return;
        const outcome = lessonObserverTerminalOutcome(frame);
        if (outcome) { finish(outcome === 'completed'); return; }
        const nextPhase = lessonPhaseFromObserverFrame(frame);
        if (nextPhase) { phase = nextPhase; persist(currentAssignment); }
      } }).then((opened) => {
        if (!live() || generation !== observerGeneration) opened.close(1000, 'observer no longer selected');
        else connection = opened;
      }, (error) => { if (valid()) captureError(error); });
    };
    const accept = (current: CurrentAssignment): boolean => {
      if (!matchesActive(expected, current)) return false;
      if (current.state === 'COMPLETED' || current.state === 'FAILED' || current.state === 'CANCELLED') {
        if (!matchesTerminal(expected, { assignmentId: current.assignmentId, assignmentVersion: current.assignmentVersion, state: current.state })) return false;
        setState((previous) => ({ ...previous, key, assignment: current }));
        finish(current.state === 'COMPLETED');
        return true;
      }
      if (!['ASSIGNED', 'PRELOADING', 'READY', 'RUNNING', 'PAUSED'].includes(current.state)) return false;
      expected = { ...expected, assignmentId: current.assignmentId, assignmentVersion: current.assignmentVersion, childId: current.childId };
      currentAssignment = !current.sessionId && sessionId && assignmentId === current.assignmentId
        ? { ...current, sessionId } : current;
      setState({ key, assignment: currentAssignment, finished: false, unsuccessful: false, stale: false });
      persist(currentAssignment);
      attach(currentAssignment);
      return true;
    };
    const acceptTerminal = (result: TerminalAssignment) => {
      if (matchesTerminal(expected, result)) { finish(result.state === 'COMPLETED'); return true; }
      return false;
    };
    const poll = async () => {
      if (!deviceId || !live()) return;
      let resolved = false;
      try {
        const current = await getCurrentAssignment(deviceId);
        if (!live()) return;
        if (current) resolved = accept(current);
        else {
          const readback = await getAssignmentReadback(deviceId);
          if (!live()) return;
          if (readback.kind === 'terminal') resolved = acceptTerminal(readback.terminal);
          if (readback.kind === 'active') resolved = accept(readback.assignment);
        }
      } catch (error) { if (live()) captureError(error); }
      if (!live()) return;
      settlingPolls = resolved ? 0 : settlingPolls + 1;
      if (settlingPolls >= 18) { setState((previous) => ({ ...previous, stale: true })); return; }
      timer = setTimeout(poll, 2500);
    };
    void poll();
    return () => {
      active = false;
      observerGeneration += 1;
      if (timer) clearTimeout(timer);
      connection?.close(1000, 'screen unmounted');
    };
  }, [key, deviceId, assignmentId, assignmentVersion, childId, sessionId, retryNonce]);

  return { ...(state.key === key ? state : empty), retry };
}
