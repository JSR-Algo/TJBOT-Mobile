import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import CL from '../components/CL';
import CLChip from '../components/CLChip';
import { ROUTES } from '@/navigation/routes';
import {
  getCurrentAssignment,
  getPreloadStatus,
  isPreloadReady,
  presentAssignmentState,
  type CurrentAssignment,
  type PreloadStatus,
} from '@/services/api/course-library.api';
import { formatLessonCopy, getErrorMessage } from '@/utils/errors';
import { matchesActive, readyAssignment } from '../assignmentReconciliation';
import { useScreenActivity } from '../useScreenActivity';

type Props = NativeStackScreenProps<RootStackParamList, 'RobotReadyScreen'>;

// Battery / Wi-Fi / Volume rows are explicitly OUT OF SLICE (plan §9 M2) — kept
// as static informational rows. Only the "Lesson loaded" row + the CLChip are
// driven by real preload state (DIV-MOBILE-FAKEREADY kill).
const STATIC_CHECKS = [
  { ic: '🔋', t: 'Battery', v: '78% · plenty', good: true },
  { ic: '📶', t: 'Wi-Fi', v: 'Casa-Familia · strong', good: true },
  { ic: '🔉', t: 'Volume', v: '6 of 10 · room-friendly', good: true },
] as const;

const POLL_INTERVAL_MS = 2500;
const MAX_PRELOAD_SETTLING_POLLS = 18;

export default function RobotReadyScreen({ navigation, route }: Props) {
  const childId = route.params?.childId;
  const deviceId = route.params?.deviceId;
  const { assignmentId, assignmentVersion, manifestChecksum, profile } = route.params ?? {};
  const selection = { deviceId, childId, assignmentId, assignmentVersion, manifestChecksum, profile };
  const activity = useScreenActivity(JSON.stringify(selection));
  const { active: screenActive, key: activityKey, isCurrent } = activity;
  const selectionKey = activityKey;
  const selectedKey = React.useRef(selectionKey);
  selectedKey.current = selectionKey;
  const [resultKey, setResultKey] = React.useState(selectionKey);
  const missingDeviceId = !deviceId;
  const [preload, setPreload] = React.useState<PreloadStatus | null>(null);
  const [assignment, setAssignment] = React.useState<CurrentAssignment | null>(null);
  const [preloadStalled, setPreloadStalled] = React.useState(false);
  const [retryNonce, setRetryNonce] = React.useState(0);

  React.useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let settlingPolls = 0;
    setPreload(null);
    setAssignment(null);
    setResultKey(selectionKey);
    setPreloadStalled(false);
    if (!deviceId || !screenActive) return;

    const poll = async () => {
      try {
        const [status, current] = await Promise.all([
          getPreloadStatus(deviceId),
          getCurrentAssignment(deviceId),
        ]);
        if (!active || !isCurrent(activityKey) || selectedKey.current !== selectionKey) return;
        setPreload(status);
        setAssignment(current && matchesActive({ deviceId, childId, assignmentId, assignmentVersion, profile }, current) ? current : null);
        if (current?.state === 'RUNNING' && childId && !status.errorCode &&
            (status.state === 'READY' || status.state === 'RUNNING') &&
            matchesActive({ deviceId, childId, assignmentId, assignmentVersion, profile }, current) &&
            status.assignmentId === current.assignmentId && status.profile === current.profile &&
            current.profile?.trim() && current.manifestChecksum?.trim() && (manifestChecksum == null || manifestChecksum === current.manifestChecksum)) {
          navigation.navigate(ROUTES.RunningScreen, {
            deviceId, childId: current.childId, assignmentId: current.assignmentId,
            assignmentVersion: current.assignmentVersion, sessionId: current.sessionId ?? undefined,
            lessonTitle: current.lessonTitle,
          });
          return;
        }
        // Server is the timeout/READY authority — keep polling only while the
        // assignment is still settling and no terminal error has surfaced.
        const settling =
          !readyAssignment({ deviceId, childId, assignmentId, assignmentVersion, manifestChecksum, profile }, current, status) &&
          status.state !== 'FAILED' &&
          status.state !== 'COMPLETED' &&
          !status.errorCode;
        if (settling) {
          settlingPolls += 1;
          if (settlingPolls >= MAX_PRELOAD_SETTLING_POLLS) {
            setPreloadStalled(true);
            return;
          }
          timer = setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch {
        if (!active || !isCurrent(activityKey) || selectedKey.current !== selectionKey) return;
        settlingPolls += 1;
        if (settlingPolls >= MAX_PRELOAD_SETTLING_POLLS) {
          setPreloadStalled(true);
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
  }, [deviceId, childId, assignmentId, assignmentVersion, manifestChecksum, profile, selectionKey, retryNonce, screenActive, activityKey, isCurrent, navigation]);

  const retryPreloadCheck = React.useCallback(() => {
    setPreload(null);
    setAssignment(null);
    setPreloadStalled(false);
    setRetryNonce((value) => value + 1);
  }, []);

  const selectedAssignment = resultKey === selectionKey ? assignment : null;
  const selectedPreload = resultKey === selectionKey ? preload : null;
  const matched = readyAssignment(selection, selectedAssignment, selectedPreload);
  const ready = Boolean(screenActive && matched && selectedPreload && isPreloadReady(selectedPreload) && !preloadStalled);
  const lessonTitle = selectedAssignment?.lessonTitle?.trim() ? selectedAssignment.lessonTitle : "Today's lesson";
  const preloadMatchesAssignment = Boolean(selectedPreload && selectedAssignment && selectedPreload.assignmentId === selectedAssignment.assignmentId);
  const presentation = preloadMatchesAssignment && selectedPreload && (selectedPreload.state !== 'READY' || ready)
    ? presentAssignmentState(selectedPreload.state) : null;
  const errorCopy = preloadMatchesAssignment && selectedPreload?.errorCode ? formatLessonCopy(getErrorMessage(selectedPreload.errorCode)) : null;
  const statusCopy = missingDeviceId
    ? "We can't prepare Robot because no device was selected."
    : preloadStalled
    ? 'Robot is taking longer than expected.'
    : presentation && selectedAssignment?.manifestChecksum
      ? formatLessonCopy(presentation.copy, { lesson: lessonTitle })
      : 'Getting things ready…';

  return (
    <DeviceShell title="Robot is ready">
      <Box paddingTop={30} paddingHorizontal={24} alignItems="center">
        <RobotDevice emotion="happy" size={200} accent="#FF6F61" />
        {ready ? (
          <Box style={styles.chipWrap}><CLChip state="ready" /></Box>
        ) : (
          <Box style={styles.chipWrap}><Text style={styles.preparing}>{statusCopy}</Text></Box>
        )}
        <Text fontWeight="600" style={styles.heading}>{lessonTitle}</Text>
        <Text style={styles.sub}>
          Place Robot on the table. When your child taps it, the lesson starts. About 4 minutes.
        </Text>
        {errorCopy ? <Text style={styles.errorText}>{errorCopy}</Text> : null}
      </Box>

      <Box paddingHorizontal={16} paddingTop={24}>
        <Box style={styles.checkCard}>
          {STATIC_CHECKS.map((r) => (
            <Box key={r.t} style={[styles.checkRow, styles.checkBorder]}>
              <Box style={styles.checkIcon}>
                <Text style={{ fontSize: 14 }}>{r.ic}</Text>
              </Box>
              <Box flex={1}>
                <Text fontWeight="600" style={styles.checkTitle}>{r.t}</Text>
                <Text style={styles.checkVal}>{r.v}</Text>
              </Box>
              {r.good && (
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={CL.good} strokeWidth={2.4} strokeLinecap="round">
                  <Path d="M5 12l5 5 9-10" />
                </Svg>
              )}
            </Box>
          ))}
          {/* Lesson-loaded row — gated on the REAL preload state, never good:true. */}
          <Box style={styles.checkRow} accessibilityLabel={ready ? 'Lesson loaded · Ready on Robot' : 'Lesson loading'}>
            <Box style={styles.checkIcon}>
              <Text style={{ fontSize: 14 }}>📚</Text>
            </Box>
            <Box flex={1}>
              <Text fontWeight="600" style={styles.checkTitle}>Lesson loaded</Text>
              <Text style={styles.checkVal}>{ready ? 'Ready on Robot' : statusCopy}</Text>
            </Box>
            {ready && (
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={CL.good} strokeWidth={2.4} strokeLinecap="round">
                <Path d="M5 12l5 5 9-10" />
              </Svg>
            )}
          </Box>
        </Box>
      </Box>

      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30} gap={10}>
        {missingDeviceId ? (
          <DeviceBigBtn onClick={() => navigation.navigate(ROUTES.SendToRobotScreen)}>Pick a different lesson</DeviceBigBtn>
        ) : (
          <DeviceBigBtn
            disabled={!ready && !preloadStalled}
            onClick={() => {
              if (preloadStalled) {
                retryPreloadCheck();
                return;
              }
              const verified = readyAssignment(selection, selectedAssignment, selectedPreload);
              if (!ready || !verified || !isCurrent(activityKey) || selectedKey.current !== selectionKey) return;
              navigation.navigate(ROUTES.RunningScreen, {
                childId: verified.childId,
                deviceId,
                assignmentId: verified.assignmentId,
                assignmentVersion: verified.assignmentVersion,
                sessionId: verified.sessionId ?? undefined,
                lessonTitle: verified.lessonTitle,
              });
            }}
          >
            {ready ? 'Hand it to your child' : preloadStalled ? 'Try again' : 'Preparing…'}
          </DeviceBigBtn>
        )}
        {!missingDeviceId && (
          <DeviceBigBtn secondary onClick={() => navigation.navigate(ROUTES.SendToRobotScreen)}>Pick a different lesson</DeviceBigBtn>
        )}
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  chipWrap: { marginTop: 22 },
  preparing: { fontSize: 13, color: CL.ink2, textAlign: 'center' },
  heading: { fontSize: 22, color: CL.ink, letterSpacing: -0.3, textAlign: 'center', marginTop: 14 },
  sub: { fontSize: 13, color: CL.ink2, textAlign: 'center', maxWidth: 300, lineHeight: 20, marginTop: 6 },
  errorText: { fontSize: 13, color: '#C0392B', textAlign: 'center', maxWidth: 300, lineHeight: 19, marginTop: 10 },
  checkCard: { backgroundColor: CL.card, borderWidth: 1, borderColor: CL.hair, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 4 },
  checkRow: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14 },
  checkBorder: { borderBottomWidth: 1, borderBottomColor: CL.hair },
  checkIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#EEF1F5', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkTitle: { fontSize: 13, color: CL.ink },
  checkVal: { fontSize: 12, color: CL.ink2, marginTop: 1 },
});
