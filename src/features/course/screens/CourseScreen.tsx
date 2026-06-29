import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { ROUTES } from '@/navigation/routes';
import PageScroll from '@/design-system/components/PageScroll';
import PageHeader from '@/design-system/components/PageHeader';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { listCourseCatalog, type CourseCatalogItem } from '@/services/api/course.api';

type Props = NativeStackScreenProps<RootStackParamList, 'CourseScreen'>;

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; courses: CourseCatalogItem[] }
  | { kind: 'error'; title: string; detail?: string; retryLabel?: string };

export default function CourseScreen({ navigation }: Props) {
  const [state, setState] = React.useState<LoadState>({ kind: 'loading' });

  const load = React.useCallback(() => {
    let active = true;
    setState({ kind: 'loading' });
    void Promise.resolve(listCourseCatalog())
      .then((courses) => {
        if (active) setState({ kind: 'ready', courses: courses ?? [] });
      })
      .catch((error: unknown) => {
        if (active) setState(courseErrorState(error));
      });
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => load(), [load]);

  return (
    <PageScroll>
      <PageHeader subtitle="My adventure" title="English with Robot" onBack={() => navigation.goBack()} />
      <Box paddingHorizontal={18} paddingBottom={30} gap={12}>
        {state.kind === 'loading' ? <Text style={styles.message}>Loading courses</Text> : null}
        {state.kind === 'error' ? (
          <Box gap={8}>
            <Text fontWeight="800" style={styles.message}>{state.title}</Text>
            {state.detail ? <Text style={styles.detail}>{state.detail}</Text> : null}
            {state.retryLabel ? (
              <TouchableOpacity
                onPress={load}
                style={styles.retry}
                accessibilityRole="button"
                accessibilityLabel={state.retryLabel}
              >
                <Text fontWeight="700" style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            ) : null}
          </Box>
        ) : null}
        {state.kind === 'ready' && state.courses.length === 0 ? (
          <Text style={styles.message}>No courses yet</Text>
        ) : null}
        {state.kind === 'ready' && state.courses.map((course) => (
          <TouchableOpacity
            key={course.id}
            disabled={course.locked}
            onPress={() => navigation.navigate(ROUTES.LevelScreen, { levelId: course.id })}
            style={[styles.courseRow, course.locked && styles.lockedRow]}
            accessibilityRole="button"
            accessibilityState={{ disabled: course.locked }}
          >
            <Box flex={1}>
              <Text fontWeight="800" style={styles.title}>{course.title}</Text>
              <Text style={styles.meta}>{course.lessonCount} lessons</Text>
            </Box>
            <Text fontWeight="800" style={course.locked ? styles.lockedText : styles.continueText}>
              {course.locked ? 'Locked' : 'Continue'}
            </Text>
          </TouchableOpacity>
        ))}
      </Box>
    </PageScroll>
  );
}

function courseErrorState(error: unknown): LoadState {
  const record = asRecord(error);
  if (record?.code === 'NETWORK_ERROR') {
    return { kind: 'error', title: 'Course catalog offline' };
  }
  if (record?.status === 429 || record?.code === 'RATE_LIMIT_EXCEEDED') {
    const retryAfter = typeof record?.retryAfterSeconds === 'number' ? record.retryAfterSeconds : 45;
    return {
      kind: 'error',
      title: 'Course refresh limited',
      detail: `Try again in ${retryAfter} seconds.`,
      retryLabel: 'Retry Course refresh limited',
    };
  }
  // Generic / not-yet-implemented catalog failure: keep the screen escapable
  // by always offering a Retry (the back affordance is wired on PageHeader).
  return { kind: 'error', title: 'Courses unavailable', retryLabel: 'Retry Courses unavailable' };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

const styles = StyleSheet.create({
  message: { fontSize: 18, color: '#2B2140' },
  detail: { fontSize: 14, color: '#5C4F77' },
  retry: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D7D0C4',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  retryText: { fontSize: 14, color: '#2B2140' },
  courseRow: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lockedRow: { opacity: 0.62 },
  title: { fontSize: 18, color: '#2B2140' },
  meta: { fontSize: 12, color: '#5C4F77', marginTop: 3 },
  continueText: { fontSize: 14, color: '#FF6F61' },
  lockedText: { fontSize: 14, color: '#8B8B96' },
});
