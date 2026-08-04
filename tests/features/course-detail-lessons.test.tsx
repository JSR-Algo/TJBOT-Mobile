import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { ROUTES } from '@/navigation/routes';
import CourseDetailScreen from '@/features/course-library/screens/CourseDetailScreen';
import {
  getCourseLessons,
  getCourses,
  type PublishedLesson,
} from '@/services/api/course-library.api';

// Mock ONLY the two network reads the screen performs; everything else stays real.
jest.mock('@/services/api/course-library.api', () => {
  const actual = jest.requireActual('@/services/api/course-library.api');
  return {
    ...actual,
    getCourses: jest.fn(),
    getCourseLessons: jest.fn(),
    listChildEnrollments: jest.fn(() => Promise.resolve({ enrollments: [] })),
    cancelCourseEnrollment: jest.fn(),
    getCurrentAssignment: jest.fn(() => Promise.resolve(null)),
  };
});

const mockedGetCourses = getCourses as jest.MockedFunction<typeof getCourses>;
const mockedGetCourseLessons = getCourseLessons as jest.MockedFunction<typeof getCourseLessons>;

// A backend UUID — the shape a real authored course actually has, and the shape
// that never matches a static catalog id.
const AUTHORED_ID = '6f124118-0f0a-4a2f-9f0e-1b2c3d4e5f60';

function lesson(overrides: Partial<PublishedLesson> & Pick<PublishedLesson, 'lessonId' | 'title'>): PublishedLesson {
  return {
    lessonVersion: 1,
    profile: 'espTft',
    manifestReady: true,
    ...overrides,
  };
}

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

function routeFor(params?: unknown) {
  return { key: ROUTES.CourseDetailScreen, name: ROUTES.CourseDetailScreen, params } as never;
}

function renderDetail(courseId: string) {
  return render(
    <CourseDetailScreen navigation={navigationFor() as never} route={routeFor({ courseId })} />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetCourses.mockResolvedValue([]);
  mockedGetCourseLessons.mockResolvedValue([]);
});

describe('CourseDetailScreen — lesson list', () => {
  // AC1
  it('renders the real lesson titles from the published lessons endpoint', async () => {
    mockedGetCourses.mockResolvedValue([
      { courseId: AUTHORED_ID, title: 'Barn Farm Place Words', lessonCount: 2 },
    ]);
    mockedGetCourseLessons.mockResolvedValue([
      lesson({ lessonId: 'l1', title: 'Meet the barn' }),
      lesson({ lessonId: 'l2', title: 'Counting the animals' }),
    ]);

    renderDetail(AUTHORED_ID);

    await waitFor(() => expect(screen.getByText('Meet the barn')).toBeTruthy());
    expect(screen.getByText('Counting the animals')).toBeTruthy();
    expect(mockedGetCourseLessons).toHaveBeenCalledWith(AUTHORED_ID);
  });

  // AC2 — the regression that made the screen print another course's content.
  it('renders no borrowed static metadata for a courseId with no catalog match', async () => {
    mockedGetCourses.mockResolvedValue([
      { courseId: AUTHORED_ID, title: 'Barn Farm Place Words', lessonCount: 1 },
    ]);
    mockedGetCourseLessons.mockResolvedValue([lesson({ lessonId: 'l1', title: 'Meet the barn' })]);

    renderDetail(AUTHORED_ID);

    await waitFor(() => expect(screen.getByText('Barn Farm Place Words')).toBeTruthy());
    // "Yummy Words" (COURSES[2]) was the old `?? COURSE` fallback. None of its
    // fields may appear under an unrelated course's title.
    expect(screen.queryByText('Yummy Words')).toBeNull();
    expect(screen.queryByText('Mealtime English — fruits, snacks, and gentle table phrases.')).toBeNull();
    expect(screen.queryByText('Asking politely')).toBeNull();
    expect(screen.queryByText('Ages 5–7 · Building up')).toBeNull();
    expect(screen.queryByText('7w')).toBeNull();
    // The "What Robot will teach" section has no data to show, so it is absent
    // rather than an empty card.
    expect(screen.queryByText('What Robot will teach')).toBeNull();
  });

  it('keeps static metadata when the courseId DOES match the static catalog', async () => {
    mockedGetCourses.mockResolvedValue([]);
    mockedGetCourseLessons.mockResolvedValue([]);

    renderDetail('c_food');

    await waitFor(() => expect(screen.getByText('Yummy Words')).toBeTruthy());
    expect(screen.getByText('Asking politely')).toBeTruthy();
    expect(screen.getByText('7w')).toBeTruthy();
  });

  // AC3
  it('shows empty-state copy when the course has no published lessons', async () => {
    mockedGetCourses.mockResolvedValue([{ courseId: AUTHORED_ID, title: 'Barn Farm', lessonCount: 0 }]);
    mockedGetCourseLessons.mockResolvedValue([]);

    renderDetail(AUTHORED_ID);

    await waitFor(() => expect(screen.getByText('No lessons published yet')).toBeTruthy());
  });

  // AC3
  it('shows error copy when the lessons endpoint rejects', async () => {
    mockedGetCourses.mockResolvedValue([{ courseId: AUTHORED_ID, title: 'Barn Farm', lessonCount: 6 }]);
    mockedGetCourseLessons.mockRejectedValue(new Error('lessons down'));

    renderDetail(AUTHORED_ID);

    await waitFor(() => expect(screen.getByText('Lessons unavailable right now')).toBeTruthy());
    // The count from the published catalog still renders — the parent sees 6 and
    // an explicit "unavailable", never 6 and a silent blank.
    expect(screen.getByText('6')).toBeTruthy();
  });

  it('falls back to a positional label when a published lesson has a blank title', async () => {
    mockedGetCourses.mockResolvedValue([{ courseId: AUTHORED_ID, title: 'Barn Farm', lessonCount: 1 }]);
    mockedGetCourseLessons.mockResolvedValue([lesson({ lessonId: 'l1', title: '' })]);

    renderDetail(AUTHORED_ID);

    await waitFor(() => expect(screen.getByText('Lesson 1')).toBeTruthy());
  });

  it('does not setState with lessons that resolve after unmount', async () => {
    let resolveLessons: (value: PublishedLesson[]) => void = () => {};
    mockedGetCourseLessons.mockReturnValue(
      new Promise<PublishedLesson[]>((resolve) => {
        resolveLessons = resolve;
      }),
    );
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const view = renderDetail(AUTHORED_ID);
    view.unmount();
    await waitFor(() => {
      resolveLessons([lesson({ lessonId: 'l1', title: 'Late' })]);
    });

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
