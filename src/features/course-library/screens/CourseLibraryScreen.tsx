import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { ROUTES } from '@/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { listLibrary, type LibraryItem } from '@/services/api/course-library.api';
import CL from '../components/CL';

type Props = NativeStackScreenProps<RootStackParamList, 'CourseLibraryScreen'>;

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; courses: LibraryItem[] }
  | { kind: 'error'; title: string; detail?: string };

export default function CourseLibraryScreen({ navigation }: Props) {
  const [state, setState] = React.useState<LoadState>({ kind: 'loading' });

  React.useEffect(() => {
    let active = true;
    setState({ kind: 'loading' });
    void listLibrary()
      .then((courses) => {
        if (active) setState({ kind: 'ready', courses: courses ?? [] });
      })
      .catch((error: unknown) => {
        if (active) setState(libraryErrorState(error));
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <DeviceShell title="Course Library">
      <Text style={styles.intro}>Pick what your Robot teaches.</Text>
      <Box paddingHorizontal={16} paddingTop={18} paddingBottom={30} gap={10}>
        {state.kind === 'loading' ? <Text style={styles.message}>Loading library</Text> : null}
        {state.kind === 'error' ? (
          <Box gap={6}>
            <Text fontWeight="800" style={styles.message}>{state.title}</Text>
            {state.detail ? <Text style={styles.detail}>{state.detail}</Text> : null}
          </Box>
        ) : null}
        {state.kind === 'ready' && state.courses.length === 0 ? (
          <Text style={styles.message}>No library courses yet</Text>
        ) : null}
        {state.kind === 'ready' && state.courses.map((course) => {
          const locked = course.locked === true || !course.owned;
          return (
            <TouchableOpacity
              key={course.courseId}
              onPress={() => navigation.navigate(ROUTES.CourseDetailScreen, { courseId: course.courseId })}
              style={styles.courseCard}
              accessibilityRole="button"
              accessibilityLabel={`Open ${course.title}${locked ? ' locked' : ''} course`}
            >
              <Box flex={1}>
                <Text fontWeight="800" style={styles.title}>{course.title}</Text>
                <Text style={styles.meta}>{course.language}</Text>
              </Box>
              {course.syncedToDevice ? <Text fontWeight="800" style={styles.onRobot}>On Robot</Text> : null}
              {locked ? <Text fontWeight="800" style={styles.locked}>Locked</Text> : null}
            </TouchableOpacity>
          );
        })}
      </Box>
    </DeviceShell>
  );
}

function libraryErrorState(error: unknown): LoadState {
  const record = asRecord(error);
  if (record?.code === 'NETWORK_ERROR') {
    return { kind: 'error', title: 'Library offline' };
  }
  if (record?.status === 502) {
    return { kind: 'error', title: 'Library service unavailable', detail: 'Retry in a moment.' };
  }
  return { kind: 'error', title: 'Library unavailable' };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

const styles = StyleSheet.create({
  intro: { fontSize: 13, color: CL.ink2, lineHeight: 20, paddingHorizontal: 20, paddingTop: 14 },
  message: { fontSize: 18, color: CL.ink },
  detail: { fontSize: 14, color: CL.ink2 },
  courseCard: {
    backgroundColor: CL.card,
    borderWidth: 1,
    borderColor: CL.hair,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: { fontSize: 15, color: CL.ink },
  meta: { fontSize: 12, color: CL.ink2, marginTop: 3 },
  onRobot: { fontSize: 12, color: CL.good },
  locked: { fontSize: 12, color: '#6E5A8A' },
});
