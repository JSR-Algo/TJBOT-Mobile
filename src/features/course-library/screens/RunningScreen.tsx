import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import CL from '../components/CL';
import { ROUTES } from '@/navigation/routes';
import {
  getCurrentAssignment,
  presentAssignmentState,
  type CurrentAssignment,
} from '@/services/api/course-library.api';
import { openRealtime, type RealtimeConnection } from '@/services/ws/realtime';
import { captureError } from '@/services/observability/sentry';
import { formatLessonCopy } from '@/utils/errors';
import {
  clearRecoveryCheckpoint,
  writeRecoveryCheckpoint,
} from '@/features/fallback/recoveryCheckpointStore';
import {
  checkpointFromCurrentAssignment,
  lessonObserverTerminalOutcome,
  lessonPhaseFromObserverFrame,
  type LessonPhase,
} from '@/features/fallback/recoveryTypes';

type Props = NativeStackScreenProps<RootStackParamList, 'RunningScreen'>;

const POLL_INTERVAL_MS = 2500;
const MAX_CURRENT_ASSIGNMENT_SETTLING_POLLS = 18;

export default function RunningScreen({ navigation, route }: Props) {
  const deviceId = route.params?.deviceId;
  const missingDeviceId = !deviceId;
  const [assignment, setAssignment] = React.useState<CurrentAssignment | null>(null);
  // Completion projection. The current-assignment endpoint only returns rows in
  // an ACTIVE state (ASSIGNED/PRELOADING/READY/RUNNING/PAUSED); the instant a
  // lesson finishes the backend drops it from that set and the read returns
  // null. So "we previously saw a live assignment, now we see null" is the
  // real terminal signal — we must NOT wait for a COMPLETED object the endpoint
  // can never emit (the progress_events stream is the authoritative completion
  // source; this is its live projection, plan M3).
  const [finished, setFinished] = React.useState(false);
  const [observerTerminalUnsuccessful, setObserverTerminalUnsuccessful] = React.useState(false);
  const [assignmentStale, setAssignmentStale] = React.useState(false);
  const [retryNonce, setRetryNonce] = React.useState(0);
  const sawLiveRef = React.useRef(false);
  const assignmentRef = React.useRef<CurrentAssignment | null>(null);
  const observerPhaseRef = React.useRef<LessonPhase | null>(null);
  const terminalRef = React.useRef(false);
  const checkpointQueueRef = React.useRef<Promise<void>>(Promise.resolve());
  const checkpointStateRef = React.useRef<string | null>(null);
  const routeSessionId = route.params?.sessionId?.trim() || null;
  const sessionId = assignment?.sessionId ?? route.params?.sessionId;
  const observerSessionId = sessionId?.trim() ? sessionId.trim() : null;

  const queueCheckpointOperation = React.useCallback((stateKey: string, operation: () => Promise<void>) => {
    if (checkpointStateRef.current === stateKey) return;
    checkpointStateRef.current = stateKey;
    const settledTail = checkpointQueueRef.current.catch((error) => {
      captureError(error);
    });
    checkpointQueueRef.current = settledTail.then(async () => {
      try {
        await operation();
      } catch (error) {
        if (checkpointStateRef.current === stateKey) checkpointStateRef.current = null;
        captureError(error);
      }
    });
  }, []);

  const persistLiveCheckpoint = React.useCallback((current: CurrentAssignment, phase?: LessonPhase | null) => {
    const checkpointAssignment = current.sessionId?.trim() || !routeSessionId
      ? current
      : { ...current, sessionId: routeSessionId };
    const checkpoint = checkpointFromCurrentAssignment(checkpointAssignment, deviceId, phase);
    if (!checkpoint) return;
    queueCheckpointOperation(`write:${JSON.stringify(checkpoint)}`, () => writeRecoveryCheckpoint(checkpoint));
  }, [deviceId, queueCheckpointOperation, routeSessionId]);

  const clearCheckpoint = React.useCallback(() => {
    queueCheckpointOperation('clear', clearRecoveryCheckpoint);
  }, [queueCheckpointOperation]);

  React.useEffect(() => {
    if (!deviceId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let settlingPolls = 0;
    setAssignmentStale(false);

    const poll = async () => {
      if (!active || terminalRef.current) return;
      try {
        const current = await getCurrentAssignment(deviceId);
        if (!active || terminalRef.current) return;
        const live = current && current.state !== 'COMPLETED' && current.state !== 'FAILED' && current.state !== 'CANCELLED';
        if (live) {
          sawLiveRef.current = true;
          settlingPolls = 0;
          if (assignmentRef.current?.assignmentId !== current.assignmentId) observerPhaseRef.current = null;
          assignmentRef.current = current.sessionId?.trim() || !routeSessionId
            ? current
            : { ...current, sessionId: routeSessionId };
          setAssignment(current);
          persistLiveCheckpoint(current, observerPhaseRef.current);
          timer = setTimeout(poll, POLL_INTERVAL_MS);
          return;
        }
        // Terminal: explicit failure/cancel stops polling but must not render
        // completion. Only COMPLETED or live->null means success.
        if (current) setAssignment(current);
        const successfulTerminal = current?.state === 'COMPLETED' || (current === null && sawLiveRef.current);
        if (successfulTerminal) {
          terminalRef.current = true;
          assignmentRef.current = null;
          clearCheckpoint();
          setObserverTerminalUnsuccessful(false);
          setFinished(true);
          return;
        }
        if (current?.state === 'FAILED' || current?.state === 'CANCELLED') {
          terminalRef.current = true;
          assignmentRef.current = null;
          clearCheckpoint();
          return;
        }
        // Non-terminal: most importantly current===null && !sawLiveRef.current,
        // the read-after-write race right after createAssignment where the
        // assignment isn't visible yet. Keep polling — stopping here would
        // freeze the UI on 'Lesson playing' forever.
        settlingPolls += 1;
        if (settlingPolls >= MAX_CURRENT_ASSIGNMENT_SETTLING_POLLS) {
          setAssignmentStale(true);
          return;
        }
        timer = setTimeout(poll, POLL_INTERVAL_MS);
      } catch {
        if (!active) return;
        settlingPolls += 1;
        if (settlingPolls >= MAX_CURRENT_ASSIGNMENT_SETTLING_POLLS) {
          setAssignmentStale(true);
          return;
        }
        timer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    poll();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [clearCheckpoint, deviceId, persistLiveCheckpoint, retryNonce, routeSessionId]);

  React.useEffect(() => {
    if (!observerSessionId) return;
    let active = true;
    let connection: RealtimeConnection | null = null;

    void openRealtime(observerSessionId, {
      onFrame: (frame) => {
        if (!active) return;
        const terminalOutcome = lessonObserverTerminalOutcome(frame);
        if (terminalOutcome) {
          terminalRef.current = true;
          assignmentRef.current = null;
          clearCheckpoint();
          setFinished(terminalOutcome === 'completed');
          setObserverTerminalUnsuccessful(terminalOutcome === 'unsuccessful');
          return;
        }
        const phase = lessonPhaseFromObserverFrame(frame);
        if (!phase || !assignmentRef.current) return;
        observerPhaseRef.current = phase;
        persistLiveCheckpoint(assignmentRef.current, phase);
      },
    }).then(
      (nextConnection) => {
        if (!active) {
          nextConnection.close(1000, 'screen unmounted');
          return;
        }
        connection = nextConnection;
      },
      (error) => {
        captureError(toError(error));
      },
    );

    return () => {
      active = false;
      connection?.close(1000, 'screen unmounted');
    };
  }, [clearCheckpoint, observerSessionId, persistLiveCheckpoint]);

  const retryCurrentAssignment = React.useCallback(() => {
    setAssignment(null);
    setFinished(false);
    setObserverTerminalUnsuccessful(false);
    setAssignmentStale(false);
    sawLiveRef.current = false;
    assignmentRef.current = null;
    observerPhaseRef.current = null;
    terminalRef.current = false;
    setRetryNonce((value) => value + 1);
  }, []);

  const lessonTitle =
    assignment?.lessonTitle?.trim()
      ? assignment.lessonTitle
      : route.params?.lessonTitle?.trim()
        ? route.params.lessonTitle
        : "Today's lesson";
  const assignmentId = assignment?.assignmentId ?? route.params?.assignmentId;
  const terminalUnsuccessful = observerTerminalUnsuccessful || assignment?.state === 'FAILED' || assignment?.state === 'CANCELLED';
  const statusUnavailable = assignmentStale || missingDeviceId || terminalUnsuccessful;
  const completed = !statusUnavailable && (finished || assignment?.state === 'COMPLETED');
  // When completion was inferred from the live terminal→null transition the
  // polled object is not COMPLETED, so resolve the completion copy explicitly.
  const presentation = completed
    ? presentAssignmentState('COMPLETED')
    : assignment
      ? presentAssignmentState(assignment.state)
      : null;
  const statusCopy = terminalUnsuccessful
    ? 'Robot could not finish this lesson.'
    : statusUnavailable
      ? "We can't confirm the lesson on Robot yet."
    : presentation
      ? formatLessonCopy(presentation.copy, { lesson: lessonTitle })
      : 'Lesson playing';
  const statusLabel = completed ? statusCopy : terminalUnsuccessful ? 'Needs attention' : statusUnavailable ? 'Waiting' : 'Lesson playing';

  return (
    <DeviceShell title={completed ? 'Lesson finished' : statusUnavailable ? 'Lesson status unavailable' : 'Lesson is on Robot'}>
      <Box paddingTop={36} paddingHorizontal={24} alignItems="center">
        <Box style={styles.robotWrap} alignItems="center" justifyContent="center">
          <RobotDevice emotion={completed ? 'happy' : statusUnavailable ? 'think' : 'speak'} size={170} accent="#FF6F61" />
        </Box>
        <Box style={[styles.statusBadge, completed && styles.statusBadgeDone, statusUnavailable && styles.statusBadgeStale]}>
          <Box style={[styles.statusDot, completed && styles.statusDotDone, statusUnavailable && styles.statusDotStale]} />
          <Text fontWeight="700" style={[styles.statusText, completed && styles.statusTextDone, statusUnavailable && styles.statusTextStale]}>
            {statusLabel}
          </Text>
        </Box>
        <Text fontWeight="600" style={styles.heading}>{lessonTitle}</Text>
        <Text style={styles.sub}>
          {completed ? "Today's lesson is complete." : statusCopy}
        </Text>
      </Box>

      <Box paddingHorizontal={16} paddingTop={30}>
        <Box style={styles.noteCard}>
          <Text style={styles.noteText}>
            {completed
              ? "You'll find today's progress on the dashboard. "
              : "You'll get a calm summary here when the lesson ends. "}
            <Text fontWeight="600" style={{ color: CL.ink }}>Audio is never saved.</Text>
          </Text>
        </Box>
      </Box>

      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30} gap={10}>
        {completed && assignmentId && deviceId && assignment?.lessonId ? (
          <DeviceBigBtn onClick={() => navigation.navigate(ROUTES.LessonSummaryScreen, {
            childId: route.params?.childId,
            assignmentId,
            deviceId,
            lessonId: assignment.lessonId,
            sessionId: sessionId ?? undefined,
          })}>
            See lesson reward
          </DeviceBigBtn>
        ) : null}
        {!completed && !statusUnavailable && (
          <DeviceBigBtn onClick={() => navigation.navigate(ROUTES.CompanionScreen, { childId: route.params?.childId, deviceId, assignmentId, sessionId, lessonTitle })}>
            See what's happening
          </DeviceBigBtn>
        )}
        {assignmentStale && !missingDeviceId && <DeviceBigBtn onClick={retryCurrentAssignment}>Try again</DeviceBigBtn>}
        <DeviceBigBtn secondary onClick={() => navigation.navigate(ROUTES.DeviceHomeScreen)}>Done for now</DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

const styles = StyleSheet.create({
  robotWrap: { width: 200, height: 200 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFF4D9', paddingVertical: 5, paddingHorizontal: 11, borderRadius: 999, marginTop: 14,
  },
  statusBadgeDone: { backgroundColor: '#E6F4EE' },
  statusBadgeStale: { backgroundColor: '#F2F4F7' },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#E8A33C' },
  statusDotDone: { backgroundColor: '#1F8A5B' },
  statusDotStale: { backgroundColor: '#667085' },
  statusText: { fontSize: 11, color: '#8A6A12' },
  statusTextDone: { color: '#1F8A5B' },
  statusTextStale: { color: '#475467' },
  heading: { fontSize: 22, color: CL.ink, letterSpacing: -0.3, textAlign: 'center', marginTop: 14 },
  sub: { fontSize: 13, color: CL.ink2, textAlign: 'center', maxWidth: 300, lineHeight: 20, marginTop: 6 },
  noteCard: { backgroundColor: '#F8F6F1', borderRadius: 12, padding: 14 },
  noteText: { fontSize: 12, color: CL.ink2, lineHeight: 20 },
});
