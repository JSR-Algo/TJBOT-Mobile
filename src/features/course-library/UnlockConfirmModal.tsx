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
import { useOptionalAuth } from '@/contexts/AuthContext';
import { formatLessonCopy, getErrorMessage, normalizeError } from '@/utils/errors';
import { useScreenActivity } from './useScreenActivity';
import { validAssignmentVersion } from './assignmentReconciliation';

type Props = NativeStackScreenProps<RootStackParamList, 'UnlockConfirmScreen'>;

export default function UnlockConfirmModal({ navigation, route }: Props) {
  const courseId = route.params?.courseId;
  // childId = the parent's currently-active child (D-CHILD-RESOLUTION). The
  // backend AuthGuard verifies the parent owns this child via req.auth.sub —
  // the client never trusts the household_id alone.
  const household = useOptionalHousehold();
  const auth = useOptionalAuth();
  const queryClient = React.useContext(QueryClientContext);
  const childId = household?.activeChild?.id;
  const selection = JSON.stringify([auth?.user?.id, household?.activeHousehold?.id, childId, courseId]);
  const { active, key, isCurrent } = useScreenActivity(JSON.stringify([childId, courseId]));
  const leaving = React.useRef(false);
  React.useEffect(() => { leaving.current = false; }, [key]);
  const current = () => !leaving.current && isCurrent(key);
  const pendingRef = React.useRef(new Set<string>());
  // Activity generations fence callbacks; stable write identities survive A-B-A.
  const dispatched = React.useRef(new Set<string>());
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [unverifiedSelection, setUnverifiedSelection] = React.useState<string | null>(null);
  const unverified = unverifiedSelection === selection;
  React.useEffect(() => { setPending(false); setError(null); }, [key]);

  const handleConfirm = async () => {
    if (pendingRef.current.has(key) || !active || !current()) return;
    setError(null);
    if (!courseId) {
      setError('Choose a course before adding it to Robot.');
      return;
    }
    if (!childId) {
      setError('Add a child to this account before adding a course to Robot.');
      return;
    }
    pendingRef.current.add(key);
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
        if (!current()) return;
        if (device.id) {
          deviceId = device.id;
          deviceName = device.name;
        }
      } catch (deviceError) {
        if (!current()) return;
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
      const writeIdentity = JSON.stringify([selection, deviceId]);
      if (dispatched.current.has(writeIdentity)) {
        setUnverifiedSelection(selection);
        setError('Could not verify the added lesson. Check Robot or pick a lesson again.');
        return;
      }
      dispatched.current.add(writeIdentity);
      try {
        const { enrollment, assignment } = await enrollCourse(courseId, { childId, deviceId });
        if (!current()) return;
        // The new enrollment becomes the child's in-flight course. Invalidate
        // the shared progress cache (SAME key ParentToday / ParentHistory /
        // TodayProgress read) plus the enrollment + current-assignment keys so
        // those screens refetch instead of showing stale pre-enroll data.
        void queryClient?.invalidateQueries({ queryKey: ['lesson-progress', 'child', childId] });
        void queryClient?.invalidateQueries({ queryKey: ['enrollments', 'child', childId] });
        void queryClient?.invalidateQueries({ queryKey: ['assignment', 'device', deviceId, 'current'] });
        if (!assignment.id?.trim() || !validAssignmentVersion(assignment.assignmentVersion) ||
            assignment.childId !== childId || assignment.deviceId !== deviceId ||
            !assignment.profile?.trim() || !assignment.manifestChecksum?.trim() ||
            enrollment.courseId !== courseId || enrollment.childId !== childId || enrollment.deviceId !== deviceId) {
          // The write was dispatched; an incomplete receipt is not permission to replay it.
          setUnverifiedSelection(selection);
          setError('Could not verify the added lesson. Check Robot or pick a lesson again.');
          return;
        }
        leaving.current = true;
        navigation.replace(ROUTES.CourseAddedScreen, {
          courseId,
          childId: assignment.childId,
          profile: assignment.profile,
          deviceId: assignment.deviceId,
          assignmentId: assignment.id,
          assignmentVersion: assignment.assignmentVersion,
          manifestChecksum: assignment.manifestChecksum,
        });
      } catch (err) {
        if (!current()) return;
        const normalized = normalizeError(err);
        // Only this audited pre-write response proves enrollment can be retried.
        if (normalized.code === 'LESSON_NOT_PLAYABLE' && normalized.status === 422) {
          dispatched.current.delete(writeIdentity);
          setError('This course is still preparing on the server. Try again in a moment.');
          return;
        }
        // Domain errors, including COURSE_NOT_AVAILABLE, can follow committed writes.
        setUnverifiedSelection(selection);
        if (['NETWORK_ERROR', 'UNKNOWN_ERROR', 'SERVER_ERROR', 'INTERNAL_ERROR', 'SERVICE_UNAVAILABLE', 'GATEWAY_TIMEOUT'].includes(normalized.code) ||
            (normalized.status != null && (normalized.status >= 500 || normalized.status === 408))) {
          setError('Could not verify the added lesson. Check Robot or pick a lesson again.');
          return;
        }
        // Same fallback shape as SendToRobotScreen/CourseDetailScreen: the
        // centralized copy map + <robot> token covers ROBOT_BUSY, ROBOT_OFFLINE,
        // LOW_BATTERY, ASSET_PACK_NOT_READY, etc. without a per-code branch here.
        setError(formatLessonCopy(getErrorMessage(normalized.code), { robot: deviceName }));
      }
    } finally {
      pendingRef.current.delete(key);
      if (current()) setPending(false);
    }
  };

  const handleBack = () => {
    leaving.current = true;
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
        {unverified ? <DeviceBigBtn secondary onClick={() => {
          leaving.current = true;
          navigation.navigate(ROUTES.SendToRobotScreen, { courseId });
        }}>Pick a different lesson</DeviceBigBtn> : null}
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
