import React from 'react';
import { Image, type ImageSourcePropType, ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { CheckCircle2, ChevronRight, Lock, Search } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { ROUTES } from '@/navigation/routes';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import ScreenShell from '@/components/ScreenShell';
import { listLibrary, type LibraryItem } from '@/services/api/course-library.api';
import CL from '../components/CL';

type Props = NativeStackScreenProps<RootStackParamList, 'CourseLibraryScreen'>;

const forestSource: ImageSourcePropType = require('../../../assets/export-html-7/forest-animals.png');
const robotCodingSource: ImageSourcePropType = require('../../../assets/export-html-7/robot-coding.png');
const spaceSource: ImageSourcePropType = require('../../../assets/export-html-7/space-adventure.png');
const mapSource: ImageSourcePropType = require('../../../assets/export-html-7/floating-map.png');
const SLEEK_LIBRARY_ICON = 'https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/user-assets/nvzeJhC2UvA/components/OWCzyfe01f8.png';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; courses: LibraryItem[] }
  | { kind: 'error'; title: string; detail?: string };

export default function CourseLibraryScreen({ navigation }: Props) {
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
    if (state.kind !== 'ready') {
      return [];
    }
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery.length === 0) {
      return state.courses;
    }
    return state.courses.filter((course) => {
      const haystack = `${course.title} ${course.language}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [query, state]);

  return (
    <ScreenShell bg="#FAF5EB" gradient={false}>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
      <Box paddingHorizontal={24} paddingTop={56} paddingBottom={18} flexDirection="row" alignItems="center" justifyContent="space-between">
        <Box>
          <Text fontWeight="800" style={styles.heading}>Course Library</Text>
          <Text fontWeight="800" style={styles.intro}>Pick what your Robot teaches.</Text>
        </Box>
        <Box style={styles.headerIconWell} alignItems="center" justifyContent="center">
          <Image source={{ uri: SLEEK_LIBRARY_ICON }} style={styles.headerIcon} resizeMode="contain" accessibilityLabel="Course Library" />
        </Box>
      </Box>

      <Box paddingHorizontal={20} paddingBottom={16}>
        <Box style={styles.searchBox} flexDirection="row" alignItems="center" gap={10}>
          <Search size={18} color={CL.ink3} strokeWidth={2.8} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search courses..."
            placeholderTextColor={CL.ink3}
            style={styles.searchInput}
            accessibilityLabel="Search courses"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </Box>
      </Box>

      <Box paddingHorizontal={20} paddingBottom={24} gap={14}>
        {state.kind === 'loading' ? <Text style={styles.message}>Loading library</Text> : null}
        {state.kind === 'error' ? (
          <Box gap={6}>
            <Text fontWeight="800" style={styles.message}>{state.title}</Text>
            {state.detail ? <Text style={styles.detail}>{state.detail}</Text> : null}
          </Box>
        ) : null}
        {state.kind === 'ready' && state.courses.length === 0 ? (
          <Text style={styles.message}>No library courses yet</Text>
        ) : null}
        {state.kind === 'ready' && state.courses.length > 0 && visibleCourses.length === 0 ? (
          <Text style={styles.message}>No matching courses</Text>
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
  const locked = course.locked === true || !course.owned;
  const imageSource = imageForCourse(course, index);
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.courseCard}
      accessibilityRole="button"
      accessibilityLabel={`Open ${course.title}${locked ? ' locked' : ''} course`}
      activeOpacity={0.82}
    >
      {imageSource ? (
        <Image source={imageSource} style={styles.courseImage} resizeMode="cover" accessibilityLabel={`${course.title} artwork`} />
      ) : (
        <Box style={styles.coursePlaceholder} alignItems="center" justifyContent="center">
          <Text fontWeight="800" style={styles.courseInitial}>{course.title.charAt(0).toUpperCase()}</Text>
        </Box>
      )}
      <Box flex={1}>
        <Text fontWeight="800" style={styles.title}>{course.title}</Text>
        <Text fontWeight="800" style={styles.meta}>{course.language.toUpperCase()} {course.price > 0 ? '· PREMIUM' : ''}</Text>
      </Box>
      {course.syncedToDevice ? <CheckCircle2 size={17} color="#4ECDC4" strokeWidth={2.9} accessibilityLabel="On Robot" /> : null}
      {locked ? <Lock size={17} color="#A06900" strokeWidth={2.9} accessibilityLabel="Locked" /> : null}
      <ChevronRight size={16} color={CL.ink3} strokeWidth={2.8} />
      {course.syncedToDevice ? <Text style={styles.hiddenStatus}>On Robot</Text> : null}
      {locked ? <Text style={styles.hiddenStatus}>Locked</Text> : null}
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
  root: { flex: 1, backgroundColor: '#FAF5EB' },
  content: { width: '100%', paddingBottom: 130 },
  heading: { fontSize: 29, color: '#2D3436', letterSpacing: 0 },
  intro: { fontSize: 13, color: '#636E72', lineHeight: 20, marginTop: 4 },
  headerIconWell: { width: 72, height: 72, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EBDCC7' },
  headerIcon: { width: 56, height: 56 },
  searchBox: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EBDCC7',
    paddingHorizontal: 16,
    shadowColor: '#A98F77',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    color: CL.ink,
    fontSize: 13,
    fontWeight: '800',
    paddingVertical: 0,
  },
  message: { fontSize: 18, color: CL.ink },
  detail: { fontSize: 14, color: CL.ink2 },
  courseCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EBDCC7',
    borderRadius: 28,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 106,
    shadowColor: '#A98F77',
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 2,
  },
  courseImage: { width: 76, height: 76, borderRadius: 24, backgroundColor: '#F0E6D6' },
  coursePlaceholder: { width: 76, height: 76, borderRadius: 24, backgroundColor: '#D6D1C9' },
  courseInitial: { color: '#FFFFFF', fontSize: 20 },
  title: { fontSize: 17, color: '#2D3436', lineHeight: 22 },
  meta: { fontSize: 10, color: '#636E72', marginTop: 5, letterSpacing: 0.8 },
  hiddenStatus: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});
