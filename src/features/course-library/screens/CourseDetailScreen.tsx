import React from 'react';
import {
  ImageBackground,
  type ImageSourcePropType,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Check, HelpCircle, LockKeyhole, MapPin, Route as RouteIcon } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { ROUTES } from '@/navigation/routes';
import ScreenShell from '@/components/ScreenShell';
import { Reveal, StatusPulse } from '@/design-system/animations';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { useOptionalHousehold } from '@/contexts/HouseholdContext';
import {
  getCourseDetail,
  getCourseLessons,
  type CourseDetail,
  type PublishedLesson,
} from '@/services/api/course-library.api';
import { getChildProgress } from '@/services/api/progress.api';
import { translateTemplate, useAppLanguage } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'CourseDetailScreen'>;

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; course: CourseDetail }
  | { kind: 'error' };

type CourseStage = {
  id: string | null;
  title: string;
  order: number;
  durationSeconds: number;
};

type StageStatus = 'completed' | 'current' | 'locked' | 'unknown';

export default function CourseDetailScreen({ navigation, route }: Props): React.JSX.Element {
  const { language, t } = useAppLanguage();
  const household = useOptionalHousehold();
  const childId = household?.activeChild?.id;
  const childName = household?.activeChild?.name?.trim() || t('Mia');
  const courseId = route.params?.courseId;
  const [reloadKey, setReloadKey] = React.useState(0);
  const [state, setState] = React.useState<LoadState>(courseId ? { kind: 'loading' } : { kind: 'error' });

  React.useEffect(() => {
    if (!courseId) return undefined;
    let active = true;
    setState({ kind: 'loading' });
    void getCourseDetail(courseId)
      .then(course => { if (active) setState({ kind: 'ready', course }); })
      .catch(() => { if (active) setState({ kind: 'error' }); });
    return () => { active = false; };
  }, [courseId, reloadKey]);

  const lessonsQuery = useQuery({
    queryKey: ['course-world-map-lessons', courseId, childId],
    queryFn: () => getCourseLessons(courseId as string, childId ? { childId } : undefined),
    enabled: typeof courseId === 'string' && courseId.length > 0,
  });
  const progressQuery = useQuery({
    queryKey: ['course-world-map-progress', childId],
    queryFn: () => getChildProgress(childId as string),
    enabled: typeof childId === 'string' && childId.length > 0,
  });

  if (state.kind === 'loading') {
    return (
      <ScreenShell bg="#FAF5EB" gradient={false}>
        <Box padding={24} style={styles.stateCard}>
          <Text style={styles.message}>{t('Loading course map')}</Text>
        </Box>
      </ScreenShell>
    );
  }

  if (state.kind === 'error') {
    return (
      <ScreenShell bg="#FAF5EB" gradient={false}>
        <Box padding={24} gap={12} style={styles.stateCard}>
          <Text fontWeight="800" style={styles.stateTitle}>{t('Course unavailable')}</Text>
          <Text style={styles.message}>{t('The course map could not load. Your progress is safe.')}</Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => setReloadKey(key => key + 1)} style={styles.primaryButton}>
            <Text fontWeight="800" style={styles.primaryText}>{t('Retry')}</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate(ROUTES.CourseLibraryScreen)} style={styles.secondaryButton}>
            <Text fontWeight="800" style={styles.secondaryText}>{t('Back to library')}</Text>
          </TouchableOpacity>
        </Box>
      </ScreenShell>
    );
  }

  const course = state.course;
  const stages = stagesFor(course, lessonsQuery.data ?? []);
  const courseProgress = progressQuery.data?.byCourse.find(item => item.courseId === course.courseId);
  const completedCount = Math.min(courseProgress?.lessonsCompleted ?? 0, stages.length);
  const progressKnown = !childId || (!progressQuery.isLoading && !progressQuery.isError);
  const progressPercent = stages.length > 0 ? Math.round((completedCount / stages.length) * 100) : 0;

  return (
    <ScreenShell bg="#FAF5EB" gradient={false}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} testID="courseDetailPage">
        <Box flexDirection="row" alignItems="center" justifyContent="space-between" style={styles.headingRow}>
          <Box flex={1}>
            <Text fontWeight="800" style={styles.eyebrow}>{t('Course World Map')}</Text>
            <Text fontWeight="800" style={styles.heading}>{course.title}</Text>
          </Box>
          <Box style={styles.percentChip} alignItems="center" justifyContent="center">
            <Text i18n={false} fontWeight="800" style={styles.percentValue}>{progressKnown && childId ? `${progressPercent}%` : '—'}</Text>
            <Text fontWeight="800" style={styles.percentLabel}>{t('Complete')}</Text>
          </Box>
        </Box>

        <Text i18n={false} style={styles.intro}>
          {translateTemplate("{{name}}'s course journey", { name: childName }, { locale: language })}
        </Text>

        <ImageBackground
          accessibilityIgnoresInvertColors
          imageStyle={styles.mapImage}
          resizeMode="cover"
          source={artworkForCourse(course)}
          style={styles.mapStage}
          testID="courseWorldMap"
        >
          <Box style={styles.mapVeil} />
          <Box style={styles.mapHeader} flexDirection="row" alignItems="center" gap={9}>
            <Box style={styles.mapHeaderIcon} alignItems="center" justifyContent="center">
              <RouteIcon color="#FFFFFF" size={19} strokeWidth={2.7} />
            </Box>
            <Box flex={1}>
              <Text fontWeight="800" style={styles.mapHeaderTitle}>{t('Adventure path')}</Text>
              <Text i18n={false} style={styles.mapHeaderCopy}>
                {translateTemplate('{{completed}} of {{total}} stages complete', { completed: completedCount, total: stages.length }, { locale: language })}
              </Text>
            </Box>
          </Box>

          {lessonsQuery.isError ? (
            <TouchableOpacity accessibilityRole="button" onPress={() => void lessonsQuery.refetch()} style={styles.inlineState}>
              <Text fontWeight="800" style={styles.inlineStateTitle}>{t('Curriculum details unavailable')}</Text>
              <Text style={styles.inlineStateCopy}>{t('Tap to try again.')}</Text>
            </TouchableOpacity>
          ) : null}
          {progressQuery.isError ? (
            <TouchableOpacity accessibilityRole="button" onPress={() => void progressQuery.refetch()} style={styles.inlineState}>
              <Text fontWeight="800" style={styles.inlineStateTitle}>{t('Progress unavailable')}</Text>
              <Text style={styles.inlineStateCopy}>{t('Tap to try again.')}</Text>
            </TouchableOpacity>
          ) : null}
          {!childId ? (
            <Box style={styles.inlineState}>
              <Text fontWeight="800" style={styles.inlineStateTitle}>{t('Progress starts after you add a child profile')}</Text>
            </Box>
          ) : null}

          <Box style={styles.stageList}>
            {stages.map((stage, index) => {
              const status = statusForStage(index, completedCount, course.locked === true, progressKnown && Boolean(childId));
              const hasLessonDetail = stage.id !== null;
              return (
                <Reveal index={index} key={`${stage.id ?? 'stage'}-${stage.order}`} testID={`courseStageReveal-${index + 1}`}>
                  {index > 0 ? <Box style={styles.pathConnector} /> : null}
                  <WorldStageNode
                    index={index}
                    onPress={hasLessonDetail
                      ? () => navigation.navigate(ROUTES.LessonDetailScreen, { courseId: course.courseId, lessonId: stage.id ?? undefined })
                      : undefined}
                    stage={stage}
                    status={status}
                  />
                </Reveal>
              );
            })}
          </Box>
        </ImageBackground>

        <Reveal index={stages.length} testID="courseSummaryReveal">
          <Box style={styles.summaryCard}>
            <Text fontWeight="800" style={styles.summaryTitle}>{t('About this journey')}</Text>
              <Text i18n={false} style={styles.summaryCopy}>
                {course.description ? t(course.description) : t('Curriculum details will appear here when published.')}
              </Text>
            <Box flexDirection="row" gap={10} style={styles.summaryMetrics}>
              <SummaryMetric label={t('Stages')} value={String(stages.length)} />
              <SummaryMetric label={t('Completed')} value={String(completedCount)} />
              <SummaryMetric label={t('Level')} value={formatLevel(course.difficulty, t)} />
            </Box>
          </Box>
        </Reveal>
      </ScrollView>
    </ScreenShell>
  );
}

function WorldStageNode({
  index,
  onPress,
  stage,
  status,
}: {
  index: number;
  onPress?: () => void;
  stage: CourseStage;
  status: StageStatus;
}): React.JSX.Element {
  const { language, t } = useAppLanguage();
    const stageTitle = stage.title
      ? t(stage.title)
      : translateTemplate('Stage {{number}}', { number: index + 1 }, { locale: language });
  const icon = status === 'completed'
    ? <Check color="#FFFFFF" size={20} strokeWidth={3} />
    : status === 'current'
      ? <MapPin color="#FFFFFF" size={20} strokeWidth={2.7} />
      : status === 'locked'
        ? <LockKeyhole color="#6F665C" size={18} strokeWidth={2.5} />
        : <HelpCircle color="#6F665C" size={18} strokeWidth={2.5} />;
  const statusCopy = status === 'completed' ? 'Completed' : status === 'current' ? 'Current' : status === 'locked' ? 'Locked' : 'Progress unavailable';
  return (
    <TouchableOpacity
      accessibilityLabel={translateTemplate('{{title}}. {{status}}', { title: stageTitle, status: t(statusCopy) }, { locale: language })}
      accessibilityRole="button"
      accessibilityState={{ disabled: !onPress }}
      activeOpacity={0.82}
      disabled={!onPress}
      onPress={onPress}
      style={[styles.stageRow, index % 2 === 0 ? styles.stageLeft : styles.stageRight]}
      testID={`courseStage-${index + 1}`}
    >
      <Box style={[styles.stageNode, styles[`stageNode${capitalize(status)}`]]} alignItems="center" justifyContent="center">
        {icon}
      </Box>
      <Box style={styles.stageCard} flex={1}>
        <Text i18n={false} fontWeight="800" style={styles.stageNumber}>
          {translateTemplate('Stage {{number}}', { number: index + 1 }, { locale: language })}
        </Text>
        <Text i18n={false} fontWeight="800" numberOfLines={2} style={styles.stageTitle}>{stageTitle}</Text>
        <Box flexDirection="row" alignItems="center" gap={6}>
          {status === 'current' ? (
            <StatusPulse
              active
              color="#FF6B6B"
              size={8}
              testID={`courseStagePulse-${index + 1}`}
            />
          ) : null}
          <Text fontWeight="800" style={styles.stageStatus}>{t(statusCopy)}</Text>
        </Box>
      </Box>
    </TouchableOpacity>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <Box style={styles.summaryMetric} flex={1}>
      <Text i18n={false} style={styles.summaryMetricLabel}>{label}</Text>
      <Text i18n={false} fontWeight="800" style={styles.summaryMetricValue}>{value}</Text>
    </Box>
  );
}

function stagesFor(course: CourseDetail, publishedLessons: PublishedLesson[]): CourseStage[] {
  if (publishedLessons.length > 0) {
    return publishedLessons.map((lesson, index) => ({
      id: lesson.lessonId,
      title: lesson.title,
      order: index + 1,
      durationSeconds: lesson.estimatedDurationSec ?? 0,
    }));
  }
  if (course.lessons && course.lessons.length > 0) {
    return [...course.lessons]
      .sort((left, right) => left.order - right.order)
      .map(lesson => ({ id: lesson.id || null, title: lesson.title, order: lesson.order, durationSeconds: lesson.durationSeconds }));
  }
  return Array.from({ length: Math.max(course.lessonCount, 1) }, (_, index) => ({
    id: null,
    title: '',
    order: index + 1,
    durationSeconds: 0,
  }));
}

function statusForStage(index: number, completedCount: number, courseLocked: boolean, progressKnown: boolean): StageStatus {
  if (courseLocked) return 'locked';
  if (!progressKnown) return 'unknown';
  if (index < completedCount) return 'completed';
  if (index === completedCount) return 'current';
  return 'locked';
}

function artworkForCourse(course: CourseDetail): ImageSourcePropType {
  const key = `${course.courseId} ${course.title}`.toLowerCase();
  if (key.includes('forest') || key.includes('animal')) return require('@/assets/export-html-7/forest-animals.png');
  if (key.includes('robot') || key.includes('code')) return require('@/assets/design-reference/course-coders.png');
  if (key.includes('space')) return require('@/assets/design-reference/course-space.png');
  return require('@/assets/lessons/barn-round-field-poster.jpg');
}

function formatLevel(difficulty: string | undefined, t: (copy: string) => string): string {
  if (!difficulty || difficulty.toLowerCase().includes('begin')) return '1';
  return t(difficulty);
}

function capitalize(value: StageStatus): 'Completed' | 'Current' | 'Locked' | 'Unknown' {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}` as 'Completed' | 'Current' | 'Locked' | 'Unknown';
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 24 },
  headingRow: { gap: 14 },
  eyebrow: { color: '#F05F65', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  heading: { color: '#202223', fontSize: 29, letterSpacing: -0.9, lineHeight: 34, marginTop: 4 },
  intro: { color: '#7A756F', fontSize: 13, marginBottom: 15, marginTop: 5 },
  percentChip: { backgroundColor: '#FFFFFF', borderColor: '#E9DFD3', borderRadius: 22, borderWidth: 1, height: 64, width: 64 },
  percentValue: { color: '#F05F65', fontSize: 16 },
  percentLabel: { color: '#827C75', fontSize: 8, marginTop: 2 },
  mapStage: { borderRadius: 32, minHeight: 650, overflow: 'hidden', padding: 18 },
  mapImage: { borderRadius: 32 },
  mapVeil: { backgroundColor: 'rgba(244,255,248,0.76)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  mapHeader: { backgroundColor: 'rgba(22,42,39,0.88)', borderRadius: 22, padding: 14 },
  mapHeaderIcon: { backgroundColor: '#FF6B70', borderRadius: 16, height: 34, width: 34 },
  mapHeaderTitle: { color: '#FFFFFF', fontSize: 15 },
  mapHeaderCopy: { color: 'rgba(255,255,255,0.72)', fontSize: 10, marginTop: 2 },
  inlineState: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 18, marginTop: 10, padding: 12 },
  inlineStateTitle: { color: '#343536', fontSize: 12 },
  inlineStateCopy: { color: '#F05F65', fontSize: 10, marginTop: 2 },
  stageList: { paddingBottom: 8, paddingTop: 20 },
  pathConnector: { alignSelf: 'center', borderLeftColor: 'rgba(255,255,255,0.95)', borderLeftWidth: 4, borderStyle: 'dashed', height: 22 },
  stageRow: { alignItems: 'center', flexDirection: 'row', gap: 10, maxWidth: '86%', minHeight: 84 },
  stageLeft: { alignSelf: 'flex-start' },
  stageRight: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  stageNode: { borderColor: '#FFFFFF', borderRadius: 25, borderWidth: 4, height: 50, shadowColor: '#33443E', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 10, width: 50, elevation: 3 },
  stageNodeCompleted: { backgroundColor: '#34AF79' },
  stageNodeCurrent: { backgroundColor: '#FF6868' },
  stageNodeLocked: { backgroundColor: '#F0E5D1' },
  stageNodeUnknown: { backgroundColor: '#E7E0D7' },
  stageCard: { backgroundColor: 'rgba(255,255,255,0.91)', borderColor: 'rgba(255,255,255,0.96)', borderRadius: 20, borderWidth: 1, minWidth: 0, padding: 12 },
  stageNumber: { color: '#8C857D', fontSize: 8, letterSpacing: 0.7, textTransform: 'uppercase' },
  stageTitle: { color: '#2B2D2E', fontSize: 13, lineHeight: 17, marginTop: 3 },
  stageStatus: { color: '#F05F65', fontSize: 9, marginTop: 4 },
  summaryCard: { backgroundColor: '#FFFFFF', borderColor: '#EDE4D9', borderRadius: 26, borderWidth: 1, marginTop: 14, padding: 18 },
  summaryTitle: { color: '#2B2D2E', fontSize: 17 },
  summaryCopy: { color: '#77716B', fontSize: 12, lineHeight: 18, marginTop: 7 },
  summaryMetrics: { marginTop: 14 },
  summaryMetric: { backgroundColor: '#F8F3EA', borderRadius: 16, padding: 11 },
  summaryMetricLabel: { color: '#8B837B', fontSize: 8 },
  summaryMetricValue: { color: '#2D2F30', fontSize: 17, marginTop: 4 },
  stateCard: { alignSelf: 'center', maxWidth: 520, width: '100%' },
  stateTitle: { color: '#303233', fontSize: 20, textAlign: 'center' },
  message: { color: '#6F6B66', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  primaryButton: { alignItems: 'center', backgroundColor: '#FF6868', borderRadius: 20, justifyContent: 'center', minHeight: 50 },
  primaryText: { color: '#FFFFFF', fontSize: 14 },
  secondaryButton: { alignItems: 'center', borderColor: '#D9D0C5', borderRadius: 20, borderWidth: 1, justifyContent: 'center', minHeight: 48 },
  secondaryText: { color: '#393A3B', fontSize: 13 },
});
