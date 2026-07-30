import React from 'react';
import { Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { BookOpenText, CheckCircle2, ShieldCheck } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import DeviceShell from '@/components/DeviceShell';
import FlowBreadcrumb from '@/components/FlowBreadcrumb';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { referenceColors, referenceShadow } from '@/design-system/referenceTheme';
import { useOptionalHousehold } from '@/contexts/HouseholdContext';
import type { RootStackParamList } from '@/navigation/routes';
import { ROUTES } from '@/navigation/routes';
import {
  getCourseLessons,
  isLessonProfile,
  type PublishedLesson,
} from '@/services/api/course-library.api';
import { useAppLanguage } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'LessonDetailScreen'>;

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; lesson: PublishedLesson }
  | { kind: 'empty' }
  | { kind: 'error' };

type LessonWord = {
  word: string;
  meta: string;
};

type LessonBrief = {
  displayTitle: string;
  durationMinutes: number;
  words: readonly LessonWord[];
};

const BLUEPRINT_WORDS: readonly LessonWord[] = [
  { word: 'moo', meta: 'Cow sound · new' },
  { word: 'quack', meta: 'Duck sound · new' },
  { word: 'neigh', meta: 'Horse sound · new' },
  { word: 'cow', meta: 'Animal · review' },
  { word: 'duck', meta: 'Animal · review' },
  { word: 'horse', meta: 'Animal · review' },
];

const LESSON_BEATS = [
  { title: 'Listen', meta: 'Meet each animal sound' },
  { title: 'Match', meta: 'Connect the sound to its animal' },
  { title: 'Say it', meta: 'Repeat with TeeBot' },
  { title: 'Play', meta: 'Choose the animal in a quick game' },
] as const;

const BLUEPRINT_LESSON_IDS = new Set(['demo-barn-animals', 'lesson-farm-sounds']);

const BLUEPRINT_LESSON: PublishedLesson = {
  lessonId: 'lesson-farm-sounds',
  lessonVersion: 1,
  lessonType: 'lesson',
  title: 'Farm Sounds',
  profile: 'espTft',
  manifestReady: true,
  topicTags: ['animals', 'speaking'],
  difficultyBand: 'beginner',
  estimatedDurationSec: 480,
  monitorable: true,
};

export default function LessonDetailScreen({ navigation, route }: Props): React.JSX.Element {
  const { t } = useAppLanguage();
  const childId = useOptionalHousehold()?.activeChild?.id;
  const courseId = route.params?.courseId;
  const requestedLessonId = route.params?.lessonId;
  const [state, setState] = React.useState<LoadState>(
    courseId ? { kind: 'loading' } : { kind: 'ready', lesson: BLUEPRINT_LESSON },
  );

  React.useEffect(() => {
    if (!courseId) {
      setState({ kind: 'ready', lesson: BLUEPRINT_LESSON });
      return undefined;
    }

    let active = true;
    setState({ kind: 'loading' });
    void getCourseLessons(courseId, childId ? { childId } : undefined)
      .then(lessons => {
        if (!active) return;
        const lesson = lessons.find(item => item.lessonId === requestedLessonId) ?? lessons[0];
        setState(lesson ? { kind: 'ready', lesson } : { kind: 'empty' });
      })
      .catch(() => {
        if (active) setState({ kind: 'error' });
      });

    return () => {
      active = false;
    };
  }, [childId, courseId, requestedLessonId]);

  const goBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate(ROUTES.CourseLibraryScreen);
  };

  if (state.kind === 'loading') {
    return (
      <DeviceShell hideHeader title="Lesson detail" screenTestID="lessonDetailPage">
        <Box style={styles.page}>
          <FlowBreadcrumb currentIndex={1} steps={['Course detail', 'Lesson detail', 'Send to Robot']} testID="lessonDetailBreadcrumb" />
          <LessonHeading eyebrow="LESSON 3" />
          <Box style={styles.stateCard}>
            <Text style={styles.stateText}>{t('Loading lesson details')}</Text>
          </Box>
        </Box>
      </DeviceShell>
    );
  }

  if (state.kind === 'error' || state.kind === 'empty') {
    const empty = state.kind === 'empty';
    return (
      <DeviceShell hideHeader title="Lesson detail" screenTestID="lessonDetailPage">
        <Box style={styles.page}>
          <FlowBreadcrumb currentIndex={1} steps={['Course detail', 'Lesson detail', 'Send to Robot']} testID="lessonDetailBreadcrumb" />
          <LessonHeading eyebrow="LESSON 3" />
          <Box style={styles.stateCard} gap={8}>
            <Text fontWeight="800" style={styles.stateTitle}>
              {t(empty ? 'No lesson is ready yet' : 'Lesson details unavailable')}
            </Text>
            <Text style={styles.stateText}>
              {t(empty ? 'This course is still preparing its first lesson.' : 'Check your connection, then return to the course and try again.')}
            </Text>
            <TouchableOpacity accessibilityRole="button" onPress={goBack} style={styles.secondaryButton}>
              <Text fontWeight="800" style={styles.secondaryButtonText}>{t('Back to course')}</Text>
            </TouchableOpacity>
          </Box>
        </Box>
      </DeviceShell>
    );
  }

  const lesson = state.lesson;
  const brief = lessonBriefFor(lesson);
  const isPublishedFlow = Boolean(courseId);
  const ready = lesson.manifestReady && isLessonProfile(lesson.profile);

  const continueLesson = () => {
    if (isPublishedFlow && courseId) {
      navigation.navigate(ROUTES.SendToRobotScreen, { courseId });
      return;
    }
    navigation.navigate(ROUTES.LessonReadyScreen);
  };

  return (
    <DeviceShell hideHeader title="Lesson detail" screenTestID="lessonDetailPage">
      <Box style={styles.page}>
        <FlowBreadcrumb currentIndex={1} steps={['Course detail', 'Lesson detail', 'Send to Robot']} testID="lessonDetailBreadcrumb" />
        <LessonHeading eyebrow={ready ? 'LESSON 3 · READY' : 'LESSON 3 · PREPARING'} />

        <Box style={styles.heroCard} flexDirection="row" alignItems="center" gap={16}>
          <Box style={styles.heroRing} />
          <Box style={styles.heroIcon} alignItems="center" justifyContent="center">
            <BookOpenText color={referenceColors.primaryDeep} size={34} strokeWidth={2.5} />
          </Box>
          <Box flex={1} style={styles.heroContent}>
            <Text i18n={false} fontWeight="800" style={styles.heroMetric}>{brief.durationMinutes} {t('min')}</Text>
            <Text i18n={false} fontWeight="800" style={styles.heroLabel}>{BLUEPRINT_LESSON_IDS.has(lesson.lessonId) ? t(brief.displayTitle) : brief.displayTitle}</Text>
            <Box style={styles.progressTrack}>
              <Box style={[styles.progressFill, { width: ready ? '100%' : '48%' }]} />
            </Box>
          </Box>
        </Box>

        <Box style={styles.card}>
          <Text fontWeight="800" style={styles.cardTitle}>{t('Words and sounds')}</Text>
          <Box style={styles.wordGrid}>
            {brief.words.map(item => (
              <Box key={item.word} style={styles.wordTile} justifyContent="center">
                <Text i18n={false} fontWeight="800" style={styles.word}>{item.word}</Text>
                <Text fontWeight="700" style={styles.wordMeta}>{t(item.meta)}</Text>
              </Box>
            ))}
          </Box>
        </Box>

        <Box style={styles.card}>
          <Text fontWeight="800" style={styles.cardTitle}>{t('Four lesson beats')}</Text>
          {LESSON_BEATS.map((beat, index) => (
            <Box key={beat.title} flexDirection="row" alignItems="center" gap={11} style={styles.beatRow}>
              <Box style={styles.beatMarkerColumn} alignItems="center">
                <Box style={styles.beatMarker} alignItems="center" justifyContent="center">
                  <Text i18n={false} fontWeight="800" style={styles.beatNumber}>{index + 1}</Text>
                </Box>
                {index < LESSON_BEATS.length - 1 ? <Box style={styles.beatConnector} /> : null}
              </Box>
              <Box flex={1}>
                <Text fontWeight="800" style={styles.beatTitle}>{t(beat.title)}</Text>
                <Text style={styles.beatMeta}>{t(beat.meta)}</Text>
              </Box>
            </Box>
          ))}
        </Box>

        <Box style={[styles.compatibilityCard, !ready && styles.compatibilityCardBlocked]} flexDirection="row" gap={10}>
          <ShieldCheck color={ready ? '#246F69' : referenceColors.primaryDeep} size={24} strokeWidth={2.5} />
          <Box flex={1}>
            <Text fontWeight="800" style={styles.compatibilityTitle}>
              {t(ready ? 'Robot compatibility confirmed' : 'Lesson is still preparing')}
            </Text>
            <Text style={styles.compatibilityCopy}>
              {t(ready
                ? 'TeeBot has the required audio, scene clips and 42 MB of free storage.'
                : 'Sending stays locked until the lesson package is ready.')}
            </Text>
          </Box>
        </Box>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: !ready }}
          activeOpacity={0.78}
          disabled={!ready}
          onPress={continueLesson}
          style={[styles.primaryButton, !ready && styles.primaryButtonDisabled]}
          testID="sendLessonToRobot"
        >
          <CheckCircle2 color="#FFFFFF" size={20} strokeWidth={2.6} />
          <Text fontWeight="800" style={styles.primaryButtonText}>
            {t(isPublishedFlow ? 'Send lesson to TeeBot' : 'Start Lesson')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.78}
          onPress={() => Alert.alert(t('Preview for parents'), t('Parent preview is planned for a later MVP step.'))}
          style={styles.secondaryButton}
        >
          <Text fontWeight="800" style={styles.secondaryButtonText}>{t('Preview for parents')}</Text>
        </TouchableOpacity>
      </Box>
    </DeviceShell>
  );
}

function LessonHeading({ eyebrow }: { eyebrow: string }): React.JSX.Element {
  const { t } = useAppLanguage();
  return (
    <Box style={styles.heading}>
      <Text fontWeight="800" style={styles.eyebrow}>{t(eyebrow)}</Text>
      <Text fontWeight="800" style={styles.title}>{t('Lesson detail')}</Text>
      <Text style={styles.subtitle}>{t('Words, objective, duration and robot compatibility.')}</Text>
    </Box>
  );
}

function lessonBriefFor(lesson: PublishedLesson): LessonBrief {
  if (BLUEPRINT_LESSON_IDS.has(lesson.lessonId)) {
    return {
      displayTitle: 'Farm Sounds',
      durationMinutes: 8,
      words: BLUEPRINT_WORDS,
    };
  }

  const words = (lesson.topicTags ?? []).slice(0, 6).map((word, index) => ({
    word,
    meta: index < 3 ? 'Lesson topic · new' : 'Lesson topic · review',
  }));

  return {
    displayTitle: lesson.title,
    durationMinutes: Math.max(1, Math.round((lesson.estimatedDurationSec ?? 300) / 60)),
    words,
  };
}

const styles = StyleSheet.create({
  page: { paddingBottom: 142, paddingHorizontal: 18, paddingTop: 4 },
  heading: { paddingHorizontal: 2, paddingTop: 4 },
  eyebrow: { color: referenceColors.primaryDeep, fontSize: 9, letterSpacing: 0.9 },
  title: { color: '#1C1E1F', fontSize: 29, letterSpacing: -1.25, lineHeight: 34, marginTop: 8 },
  subtitle: { color: referenceColors.inkSoft, fontSize: 11, lineHeight: 16, marginTop: 8 },
  heroCard: { backgroundColor: '#FFE1E1', borderRadius: 29, minHeight: 128, marginTop: 18, overflow: 'hidden', padding: 18, position: 'relative' },
  heroRing: { borderColor: 'rgba(255,255,255,0.50)', borderRadius: 56, borderWidth: 20, bottom: -50, height: 112, position: 'absolute', right: -38, width: 112 },
  heroIcon: { backgroundColor: referenceColors.card, borderRadius: 22, height: 68, width: 68, ...referenceShadow.card },
  heroContent: { zIndex: 1 },
  heroMetric: { color: '#1C1E1F', fontSize: 28, letterSpacing: -1.2, lineHeight: 31 },
  heroLabel: { color: referenceColors.inkSoft, fontSize: 11, marginTop: 7 },
  progressTrack: { backgroundColor: 'rgba(255,255,255,0.72)', borderRadius: 99, height: 7, marginTop: 12, overflow: 'hidden' },
  progressFill: { backgroundColor: referenceColors.primary, borderRadius: 99, height: '100%' },
  card: { backgroundColor: referenceColors.card, borderRadius: 25, marginTop: 14, padding: 17, ...referenceShadow.card },
  cardTitle: { color: '#1C1E1F', fontSize: 15, letterSpacing: -0.38, marginBottom: 13 },
  wordGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  wordTile: { backgroundColor: '#F5EFE5', borderRadius: 18, marginBottom: 8, minHeight: 89, padding: 11, width: '48.7%' },
  word: { color: '#1C1E1F', fontSize: 16 },
  wordMeta: { color: referenceColors.inkMuted, fontSize: 9, lineHeight: 12, marginTop: 4 },
  beatRow: { minHeight: 62 },
  beatMarkerColumn: { height: 62, position: 'relative', width: 38 },
  beatMarker: { backgroundColor: '#F5EFE5', borderColor: referenceColors.line, borderRadius: 19, borderWidth: 1, height: 38, width: 38, zIndex: 1 },
  beatNumber: { color: referenceColors.inkMuted, fontSize: 10 },
  beatConnector: { backgroundColor: referenceColors.line, bottom: -1, height: 25, position: 'absolute', width: 2 },
  beatTitle: { color: '#1C1E1F', fontSize: 11 },
  beatMeta: { color: referenceColors.inkMuted, fontSize: 9, lineHeight: 13, marginTop: 4 },
  compatibilityCard: { backgroundColor: referenceColors.secondarySoft, borderColor: referenceColors.secondary, borderRadius: 25, borderWidth: 1, marginTop: 14, padding: 17 },
  compatibilityCardBlocked: { backgroundColor: referenceColors.primarySoft, borderColor: referenceColors.primary },
  compatibilityTitle: { color: '#246F69', fontSize: 11 },
  compatibilityCopy: { color: referenceColors.inkSoft, fontSize: 9, lineHeight: 13, marginTop: 4 },
  primaryButton: { alignItems: 'center', backgroundColor: referenceColors.primary, borderRadius: 19, flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 18, minHeight: 56, paddingHorizontal: 15, ...referenceShadow.button },
  primaryButtonDisabled: { opacity: 0.45 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14 },
  stateCard: { backgroundColor: referenceColors.card, borderColor: referenceColors.line, borderRadius: 25, borderWidth: 1, marginTop: 18, padding: 20 },
  stateTitle: { color: '#1C1E1F', fontSize: 20 },
  stateText: { color: referenceColors.inkSoft, fontSize: 14, lineHeight: 21 },
  secondaryButton: { alignItems: 'center', backgroundColor: referenceColors.card, borderColor: referenceColors.line, borderRadius: 19, borderWidth: 1, justifyContent: 'center', marginTop: 9, minHeight: 56, paddingHorizontal: 15 },
  secondaryButtonText: { color: '#1C1E1F', fontSize: 12 },
});
