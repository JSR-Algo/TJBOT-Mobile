import React from 'react';
import { StyleSheet } from 'react-native';
import { QueryClientContext } from '@tanstack/react-query';
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
import { useOptionalHousehold } from '@/contexts/HouseholdContext';
import { formatLessonCopy, getErrorMessage, normalizeError } from '@/utils/errors';

type Props = NativeStackScreenProps<RootStackParamList, 'UnlockConfirmScreen'>;

export default function UnlockConfirmModal({ navigation, route }: Props) {
  const courseId = route.params?.courseId;
  // childId = the parent's currently-active child (D-CHILD-RESOLUTION). The
  // backend AuthGuard verifies the parent owns this child via req.auth.sub —
  // the client never trusts the household_id alone.
  const household = useOptionalHousehold();
  const queryClient = React.useContext(QueryClientContext);
  const childId = household?.activeChild?.id;
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleConfirm = async () => {
    if (pending) return;
    setError(null);
    if (!courseId) {
      setError('Choose a course before adding it to Robot.');
      return;
    }
    if (!childId) {
      setError('Add a child to this account before adding a course to Robot.');
      return;
    }
    setPending(true);
    try {
      // Resolve the household device for the ACTIVE child the same way
      // SendToRobotScreen does — 'primary' lets the server pick the bound robot
      // (devices.assigned_child_profile_id === childId) and falls back to the
      // first-listed device in single-robot households. This screen requires a
      // resolved device before enrolling (unlike SendToRobotScreen's lesson-only
      // path) so the parent always lands on a real RobotReadyScreen next.
      let deviceId: string | undefined;
      let deviceName: string | undefined;
      try {
        const device = await getDeviceStatus('primary', childId);
        if (device.id) {
          deviceId = device.id;
          deviceName = device.name;
        }
      } catch (deviceError) {
        const normalized = normalizeError(deviceError);
        if (normalized.code === 'NETWORK_ERROR') {
          setError('Could not check Robot right now. Check connection and try again.');
          return;
        }
        deviceId = undefined;
      }
      if (!deviceId) {
        setError('No Robot yet — connect Robot before adding a course.');
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
        if (normalized.code === 'LESSON_NOT_PLAYABLE') {
          setError('This course is still preparing on the server. Try again in a moment.');
          return;
        }
        // Same fallback shape as SendToRobotScreen/CourseDetailScreen: the
        // centralized copy map + <robot> token covers ROBOT_BUSY, ROBOT_OFFLINE,
        // LOW_BATTERY, ASSET_PACK_NOT_READY, etc. without a per-code branch here.
        setError(formatLessonCopy(getErrorMessage(normalized.code), { robot: deviceName }));
      }
    } finally {
      setPending(false);
    }
  };

  const handleBack = () => {
    if (courseId) {
      navigation.navigate(ROUTES.CourseDetailScreen, { courseId });
      return;
    }
    navigation.navigate(ROUTES.CourseLibraryScreen);
  };

  return (
    <DeviceShell title="Add course to Robot" onBack={handleBack}>
      <Box paddingTop={30} paddingHorizontal={24} alignItems="center">
        <Text fontWeight="600" style={styles.heading}>Ready to add this course?</Text>
        <Text style={styles.sub}>Robot will prepare the first lesson for your child.</Text>
      </Box>

      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <DeviceBigBtn
          onClick={() => { void handleConfirm(); }}
          disabled={pending}
          accessibilityLabel={pending ? 'Adding...' : 'Add to Robot'}
        >
          {pending ? 'Adding...' : 'Add to Robot'}
        </DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 20, color: CL.ink, letterSpacing: -0.2, textAlign: 'center' },
  sub: { fontSize: 13, color: CL.ink2, marginTop: 6, textAlign: 'center', maxWidth: 280, lineHeight: 20 },
  errorText: { fontSize: 13, color: '#C0392B', textAlign: 'center', marginBottom: 10 },
});
