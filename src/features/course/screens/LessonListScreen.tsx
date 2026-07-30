import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { ROUTES } from '@/navigation/routes';
import PageScroll from '@/design-system/components/PageScroll';
import PageHeader from '@/design-system/components/PageHeader';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { Icon } from '@/design-system/icons';
import { referenceColors, referenceShadow } from '@/design-system/referenceTheme';
import { getLessonList, type LessonDetail } from '@/services/api/course.api';
import { translateTemplate, useAppLanguage } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'LessonListScreen'>;

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; lessons: LessonDetail[] }
  | { kind: 'error'; title: string; detail?: string };

export default function LessonListScreen({ navigation, route }: Props) {
  const { language, t } = useAppLanguage();
  const unitId = route.params?.unitId;
  const [state, setState] = React.useState<LoadState>(
    unitId ? { kind: 'loading' } : { kind: 'error', title: 'Lesson list unavailable' },
  );

  React.useEffect(() => {
    if (!unitId) {
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
  }, [unitId]);

  return (
    <PageScroll>
      <PageHeader
        onBack={() => navigation.navigate(ROUTES.UnitScreen, unitId ? { unitId } : undefined)}
        subtitle="All lessons"
        title="Hello Friends"
      />
      <Box paddingHorizontal={18} paddingBottom={30} gap={10}>
        {state.kind === 'loading' ? (
          <Box style={styles.stateCard} alignItems="center" gap={12}>
            <ActivityIndicator color={referenceColors.primary} />
            <Text fontWeight="800" style={styles.message}>Loading lessons</Text>
            <Text style={styles.detail}>Finding the latest activities for this unit.</Text>
          </Box>
        ) : null}
        {state.kind === 'error' ? (
          <Box style={styles.stateCard} alignItems="center" gap={10}>
            <Box style={styles.stateIcon} alignItems="center" justifyContent="center">
              <Icon name="BookOpen" size={30} color={referenceColors.lavender} strokeWidth={2.2} />
            </Box>
            <Text fontWeight="800" style={styles.message}>{state.title}</Text>
            <Text style={styles.detail}>
              {state.detail ?? 'Choose a unit first, then come back to see its lessons.'}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Back to units"
              onPress={() => navigation.navigate(ROUTES.UnitScreen, unitId ? { unitId } : undefined)}
              style={styles.stateAction}
            >
              <Icon name="ArrowLeft" size={17} color="#FFFFFF" strokeWidth={2.4} />
              <Text fontWeight="800" style={styles.stateActionText}>Back to units</Text>
            </TouchableOpacity>
          </Box>
        ) : null}
        {state.kind === 'ready' && state.lessons.length === 0 ? (
          <Box style={styles.stateCard} alignItems="center" gap={10}>
            <Box style={styles.stateIcon} alignItems="center" justifyContent="center">
              <Icon name="Clock3" size={30} color={referenceColors.gold} strokeWidth={2.2} />
            </Box>
            <Text fontWeight="800" style={styles.message}>No lessons ready yet</Text>
            <Text style={styles.detail}>This unit is being prepared. Try another unit for now.</Text>
          </Box>
        ) : null}
        {state.kind === 'ready' && state.lessons.map((lesson) => (
          <TouchableOpacity
            key={lesson.id}
            onPress={() => navigation.navigate(ROUTES.LessonDetailScreen, { lessonId: lesson.id })}
            style={styles.lessonRow}
            accessibilityRole="button"
            accessibilityLabel={`${lesson.title}. ${lesson.durationMinutes} minutes`}
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
    return { kind: 'error', title: 'Lesson list offline' };
  }
  if (record?.status === 410 || record?.code === 'LESSON_GONE') {
    return {
      kind: 'error',
      title: 'Lesson list changed',
      detail: 'Refresh to continue with the latest state.',
    };
  }
  return { kind: 'error', title: 'Lessons unavailable' };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

const styles = StyleSheet.create({
  message: { fontSize: 18, color: referenceColors.ink, textAlign: 'center' },
  detail: { fontSize: 14, lineHeight: 20, color: referenceColors.inkSoft, textAlign: 'center' },
  stateCard: {
    minHeight: 230,
    backgroundColor: referenceColors.card,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: referenceColors.line,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 32,
    ...referenceShadow.card,
  },
  stateIcon: { width: 64, height: 64, borderRadius: 24, backgroundColor: referenceColors.lavenderSoft },
  stateAction: {
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: referenceColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 6,
  },
  stateActionText: { fontSize: 14, color: '#FFFFFF' },
  lessonRow: {
    backgroundColor: referenceColors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: referenceColors.line,
    padding: 18,
    ...referenceShadow.card,
  },
  title: { fontSize: 18, color: referenceColors.ink },
  meta: { fontSize: 12, color: referenceColors.inkSoft, marginTop: 3 },
});
