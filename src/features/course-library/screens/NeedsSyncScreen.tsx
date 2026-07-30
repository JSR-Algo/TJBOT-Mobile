import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { ROUTES } from '@/navigation/routes';
import Robot from '@/design-system/components/Robot';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import DeviceRow from '@/components/DeviceRow';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import CL from '../components/CL';
import CLChip from '../components/CLChip';
import LCDPreview from '../components/LCDPreview';
import { getCourseDetail, getRobotSyncStatus, type CourseDetail } from '@/services/api/course-library.api';

type Props = NativeStackScreenProps<RootStackParamList, 'NeedsSyncScreen'>;

export default function NeedsSyncScreen({ navigation, route }: Props) {
  const courseId = route.params?.courseId ?? 'c_food';
  const [syncMsg, setSyncMsg] = React.useState<string | null>(null);
  const [course, setCourse] = React.useState<CourseDetail | null>(null);
  const [courseError, setCourseError] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    setCourse(null);
    setCourseError(false);
    void getCourseDetail(courseId)
      .then((detail) => {
        if (active) setCourse(detail);
      })
      .catch(() => {
        if (active) setCourseError(true);
      });
    return () => {
      active = false;
    };
  }, [courseId]);

  const handleReconnect = async () => {
    setSyncMsg(null);
    try {
      const status = await getRobotSyncStatus(courseId);
      if (status.synced) {
        navigation.navigate(ROUTES.CourseAddedScreen, { courseId });
      } else {
        setSyncMsg('Robot has not synced this course yet. Check Wi-Fi and try again.');
      }
    } catch {
      setSyncMsg('Robot has not synced this course yet. Check Wi-Fi and try again.');
    }
  };

  return (
    <DeviceShell title="Robot needs to catch up" onBack={() => navigation.navigate(ROUTES.CourseLibraryScreen)}>
      <Box paddingTop={30} paddingHorizontal={24} alignItems="center">
        <Robot emotion="worry" size={170} accessibilityLabel="TeeBot waiting to reconnect" />
        <Box style={styles.chipWrap}><CLChip state="needs_sync" /></Box>
        <Text fontWeight="600" style={styles.heading}>Robot has not synced this course yet</Text>
        <Text style={styles.sub}>
          {course
            ? `"${course.title}" is waiting in the app. We'll send it when Robot is back online.`
            : courseError
              ? 'Course details are unavailable. Reconnect Robot to check again.'
              : 'Loading the pending course…'}
        </Text>
      </Box>

      <Box paddingHorizontal={16} paddingTop={24}>
        <Text fontWeight="700" style={styles.sectionLabel}>Waiting to send</Text>
        <Box style={styles.pendingCard}>
          {course ? (
            <Box style={styles.pendingRow}>
              <LCDPreview emotion="speak" accent="#FF6F61" size={56} />
              <Box flex={1}>
                <Text fontWeight="600" style={styles.pendingTitle}>{course.title}</Text>
                <Text style={styles.pendingMeta}>
                  {course.lessonCount === 1 ? '1 lesson' : `${course.lessonCount} lessons`}
                </Text>
              </Box>
            </Box>
          ) : (
            <Box style={styles.pendingRow}>
              <Text style={styles.pendingMeta}>
                {courseError ? 'Course details unavailable' : 'Loading course details…'}
              </Text>
            </Box>
          )}
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Text fontWeight="700" style={styles.sectionLabel}>Try this</Text>
        <Box style={styles.rowCard}>
          <DeviceRow icon="PlugZap" title="Check Robot is plugged in" body="Or has at least 20% battery" />
          <DeviceRow icon="Wifi" title="Check Robot connection" body="If your network changed or password rotated" onClick={() => navigation.navigate(ROUTES.DeviceHomeScreen)} />
          <DeviceRow icon="RotateCcw" title="Restart Robot" body="Hold the top button for 5 seconds" />
        </Box>
      </Box>

      <Text style={styles.note}>No rush — your child can pick up tomorrow.</Text>

      {syncMsg && (
        <Box paddingHorizontal={20} paddingTop={12}>
          <Text style={styles.syncMsg}>{syncMsg}</Text>
        </Box>
      )}

      <Box paddingHorizontal={20} paddingTop={20} paddingBottom={30} gap={10}>
        <DeviceBigBtn onClick={handleReconnect}>Reconnect Robot now</DeviceBigBtn>
        <DeviceBigBtn secondary onClick={() => navigation.navigate(ROUTES.DeviceHomeScreen)}>I'll do it later</DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  chipWrap: { marginTop: 18 },
  heading: { fontSize: 20, color: CL.ink, letterSpacing: -0.3, textAlign: 'center', maxWidth: 300, marginTop: 12 },
  sub: { fontSize: 13, color: CL.ink2, textAlign: 'center', maxWidth: 300, lineHeight: 20, marginTop: 6 },
  sectionLabel: { fontSize: 11, color: CL.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  pendingCard: { backgroundColor: CL.card, borderWidth: 1, borderColor: CL.hair, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 4 },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  pendingTitle: { fontSize: 13, color: CL.ink },
  pendingMeta: { fontSize: 11, color: CL.ink2, marginTop: 2 },
  rowCard: { backgroundColor: CL.card, borderWidth: 1, borderColor: CL.hair, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 4 },
  note: { fontSize: 12, color: CL.ink2, lineHeight: 20, textAlign: 'center', paddingHorizontal: 20, paddingTop: 12 },
  syncMsg: { fontSize: 13, color: '#C0392B', lineHeight: 19 },
});
