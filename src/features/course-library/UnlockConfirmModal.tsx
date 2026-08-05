import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { QueryClientContext } from '@tanstack/react-query';
import Svg, { Path, Rect } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { ROUTES } from '@/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import CL from './components/CL';
import { enrollCourse } from '@/services/api/course-library.api';
import { getDeviceStatus } from '@/services/api/device.api';
import { authenticateParent } from '@/services/api/parent.api';
import { useOptionalHousehold } from '@/contexts/HouseholdContext';
import { getErrorMessage, normalizeError } from '@/utils/errors';

type Props = NativeStackScreenProps<RootStackParamList, 'UnlockConfirmScreen'>;

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }
  if ('status' in error && typeof error.status === 'number') {
    return error.status;
  }
  if ('response' in error) {
    const response = error.response;
    if (response && typeof response === 'object' && 'status' in response && typeof response.status === 'number') {
      return response.status;
    }
  }
  return undefined;
}

export default function UnlockConfirmModal({ navigation, route }: Props) {
  const courseId = route.params?.courseId;
  // childId = the parent's currently-active child (D-CHILD-RESOLUTION). The
  // backend AuthGuard verifies the parent owns this child via req.auth.sub —
  // the client never trusts the household_id alone.
  const household = useOptionalHousehold();
  const queryClient = React.useContext(QueryClientContext);
  const childId = household?.activeChild?.id;
  const [vals, setVals] = React.useState(['', '', '', '']);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const filled = vals.every(Boolean);

  const handleConfirm = async () => {
    if (!filled || pending) return;
    setError(null);
    if (!courseId) {
      setError('Choose a course before unlocking it.');
      return;
    }
    if (!childId) {
      setError('Add a child to this account before unlocking a course.');
      return;
    }
    setPending(true);
    try {
      const pin = vals.join('');
      try {
        const auth = await authenticateParent({ pin });
        if (!auth.authenticated) {
          setError('Parent PIN was not accepted. Try again.');
          return;
        }
      } catch (authError) {
        const status = getErrorStatus(authError);
        const normalized = normalizeError(authError);
        if (status === 429) {
          const wait = normalized.retryAfterSeconds ?? 30;
          setError(`Too many attempts. Try again in ${wait} seconds.`);
          return;
        }
        if (status === 423) {
          setError('Too many wrong attempts. Parent check is locked for now.');
          return;
        }
        setError('Wrong PIN. Try again.');
        return;
      }

      // Resolve the household device for the ACTIVE child the same way
      // SendToRobotScreen does — 'primary' lets the server pick the bound robot
      // (devices.assigned_child_profile_id === childId) and falls back to the
      // first-listed device in single-robot households. When no device is
      // available we still attempt the enrollment WITHOUT deviceId so the parent
      // can finish the unlock flow; the backend creates the enrollment and
      // returns a placeholder/no-op assignment that RobotReadyScreen will show
      // as "no robot yet".
      let deviceId: string | undefined;
      try {
        const device = await getDeviceStatus('primary', childId);
        if (device.id) deviceId = device.id;
      } catch (deviceError) {
        const normalized = normalizeError(deviceError);
        if (normalized.code === 'NETWORK_ERROR') {
          setError('Could not check Robot right now. Check connection and try again.');
          return;
        }
        deviceId = undefined;
      }
      if (!deviceId) {
        setError('No Robot yet — connect Robot before unlocking a course.');
        return;
      }
      try {
        const { assignment } = await enrollCourse(courseId, { childId, deviceId });
        // The new enrollment becomes the child's in-flight course. Invalidate
        // the shared progress cache (SAME key ParentToday / ParentHistory /
        // TodayProgress read) plus the enrollment + current-assignment keys so
        // those screens refetch instead of showing stale pre-enroll data.
        void queryClient?.invalidateQueries({ queryKey: ['lesson-progress', 'child', childId] });
        void queryClient?.invalidateQueries({ queryKey: ['enrollments', 'child', childId] });
        void queryClient?.invalidateQueries({ queryKey: ['assignment', 'device', deviceId, 'current'] });
        navigation.replace(ROUTES.CourseAddedScreen, {
          courseId,
          deviceId: assignment.deviceId,
          assignmentId: assignment.id,
          assignmentVersion: assignment.assignmentVersion,
          manifestChecksum: assignment.manifestChecksum,
        });
      } catch (err) {
        const normalized = normalizeError(err);
        if (normalized.code === 'NO_DEVICE') {
          setError('No Robot yet — connect Robot before unlocking a course.');
          return;
        }
        if (normalized.code === 'LESSON_NOT_PLAYABLE') {
          setError('This course is still preparing on the server. Try again in a moment.');
          return;
        }
        if (normalized.code === 'ASSET_PACK_NOT_READY') {
          setError(getErrorMessage(normalized.code));
          return;
        }
        setError('Could not unlock the course. Try again.');
      }
    } finally {
      setPending(false);
    }
  };

  const handleKey = (k: string) => {
    setVals(prev => {
      const next = [...prev];
      if (k === '⌫') {
        for (let j = next.length - 1; j >= 0; j--) {
          if (next[j]) { next[j] = ''; break; }
        }
      } else {
        const idx = next.findIndex(x => !x);
        if (idx >= 0) next[idx] = k;
      }
      return next;
    });
  };

  const handleBack = () => {
    if (courseId) {
      navigation.navigate(ROUTES.CourseDetailScreen, { courseId });
      return;
    }
    navigation.navigate(ROUTES.CourseLibraryScreen);
  };

  return (
    <DeviceShell title="Quick parent check" onBack={handleBack}>
      <Box paddingTop={30} paddingHorizontal={24} alignItems="center">
        <Box style={styles.lockIcon}>
          <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={CL.ink2} strokeWidth={1.8} strokeLinecap="round">
            <Rect x={5} y={11} width={14} height={10} rx={2} />
            <Path d="M8 11V7a4 4 0 018 0v4" />
          </Svg>
        </Box>
        <Text fontWeight="600" style={styles.heading}>Parent PIN required</Text>
        <Text style={styles.sub}>Enter your parent PIN before adding this course to Robot.</Text>
      </Box>

      <Box paddingHorizontal={20} paddingTop={24} alignItems="center">
        <Text fontWeight="700" style={styles.pinLabel}>PARENT PIN</Text>
      </Box>

      <Box paddingHorizontal={20} paddingTop={18}>
        <Box flexDirection="row" gap={10} justifyContent="center">
          {vals.map((v, i) => (
            <Box key={i} style={[styles.digit, { borderColor: v ? CL.accent : CL.hair }]}>
              <Text fontWeight="700" style={styles.digitText}>{v ? '•' : ''}</Text>
            </Box>
          ))}
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={24}>
        <Box style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {KEYS.map((k, i) => {
            if (!k) return <Box key={i} flex={1} height={54} />;
            const label = k === '⌫' ? 'Delete last digit' : `Enter digit ${k}`;
            return (
              <TouchableOpacity
                key={i}
                onPress={() => handleKey(k)}
                style={styles.key}
                activeOpacity={0.7}
                accessibilityLabel={label}
                accessibilityRole="button"
              >
                <Text fontWeight="600" style={styles.keyText}>{k}</Text>
              </TouchableOpacity>
            );
          })}
        </Box>
      </Box>

      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <DeviceBigBtn onClick={() => { void handleConfirm(); }} disabled={pending || !filled}>
          {pending ? 'Adding...' : filled ? 'Confirm add' : 'Enter parent PIN'}
        </DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  lockIcon: { width: 64, height: 64, borderRadius: 18, backgroundColor: '#EEF1F5', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  heading: { fontSize: 20, color: CL.ink, letterSpacing: -0.2, textAlign: 'center' },
  sub: { fontSize: 13, color: CL.ink2, marginTop: 6, textAlign: 'center', maxWidth: 280, lineHeight: 20 },
  pinLabel: { fontSize: 12, color: CL.ink2, letterSpacing: 0.8 },
  digit: {
    width: 54, height: 64, borderRadius: 12, backgroundColor: CL.card,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
  digitText: { fontSize: 28, color: CL.ink, fontFamily: 'Courier New' },
  key: {
    width: '30%', height: 54, borderRadius: 12, borderWidth: 1, borderColor: CL.hair,
    backgroundColor: CL.card, alignItems: 'center', justifyContent: 'center',
  },
  keyText: { fontSize: 20, color: CL.ink },
  errorText: { fontSize: 13, color: '#C0392B', textAlign: 'center', marginBottom: 10 },
});
