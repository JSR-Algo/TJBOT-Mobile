import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ROUTES } from '@/navigation/routes';
import LCDLessonTurnScreen from '@/features/device/screens/LCDLessonTurnScreen';
import LessonResumeScreen from '@/features/fallback/screens/LessonResumeScreen';
import BuyCourseScreen from '@/features/course-library/screens/BuyCourseScreen';
import CourseLockedScreen from '@/features/course-library/screens/CourseLockedScreen';
import CourseDetailScreen from '@/features/course-library/screens/CourseDetailScreen';
import COURSES from '@/features/course-library/components/courses';
import { getCourses, type PublishedCourse } from '@/services/api/course-library.api';

// CourseDetailScreen reads the published catalog on mount. Keep every other
// export REAL (the screen relies on none of them) and mock ONLY the one network
// read, mirroring course-library-screen-coverage-gaps.test.tsx.
jest.mock('@/services/api/course-library.api', () => {
  const actual = jest.requireActual('@/services/api/course-library.api');
  return {
    ...actual,
    getCourses: jest.fn(),
  };
});

const mockedGetCourses = getCourses as jest.MockedFunction<typeof getCourses>;

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

function routeFor(name: string, params?: unknown) {
  return { key: name, name, params } as never;
}

beforeEach(() => {
  jest.clearAllMocks();
  // Default: never-resolving so screens that mount it stay on static fallback
  // unless a test overrides. Resolved value supplied per-test.
  mockedGetCourses.mockResolvedValue([]);
});

// ───────────────────────────────────────────────────────────────────────────
// LCDLessonTurnScreen — static gallery of the 5 lesson-turn LCD frames + the
// transitions table. Pure render of module constants; covers lines 29-68
// (the TURNS map, frame/ms badges, and the TRANSITIONS map incl. the
// `i < length - 1` border ternary on both true and false legs).
// ───────────────────────────────────────────────────────────────────────────
describe('LCDLessonTurnScreen — lesson-turn LCD gallery render', () => {
  it('renders all five turn cards with frame counters and the transitions table', () => {
    const navigation = navigationFor();
    render(
      <LCDLessonTurnScreen
        navigation={navigation as never}
        route={routeFor(ROUTES.LCDLessonTurnScreen)}
      />,
    );

    // Header copy (lines 31-39).
    expect(screen.getByText('One lesson turn')).toBeTruthy();

    // TURNS.map rendered every frame: labels + the words line per turn (42-58).
    expect(screen.getByText('1 · Robot speaks')).toBeTruthy();
    expect(screen.getByText('2 · Robot listens')).toBeTruthy();
    expect(screen.getByText('3 · Child speaks')).toBeTruthy();
    expect(screen.getByText('4 · Robot thinks')).toBeTruthy();
    expect(screen.getByText('5 · Robot celebrates')).toBeTruthy();

    // frame badge index expression `${i + 1}/${TURNS.length}` (line 47).
    expect(screen.getByText('frame · 1/5')).toBeTruthy();
    expect(screen.getByText('frame · 5/5')).toBeTruthy();

    // TRANSITIONS.map (lines 67-72), including a non-last row (border-true leg)
    // and the last row (border-false leg of the `i < length - 1` ternary).
    expect(screen.getByText('speak → listen')).toBeTruthy();
    expect(screen.getByText("didn't_hear / try_again")).toBeTruthy();
  });
});

// ───────────────────────────────────────────────────────────────────────────
// LessonResumeScreen — resume-fallback. Covers the resumeTarget routing ladder
// (lines 22-36) for all four branches, the activityLabel conditional (line 51),
// and both bottom CTAs (lines 59-64). Defaults applied when no checkpoint.
// ───────────────────────────────────────────────────────────────────────────
describe('LessonResumeScreen — resume routing + render', () => {
  it('uses default lesson copy and resumes to UserSpeakingScreen when no checkpoint', () => {
    const navigation = navigationFor();
    render(
      <LessonResumeScreen
        navigation={navigation as never}
        route={routeFor(ROUTES.LessonResumeScreen, undefined)}
      />,
    );

    // Defaults (lines 18-21): no activityLabel branch (line 51 false leg).
    expect(screen.getByText('How are you?')).toBeTruthy();
    expect(screen.getByText('60%')).toBeTruthy();

    // resumeTarget default → UserSpeakingScreen (line 35, fall-through).
    fireEvent.press(screen.getByText('Keep going'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.UserSpeakingScreen);
  });

  it('resumes to RobotListeningScreen and renders activityLabel when checkpoint provides them', () => {
    const navigation = navigationFor();
    render(
      <LessonResumeScreen
        navigation={navigation as never}
        route={routeFor(ROUTES.LessonResumeScreen, {
          checkpoint: {
            lessonTitle: 'Colors at the Park',
            progressLabel: '40%',
            activityLabel: 'Activity 2 of 3',
            resumeTarget: ROUTES.RobotListeningScreen,
          },
        })}
      />,
    );

    // checkpoint-supplied copy + activityLabel true leg (lines 18-20, 51).
    expect(screen.getByText('Colors at the Park')).toBeTruthy();
    expect(screen.getByText('40%')).toBeTruthy();
    expect(screen.getByText('Activity 2 of 3')).toBeTruthy();

    fireEvent.press(screen.getByText('Keep going'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.RobotListeningScreen);
  });

  it('resumes to RobotSpeakingScreen branch (lines 27-29)', () => {
    const navigation = navigationFor();
    render(
      <LessonResumeScreen
        navigation={navigation as never}
        route={routeFor(ROUTES.LessonResumeScreen, {
          checkpoint: { resumeTarget: ROUTES.RobotSpeakingScreen },
        })}
      />,
    );
    fireEvent.press(screen.getByText('Keep going'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.RobotSpeakingScreen);
  });

  it('resumes to ActivityIntroScreen branch (lines 31-33)', () => {
    const navigation = navigationFor();
    render(
      <LessonResumeScreen
        navigation={navigation as never}
        route={routeFor(ROUTES.LessonResumeScreen, {
          checkpoint: { resumeTarget: ROUTES.ActivityIntroScreen },
        })}
      />,
    );
    fireEvent.press(screen.getByText('Keep going'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.ActivityIntroScreen);
  });

  it('"Stop for now" + TopBar back both route to HomeHubScreen (lines 39, 62)', () => {
    const navigation = navigationFor();
    render(
      <LessonResumeScreen
        navigation={navigation as never}
        route={routeFor(ROUTES.LessonResumeScreen, undefined)}
      />,
    );
    // TopBar back button (line 39 onBack arrow).
    fireEvent.press(screen.getByLabelText('Back to home'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.HomeHubScreen);

    navigation.navigate.mockClear();
    // "Stop for now" text CTA (line 62).
    fireEvent.press(screen.getByText('Stop for now'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.HomeHubScreen);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// BuyCourseScreen — free-mode "add course" screen. Covers the courseId
// fallback resolution + i18n template build (lines 21-28) and both CTAs +
// onBack (lines 31, 56-57).
// ───────────────────────────────────────────────────────────────────────────
describe('BuyCourseScreen — add-free-course handlers', () => {
  it('resolves a known courseId and renders the course title + free-mode card', () => {
    const navigation = navigationFor();
    render(
      <BuyCourseScreen
        navigation={navigation as never}
        route={routeFor(ROUTES.BuyCourseScreen, { courseId: 'c_animals' })}
      />,
    );

    // c.title from the matched course (line 22 find hit).
    expect(screen.getByText('My Animal Friends')).toBeTruthy();
    expect(screen.getByText('Included for now')).toBeTruthy();
  });

  it('falls back to the default COURSE when courseId is unknown (line 22 ?? COURSE)', () => {
    const navigation = navigationFor();
    render(
      <BuyCourseScreen
        navigation={navigation as never}
        route={routeFor(ROUTES.BuyCourseScreen, { courseId: 'does-not-exist' })}
      />,
    );
    // COURSES[2] is "Yummy Words" — the module default fallback.
    expect(screen.getByText('Yummy Words')).toBeTruthy();
  });

  it('defaults the courseId to COURSE.id when route.params is undefined (line 21 ?? leg)', () => {
    const navigation = navigationFor();
    render(
      <BuyCourseScreen
        navigation={navigation as never}
        route={routeFor(ROUTES.BuyCourseScreen, undefined)}
      />,
    );
    // params undefined → COURSE (COURSES[2] = "Yummy Words").
    expect(screen.getByText('Yummy Words')).toBeTruthy();
  });

  it('"Add free course" routes to UnlockConfirmScreen with the courseId (line 56)', () => {
    const navigation = navigationFor();
    render(
      <BuyCourseScreen
        navigation={navigation as never}
        route={routeFor(ROUTES.BuyCourseScreen, { courseId: 'c_animals' })}
      />,
    );
    fireEvent.press(screen.getByText('Add free course'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.UnlockConfirmScreen, { courseId: 'c_animals' });
  });

  it('"Not now" + back both route to CourseDetailScreen with the courseId (lines 31, 57)', () => {
    const navigation = navigationFor();
    render(
      <BuyCourseScreen
        navigation={navigation as never}
        route={routeFor(ROUTES.BuyCourseScreen, { courseId: 'c_animals' })}
      />,
    );
    fireEvent.press(screen.getByText('Not now'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.CourseDetailScreen, { courseId: 'c_animals' });

    navigation.navigate.mockClear();
    // DeviceShell back button (line 31 onBack arrow → CourseDetailScreen).
    fireEvent.press(screen.getByLabelText('Go back'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.CourseDetailScreen, { courseId: 'c_animals' });
  });
});

// ───────────────────────────────────────────────────────────────────────────
// CourseLockedScreen — locked-course screen. Covers courseId resolution
// (lines 22-23), render of the locked hero, and all three bottom CTAs + the
// "Try first" CourseCard onClick + onBack (lines 25, 60, 64-68).
// ───────────────────────────────────────────────────────────────────────────
describe('CourseLockedScreen — locked-course handlers', () => {
  it('renders the locked hero for a known locked course', () => {
    const navigation = navigationFor();
    render(
      <CourseLockedScreen
        navigation={navigation as never}
        route={routeFor(ROUTES.CourseLockedScreen, { courseId: 'c_stories' })}
      />,
    );
    // c.title from matched course (line 23) + the "why locked" explainer.
    expect(screen.getByText('Story Time')).toBeTruthy();
    expect(screen.getByText('Why is this locked?')).toBeTruthy();
  });

  it('falls back to default COURSE on unknown courseId (line 23 ?? COURSE)', () => {
    const navigation = navigationFor();
    render(
      <CourseLockedScreen
        navigation={navigation as never}
        route={routeFor(ROUTES.CourseLockedScreen, { courseId: 'nope' })}
      />,
    );
    // COURSES[4] default = "Story Time".
    expect(screen.getByText('Story Time')).toBeTruthy();
  });

  it('defaults the courseId to COURSE.id when route.params is undefined (line 22 ?? leg)', () => {
    const navigation = navigationFor();
    render(
      <CourseLockedScreen
        navigation={navigation as never}
        route={routeFor(ROUTES.CourseLockedScreen, undefined)}
      />,
    );
    // params undefined → COURSE (COURSES[4] = "Story Time").
    expect(screen.getByText('Story Time')).toBeTruthy();
  });

  it('"Add free course" routes to UnlockConfirmScreen with courseId (line 64)', () => {
    const navigation = navigationFor();
    render(
      <CourseLockedScreen
        navigation={navigation as never}
        route={routeFor(ROUTES.CourseLockedScreen, { courseId: 'c_outside' })}
      />,
    );
    fireEvent.press(screen.getByText('Add free course'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.UnlockConfirmScreen, { courseId: 'c_outside' });
  });

  it('"Try first" card + "Back to library" + back route to CourseLibrary/Detail (lines 25, 60, 65)', () => {
    const navigation = navigationFor();
    render(
      <CourseLockedScreen
        navigation={navigation as never}
        route={routeFor(ROUTES.CourseLockedScreen, { courseId: 'c_outside' })}
      />,
    );
    fireEvent.press(screen.getByText('Back to library'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.CourseLibraryScreen);

    navigation.navigate.mockClear();
    // "Try first" CourseCard onClick (line 60 → CourseDetailScreen). The card is
    // a button labelled "Open <title> <state> course"; COURSES[0] is installed.
    fireEvent.press(screen.getByLabelText('Open Hello Friends installed course'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.CourseDetailScreen);

    navigation.navigate.mockClear();
    // DeviceShell back button (line 25 onBack arrow → CourseLibraryScreen).
    fireEvent.press(screen.getByLabelText('Go back'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.CourseLibraryScreen);
  });

  it('"Contact support" routes to SupportScreen with app_error context (lines 66-73)', () => {
    const navigation = navigationFor();
    render(
      <CourseLockedScreen
        navigation={navigation as never}
        route={routeFor(ROUTES.CourseLockedScreen, { courseId: 'c_outside' })}
      />,
    );
    fireEvent.press(screen.getByText('Contact support'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.SupportScreen, {
      context: { topic: 'app_error', errorFamily: 'app_error' },
    });
  });
});

// ───────────────────────────────────────────────────────────────────────────
// CourseDetailScreen — covers the published-overlay effect (lines 28-41) on
// BOTH the resolve-with-match path (line 32 overlay title/lessonCount) and the
// catch path (line 35-36 fallback to static), plus the static-fallback courseId
// resolution (line 43) and the two CTAs (lines 50, 100-101).
// ───────────────────────────────────────────────────────────────────────────
describe('CourseDetailScreen — published overlay + CTAs', () => {
  it('overlays the published title + lessonCount over the static course (line 32, 46-47)', async () => {
    const navigation = navigationFor();
    const published: PublishedCourse = {
      courseId: 'c_hello',
      title: 'Hello Friends (Authored)',
      lessonCount: 99,
    };
    mockedGetCourses.mockResolvedValue([published]);

    render(
      <CourseDetailScreen
        navigation={navigation as never}
        route={routeFor(ROUTES.CourseDetailScreen, { courseId: 'c_hello' })}
      />,
    );

    // After the effect resolves, the published title overlays the static one.
    await waitFor(() => expect(screen.getByText('Hello Friends (Authored)')).toBeTruthy());
    // lessonCount overlay (line 47) surfaces in the stat grid.
    expect(screen.getByText('99')).toBeTruthy();
    expect(mockedGetCourses).toHaveBeenCalledTimes(1);
  });

  it('keeps static metadata when published title is blank (line 46 trim-false leg)', async () => {
    const navigation = navigationFor();
    mockedGetCourses.mockResolvedValue([{ courseId: 'c_hello', title: '   ', lessonCount: 7 }]);

    render(
      <CourseDetailScreen
        navigation={navigation as never}
        route={routeFor(ROUTES.CourseDetailScreen, { courseId: 'c_hello' })}
      />,
    );

    // Blank published title → static "Hello Friends" retained, but lessonCount
    // still overlays to 7 (published truthy → line 47 true leg).
    await waitFor(() => expect(screen.getByText('7')).toBeTruthy());
    expect(screen.getByText('Hello Friends')).toBeTruthy();
  });

  it('falls back to static metadata when getCourses rejects (catch, lines 34-36)', async () => {
    const navigation = navigationFor();
    mockedGetCourses.mockRejectedValue(new Error('catalog down'));

    render(
      <CourseDetailScreen
        navigation={navigation as never}
        route={routeFor(ROUTES.CourseDetailScreen, { courseId: 'c_hello' })}
      />,
    );

    // No published overlay; static title + static lessons (24) render.
    await waitFor(() => expect(screen.getByText('Hello Friends')).toBeTruthy());
    expect(screen.getByText('24')).toBeTruthy();
  });

  it('defaults the courseId to COURSE.id when route.params is undefined (line 22 ?? leg)', async () => {
    const navigation = navigationFor();
    mockedGetCourses.mockResolvedValue([]);
    render(
      <CourseDetailScreen
        navigation={navigation as never}
        route={routeFor(ROUTES.CourseDetailScreen, undefined)}
      />,
    );
    // params undefined → COURSE (COURSES[2] = "Yummy Words").
    await waitFor(() => expect(screen.getByText('Yummy Words')).toBeTruthy());
  });

  it('skips the resolve setState when unmounted before getCourses settles (line 32 active-false)', async () => {
    const navigation = navigationFor();
    let resolveList: (v: PublishedCourse[]) => void = () => {};
    mockedGetCourses.mockReturnValue(
      new Promise<PublishedCourse[]>((res) => {
        resolveList = res;
      }),
    );

    const { unmount } = render(
      <CourseDetailScreen
        navigation={navigation as never}
        route={routeFor(ROUTES.CourseDetailScreen, { courseId: 'c_hello' })}
      />,
    );

    // Tear down the cleanup (active = false) BEFORE the promise resolves, then
    // resolve — the `if (active)` guard (line 32) must take its false leg.
    unmount();
    await act(async () => {
      resolveList([{ courseId: 'c_hello', title: 'Late', lessonCount: 1 }]);
      await Promise.resolve();
    });
    // No throw / no act warning => the guard short-circuited the setState.
    expect(mockedGetCourses).toHaveBeenCalledTimes(1);
  });

  it('skips the catch setState when unmounted before getCourses rejects (line 36 active-false)', async () => {
    const navigation = navigationFor();
    let rejectList: (e: unknown) => void = () => {};
    mockedGetCourses.mockReturnValue(
      new Promise<PublishedCourse[]>((_res, rej) => {
        rejectList = rej;
      }),
    );

    const { unmount } = render(
      <CourseDetailScreen
        navigation={navigation as never}
        route={routeFor(ROUTES.CourseDetailScreen, { courseId: 'c_hello' })}
      />,
    );

    unmount();
    await act(async () => {
      rejectList(new Error('late failure'));
      await Promise.resolve();
    });
    expect(mockedGetCourses).toHaveBeenCalledTimes(1);
  });

  it('uses default COURSE for unknown courseId (line 43 ?? COURSE) and routes CTAs', async () => {
    const navigation = navigationFor();
    mockedGetCourses.mockResolvedValue([]);

    render(
      <CourseDetailScreen
        navigation={navigation as never}
        route={routeFor(ROUTES.CourseDetailScreen, { courseId: 'unknown-course' })}
      />,
    );

    // COURSES[2] default = "Yummy Words".
    await waitFor(() => expect(screen.getByText('Yummy Words')).toBeTruthy());

    // "Add to Robot" → UnlockConfirmScreen with the (unknown) courseId (line 100).
    fireEvent.press(screen.getByText('Add to Robot'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.UnlockConfirmScreen, { courseId: 'unknown-course' });

    // "Back to library" → CourseLibraryScreen (line 101).
    fireEvent.press(screen.getByText('Back to library'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.CourseLibraryScreen);

    navigation.navigate.mockClear();
    // DeviceShell back button (line 50 onBack arrow → CourseLibraryScreen).
    fireEvent.press(screen.getByLabelText('Go back'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.CourseLibraryScreen);
  });
});
