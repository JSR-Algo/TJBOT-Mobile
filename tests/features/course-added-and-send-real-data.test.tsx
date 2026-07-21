import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { ROUTES } from '@/navigation/routes';
import CourseAddedScreen from '@/features/course-library/screens/CourseAddedScreen';
import {
  getCourseLessons,
  getCourses,
  getCurrentAssignment,
  type CurrentAssignment,
} from '@/services/api/course-library.api';

jest.mock('@/services/api/course-library.api', () => {
  const actual = jest.requireActual('@/services/api/course-library.api');
  return {
    ...actual,
    getCourses: jest.fn(),
    getCourseLessons: jest.fn(),
    getCurrentAssignment: jest.fn(),
  };
});

const mockedGetCourses = getCourses as jest.MockedFunction<typeof getCourses>;
const mockedGetCourseLessons = getCourseLessons as jest.MockedFunction<typeof getCourseLessons>;
const mockedGetCurrentAssignment = getCurrentAssignment as jest.MockedFunction<typeof getCurrentAssignment>;

const COURSE_KEY = 'w01-place-words';
const DEVICE_ID = '33333333-3333-4333-8333-333333333333';

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

function seatedAssignment(lessonTitle: string): CurrentAssignment {
  return {
    assignmentId: 'a-1',
    sessionId: null,
    assignmentVersion: 1,
    lessonId: 'w01-d01-barn-say-it',
    lessonTitle,
    lessonVersion: 1,
    manifestChecksum: 'a'.repeat(64),
    state: 'ASSIGNED' as CurrentAssignment['state'],
    childId: 'c-1',
    profile: 'espTft',
  };
}

function renderAdded(params: Record<string, unknown>) {
  return render(
    <CourseAddedScreen
      navigation={navigationFor() as never}
      route={{ key: ROUTES.CourseAddedScreen, name: ROUTES.CourseAddedScreen, params } as never}
    />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetCourses.mockResolvedValue([{ courseId: COURSE_KEY, title: 'Barn Farm Place Words', lessonCount: 1 }]);
  mockedGetCourseLessons.mockResolvedValue([]);
  mockedGetCurrentAssignment.mockResolvedValue(null);
});

describe('CourseAddedScreen — "On Robot now" reflects the real seat', () => {
  it('renders the lesson actually seated on the device, not a hardcoded one', async () => {
    mockedGetCurrentAssignment.mockResolvedValue(seatedAssignment('This Is a Barn'));

    renderAdded({ courseId: COURSE_KEY, deviceId: DEVICE_ID, assignmentId: 'a-1' });

    await waitFor(() => expect(screen.getByText('This Is a Barn')).toBeTruthy());
    // The literal that used to render under "On Robot now" for every course.
    expect(screen.queryByText('Lesson 1 · Hello, food!')).toBeNull();
    expect(mockedGetCurrentAssignment).toHaveBeenCalledWith(DEVICE_ID);
  });

  it('falls back to neutral copy when the seat is unknown, never to a fake lesson', async () => {
    mockedGetCurrentAssignment.mockRejectedValue(new Error('device offline'));

    renderAdded({ courseId: COURSE_KEY, deviceId: DEVICE_ID });

    await waitFor(() => expect(screen.getByText('Preparing the first lesson')).toBeTruthy());
    expect(screen.queryByText('Lesson 1 · Hello, food!')).toBeNull();
  });

  it('does not claim Robot alternates between two hardcoded courses', async () => {
    renderAdded({ courseId: COURSE_KEY, deviceId: DEVICE_ID });

    await waitFor(() => expect(screen.getByText('Barn Farm Place Words is on Robot')).toBeTruthy());
    expect(screen.queryByText('Robot will alternate between Hello Friends and Yummy Words')).toBeNull();
  });

  it('does not borrow the static catalog course for a backend course_key', async () => {
    renderAdded({ courseId: COURSE_KEY, deviceId: DEVICE_ID });

    await waitFor(() => expect(screen.getByText('Barn Farm Place Words is on Robot')).toBeTruthy());
    expect(screen.queryByText('Yummy Words is on Robot')).toBeNull();
  });
});
