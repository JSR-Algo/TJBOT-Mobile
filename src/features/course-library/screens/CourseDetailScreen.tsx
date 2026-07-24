import React from 'react';
import { Image, type ImageSourcePropType, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { FileText, Play } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { ROUTES } from '@/navigation/routes';
import ScreenShell from '@/components/ScreenShell';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { useOptionalHousehold } from '@/contexts/HouseholdContext';
import { getCourseDetail, type CourseDetail } from '@/services/api/course-library.api';
import { useAppLanguage } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'CourseDetailScreen'>;

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; course: CourseDetail }
  | { kind: 'error' };

export default function CourseDetailScreen({ navigation, route }: Props): React.JSX.Element {
  const { t } = useAppLanguage();
  const childName = useOptionalHousehold()?.activeChild?.name?.trim() || t('Mia');
  const courseId = route.params?.courseId;
  const [state, setState] = React.useState<LoadState>(courseId ? { kind: 'loading' } : { kind: 'error' });

  React.useEffect(() => {
    if (!courseId) return undefined;
    let active = true;
    setState({ kind: 'loading' });
    void getCourseDetail(courseId)
      .then(course => { if (active) setState({ kind: 'ready', course }); })
      .catch(() => { if (active) setState({ kind: 'error' }); });
    return () => { active = false; };
  }, [courseId]);

  if (state.kind === 'loading') {
    return <ScreenShell bg="#FAF5EB" gradient={false}><Box padding={24}><Text style={styles.message}>{t('Loading course details')}</Text></Box></ScreenShell>;
  }

  if (state.kind === 'error') {
    return (
      <ScreenShell bg="#FAF5EB" gradient={false}>
        <Box padding={24} gap={16}>
          <Text fontWeight="800" style={styles.message}>{t('Course unavailable')}</Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate(ROUTES.CourseLibraryScreen)} style={styles.secondaryButton}>
            <Text fontWeight="800" style={styles.secondaryText}>{t('Back to library')}</Text>
          </TouchableOpacity>
        </Box>
      </ScreenShell>
    );
  }

  const course = state.course;
  const lessonCount = Math.max(course.lessonCount, 1);
  const durationSeconds = course.lessons?.reduce((sum, lesson) => sum + lesson.durationSeconds, 0) ?? 0;
  const typicalMinutes = durationSeconds > 0 ? Math.max(1, Math.round(durationSeconds / lessonCount / 60)) : 10;
  const locked = course.locked === true;

  return (
    <ScreenShell bg="#FAF5EB" gradient={false}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} testID="courseDetailPage">
        <Box style={styles.artworkStage} alignItems="center" justifyContent="center">
          <Box style={styles.artworkGlow} />
          <Image accessibilityIgnoresInvertColors resizeMode="cover" source={artworkForCourse(course)} style={styles.artwork} />
        </Box>

        <Box style={styles.documentBadge} alignItems="center" justifyContent="center">
          <FileText color="#149A88" size={24} />
        </Box>
        <Text fontWeight="800" style={styles.heading}>{course.title}</Text>
        <Text style={styles.language}>{t('English')}</Text>

        <Box flexDirection="row" gap={9} style={styles.summaryRow}>
          <SummaryTile background="#FFEAD6" label={t('Level')} value={formatLevel(course.difficulty, t)} />
          <SummaryTile background="#F1EDE5" label={t('Outcome')} value={t('Everyday words')} />
          <SummaryTile background="#FFE1E1" label={t('Duration')} value={t('9 weeks')} />
        </Box>

        <Box style={styles.progressTrack}><Box style={styles.progressFill} /></Box>
        <Text style={styles.trackLabel}>{t('Everyday Explorer')}</Text>

        <Box style={styles.card}>
          <Text fontWeight="800" style={styles.cardTitle}>{t('Course at a glance')}</Text>
          <Box flexDirection="row" gap={8}>
            <MetricTile background="#FFE8E0" label={t('Lessons')} value={String(lessonCount)} />
            <MetricTile background="#DDF7F3" label={t('Vocabulary')} value={String(Math.max(lessonCount * 8, 8))} />
            <MetricTile background="#FFF0CB" label={t('Typical lesson')} value={`${typicalMinutes} min`} />
          </Box>
        </Box>

        <Box style={styles.card}>
          <Text i18n={false} fontWeight="800" style={styles.cardTitle}>{t('What {{name}} will learn').replace('{{name}}', childName)}</Text>
          <Box flexDirection="row" gap={8}>
            <LearningTile title={t('Recognize everyday words')} copy={course.description || t('Home, family, food, animals, and places')} />
            <LearningTile title={t('Answer TeeBot clearly')} copy={t('Listen, point, repeat, and make a choice')} />
          </Box>
        </Box>

        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.78}
          onPress={() => navigation.navigate(ROUTES.UnlockConfirmScreen, { courseId: course.courseId })}
          style={styles.primaryButton}
          testID="coursePrimaryAction"
        >
          <Text fontWeight="800" style={styles.primaryText}>{locked ? t('Unlock course') : t('Add to Robot')}</Text>
          <Play color="#FFFFFF" fill="#FFFFFF" size={17} />
        </TouchableOpacity>
      </ScrollView>
    </ScreenShell>
  );
}

function SummaryTile({ background, label, value }: { background: string; label: string; value: string }) {
  return (
    <Box style={[styles.summaryTile, { backgroundColor: background }]} flex={1}>
      <Text i18n={false} style={styles.summaryLabel}>{label}</Text>
      <Text i18n={false} fontWeight="800" style={styles.summaryValue}>{value}</Text>
    </Box>
  );
}

function MetricTile({ background, label, value }: { background: string; label: string; value: string }) {
  return (
    <Box style={[styles.metricTile, { backgroundColor: background }]} flex={1}>
      <Text i18n={false} style={styles.metricLabel}>{label}</Text>
      <Text i18n={false} fontWeight="800" style={styles.metricValue}>{value}</Text>
    </Box>
  );
}

function LearningTile({ copy, title }: { copy: string; title: string }) {
  return (
    <Box style={styles.learningTile} flex={1}>
      <Text i18n={false} fontWeight="800" style={styles.learningTitle}>{title}</Text>
      <Text i18n={false} style={styles.learningCopy}>{copy}</Text>
    </Box>
  );
}

function artworkForCourse(course: CourseDetail): ImageSourcePropType {
  const key = `${course.courseId} ${course.title}`.toLowerCase();
  if (key.includes('forest') || key.includes('animal')) return require('@/assets/export-html-7/forest-animals.png');
  if (key.includes('robot') || key.includes('code')) return require('@/assets/design-reference/course-coders.png');
  if (key.includes('space')) return require('@/assets/design-reference/course-space.png');
  return require('@/assets/lessons/barn-round-field-poster.jpg');
}

function formatLevel(difficulty: string | undefined, t: (copy: string) => string): string {
  if (!difficulty) return '1';
  if (difficulty.toLowerCase().includes('begin')) return '1';
  return t(difficulty);
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 16 },
  artworkStage: { borderRadius: 24, height: 145, overflow: 'hidden', position: 'relative' },
  artworkGlow: { backgroundColor: '#FBE6DD', borderRadius: 120, height: 150, position: 'absolute', width: 320 },
  artwork: { height: 145, width: '100%' },
  documentBadge: { backgroundColor: '#FFFFFF', borderColor: '#EEE5DA', borderRadius: 17, borderWidth: 1, height: 52, marginTop: -24, width: 52 },
  heading: { color: '#1C1E1F', fontSize: 24, letterSpacing: -0.7, lineHeight: 30, marginTop: 7 },
  language: { color: '#8B8781', fontSize: 11, marginBottom: 9 },
  summaryRow: { marginBottom: 9 },
  summaryTile: { borderRadius: 15, minHeight: 58, padding: 9 },
  summaryLabel: { color: '#8B8177', fontSize: 8 },
  summaryValue: { color: '#3C3936', fontSize: 10, lineHeight: 13, marginTop: 3 },
  progressTrack: { backgroundColor: '#F8DAD8', borderRadius: 4, height: 6, overflow: 'hidden' },
  progressFill: { backgroundColor: '#F06F69', borderRadius: 4, height: '100%', width: '46%' },
  trackLabel: { color: '#8B8781', fontSize: 9, marginBottom: 9, marginTop: 4 },
  card: { backgroundColor: '#FFFFFF', borderColor: '#EFE6DC', borderRadius: 20, borderWidth: 1, marginBottom: 9, padding: 12 },
  cardTitle: { color: '#343536', fontSize: 12, marginBottom: 9 },
  metricTile: { borderRadius: 14, minHeight: 64, padding: 9 },
  metricLabel: { color: '#8A8178', fontSize: 8 },
  metricValue: { color: '#323435', fontSize: 14, marginTop: 5 },
  learningTile: { backgroundColor: '#F8F4EE', borderRadius: 14, minHeight: 68, padding: 9 },
  learningTitle: { color: '#403E3B', fontSize: 9, lineHeight: 12 },
  learningCopy: { color: '#88827B', fontSize: 7, lineHeight: 10, marginTop: 4 },
  primaryButton: { alignItems: 'center', backgroundColor: '#202324', borderRadius: 24, flexDirection: 'row', justifyContent: 'space-between', minHeight: 48, paddingHorizontal: 20 },
  primaryText: { color: '#FFFFFF', fontSize: 13 },
  secondaryButton: { alignItems: 'center', borderColor: '#D9D0C5', borderRadius: 20, borderWidth: 1, minHeight: 48, justifyContent: 'center' },
  secondaryText: { color: '#393A3B', fontSize: 13 },
  message: { color: '#6F6B66', fontSize: 14, textAlign: 'center' },
});
