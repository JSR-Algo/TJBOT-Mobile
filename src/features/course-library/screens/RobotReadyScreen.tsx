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
  const deviceId = route.params?.deviceId;
  const missingDeviceId = !deviceId;
  const [preload, setPreload] = React.useState<PreloadStatus | null>(null);
  const [assignment, setAssignment] = React.useState<CurrentAssignment | null>(null);
  const [preloadStalled, setPreloadStalled] = React.useState(false);
  const [retryNonce, setRetryNonce] = React.useState(0);

  React.useEffect(() => {
    if (!deviceId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let settlingPolls = 0;
    setPreloadStalled(false);

    const poll = async () => {
      try {
        const [status, current] = await Promise.all([
          getPreloadStatus(deviceId),
          getCurrentAssignment(deviceId),
        ]);
        if (!active) return;
        setPreload(status);
        setAssignment(current);
        // Server is the timeout/READY authority — keep polling only while the
        // assignment is still settling and no terminal error has surfaced.
        const settling =
          status.state !== 'READY' &&
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
        if (!active) return;
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
  }, [deviceId, retryNonce]);

  const retryPreloadCheck = React.useCallback(() => {
    setPreload(null);
    setAssignment(null);
    setPreloadStalled(false);
    setRetryNonce((value) => value + 1);
  }, []);

  const manifestChecksum = assignment?.manifestChecksum ?? route.params?.manifestChecksum;
  const hasManifestChecksum = typeof manifestChecksum === 'string' && manifestChecksum.trim().length > 0;
  const assignmentId = assignment?.assignmentId ?? route.params?.assignmentId;
  const sessionId = assignment?.sessionId ?? undefined;
  const preloadMatchesAssignment = Boolean(preload && assignmentId && preload.assignmentId === assignmentId);
  const ready = !missingDeviceId && preload && !preloadStalled
    ? isPreloadReady(preload) && hasManifestChecksum && preloadMatchesAssignment
    : false;
  const lessonTitle = assignment?.lessonTitle?.trim() ? assignment.lessonTitle : "Today's lesson";
  const presentation = preload ? presentAssignmentState(preload.state) : null;
  const errorCopy = preload?.errorCode ? formatLessonCopy(getErrorMessage(preload.errorCode)) : null;
  const statusCopy = missingDeviceId
    ? "We can't prepare Robot because no device was selected."
    : preloadStalled
    ? 'Robot is taking longer than expected.'
    : hasManifestChecksum && preloadMatchesAssignment && presentation
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
              navigation.navigate(ROUTES.RunningScreen, {
                deviceId,
                assignmentId,
                sessionId,
                lessonTitle,
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
