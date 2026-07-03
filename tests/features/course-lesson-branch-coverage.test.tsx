import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ROUTES } from '@/navigation/routes';
import CourseAddedScreen from '@/features/course-library/screens/CourseAddedScreen';
import CourseLibraryScreen from '@/features/course-library/screens/CourseLibraryScreen';
import CourseCard from '@/features/course-library/components/CourseCard';
import CourseScreen from '@/features/course/screens/CourseScreen';
import LessonListScreen from '@/features/course/screens/LessonListScreen';
import { getCourses, listLibrary, type PublishedCourse, type LibraryItem } from '@/services/api/course-library.api';
import {
  listCourseCatalog,
  getLessonList,
  type CourseCatalogItem,
  type LessonDetail,
} from '@/services/api/course.api';

// CourseLibraryScreen now loads via useFocusEffect (refetch-on-tab-focus).
// Outside a NavigationContainer that hook throws, so treat it as a plain effect.
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native') as typeof import('@react-navigation/native');
  const ReactInner = require('react') as typeof import('react');
  return {
    ...actual,
    useFocusEffect: (cb: () => undefined | (() => void)) => {
      ReactInner.useEffect(() => {
        const cleanup = cb();
        return typeof cleanup === 'function' ? cleanup : undefined;
      }, [cb]);
    },
  };
});

// Mock ONLY the network reads each screen depends on; keep all presentation /
// state-machine code real so these branches are exercised the way prod runs.
jest.mock('@/services/api/course-library.api', () => {
  const actual = jest.requireActual('@/services/api/course-library.api');
  return { ...actual, getCourses: jest.fn(), listLibrary: jest.fn() };
});
jest.mock('@/services/api/course.api', () => {
  const actual = jest.requireActual('@/services/api/course.api');
  return { ...actual, listCourseCatalog: jest.fn(), getLessonList: jest.fn() };
});

const mockedGetCourses = getCourses as jest.MockedFunction<typeof getCourses>;
const mockedListLibrary = listLibrary as jest.MockedFunction<typeof listLibrary>;
const mockedListCourseCatalog = listCourseCatalog as jest.MockedFunction<typeof listCourseCatalog>;
const mockedGetLessonList = getLessonList as jest.MockedFunction<typeof getLessonList>;

function navigationFor() {
  return {
    navigate: jest.fn(),
    replace: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
    canGoBack: jest.fn(() => true),
    isFocused: jest.fn(() => true),
    addListener: jest.fn(() => jest.fn()),
    removeListener: jest.fn(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetCourses.mockResolvedValue([] as PublishedCourse[]);
  mockedListLibrary.mockResolvedValue([] as LibraryItem[]);
  mockedListCourseCatalog.mockResolvedValue([] as CourseCatalogItem[]);
  mockedGetLessonList.mockResolvedValue([] as LessonDetail[]);
});

// ───────────────────────────────────────────────────────────────────────────
// CourseAddedScreen — line 103: the secondary "Back to Robot home" CTA. The
// primary CTA is already covered elsewhere; this drives the secondary
// DeviceBigBtn onClick → navigate(DeviceHomeScreen).
// ───────────────────────────────────────────────────────────────────────────
describe('CourseAddedScreen — secondary CTA (line 103)', () => {
  it('"Back to Robot home" navigates to DeviceHomeScreen', async () => {
    const navigation = navigationFor();
    render(
      <CourseAddedScreen
        navigation={navigation as never}
        route={{ key: 'ca', name: ROUTES.CourseAddedScreen, params: { courseId: 'c_food' } } as never}
      />,
    );

    // Flush the getCourses effect so we render past loading.
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.press(screen.getByText('Back to Robot home'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.DeviceHomeScreen);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// CourseLibraryScreen — line 56: the per-course onPress that navigates to
// CourseDetailScreen. Reaching it requires the `ready` state WITH at least one
// course row mapped.
// ───────────────────────────────────────────────────────────────────────────
describe('CourseLibraryScreen — course row onPress (line 56)', () => {
  function libItem(over: Partial<LibraryItem> = {}): LibraryItem {
    return {
      courseId: 'lib-1',
      title: 'Library Course One',
      language: 'en',
      owned: true,
      syncedToDevice: false,
      locked: false,
      ...over,
    } as LibraryItem;
  }

  it('pressing a loaded course row navigates to CourseDetailScreen with its courseId', async () => {
    mockedListLibrary.mockResolvedValue([libItem({ courseId: 'lib-42', title: 'Counting Fun' })]);
    const navigation = navigationFor();
    render(
      <CourseLibraryScreen
        navigation={navigation as never}
        route={{ key: 'cl', name: ROUTES.CourseLibraryScreen, params: undefined } as never}
      />,
    );

    await waitFor(() => expect(screen.getByText('Counting Fun')).toBeTruthy());
    fireEvent.press(screen.getByText('Counting Fun'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.CourseDetailScreen, { courseId: 'lib-42' });
  });

  it('renders the synced + locked indicators for the alternate row variants', async () => {
    mockedListLibrary.mockResolvedValue([
      libItem({ courseId: 'lib-a', title: 'On-Robot Course', syncedToDevice: true, owned: true, locked: false }),
      libItem({ courseId: 'lib-b', title: 'Locked Course', owned: false, locked: true }),
    ]);
    const navigation = navigationFor();
    render(
      <CourseLibraryScreen
        navigation={navigation as never}
        route={{ key: 'cl', name: ROUTES.CourseLibraryScreen, params: undefined } as never}
      />,
    );

    await waitFor(() => expect(screen.getByText('On Robot')).toBeTruthy());
    expect(screen.getByText('Locked')).toBeTruthy();
  });
});

// ───────────────────────────────────────────────────────────────────────────
// CourseCard — line 28: isCourseState false branch (invalid state coerced to
// 'not_installed'); line 61: the no-onClick View with the locked-opacity arm.
// ───────────────────────────────────────────────────────────────────────────
describe('CourseCard — state coercion + non-pressable locked variant', () => {
  function course(over: Partial<React.ComponentProps<typeof CourseCard>['course']> = {}) {
    return {
      state: 'installed',
      lcd: 'happy',
      ages: '4–6',
      title: 'Hello Friends',
      level: 'Just starting',
      lessons: 24,
      teaches: ['Greetings', 'Names', 'Family', 'Feelings'],
      ...over,
    };
  }

  it('an unknown state falls back to not_installed chip (line 28 false arm) and renders the +N overflow tag', () => {
    // 4 teaches → slice(0,3) renders 3 + "+1" overflow (line 50-51 true arm too).
    render(<CourseCard course={course({ state: 'bogus_state', title: 'Mystery Course' })} />);

    // Accessibility label echoes the raw state, proving the card rendered with
    // the invalid state while the chip fell back internally.
    expect(screen.getByLabelText('Mystery Course bogus_state course')).toBeTruthy();
    expect(screen.getByText('+1')).toBeTruthy();
  });

  it('with no onClick it renders the non-pressable View; locked state takes the 0.85-opacity arm (line 61)', () => {
    render(<CourseCard course={course({ state: 'locked', title: 'Locked Course' })} />);

    // No onClick → the disabled View branch (lines 59-67), accessibilityState disabled.
    const view = screen.getByLabelText('Locked Course locked course');
    expect(view).toBeTruthy();
    expect(view.props.accessibilityState).toEqual({ disabled: true });
    // No "Open …" button label exists on the non-pressable path.
    expect(screen.queryByLabelText('Open Locked Course locked course')).toBeNull();
  });

  it('with no onClick and an unlocked state takes the opacity:1 arm (line 61 false branch)', () => {
    render(<CourseCard course={course({ state: 'ready', title: 'Ready Course' })} />);
    expect(screen.getByLabelText('Ready Course ready course')).toBeTruthy();
  });
});

// ───────────────────────────────────────────────────────────────────────────
// CourseScreen — line 67: the per-course onPress navigating to the real
// course-library detail screen instead of the static LevelScreen prototype.
// Reaching it needs a `ready` state with an unlocked course row.
// ───────────────────────────────────────────────────────────────────────────
describe('CourseScreen — course row onPress (line 67)', () => {
  function catalogItem(over: Partial<CourseCatalogItem> = {}): CourseCatalogItem {
    return {
      id: 'cat-1',
      title: 'English Basics',
      language: 'en',
      levelCount: 2,
      lessonCount: 12,
      locked: false,
      progress: 0,
      ...over,
    };
  }

  it('pressing an unlocked course navigates to CourseDetailScreen with its courseId', async () => {
    mockedListCourseCatalog.mockResolvedValue([catalogItem({ id: 'cat-77', title: 'Adventure One' })]);
    const navigation = navigationFor();
    render(
      <CourseScreen
        navigation={navigation as never}
        route={{ key: 'cs', name: ROUTES.CourseScreen, params: undefined } as never}
      />,
    );

    await waitFor(() => expect(screen.getByText('Adventure One')).toBeTruthy());
    fireEvent.press(screen.getByText('Adventure One'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.CourseDetailScreen, { courseId: 'cat-77' });
    expect(navigation.navigate).not.toHaveBeenCalledWith(ROUTES.LevelScreen, expect.anything());
  });

  it('a locked course renders the Locked label (locked-text arm of line 76-78)', async () => {
    mockedListCourseCatalog.mockResolvedValue([catalogItem({ id: 'cat-x', title: 'Sealed Course', locked: true })]);
    const navigation = navigationFor();
    render(
      <CourseScreen
        navigation={navigation as never}
        route={{ key: 'cs', name: ROUTES.CourseScreen, params: undefined } as never}
      />,
    );

    await waitFor(() => expect(screen.getByText('Sealed Course')).toBeTruthy());
    expect(screen.getByText('Locked')).toBeTruthy();
  });
});

// ───────────────────────────────────────────────────────────────────────────
// LessonListScreen — line 49: PageHeader onBack with `unitId ? { unitId } :
// undefined`. The `undefined` branch fires when route has NO unitId.
// ───────────────────────────────────────────────────────────────────────────
describe('LessonListScreen — back nav undefined params arm (line 49)', () => {
  it('without a unitId the back arrow navigates to UnitScreen with undefined params (line 49 false arm)', async () => {
    const navigation = navigationFor();
    render(
      <LessonListScreen
        navigation={navigation as never}
        route={{ key: 'll', name: ROUTES.LessonListScreen, params: undefined } as never}
      />,
    );

    // No unitId → the effect sets the error state synchronously; no network read.
    expect(mockedGetLessonList).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText('Back'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.UnitScreen, undefined);
  });

  it('with a unitId the back arrow carries { unitId } (line 49 true arm)', async () => {
    mockedGetLessonList.mockResolvedValue([]);
    const navigation = navigationFor();
    render(
      <LessonListScreen
        navigation={navigation as never}
        route={{ key: 'll', name: ROUTES.LessonListScreen, params: { unitId: 'u-9' } } as never}
      />,
    );

    await waitFor(() => expect(mockedGetLessonList).toHaveBeenCalledWith('u-9'));
    fireEvent.press(screen.getByLabelText('Back'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.UnitScreen, { unitId: 'u-9' });
  });
});
