// Round-2 coverage closeout for the lesson/course screen branch arms that the
// round-1 suites left half-covered (lines were 100% but specific branch arms
// were not). Each test drives a SPECIFIC uncovered arm called out in the
// mobile-lane coverage report:
//   - CourseAddedScreen:  20, 45-58  (empty-params default, unmount race,
//                          ?? null find-fallback, COURSES[2] static fallback,
//                          published.title?.trim() ternary both arms)
//   - CourseLibraryScreen: 27-30, 87 (unmount race on then/catch, courses ?? [],
//                          asRecord non-object short-circuit)
//   - CourseScreen:        27-30, 92-104 (unmount race, courses ?? [],
//                          429/RATE_LIMIT mapping ±numeric retryAfterSeconds,
//                          asRecord short-circuit)
//   - LessonListScreen:    36-39, 109 (unmount race, lessons ?? [],
//                          asRecord non-object short-circuit)
//
// Mocks ONLY the network reads; all presentation/state code stays real so the
// branches execute exactly as prod runs them. Mirrors
// course-lesson-branch-coverage.test.tsx conventions.

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ROUTES } from '@/navigation/routes';
import CourseAddedScreen from '@/features/course-library/screens/CourseAddedScreen';
import CourseLibraryScreen from '@/features/course-library/screens/CourseLibraryScreen';
import CourseScreen from '@/features/course/screens/CourseScreen';
import LessonListScreen from '@/features/course/screens/LessonListScreen';
import {
  getCourses,
  listLibrary,
  type PublishedCourse,
  type LibraryItem,
} from '@/services/api/course-library.api';
import {
  listCourseCatalog,
  getLessonList,
  type CourseCatalogItem,
  type LessonDetail,
} from '@/services/api/course.api';

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

function pubCourse(over: Partial<PublishedCourse> = {}): PublishedCourse {
  return { courseId: 'c_food', title: 'Authored Title', lessonCount: 3, ...over };
}

// ───────────────────────────────────────────────────────────────────────────
// CourseAddedScreen — lines 20, 45-58.
// ───────────────────────────────────────────────────────────────────────────
describe('CourseAddedScreen — default courseId + published overlay branch arms', () => {
  it('empty route params → courseId falls back to "c_food" (line 20) and getCourses is queried for it', async () => {
    const navigation = navigationFor();
    render(
      <CourseAddedScreen
        navigation={navigation as never}
        // No params object at all → route.params?.courseId is undefined → 'c_food'.
        route={{ key: 'ca', name: ROUTES.CourseAddedScreen, params: undefined } as never}
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    // The c_food static catalog entry (COURSES[2]) drives the LCD + title, so the
    // default-arm courseId produced a real, non-crashing render.
    expect(screen.getByText('Yummy Words is on Robot')).toBeTruthy();
    // Default-arm courseId reached the send CTA payload (hasAssignment=false copy).
    expect(screen.getByText("Send today's lesson now")).toBeTruthy();
  });

  it('published course whose title is present overlays the REAL title (line 58 truthy arm)', async () => {
    // courseId matches a published course → find() returns it (not the ?? null
    // arm) AND published.title.trim() is truthy → title comes from published.
    mockedGetCourses.mockResolvedValue([pubCourse({ courseId: 'c_food', title: 'Snack Words (Authored)' })]);
    const navigation = navigationFor();
    render(
      <CourseAddedScreen
        navigation={navigation as never}
        route={{ key: 'ca', name: ROUTES.CourseAddedScreen, params: { courseId: 'c_food' } } as never}
      />,
    );

    await waitFor(() => expect(screen.getByText('Snack Words (Authored) is on Robot')).toBeTruthy());
  });

  it('published course with a blank/whitespace title falls back to the static title (line 58 falsy arm)', async () => {
    // find() resolves the published course, but title?.trim() is '' → ternary
    // false arm uses the static COURSES title ("Yummy Words").
    mockedGetCourses.mockResolvedValue([pubCourse({ courseId: 'c_food', title: '   ' })]);
    const navigation = navigationFor();
    render(
      <CourseAddedScreen
        navigation={navigation as never}
        route={{ key: 'ca', name: ROUTES.CourseAddedScreen, params: { courseId: 'c_food' } } as never}
      />,
    );

    await waitFor(() => expect(screen.getByText('Yummy Words is on Robot')).toBeTruthy());
  });

  it('a courseId absent from the published list resolves to ?? null (line 45) and renders the static catalog title', async () => {
    // getCourses returns a DIFFERENT course → find() === undefined → ?? null,
    // so published stays null and the static c_hello title is used.
    mockedGetCourses.mockResolvedValue([pubCourse({ courseId: 'c_other', title: 'Unrelated' })]);
    const navigation = navigationFor();
    render(
      <CourseAddedScreen
        navigation={navigation as never}
        route={{ key: 'ca', name: ROUTES.CourseAddedScreen, params: { courseId: 'c_hello' } } as never}
      />,
    );

    await waitFor(() => expect(screen.getByText('Hello Friends is on Robot')).toBeTruthy());
  });

  it('a courseId in NEITHER published nor static catalog falls back to COURSES[2] (line 55 ?? arm)', async () => {
    // courseId not in static COURSES → COURSES.find() === undefined → ?? COURSES[2]
    // (Yummy Words). published is also empty → static title survives, no crash.
    mockedGetCourses.mockResolvedValue([] as PublishedCourse[]);
    const navigation = navigationFor();
    render(
      <CourseAddedScreen
        navigation={navigation as never}
        route={{ key: 'ca', name: ROUTES.CourseAddedScreen, params: { courseId: 'c_does_not_exist' } } as never}
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText('Yummy Words is on Robot')).toBeTruthy();
  });

  it('a published course unknown to the static catalog overlays its title onto the COURSES[2] fallback (line 55 + 58)', async () => {
    // courseId is NOT in static COURSES (→ COURSES[2] fallback) but IS published
    // with a real title → both the static ?? arm and the published-title arm run.
    mockedGetCourses.mockResolvedValue([pubCourse({ courseId: 'c_brand_new', title: 'Brand New Authored' })]);
    const navigation = navigationFor();
    render(
      <CourseAddedScreen
        navigation={navigation as never}
        route={{ key: 'ca', name: ROUTES.CourseAddedScreen, params: { courseId: 'c_brand_new' } } as never}
      />,
    );

    await waitFor(() => expect(screen.getByText('Brand New Authored is on Robot')).toBeTruthy());
  });

  it('unmount before getCourses resolves: the `if (active)` guard drops the setState (lines 45/48)', async () => {
    let resolveCourses!: (v: PublishedCourse[]) => void;
    mockedGetCourses.mockReturnValue(
      new Promise<PublishedCourse[]>((r) => {
        resolveCourses = r;
      }),
    );
    const navigation = navigationFor();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = render(
      <CourseAddedScreen
        navigation={navigation as never}
        route={{ key: 'ca', name: ROUTES.CourseAddedScreen, params: { courseId: 'c_food' } } as never}
      />,
    );

    await waitFor(() => expect(mockedGetCourses).toHaveBeenCalled());
    // Cleanup flips active=false BEFORE the read resolves.
    unmount();
    await act(async () => {
      resolveCourses([pubCourse({ courseId: 'c_food', title: 'Too Late' })]);
      await Promise.resolve();
      await Promise.resolve();
    });

    // The post-unmount resolve hit `if (active)` false → no setPublished, no warn.
    expect(
      errorSpy.mock.calls.some((c) => String(c[0]).includes("can't perform a React state update")),
    ).toBe(false);
    errorSpy.mockRestore();
  });

  it('unmount before getCourses REJECTS: the catch `if (active)` guard drops the setState (line 48)', async () => {
    let rejectCourses!: (e: unknown) => void;
    mockedGetCourses.mockReturnValue(
      new Promise<PublishedCourse[]>((_, rej) => {
        rejectCourses = rej;
      }),
    );
    const navigation = navigationFor();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = render(
      <CourseAddedScreen
        navigation={navigation as never}
        route={{ key: 'ca', name: ROUTES.CourseAddedScreen, params: { courseId: 'c_food' } } as never}
      />,
    );

    await waitFor(() => expect(mockedGetCourses).toHaveBeenCalled());
    unmount();
    await act(async () => {
      rejectCourses(new Error('offline after unmount'));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(
      errorSpy.mock.calls.some((c) => String(c[0]).includes("can't perform a React state update")),
    ).toBe(false);
    errorSpy.mockRestore();
  });

  it('getCourses rejection while mounted: catch sets published=null and the static title renders (line 48 active arm)', async () => {
    mockedGetCourses.mockRejectedValue(new Error('catalog down'));
    const navigation = navigationFor();
    render(
      <CourseAddedScreen
        navigation={navigation as never}
        route={{ key: 'ca', name: ROUTES.CourseAddedScreen, params: { courseId: 'c_food' } } as never}
      />,
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    // catch → setPublished(null) → static c_food title ("Yummy Words").
    expect(screen.getByText('Yummy Words is on Robot')).toBeTruthy();
  });
});

// ───────────────────────────────────────────────────────────────────────────
// CourseLibraryScreen — lines 27-30, 87.
// ───────────────────────────────────────────────────────────────────────────
describe('CourseLibraryScreen — load race + asRecord short-circuit branch arms', () => {
  it('listLibrary resolves undefined → courses ?? [] yields the empty-state copy (line 27 ?? arm)', async () => {
    mockedListLibrary.mockResolvedValue(undefined as unknown as LibraryItem[]);
    const navigation = navigationFor();
    render(
      <CourseLibraryScreen
        navigation={navigation as never}
        route={{ key: 'cl', name: ROUTES.CourseLibraryScreen, params: undefined } as never}
      />,
    );

    await waitFor(() => expect(screen.getByText('No library courses yet')).toBeTruthy());
  });

  it('unmount before listLibrary resolves: the then-guard drops setState (line 27 active=false arm)', async () => {
    let resolveLib!: (v: LibraryItem[]) => void;
    mockedListLibrary.mockReturnValue(
      new Promise<LibraryItem[]>((r) => {
        resolveLib = r;
      }),
    );
    const navigation = navigationFor();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = render(
      <CourseLibraryScreen
        navigation={navigation as never}
        route={{ key: 'cl', name: ROUTES.CourseLibraryScreen, params: undefined } as never}
      />,
    );

    await waitFor(() => expect(mockedListLibrary).toHaveBeenCalled());
    unmount();
    await act(async () => {
      resolveLib([]);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(
      errorSpy.mock.calls.some((c) => String(c[0]).includes("can't perform a React state update")),
    ).toBe(false);
    errorSpy.mockRestore();
  });

  it('unmount before listLibrary REJECTS: the catch-guard drops the error setState (line 30 active=false arm)', async () => {
    let rejectLib!: (e: unknown) => void;
    mockedListLibrary.mockReturnValue(
      new Promise<LibraryItem[]>((_, rej) => {
        rejectLib = rej;
      }),
    );
    const navigation = navigationFor();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = render(
      <CourseLibraryScreen
        navigation={navigation as never}
        route={{ key: 'cl', name: ROUTES.CourseLibraryScreen, params: undefined } as never}
      />,
    );

    await waitFor(() => expect(mockedListLibrary).toHaveBeenCalled());
    unmount();
    await act(async () => {
      rejectLib(new Error('library down after unmount'));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(
      errorSpy.mock.calls.some((c) => String(c[0]).includes("can't perform a React state update")),
    ).toBe(false);
    errorSpy.mockRestore();
  });

  it('a non-object rejection value hits asRecord short-circuit (line 87) → generic "Library unavailable"', async () => {
    // error is a primitive string → `value && typeof value === 'object'` is false
    // → asRecord returns null → neither NETWORK_ERROR nor 502 arm → default title.
    mockedListLibrary.mockRejectedValue('plain-string-error');
    const navigation = navigationFor();
    render(
      <CourseLibraryScreen
        navigation={navigation as never}
        route={{ key: 'cl', name: ROUTES.CourseLibraryScreen, params: undefined } as never}
      />,
    );

    await waitFor(() => expect(screen.getByText('Library unavailable')).toBeTruthy());
  });

  it('a 502 object rejection produces the service-unavailable copy with its detail (line 80-81 arm)', async () => {
    mockedListLibrary.mockRejectedValue({ status: 502 });
    const navigation = navigationFor();
    render(
      <CourseLibraryScreen
        navigation={navigation as never}
        route={{ key: 'cl', name: ROUTES.CourseLibraryScreen, params: undefined } as never}
      />,
    );

    await waitFor(() => expect(screen.getByText('Library service unavailable')).toBeTruthy());
    expect(screen.getByText('Retry in a moment.')).toBeTruthy();
  });
});

// ───────────────────────────────────────────────────────────────────────────
// CourseScreen — lines 27-30, 92-104.
// ───────────────────────────────────────────────────────────────────────────
describe('CourseScreen — load race + rate-limit mapping + asRecord branch arms', () => {
  it('listCourseCatalog resolves undefined → courses ?? [] yields the empty-state copy (line 27 ?? arm)', async () => {
    mockedListCourseCatalog.mockResolvedValue(undefined as unknown as CourseCatalogItem[]);
    const navigation = navigationFor();
    render(
      <CourseScreen
        navigation={navigation as never}
        route={{ key: 'cs', name: ROUTES.CourseScreen, params: undefined } as never}
      />,
    );

    await waitFor(() => expect(screen.getByText('No courses yet')).toBeTruthy());
  });

  it('a 429 with a numeric retryAfterSeconds renders that exact value (line 92 typeof-number true arm)', async () => {
    mockedListCourseCatalog.mockRejectedValue({ status: 429, retryAfterSeconds: 12 });
    const navigation = navigationFor();
    render(
      <CourseScreen
        navigation={navigation as never}
        route={{ key: 'cs', name: ROUTES.CourseScreen, params: undefined } as never}
      />,
    );

    await waitFor(() => expect(screen.getByText('Course refresh limited')).toBeTruthy());
    expect(screen.getByText('Try again in 12 seconds.')).toBeTruthy();
  });

  it('a RATE_LIMIT_EXCEEDED code WITHOUT a numeric retryAfterSeconds defaults to 45 (line 92 false arm)', async () => {
    // code arm of the OR + retryAfterSeconds is a string → typeof !== 'number' → 45.
    mockedListCourseCatalog.mockRejectedValue({ code: 'RATE_LIMIT_EXCEEDED', retryAfterSeconds: 'soon' });
    const navigation = navigationFor();
    render(
      <CourseScreen
        navigation={navigation as never}
        route={{ key: 'cs', name: ROUTES.CourseScreen, params: undefined } as never}
      />,
    );

    await waitFor(() => expect(screen.getByText('Course refresh limited')).toBeTruthy());
    expect(screen.getByText('Try again in 45 seconds.')).toBeTruthy();

    // The retryLabel arm is present → the Retry CTA re-runs load() (lines 48-57).
    mockedListCourseCatalog.mockResolvedValue([
      { id: 'cat-9', title: 'Recovered', language: 'en', levelCount: 1, lessonCount: 3, locked: false, progress: 0 },
    ]);
    fireEvent.press(screen.getByText('Retry'));
    await waitFor(() => expect(screen.getByText('Recovered')).toBeTruthy());
  });

  it('a non-object rejection hits asRecord short-circuit (line 103) → generic "Courses unavailable"', async () => {
    mockedListCourseCatalog.mockRejectedValue(42);
    const navigation = navigationFor();
    render(
      <CourseScreen
        navigation={navigation as never}
        route={{ key: 'cs', name: ROUTES.CourseScreen, params: undefined } as never}
      />,
    );

    await waitFor(() => expect(screen.getByText('Courses unavailable')).toBeTruthy());
  });

  it('unmount before listCourseCatalog resolves: the then-guard drops setState (line 27 active=false arm)', async () => {
    let resolveCat!: (v: CourseCatalogItem[]) => void;
    mockedListCourseCatalog.mockReturnValue(
      new Promise<CourseCatalogItem[]>((r) => {
        resolveCat = r;
      }),
    );
    const navigation = navigationFor();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = render(
      <CourseScreen
        navigation={navigation as never}
        route={{ key: 'cs', name: ROUTES.CourseScreen, params: undefined } as never}
      />,
    );

    await waitFor(() => expect(mockedListCourseCatalog).toHaveBeenCalled());
    unmount();
    await act(async () => {
      resolveCat([]);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(
      errorSpy.mock.calls.some((c) => String(c[0]).includes("can't perform a React state update")),
    ).toBe(false);
    errorSpy.mockRestore();
  });

  it('unmount before listCourseCatalog REJECTS: the catch-guard drops the error setState (line 30 active=false arm)', async () => {
    let rejectCat!: (e: unknown) => void;
    mockedListCourseCatalog.mockReturnValue(
      new Promise<CourseCatalogItem[]>((_, rej) => {
        rejectCat = rej;
      }),
    );
    const navigation = navigationFor();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = render(
      <CourseScreen
        navigation={navigation as never}
        route={{ key: 'cs', name: ROUTES.CourseScreen, params: undefined } as never}
      />,
    );

    await waitFor(() => expect(mockedListCourseCatalog).toHaveBeenCalled());
    unmount();
    await act(async () => {
      rejectCat(new Error('catalog down after unmount'));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(
      errorSpy.mock.calls.some((c) => String(c[0]).includes("can't perform a React state update")),
    ).toBe(false);
    errorSpy.mockRestore();
  });
});

// ───────────────────────────────────────────────────────────────────────────
// LessonListScreen — lines 36-39, 109.
// ───────────────────────────────────────────────────────────────────────────
describe('LessonListScreen — load race + asRecord short-circuit branch arms', () => {
  it('getLessonList resolves undefined → lessons ?? [] yields the empty-state copy (line 36 ?? arm)', async () => {
    mockedGetLessonList.mockResolvedValue(undefined as unknown as LessonDetail[]);
    const navigation = navigationFor();
    render(
      <LessonListScreen
        navigation={navigation as never}
        route={{ key: 'll', name: ROUTES.LessonListScreen, params: { unitId: 'u-1' } } as never}
      />,
    );

    await waitFor(() => expect(screen.getByText('No lessons ready yet')).toBeTruthy());
  });

  it('a non-object rejection hits asRecord short-circuit (line 109) → generic "Lessons unavailable"', async () => {
    mockedGetLessonList.mockRejectedValue('string-error');
    const navigation = navigationFor();
    render(
      <LessonListScreen
        navigation={navigation as never}
        route={{ key: 'll', name: ROUTES.LessonListScreen, params: { unitId: 'u-1' } } as never}
      />,
    );

    await waitFor(() => expect(screen.getByText('Lessons unavailable')).toBeTruthy());
  });

  it('a 410 LESSON_GONE object renders the changed-list copy with detail (line 98-104 arm)', async () => {
    mockedGetLessonList.mockRejectedValue({ status: 410 });
    const navigation = navigationFor();
    render(
      <LessonListScreen
        navigation={navigation as never}
        route={{ key: 'll', name: ROUTES.LessonListScreen, params: { unitId: 'u-1' } } as never}
      />,
    );

    await waitFor(() => expect(screen.getByText('Lesson list changed')).toBeTruthy());
    expect(screen.getByText('Refresh to continue with the latest state.')).toBeTruthy();
  });

  it('unmount before getLessonList resolves: the then-guard drops setState (line 36 active=false arm)', async () => {
    let resolveLessons!: (v: LessonDetail[]) => void;
    mockedGetLessonList.mockReturnValue(
      new Promise<LessonDetail[]>((r) => {
        resolveLessons = r;
      }),
    );
    const navigation = navigationFor();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = render(
      <LessonListScreen
        navigation={navigation as never}
        route={{ key: 'll', name: ROUTES.LessonListScreen, params: { unitId: 'u-1' } } as never}
      />,
    );

    await waitFor(() => expect(mockedGetLessonList).toHaveBeenCalled());
    unmount();
    await act(async () => {
      resolveLessons([]);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(
      errorSpy.mock.calls.some((c) => String(c[0]).includes("can't perform a React state update")),
    ).toBe(false);
    errorSpy.mockRestore();
  });

  it('unmount before getLessonList REJECTS: the catch-guard drops the error setState (line 39 active=false arm)', async () => {
    let rejectLessons!: (e: unknown) => void;
    mockedGetLessonList.mockReturnValue(
      new Promise<LessonDetail[]>((_, rej) => {
        rejectLessons = rej;
      }),
    );
    const navigation = navigationFor();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = render(
      <LessonListScreen
        navigation={navigation as never}
        route={{ key: 'll', name: ROUTES.LessonListScreen, params: { unitId: 'u-1' } } as never}
      />,
    );

    await waitFor(() => expect(mockedGetLessonList).toHaveBeenCalled());
    unmount();
    await act(async () => {
      rejectLessons(new Error('lessons down after unmount'));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(
      errorSpy.mock.calls.some((c) => String(c[0]).includes("can't perform a React state update")),
    ).toBe(false);
    errorSpy.mockRestore();
  });
});
