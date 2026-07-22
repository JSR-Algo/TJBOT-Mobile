import React from 'react';
import { Image, type ImageSourcePropType, ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarRange, CheckCircle2, ChevronRight, Globe2, Lock, Map, Search, Settings2 } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { ROUTES } from '@/navigation/routes';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import ScreenShell from '@/components/ScreenShell';
import RobotImage from '@/components/RobotImage';
import { parentColors, parentRadii, parentShadows } from '@/design-system/tokens';
import { translateTemplate, useAppLanguage } from '@/services/i18n/i18n';
import { listLibrary, type LibraryItem } from '@/services/api/course-library.api';

type Props = NativeStackScreenProps<RootStackParamList, 'CourseLibraryScreen'>;

const forestSource: ImageSourcePropType = require('../../../assets/export-html-7/forest-animals.png');
const robotCodingSource: ImageSourcePropType = require('../../../assets/export-html-7/robot-coding.png');
const spaceSource: ImageSourcePropType = require('../../../assets/export-html-7/space-adventure.png');
const mapSource: ImageSourcePropType = require('../../../assets/export-html-7/floating-map.png');

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; courses: LibraryItem[] }
  | { kind: 'error'; title: string; detail?: string };

export default function CourseLibraryScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { language, setLanguage, t } = useAppLanguage();
  const [state, setState] = React.useState<LoadState>({ kind: 'loading' });
  const [query, setQuery] = React.useState('');

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

  const visibleCourses = React.useMemo(() => {
    if (state.kind !== 'ready') return [];
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery.length === 0) return state.courses;
    return state.courses.filter((course) => {
      const haystack = `${course.title} ${course.language}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [query, state]);

  const toggleLanguage = (): void => {
    void setLanguage(language === 'en' ? 'vi' : 'en');
  };

  return (
    <ScreenShell bg={parentColors.bg} gradient={false}>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Box style={[styles.topBar, { paddingTop: insets.top + 12 }]} flexDirection="row" alignItems="center" justifyContent="space-between">
          <RobotImage variant="head" size={58} accessibilityLabel={t('TeeBot')} />
          <Box flexDirection="row" alignItems="center" gap={10}>
            <TouchableOpacity
              onPress={toggleLanguage}
              style={styles.languageButton}
              accessibilityRole="button"
              accessibilityLabel={t('Change language')}
              activeOpacity={0.78}
            >
              <Globe2 size={17} color={parentColors.accent} strokeWidth={2.4} />
              <Text fontWeight="800" style={styles.languageCode}>{language.toUpperCase()}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate(ROUTES.ParentSettingsScreen)}
              style={styles.iconButton}
              accessibilityRole="button"
              accessibilityLabel={t('Open parent settings')}
              activeOpacity={0.78}
            >
              <Settings2 size={21} color={parentColors.ink1} strokeWidth={2.5} />
            </TouchableOpacity>
          </Box>
        </Box>

        <Box paddingHorizontal={18} paddingBottom={18}>
          <Text fontWeight="800" style={styles.heading}>{t('Course Library')}</Text>
          <Text style={styles.intro}>{t('Pick what your Robot teaches.')}</Text>
        </Box>

        <Box paddingHorizontal={18} paddingBottom={16}>
          <Box style={styles.searchBox} flexDirection="row" alignItems="center" gap={10}>
            <Search size={18} color={parentColors.ink2} strokeWidth={2.4} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('Search courses...')}
              placeholderTextColor={parentColors.ink2}
              style={styles.searchInput}
              accessibilityLabel={t('Search courses')}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Box>
        </Box>

        <Box paddingHorizontal={18} gap={10}>
          {state.kind === 'loading' ? <Text style={styles.message}>{t('Loading library')}</Text> : null}
          {state.kind === 'error' ? (
            <Box gap={6}>
              <Text fontWeight="800" style={styles.message}>{t(state.title)}</Text>
              {state.detail ? <Text style={styles.detail}>{t(state.detail)}</Text> : null}
            </Box>
          ) : null}
          {state.kind === 'ready' && state.courses.length === 0 ? (
            <Text style={styles.message}>{t('No library courses yet')}</Text>
          ) : null}
          {state.kind === 'ready' && state.courses.length > 0 && visibleCourses.length === 0 ? (
            <Text style={styles.message}>{t('No matching courses')}</Text>
          ) : null}
          {state.kind === 'ready' && visibleCourses.map((course, index) => (
            <CourseCard
              key={course.courseId}
              course={course}
              index={index}
              onPress={() => navigation.navigate(ROUTES.CourseDetailScreen, { courseId: course.courseId })}
            />
          ))}
        </Box>

        <Box paddingHorizontal={18} paddingTop={24} gap={10}>
          <Text fontWeight="800" style={styles.sectionTitle}>{t('More in Plan')}</Text>
          <PlanRow
            icon={<Map size={19} color={parentColors.ink1} strokeWidth={2.3} />}
            label={t('Six-month roadmap')}
            accessibilityLabel={t('Open six-month roadmap')}
            onPress={() => navigation.navigate(ROUTES.LessonRoadmapScreen)}
          />
          <PlanRow
            icon={<CalendarRange size={19} color={parentColors.ink1} strokeWidth={2.3} />}
            label={t('Week planner')}
            accessibilityLabel={t('Open week planner')}
            onPress={() => navigation.navigate(ROUTES.ParentTodayScreen)}
          />
        </Box>
      </ScrollView>
    </ScreenShell>
  );
}

type CourseCardProps = {
  course: LibraryItem;
  index: number;
  onPress: () => void;
};

function CourseCard({ course, index, onPress }: CourseCardProps): React.JSX.Element {
  const { language, t } = useAppLanguage();
  const locked = course.locked === true || !course.owned;
  const imageSource = imageForCourse(course, index);
  const status = locked ? ` ${t('Locked').toLowerCase()}` : '';
  const accessibilityLabel = translateTemplate(
    'Open {{title}}{{status}} course',
    { title: course.title, status },
    { locale: language },
  );
  const artworkLabel = translateTemplate(
    '{{title}} artwork',
    { title: course.title },
    { locale: language },
  );
  const metadata = `${course.language.toUpperCase()}${course.price > 0 ? ` · ${t('Premium').toUpperCase()}` : ''}`;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.courseCard}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      activeOpacity={0.82}
    >
      {imageSource ? (
        <Image source={imageSource} style={styles.courseImage} resizeMode="cover" accessibilityLabel={artworkLabel} />
      ) : (
        <Box style={styles.coursePlaceholder} alignItems="center" justifyContent="center">
          <Text fontWeight="800" style={styles.courseInitial}>{course.title.charAt(0).toUpperCase()}</Text>
        </Box>
      )}
      <Box flex={1}>
        <Text fontWeight="800" style={styles.title}>{course.title}</Text>
        <Text style={styles.meta}>{metadata}</Text>
      </Box>
      {course.syncedToDevice ? <CheckCircle2 size={17} color={parentColors.success} strokeWidth={2.7} accessibilityLabel={t('On Robot')} /> : null}
      {locked ? <Lock size={17} color={parentColors.warning} strokeWidth={2.7} accessibilityLabel={t('Locked')} /> : null}
      <ChevronRight size={17} color={parentColors.ink2} strokeWidth={2.4} />
      {course.syncedToDevice ? <Text style={styles.hiddenStatus}>{t('On Robot')}</Text> : null}
      {locked ? <Text style={styles.hiddenStatus}>{t('Locked')}</Text> : null}
    </TouchableOpacity>
  );
}

type PlanRowProps = {
  icon: React.ReactNode;
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
};

function PlanRow({ icon, label, accessibilityLabel, onPress }: PlanRowProps): React.JSX.Element {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.planRow}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      activeOpacity={0.8}
    >
      <Box style={styles.planIcon} alignItems="center" justifyContent="center">{icon}</Box>
      <Text fontWeight="800" style={styles.planLabel}>{label}</Text>
      <ChevronRight size={17} color={parentColors.ink2} strokeWidth={2.4} />
    </TouchableOpacity>
  );
}

function imageForCourse(course: LibraryItem, index: number): ImageSourcePropType | null {
  const title = course.title.toLowerCase();
  if (title.includes('forest') || title.includes('animal')) {
    return forestSource;
  }
  if (title.includes('robot') || title.includes('code')) {
    return robotCodingSource;
  }
  if (title.includes('space')) {
    return spaceSource;
  }
  if (title.includes('place') || title.includes('map')) {
    return mapSource;
  }
  const fallbackSources = [mapSource, forestSource, robotCodingSource, spaceSource] as const;
  return fallbackSources[index % fallbackSources.length] ?? null;
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
  root: { flex: 1, backgroundColor: parentColors.bg },
  content: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingBottom: 132,
  },
  topBar: {
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  languageButton: {
    minWidth: 72,
    height: 46,
    borderRadius: 23,
    paddingHorizontal: 14,
    backgroundColor: parentColors.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    ...parentShadows.card,
  },
  languageCode: {
    fontSize: 12,
    color: parentColors.ink1,
  },
  iconButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: parentColors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...parentShadows.card,
  },
  heading: {
    fontSize: 30,
    lineHeight: 36,
    color: parentColors.ink1,
    letterSpacing: -0.8,
  },
  intro: {
    fontSize: 14,
    color: parentColors.ink2,
    lineHeight: 21,
    marginTop: 2,
  },
  searchBox: {
    height: 52,
    borderRadius: 18,
    backgroundColor: parentColors.card,
    paddingHorizontal: 16,
    ...parentShadows.card,
  },
  searchInput: {
    flex: 1,
    color: parentColors.ink1,
    fontSize: 14,
    paddingVertical: 0,
  },
  message: {
    fontSize: 17,
    color: parentColors.ink1,
    paddingVertical: 12,
  },
  detail: { fontSize: 14, color: parentColors.ink2 },
  courseCard: {
    minHeight: 82,
    backgroundColor: parentColors.card,
    borderRadius: parentRadii.card,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...parentShadows.card,
  },
  courseImage: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: parentColors.cream,
  },
  coursePlaceholder: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: parentColors.accentSoft,
  },
  courseInitial: { color: parentColors.accent, fontSize: 20 },
  title: {
    fontSize: 15,
    color: parentColors.ink1,
    lineHeight: 20,
  },
  meta: {
    fontSize: 11,
    color: parentColors.ink2,
    marginTop: 4,
    letterSpacing: 0.2,
  },
  sectionTitle: {
    fontSize: 17,
    color: parentColors.ink1,
    marginBottom: 2,
  },
  planRow: {
    minHeight: 62,
    borderRadius: parentRadii.card,
    backgroundColor: parentColors.card,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...parentShadows.card,
  },
  planIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: parentColors.card2,
  },
  planLabel: {
    flex: 1,
    fontSize: 14,
    color: parentColors.ink1,
  },
  hiddenStatus: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});
