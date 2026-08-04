import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import CourseDetailScreen from '@/features/course-library/screens/CourseDetailScreen';
import { ROUTES } from '@/navigation/routes';
import client from '@/services/http/client';

jest.mock('@/services/http/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('@/contexts/HouseholdContext', () => ({
  useOptionalHousehold: jest.fn(() => ({
    children: [{ id: 'ch-1', name: 'Minh' }],
    activeChild: { id: 'ch-1', name: 'Minh' },
  })),
}));

const mockedClient = client as jest.Mocked<typeof client>;

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

describe('course enrollment lifecycle integration with mocked HTTP adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      buttons?.find((button) => button.style === 'destructive')?.onPress?.();
    });
    mockedClient.get.mockImplementation(async (path: string) => {
      if (path === '/courses') {
        return { data: { data: { courses: [{ course_id: 'c_food', title: 'Food Words', lesson_count: 1 }] } } };
      }
      if (path === '/courses/c_food/lessons') {
        return { data: { data: { lessons: [{ lesson_id: 'lesson-1', lesson_version: 1, title: 'Food Words', profile: 'espTft', manifest_ready: true }] } } };
      }
      if (path === '/children/ch-1/enrollments') {
        return { data: { data: { enrollments: [{ id: 'enr-1', child_id: 'ch-1', course_id: 'c_food', device_id: 'dev-1', status: 'paused' }] } } };
      }
      if (path === '/devices/household/me') {
        return { data: { data: [{ id: 'dev-1', name: 'Casa Robot', status: 'active', battery_level: 80, assigned_child_profile_id: 'ch-1' }] } };
      }
      throw new Error(`unexpected GET ${path}`);
    });
    mockedClient.post.mockResolvedValue({
      data: {
        data: {
          enrollment: { id: 'enr-1', child_id: 'ch-1', course_id: 'c_food', device_id: 'dev-1', status: 'active' },
          assignment: {
            assignment_id: 'asg-1',
            assignment_version: 3,
            device_id: 'dev-1',
            child_id: 'ch-1',
            lesson_id: 'lesson-1',
            lesson_title: 'Food Words',
            lesson_version: 1,
            manifest_checksum: 'sha256:food',
            profile: 'espTft',
            state: 'PRELOADING',
          },
        },
      },
    });
    mockedClient.delete.mockResolvedValue({
      data: {
        data: {
          cancelled: true,
        },
      },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses real API functions over the mocked adapter to POST resume and DELETE cancel with child/device context', async () => {
    const navigation = navigationFor();
    render(
      <CourseDetailScreen
        navigation={navigation as never}
        route={{ key: 'detail', name: ROUTES.CourseDetailScreen, params: { courseId: 'c_food' } } as never}
      />,
    );

    await waitFor(() => expect(screen.getByText('Course paused')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByText('Resume course'));
    });

    expect(mockedClient.post).toHaveBeenCalledWith('/courses/c_food/enroll', { childId: 'ch-1', deviceId: 'dev-1' });
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.RobotReadyScreen, {
      childId: 'ch-1',
      courseId: 'c_food',
      deviceId: 'dev-1',
      assignmentId: 'asg-1',
      assignmentVersion: 3,
      lessonTitle: 'Food Words',
      manifestChecksum: 'sha256:food',
    });

    await act(async () => {
      fireEvent.press(screen.getByText('Cancel course'));
    });

    expect(mockedClient.delete).toHaveBeenCalledWith('/courses/c_food/enroll/ch-1');
  });
});
