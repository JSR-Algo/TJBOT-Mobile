import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { ROUTES } from '@/navigation/routes';
import PageScroll from '@/design-system/components/PageScroll';
import PageHeader from '@/design-system/components/PageHeader';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { getLessonList, type LessonDetail } from '@/services/api/course.api';
import { translateTemplate, useAppLanguage } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'LessonListScreen'>;

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; lessons: LessonDetail[] }
  | { kind: 'error'; title: string; detail?: string; retryLabel?: string };

export default function LessonListScreen({ navigation, route }: Props) {
  const { language, t } = useAppLanguage();
  const unitId = route.params?.unitId;
  const [state, setState] = React.useState<LoadState>(
    unitId ? { kind: 'loading' } : { kind: 'error', title: 'Lesson list unavailable' },
  );
  const [reloadNonce, setReloadNonce] = React.useState(0);

  React.useEffect(() => {
    if (!unitId) {
      // No unitId to fetch with — a retry cannot change the outcome, so this
      // state deliberately keeps only the header's back affordance.
      setState({ kind: 'error', title: 'Lesson list unavailable' });
      return undefined;
    }
    let active = true;
    setState({ kind: 'loading' });
    void getLessonList(unitId)
      .then((lessons) => {
        if (active) setState({ kind: 'ready', lessons: lessons ?? [] });
      })
      .catch((error: unknown) => {
        if (active) setState(lessonErrorState(error));
      });
    return () => {
      active = false;
    };
  }, [unitId, reloadNonce]);

  const reload = React.useCallback(() => {
    setReloadNonce((value) => value + 1);
  }, []);

  return (
    <PageScroll>
      <PageHeader
        onBack={() => navigation.navigate(ROUTES.UnitScreen, unitId ? { unitId } : undefined)}
        subtitle="All lessons"
        title="Hello Friends"
      />
      <Box paddingHorizontal={18} paddingBottom={30} gap={10}>
        {state.kind === 'loading' ? <Text style={styles.message}>Loading lessons</Text> : null}
        {state.kind === 'error' ? (
          <Box gap={8}>
            <Text fontWeight="800" style={styles.message}>{state.title}</Text>
            {state.detail ? <Text style={styles.detail}>{state.detail}</Text> : null}
            {state.retryLabel ? (
              <TouchableOpacity
                onPress={reload}
                style={styles.retry}
                accessibilityRole="button"
                accessibilityLabel={state.retryLabel}
              >
                <Text fontWeight="700" style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            ) : null}
          </Box>
        ) : null}
        {state.kind === 'ready' && state.lessons.length === 0 ? (
          <Text style={styles.message}>No lessons ready yet</Text>
        ) : null}
        {state.kind === 'ready' && state.lessons.map((lesson) => (
          <TouchableOpacity
            key={lesson.id}
            onPress={() => navigation.navigate(ROUTES.LessonDetailScreen, { lessonId: lesson.id })}
            style={styles.lessonRow}
            accessibilityRole="button"
          >
            <Box flex={1}>
              <Text fontWeight="800" style={styles.title}>{lesson.title}</Text>
              <Text style={styles.meta} i18n={false}>
                {translateTemplate(
                  '{{duration}} {{minuteLabel}} · {{words}} {{wordLabel}}',
                  {
                    duration: lesson.durationMinutes,
                    minuteLabel: t('minutes'),
                    words: lesson.wordsCount,
                    wordLabel: t('words'),
                  },
                  { locale: language },
                )}
              </Text>
            </Box>
          </TouchableOpacity>
        ))}
      </Box>
    </PageScroll>
  );
}

function lessonErrorState(error: unknown): LoadState {
  const record = asRecord(error);
  if (record?.code === 'NETWORK_ERROR') {
    return { kind: 'error', title: 'Lesson list offline', retryLabel: 'Retry Lesson list offline' };
  }
  if (record?.status === 410 || record?.code === 'LESSON_GONE') {
    return {
      kind: 'error',
      title: 'Lesson list changed',
      // This copy told the parent to "Refresh" while offering nothing to press.
      detail: 'Refresh to continue with the latest state.',
      retryLabel: 'Retry Lesson list changed',
    };
  }
  return { kind: 'error', title: 'Lessons unavailable', retryLabel: 'Retry Lessons unavailable' };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

const styles = StyleSheet.create({
  message: { fontSize: 18, color: '#2B2140' },
  detail: { fontSize: 14, color: '#5C4F77' },
  retry: {
    minHeight: 44,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D7D0C4',
    paddingHorizontal: 14,
    backgroundColor: '#fff',
  },
  retryText: { fontSize: 14, color: '#2B2140' },
  lessonRow: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
  },
  title: { fontSize: 18, color: '#2B2140' },
  meta: { fontSize: 12, color: '#5C4F77', marginTop: 3 },
});
