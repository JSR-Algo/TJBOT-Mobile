import React from 'react';
import { Image, type ImageSourcePropType, ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { ChevronRight, Lock, Search } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { ROUTES } from '@/navigation/routes';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import ScreenShell from '@/components/ScreenShell';
import { translateTemplate, useAppLanguage } from '@/services/i18n/i18n';
import { listLibrary, type LibraryItem } from '@/services/api/course-library.api';

type Props = NativeStackScreenProps<RootStackParamList, 'CourseLibraryScreen'>;

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; courses: LibraryItem[] }
  | { kind: 'error'; title: string; detail?: string };

const COURSE_ART: readonly ImageSourcePropType[] = [
  require('@/assets/lessons/barn-round-field-poster.jpg'),
  require('@/assets/export-html-7/forest-animals.png'),
  require('@/assets/design-reference/course-coders.png'),
  require('@/assets/design-reference/course-space.png'),
];

export default function CourseLibraryScreen({ navigation }: Props): React.JSX.Element {
  const { t } = useAppLanguage();
  const [state, setState] = React.useState<LoadState>({ kind: 'loading' });
  const [query, setQuery] = React.useState('');

  const load = React.useCallback((): void => {
    setState({ kind: 'loading' });
    void listLibrary()
      .then(courses => setState({ kind: 'ready', courses: courses ?? [] }))
      .catch((error: unknown) => setState(libraryErrorState(error)));
  }, []);

  React.useEffect(() => {
    let active = true;
    setState({ kind: 'loading' });
    void listLibrary()
      .then(courses => { if (active) setState({ kind: 'ready', courses: courses ?? [] }); })
      .catch((error: unknown) => { if (active) setState(libraryErrorState(error)); });
    return () => { active = false; };
  }, []);

  const visibleCourses = React.useMemo(() => {
    if (state.kind !== 'ready') return [];
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return state.courses;
    return state.courses.filter(course => `${course.title} ${course.description ?? ''}`.toLowerCase().includes(normalizedQuery));
  }, [query, state]);

  return (
    <ScreenShell bg="#FAF5EB" gradient={false}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        testID="courseLibraryPage"
      >
        <Text fontWeight="800" style={styles.heading}>{t('Course Library')}</Text>
        <Text style={styles.intro}>{t('Pick what TeeBot teaches.')}</Text>

        <Box style={styles.searchBox} flexDirection="row" alignItems="center" gap={10}>
          <Search size={19} color="#827D77" strokeWidth={2.4} />
          <TextInput
            accessibilityLabel={t('Search courses')}
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setQuery}
            placeholder={t('Search courses...')}
            placeholderTextColor="#8B8782"
            style={styles.searchInput}
            value={query}
          />
        </Box>

        <Box gap={9}>
          {state.kind === 'loading' ? <StatusCard title={t('Loading library')} /> : null}
          {state.kind === 'error' ? (
            <TouchableOpacity accessibilityRole="button" onPress={load} style={styles.statusCard}>
              <Text i18n={false} fontWeight="800" style={styles.message}>{t(state.title)}</Text>
              <Text style={styles.detail}>{state.detail ? t(state.detail) : t('Tap to try again.')}</Text>
            </TouchableOpacity>
          ) : null}
          {state.kind === 'ready' && state.courses.length === 0 ? <StatusCard title={t('No library courses yet')} /> : null}
          {state.kind === 'ready' && state.courses.length > 0 && visibleCourses.length === 0 ? <StatusCard title={t('No matching courses')} /> : null}
          {visibleCourses.map((course, index) => (
            <CourseCard
              course={course}
              imageSource={artworkForCourse(course, index)}
              key={course.courseId}
              onPress={() => navigation.navigate(ROUTES.CourseDetailScreen, { courseId: course.courseId })}
            />
          ))}
        </Box>

        <Text fontWeight="800" style={styles.moreTitle}>{t('More in Plan')}</Text>
        <PlanRow label={t('Six-month roadmap')} />
        <PlanRow label={t('Week planner')} />
      </ScrollView>
    </ScreenShell>
  );
}

function CourseCard({ course, imageSource, onPress }: { course: LibraryItem; imageSource: ImageSourcePropType; onPress: () => void }) {
  const { language, t } = useAppLanguage();
  const locked = course.locked === true || !course.owned;
  const status = locked ? ` ${t('Locked').toLowerCase()}` : '';
  const accessibilityLabel = translateTemplate('Open {{title}}{{status}} course', { title: course.title, status }, { locale: language });
  const lessonCount = course.lessonCount && course.lessonCount > 0 ? course.lessonCount : 1;

  return (
    <TouchableOpacity accessibilityLabel={accessibilityLabel} accessibilityRole="button" activeOpacity={0.82} onPress={onPress} style={styles.courseCard}>
      <Image accessibilityIgnoresInvertColors resizeMode="cover" source={imageSource} style={styles.courseArtwork} />
      <Box flex={1} gap={5}>
        <Text fontWeight="800" style={styles.title} numberOfLines={2}>{course.title}</Text>
        <Text i18n={false} style={styles.metadata}>
          {translateTemplate('{{language}} · {{count}} lessons', { language: course.language.toUpperCase(), count: lessonCount }, { locale: language })}
        </Text>
        {course.syncedToDevice ? <Text fontWeight="800" style={styles.availableStatus}>{t('On Robot')}</Text> : null}
        {locked ? <Text fontWeight="800" style={styles.lockedStatus}>{t('Locked')}</Text> : null}
      </Box>
      {locked ? <Lock accessibilityLabel={t('Locked')} color="#A7A29B" size={18} strokeWidth={2.5} /> : null}
      <ChevronRight color="#8C8781" size={21} strokeWidth={2.5} />
    </TouchableOpacity>
  );
}

function PlanRow({ label }: { label: string }): React.JSX.Element {
  return (
    <Box style={styles.planRow} flexDirection="row" alignItems="center">
      <Text i18n={false} fontWeight="800" style={styles.planLabel}>{label}</Text>
      <ChevronRight color="#918B84" size={20} />
    </Box>
  );
}

function StatusCard({ title }: { title: string }): React.JSX.Element {
  return <Box style={styles.statusCard}><Text i18n={false} fontWeight="800" style={styles.message}>{title}</Text></Box>;
}

function artworkForCourse(course: LibraryItem, index: number): ImageSourcePropType {
  const key = `${course.courseId} ${course.title}`.toLowerCase();
  if (key.includes('forest') || key.includes('animal')) return COURSE_ART[1];
  if (key.includes('robot') || key.includes('code')) return COURSE_ART[2];
  if (key.includes('space')) return COURSE_ART[3];
  if (key.includes('farm') || key.includes('barn')) return COURSE_ART[0];
  return COURSE_ART[index % COURSE_ART.length];
}

function libraryErrorState(error: unknown): LoadState {
  const record = error && typeof error === 'object' ? error as Record<string, unknown> : null;
  if (record?.code === 'NETWORK_ERROR') return { kind: 'error', title: 'Library offline' };
  if (record?.status === 502) return { kind: 'error', title: 'Library service unavailable', detail: 'Retry in a moment.' };
  return { kind: 'error', title: 'Library unavailable' };
}

const styles = StyleSheet.create({
  content: { alignSelf: 'center', maxWidth: 520, padding: 18, paddingBottom: 18, width: '100%' },
  heading: { color: '#1A1C1D', fontSize: 25, letterSpacing: -0.7, lineHeight: 30 },
  intro: { color: '#7B7772', fontSize: 11, marginBottom: 12, marginTop: 3 },
  searchBox: { backgroundColor: '#FFFFFF', borderColor: '#EEE6DC', borderRadius: 18, borderWidth: 1, height: 46, marginBottom: 12, paddingHorizontal: 14 },
  searchInput: { color: '#262829', flex: 1, fontSize: 12, paddingVertical: 0 },
  courseCard: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#EEE6DC', borderRadius: 19, borderWidth: 1, flexDirection: 'row', gap: 10, minHeight: 72, padding: 9 },
  courseArtwork: { backgroundColor: '#FFF4DE', borderRadius: 14, height: 54, overflow: 'hidden', width: 54 },
  title: { color: '#2A2B2C', fontSize: 13, lineHeight: 16 },
  metadata: { color: '#8A8580', fontSize: 9 },
  availableStatus: { color: '#238763', fontSize: 8 },
  lockedStatus: { color: '#8C8378', fontSize: 8 },
  statusCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18 },
  message: { color: '#353637', fontSize: 14 },
  detail: { color: '#7A7772', fontSize: 12, marginTop: 5 },
  moreTitle: { color: '#373839', fontSize: 13, marginBottom: 8, marginTop: 12 },
  planRow: { backgroundColor: '#FFFFFF', borderColor: '#EEE6DC', borderRadius: 16, borderWidth: 1, justifyContent: 'space-between', marginBottom: 8, minHeight: 48, paddingHorizontal: 15 },
  planLabel: { color: '#414243', fontSize: 11 },
});
