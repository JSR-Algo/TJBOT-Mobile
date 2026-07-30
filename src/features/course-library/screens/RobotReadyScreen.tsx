import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import Robot from '@/design-system/components/Robot';
import { Icon } from '@/design-system/icons';
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


const POLL_INTERVAL_MS = 2500;

export default function RobotReadyScreen({ navigation, route }: Props) {
  const deviceId = route.params?.deviceId;
  const [preload, setPreload] = React.useState<PreloadStatus | null>(null);
  const [assignment, setAssignment] = React.useState<CurrentAssignment | null>(null);

  React.useEffect(() => {
    if (!deviceId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

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
        if (settling) timer = setTimeout(poll, POLL_INTERVAL_MS);
      } catch {
        // Transient read failure — retry on the same cadence.
        if (active) timer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    poll();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [deviceId]);

  const ready = preload ? isPreloadReady(preload) : false;
  const lessonTitle = assignment?.lessonTitle?.trim() ? assignment.lessonTitle : "Today's lesson";
  const presentation = preload ? presentAssignmentState(preload.state) : null;
  const errorCopy = preload?.errorCode ? formatLessonCopy(getErrorMessage(preload.errorCode)) : null;
  const statusCopy = !deviceId
    ? 'Choose a Robot to prepare this lesson.'
    : presentation
      ? formatLessonCopy(presentation.copy, { lesson: lessonTitle })
      : 'Getting things ready…';

  return (
    <DeviceShell title={!deviceId ? 'Choose a Robot' : ready ? 'Robot is ready' : statusCopy}>
      <Box paddingTop={30} paddingHorizontal={24} alignItems="center">
        <Robot
          emotion={ready ? 'success' : deviceId ? 'listen' : 'curious'}
          size={200}
          accessibilityLabel={ready ? 'TeeBot ready for the lesson' : 'TeeBot preparing the lesson'}
        />
        {ready ? (
          <Box style={styles.chipWrap}><CLChip state="ready" /></Box>
        ) : (
          <Box style={styles.chipWrap}><Text style={styles.preparing}>{statusCopy}</Text></Box>
        )}
        <Text fontWeight="600" style={styles.heading}>{lessonTitle}</Text>
        <Text style={styles.sub}>
          {ready
            ? 'Place Robot on the table. When your child taps it, the lesson starts.'
            : deviceId
              ? 'Keep Robot powered on and connected while the lesson downloads.'
              : 'Open your Robot list and choose the device that should receive this lesson.'}
        </Text>
        {errorCopy ? <Text style={styles.errorText}>{errorCopy}</Text> : null}
      </Box>

      <Box paddingHorizontal={16} paddingTop={24}>
        <Box style={styles.checkCard}>
          {/* Lesson-loaded row — gated on the REAL preload state, never good:true. */}
          <Box style={styles.checkRow} accessibilityLabel={ready ? 'Lesson loaded · Ready on Robot' : deviceId ? 'Lesson loading' : 'Robot not selected'}>
            <Box style={styles.checkIcon}>
              <Icon name={deviceId ? 'BookOpen' : 'Bot'} size={16} color={CL.ink2} strokeWidth={2.3} />
            </Box>
            <Box flex={1}>
              <Text fontWeight="600" style={styles.checkTitle}>Lesson loaded</Text>
              <Text style={styles.checkVal}>
                {ready
                  ? 'Ready on Robot'
                  : preload
                    ? `${preload.criticalReady} of ${preload.criticalTotal} required files ready`
                    : statusCopy}
              </Text>
            </Box>
            {ready ? <Icon name="CircleCheck" size={18} color={CL.good} strokeWidth={2.4} /> : null}
          </Box>
        </Box>
      </Box>

      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30} gap={10}>
        {deviceId ? (
          <DeviceBigBtn
            disabled={!ready}
            onClick={() =>
              navigation.navigate(ROUTES.RunningScreen, {
                deviceId,
                assignmentId: route.params?.assignmentId,
                lessonTitle,
              })
            }
          >
            {ready ? 'Hand it to your child' : 'Preparing…'}
          </DeviceBigBtn>
        ) : (
          <DeviceBigBtn onClick={() => navigation.navigate(ROUTES.DeviceHomeScreen)}>
            Choose a Robot
          </DeviceBigBtn>
        )}
        <DeviceBigBtn secondary onClick={() => navigation.navigate(ROUTES.SendToRobotScreen)}>Pick a different lesson</DeviceBigBtn>
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
