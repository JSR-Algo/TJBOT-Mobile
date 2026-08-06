import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import LCDFace from '@/design-system/components/LCDFace';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import DeviceRow from '@/components/DeviceRow';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import CL from '../components/CL';
import { ROUTES } from '@/navigation/routes';
import {
  getCurrentAssignment,
  presentAssignmentState,
  type AssignmentState,
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
  isTerminalLessonObserverFrame,
  lessonPhaseFromObserverFrame,
  type LessonPhase,
} from '@/features/fallback/recoveryTypes';

type Props = NativeStackScreenProps<RootStackParamList, 'CompanionScreen'>;

const POLL_INTERVAL_MS = 2500;
const MAX_CURRENT_ASSIGNMENT_SETTLING_POLLS = 18;

function faceFor(state: AssignmentState | undefined): 'speak' | 'happy' | 'think' {
  if (state === 'COMPLETED') return 'happy';
  if (state === 'RUNNING') return 'speak';
  return 'think';
}

export default function CompanionScreen({ navigation, route }: Props) {
  const deviceId = route.params?.deviceId;
  const missingDeviceId = !deviceId;
  const [assignment, setAssignment] = React.useState<CurrentAssignment | null>(null);
  // Same completion projection as RunningScreen: the current-assignment read
  // returns null the instant the lesson finishes (COMPLETED is not an ACTIVE
  // state), so a live→null transition is the terminal signal — the face must
  // switch to 'happy' rather than freezing on 'think'.
  const [finished, setFinished] = React.useState(false);
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
    checkpointQueueRef.current = checkpointQueueRef.current
      .then(operation)
      .catch((error) => {
        if (checkpointStateRef.current === stateKey) checkpointStateRef.current = null;
        captureError(error);
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
        // freeze the live face mirror on 'think' forever.
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
        if (isTerminalLessonObserverFrame(frame)) {
          terminalRef.current = true;
          assignmentRef.current = null;
          clearCheckpoint();
          if (isCompletedRealtimeFrame(frame)) setFinished(true);
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
    setAssignmentStale(false);
    sawLiveRef.current = false;
    assignmentRef.current = null;
    observerPhaseRef.current = null;
    terminalRef.current = false;
    setRetryNonce((value) => value + 1);
  }, []);

  const terminalUnsuccessful = assignment?.state === 'FAILED' || assignment?.state === 'CANCELLED';
  const statusUnavailable = assignmentStale || missingDeviceId || terminalUnsuccessful;
  const completed = !statusUnavailable && (finished || assignment?.state === 'COMPLETED');
  const lessonTitle =
    assignment?.lessonTitle?.trim()
      ? assignment.lessonTitle
      : route.params?.lessonTitle?.trim()
        ? route.params.lessonTitle
        : "Today's lesson";
  const assignmentId = assignment?.assignmentId ?? route.params?.assignmentId;
  const presentation = completed
    ? presentAssignmentState('COMPLETED')
    : assignment
      ? presentAssignmentState(assignment.state)
      : null;
  const statusCopy = terminalUnsuccessful
    ? 'Robot could not finish this lesson.'
    : statusUnavailable
      ? "We can't confirm the live mirror yet."
    : presentation
      ? formatLessonCopy(presentation.copy, { lesson: lessonTitle })
      : 'Lesson running on Robot';

  return (
    <DeviceShell title="What Robot sees" onBack={() => navigation.goBack()}>
      <Text style={styles.intro}>
        A live mirror of Robot's face. <Text fontWeight="600" style={{ color: CL.ink }}>No transcript</Text> — what your child says stays between them.
      </Text>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Box style={styles.lcdMirror} alignItems="center" gap={12}>
          <Box flexDirection="row" alignItems="center" gap={10} style={styles.liveRow}>
            <Box style={[styles.liveDot, statusUnavailable && styles.liveDotStale]} />
            <Text style={styles.liveText}>{statusUnavailable ? 'Waiting' : 'Live'}</Text>
          </Box>
          <LCDFace emotion={completed ? 'happy' : statusUnavailable ? 'think' : faceFor(assignment?.state)} size={220} accent="#FF6F61" />
          <Text fontWeight="600" style={styles.phaseLabel}>{statusCopy}</Text>
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Box style={styles.progressCard}>
          <Text fontWeight="600" style={styles.progressTitle}>{lessonTitle}</Text>
          <Text style={styles.progressMeta}>
            {statusUnavailable ? 'Return to lesson status to reconnect Robot.' : 'Robot is leading the lesson. You can put your phone away.'}
          </Text>
        </Box>
      </Box>

      {assignmentStale && !missingDeviceId && (
        <Box paddingHorizontal={20} paddingTop={18} gap={10}>
          <DeviceBigBtn onClick={retryCurrentAssignment}>Try again</DeviceBigBtn>
          <DeviceBigBtn secondary onClick={() => navigation.goBack()}>
            Back to lesson status
          </DeviceBigBtn>
        </Box>
      )}

      {completed && assignmentId && deviceId && assignment?.lessonId ? (
        <Box paddingHorizontal={20} paddingTop={18}>
          <DeviceBigBtn onClick={() => navigation.navigate(ROUTES.LessonSummaryScreen, {
            childId: route.params?.childId,
            assignmentId,
            deviceId,
            lessonId: assignment.lessonId,
            sessionId: sessionId ?? undefined,
          })}>
            See lesson reward
          </DeviceBigBtn>
        </Box>
      ) : null}

      <Box paddingHorizontal={16} paddingTop={18}>
        <Text fontWeight="700" style={styles.sectionLabel}>If you need to</Text>
        <Box style={styles.rowCard}>
          <DeviceRow icon="🔉" title="Turn volume down" body="Currently at 6 of 10" />
          <DeviceRow icon="⏸️" title="Pause Robot gently" body="Robot will say 'Let's take a quick break'" />
        </Box>
      </Box>

      <Box height={30} />
    </DeviceShell>
  );
}

function isCompletedRealtimeFrame(frame: unknown): boolean {
  if (typeof frame !== 'object' || frame === null) return false;
  const type = stringProp(frame, 'type');
  return (
    stringProp(frame, 'state') === 'COMPLETED' ||
    stringProp(frame, 'current_state') === 'COMPLETED' ||
    (type === 'session.end' && ['complete', 'completed'].includes(stringProp(frame, 'end_reason') ?? ''))
  );
}

function stringProp(value: object, key: string): string | null {
  const prop = Reflect.get(value, key);
  return typeof prop === 'string' ? prop : null;
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

const styles = StyleSheet.create({
  intro: { fontSize: 12, color: CL.ink2, lineHeight: 20, paddingHorizontal: 20, paddingTop: 14 },
  lcdMirror: { backgroundColor: '#0E1116', borderRadius: 18, paddingVertical: 18, paddingHorizontal: 18 },
  liveRow: { alignSelf: 'flex-start' },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#EF5454' },
  liveDotStale: { backgroundColor: '#98A2B3' },
  liveText: { fontSize: 11, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: '600' },
  phaseLabel: { fontSize: 15, color: '#fff', marginTop: 4, textAlign: 'center' },
  progressCard: { backgroundColor: CL.card, borderWidth: 1, borderColor: CL.hair, borderRadius: 14, padding: 14 },
  progressTitle: { fontSize: 13, color: CL.ink },
  progressMeta: { fontSize: 11, color: CL.ink2, marginTop: 4, lineHeight: 16 },
  sectionLabel: { fontSize: 11, color: CL.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  rowCard: { backgroundColor: CL.card, borderWidth: 1, borderColor: CL.hair, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 4 },
});
