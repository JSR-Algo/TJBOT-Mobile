import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { ROUTES } from '@/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { listLibrary, type LibraryItem } from '@/services/api/course-library.api';
import { translateTemplate, useAppLanguage } from '@/services/i18n/i18n';
import CL from '../components/CL';

type Props = NativeStackScreenProps<RootStackParamList, 'CourseLibraryScreen'>;

type ErrorInfo = { title: string; detail?: string };
type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; courses: LibraryItem[] }
  | { kind: 'error'; title: string; detail?: string };

const LANGUAGE_LABEL: Record<string, string> = { en: 'English', vi: 'Vietnamese' };

export default function CourseLibraryScreen({ navigation }: Props) {
  const { language, t } = useAppLanguage();
  const [state, setState] = React.useState<LoadState>({ kind: 'loading' });
  const [refreshing, setRefreshing] = React.useState(false);
  // Guards setState against a response that resolves after the screen has moved
  // on (unmount, or a newer load()). Bumping the ref invalidates in-flight runs.
  const reqIdRef = React.useRef(0);

  const load = React.useCallback((mode: 'initial' | 'retry' = 'initial') => {
    const myId = ++reqIdRef.current;
    if (mode === 'retry') setRefreshing(true);
    else setState({ kind: 'loading' });
    void listLibrary()
      .then((courses) => {
        if (reqIdRef.current !== myId) return;
        setState({ kind: 'ready', courses: courses ?? [] });
      })
      .catch((error: unknown) => {
        if (reqIdRef.current !== myId) return;
        setState({ kind: 'error', ...libraryErrorInfo(error) });
      })
      .finally(() => {
        if (reqIdRef.current === myId) setRefreshing(false);
      });
  }, []);

  // Load on mount and refetch when the tab regains focus (bottom-tab screens
  // stay mounted, so a plain useEffect would never refresh after a failure).
  useFocusEffect(
    React.useCallback(() => {
      load('initial');
      return () => {
        // Invalidate any in-flight request when the tab loses focus/unmounts.
        reqIdRef.current += 1;
      };
    }, [load]),
  );

  return (
    <DeviceShell title="Course Library">
      <Text style={styles.intro}>Pick what your Robot teaches.</Text>
      <Box paddingHorizontal={16} paddingTop={18} paddingBottom={30} gap={10}>
        {state.kind === 'loading' ? <Text style={styles.message}>Loading library</Text> : null}
        {state.kind === 'error' ? (
          <Box gap={10}>
            <Text fontWeight="800" style={styles.message}>{state.title}</Text>
            {state.detail ? <Text style={styles.detail}>{state.detail}</Text> : null}
            <TouchableOpacity
              onPress={() => load('retry')}
              disabled={refreshing}
              accessibilityRole="button"
              accessibilityLabel={t('Try again')}
              accessibilityState={{ disabled: refreshing, busy: refreshing }}
              style={styles.retryBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {refreshing ? <ActivityIndicator size="small" color={CL.ink} /> : null}
              <Text fontWeight="700" style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </Box>
        ) : null}
        {state.kind === 'ready' && state.courses.length === 0 ? (
          <Text style={styles.message}>No library courses yet</Text>
        ) : null}
        {state.kind === 'ready' && state.courses.map((course, index) => {
          const locked = course.locked === true || !course.owned;
          const title = course.title || t('Untitled course');
          const languageLabel = LANGUAGE_LABEL[course.language]
            ? t(LANGUAGE_LABEL[course.language])
            : course.language;
          return (
            <TouchableOpacity
              key={course.courseId || `course-${index}`}
              onPress={() => {
                // Never navigate with a blank id — CourseDetail's `?? fallback`
                // would silently open an unrelated course.
                if (!course.courseId) return;
                navigation.navigate(ROUTES.CourseDetailScreen, { courseId: course.courseId });
              }}
              style={styles.courseCard}
              accessibilityRole="button"
              accessibilityLabel={translateTemplate(
                locked ? 'Open {{title}} locked course' : 'Open {{title}} course',
                { title },
                { locale: language },
              )}
            >
              <Box flex={1}>
                <Text fontWeight="800" style={styles.title} numberOfLines={2} i18n={false}>{title}</Text>
                <Text style={styles.meta} i18n={false}>{languageLabel}</Text>
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

// Map the normalized AppError (client.ts always normalizes before rejecting) to
// user copy. Reads status/code so a Render cold-start 503/504 gets a real
// "service unavailable + retry" message instead of the generic fallback.
function libraryErrorInfo(error: unknown): ErrorInfo {
  const record = asRecord(error);
  const code = typeof record?.code === 'string' ? record.code : undefined;
  const status = typeof record?.status === 'number' ? record.status : undefined;
  const message = typeof record?.message === 'string' ? record.message : undefined;
  if (code === 'NETWORK_ERROR') {
    return { title: 'Library offline' };
  }
  if (status === 502 || status === 503 || status === 504) {
    // Keep the friendly, localized detail — raw upstream 5xx messages
    // ("bad gateway") are noise to a parent.
    return { title: 'Library service unavailable', detail: 'Retry in a moment.' };
  }
  // For anything else, surface the normalized message only when it adds signal
  // beyond a bare status (client.ts already maps generic ones to friendly copy).
  return { title: 'Library unavailable', detail: message };
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
  retryBtn: {
    minHeight: 44,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: CL.card,
    borderWidth: 1,
    borderColor: CL.hair,
  },
  retryText: { fontSize: 14, color: CL.ink },
});
