import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ROUTES, type RootStackParamList } from '@/navigation/routes';
import { referenceColors, referenceShadow } from '@/design-system/referenceTheme';
import { Text } from '@/design-system/primitives';
import { getCuratedLessonCatalog } from '../content/curatedLegacyLessons';
import type { LessonAgeBand } from '../types';
import { translateTemplate, useAppLanguage } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'LessonPickScreen'>;

export function LessonPickScreen({ navigation, route }: Props): React.JSX.Element {
  const { language } = useAppLanguage();
  const ageBand = (route.params?.ageBand ?? '4-6') as LessonAgeBand;
  const lessons = useMemo(() => getCuratedLessonCatalog(ageBand), [ageBand]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>English lessons</Text>
      <Text style={styles.title}>Pick a lesson</Text>
      <Text style={styles.subtitle}>Chat with Robot first, then jump into fullscreen video and nine practice steps.</Text>

      <View style={styles.grid}>
        {lessons.map((lesson) => (
          <TouchableOpacity
            key={lesson.lessonId}
            accessibilityRole="button"
            accessibilityLabel={translateTemplate(
              'Start {{lesson}}',
              { lesson: lesson.title ?? lesson.theme },
              { locale: language },
            )}
            style={styles.card}
            onPress={() => navigation.navigate(ROUTES.RobotCompanionScreen, {
              lessonId: lesson.lessonId,
              ageBand,
              autoStartVoice: true,
            })}
          >
            <Text style={styles.week}>Week {lesson.week} · Day {lesson.day}</Text>
            <Text style={styles.cardTitle}>{lesson.title ?? lesson.theme}</Text>
            <Text style={styles.cardTheme}>{lesson.theme}</Text>
            <Text style={styles.focus}>{lesson.focusItems.join(' · ')}</Text>
            <Text style={styles.cta}>Tap to start →</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

export default LessonPickScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: referenceColors.bg,
  },
  content: {
    padding: 24,
    gap: 16,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: referenceColors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: referenceColors.ink,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: referenceColors.inkSoft,
    marginBottom: 8,
  },
  grid: {
    gap: 14,
  },
  card: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255,107,111,0.16)',
    padding: 18,
    gap: 6,
    ...referenceShadow.card,
  },
  week: {
    fontSize: 11,
    fontWeight: '700',
    color: referenceColors.inkMuted,
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: referenceColors.ink,
  },
  cardTheme: {
    fontSize: 14,
    fontWeight: '600',
    color: referenceColors.inkSoft,
  },
  focus: {
    fontSize: 13,
    fontWeight: '700',
    color: referenceColors.primary,
    marginTop: 4,
  },
  cta: {
    fontSize: 13,
    fontWeight: '700',
    color: referenceColors.inkMuted,
    marginTop: 6,
  },
});
