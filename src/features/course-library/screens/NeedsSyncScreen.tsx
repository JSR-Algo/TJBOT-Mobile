import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { ROUTES } from '@/navigation/routes';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import DeviceRow from '@/components/DeviceRow';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import CL from '../components/CL';
import CLChip from '../components/CLChip';
import LCDPreview from '../components/LCDPreview';
import { getPreloadStatus, isPreloadReady } from '@/services/api/course-library.api';
import { getDeviceStatus } from '@/services/api/device.api';

type Props = NativeStackScreenProps<RootStackParamList, 'NeedsSyncScreen'>;

const NO_DEVICE_MSG = 'No robot is paired yet. Pair one from the Robot tab, then try again.';
const NOT_READY_MSG = "Robot hasn't finished downloading this course. Keep it on Wi-Fi and try again.";
const UNREACHABLE_MSG = "We couldn't reach Robot just now. Check Wi-Fi and try again.";

export default function NeedsSyncScreen({ navigation, route }: Props) {
  const courseId = route.params?.courseId ?? 'c_food';
  const [syncMsg, setSyncMsg] = React.useState<string | null>(null);
  // Guards the retry against a double-tap firing two preload reads.
  const checking = React.useRef(false);

  // Readiness comes from the device's live preload status. The old
  // /course-library/:id/sync-status route is retired server-side (410
  // ENDPOINT_RETIRED), so asking it could never report a synced robot.
  const handleReconnect = async () => {
    if (checking.current) return;
    checking.current = true;
    setSyncMsg(null);
    try {
      let deviceId = route.params?.deviceId;
      if (!deviceId) {
        const device = await getDeviceStatus('primary', route.params?.childId);
        deviceId = device?.id;
      }
      if (!deviceId) {
        setSyncMsg(NO_DEVICE_MSG);
        return;
      }
      const preload = await getPreloadStatus(deviceId);
      if (isPreloadReady(preload)) {
        navigation.navigate(ROUTES.CourseAddedScreen, { courseId });
      } else {
        setSyncMsg(NOT_READY_MSG);
      }
    } catch {
      setSyncMsg(UNREACHABLE_MSG);
    } finally {
      checking.current = false;
    }
  };

  return (
    <DeviceShell title="Robot needs to catch up" onBack={() => navigation.navigate(ROUTES.CourseLibraryScreen)}>
      <Box paddingTop={30} paddingHorizontal={24} alignItems="center">
        <RobotDevice emotion="reconnect" size={170} accent="#FF6F61" />
        <Box style={styles.chipWrap}><CLChip state="needs_sync" /></Box>
        <Text fontWeight="600" style={styles.heading}>Robot is offline right now</Text>
        <Text style={styles.sub}>
          Your new course "Yummy Words" is waiting on the app. We'll send it the moment Robot is back on Wi-Fi.
        </Text>
      </Box>

      <Box paddingHorizontal={16} paddingTop={24}>
        <Text fontWeight="700" style={styles.sectionLabel}>Waiting to send</Text>
        <Box style={styles.pendingCard}>
          <Box style={[styles.pendingRow, { borderBottomWidth: 1, borderBottomColor: CL.hair }]}>
            <LCDPreview emotion="speak" accent="#FF6F61" size={56} />
            <Box flex={1}>
              <Text fontWeight="600" style={styles.pendingTitle}>Yummy Words · full course</Text>
              <Text style={styles.pendingMeta}>28 lessons · added 2 minutes ago</Text>
            </Box>
          </Box>
          <Box style={styles.pendingRow}>
            <LCDPreview emotion="happy" accent="#FF6F61" size={56} />
            <Box flex={1}>
              <Text fontWeight="600" style={styles.pendingTitle}>Today's lesson · Animals at home</Text>
              <Text style={styles.pendingMeta}>Will play once Robot is back online</Text>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Text fontWeight="700" style={styles.sectionLabel}>Try this</Text>
        <Box style={styles.rowCard}>
          <DeviceRow icon="🔌" title="Check Robot is plugged in" body="Or has at least 20% battery" />
          <DeviceRow icon="📶" title="Check Robot connection" body="If your network changed or password rotated" onClick={() => navigation.navigate(ROUTES.DeviceHomeScreen)} />
          <DeviceRow icon="🔄" title="Restart Robot" body="Hold the top button for 5 seconds" />
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
