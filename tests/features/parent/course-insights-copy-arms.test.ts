/**
 * Additive coverage for the `courseInsights.ts` copy/label branch arms left
 * uncovered by `course-insights.test.ts` (which only exercises the
 * `personality_match` arm of `lessonFitCopy` and never imports `qualityLabel`).
 *
 * Mirrors the neighboring `course-insights.test.ts` fixtures/style. Asserts the
 * REAL rendered copy strings (not just "is truthy"), so each branch is pinned
 * to its exact output. The matched-topics-join and rank-fallback arms are
 * distinguished by asserting the full `·`-joined string.
 *
 * Reachable gaps closed (per docs/qa/learning-flow-e2e-coverage.md §4.E):
 *   - lessonFitCopy L70  → `interest_match` + matched topics
 *   - lessonFitCopy L73-74 → rank-only fallback (no reason/topic match)
 *   - qualityLabel L83-86 → all four label thresholds
 */

import {
  buildCourseInsightDashboard,
  lessonFitCopy,
  qualityLabel,
} from '@/features/parent/courseInsights';
import type { ChildProgress } from '@/services/api/progress.api';
import type { PublishedLesson } from '@/services/api/course-library.api';

function lesson(overrides: Partial<PublishedLesson> = {}): PublishedLesson {
  return {
    lessonId: 'lesson-1',
    lessonVersion: 1,
    lessonType: 'lesson',
    title: 'Animal Jobs',
    profile: 'espTft',
    manifestReady: true,
    topicTags: ['animals', 'engineer'],
    difficultyBand: 'beginner',
    estimatedDurationSec: 150,
    monitorable: true,
    ...overrides,
  };
}

describe('lessonFitCopy — personalization-reason copy arms', () => {
  it('interest_match with matched topics → "Interest match: …" lead (L70)', () => {
    const copy = lessonFitCopy(
      lesson({
        personalization: {
          rank: 3,
          reasonCode: 'interest_match',
          matchedTopics: ['dinosaurs', 'space'],
        },
      }),
    );
    // Leads with the interest-match phrase, then the band, then minutes.
    expect(copy).toBe('Interest match: dinosaurs, space · beginner · 3 min');
  });

  it('rank-only fallback when reasonCode does not match a copy arm (L73-74)', () => {
    // neutral_order has no dedicated copy arm, so the rank fallback fires.
    const copy = lessonFitCopy(
      lesson({
        difficultyBand: undefined,
        estimatedDurationSec: undefined,
        topicTags: [],
        personalization: {
          rank: 2,
          reasonCode: 'neutral_order',
          matchedTopics: [],
        },
      }),
    );
    expect(copy).toBe('Personalized rank #2');
  });

  it('interest_match with EMPTY matched topics falls through to the rank arm (L73-74 guard)', () => {
    // reasonCode matches but matches.length === 0, so the L69 guard is false
    // and execution falls to the `else if (rank)` arm — proves the `&& matches.length`
    // guard is load-bearing, not redundant.
    const copy = lessonFitCopy(
      lesson({
        difficultyBand: undefined,
        estimatedDurationSec: undefined,
        topicTags: [],
        personalization: {
          rank: 5,
          reasonCode: 'interest_match',
          matchedTopics: [],
        },
      }),
    );
    expect(copy).toBe('Personalized rank #5');
  });

  it('no personalization → falls back to topic tags (parts.length === 0 arm, L78)', () => {
    const copy = lessonFitCopy(
      lesson({
        difficultyBand: undefined,
        estimatedDurationSec: undefined,
        personalization: undefined,
        topicTags: ['a', 'b', 'c', 'd'],
      }),
    );
    // Only the first 3 topic tags are surfaced when nothing else qualifies.
    expect(copy).toBe('a, b, c');
  });
});

describe('buildCourseInsightDashboard — coursePath percent guard (L42)', () => {
  it('a course with lessonsTotal === 0 yields percent 0 (no divide-by-zero)', () => {
    const progress: ChildProgress = {
      childId: 'c1',
      lessonsCompleted: 0,
      currentStreakDays: 0,
      masteredWords: 0,
      byCourse: [
        // lessonsTotal 0 → the `> 0 ? … : 0` else-arm (L42) fires.
        { courseId: 'empty', lessonsCompleted: 0, lessonsTotal: 0 },
        // a normal course to prove the truthy arm still computes alongside it.
        { courseId: 'animals', lessonsCompleted: 1, lessonsTotal: 4 },
      ],
    };
    const dashboard = buildCourseInsightDashboard({ progress });
    const empty = dashboard.coursePath.find((c) => c.courseId === 'empty');
    const animals = dashboard.coursePath.find((c) => c.courseId === 'animals');
    expect(empty?.percent).toBe(0);
    expect(animals?.percent).toBe(25);
    // strongestCourse is the higher-percent course; nextCourse skips the
    // 0/0 course (lessonsCompleted < lessonsTotal is false: 0 < 0 === false).
    expect(dashboard.strongestCourse?.courseId).toBe('animals');
    expect(dashboard.nextCourse?.courseId).toBe('animals');
  });
});

describe('qualityLabel — threshold copy arms (L83-86)', () => {
  it.each([
    { percent: 100, label: 'Strong' },
    { percent: 85, label: 'Strong' },
    { percent: 84, label: 'Needs attention' },
    { percent: 60, label: 'Needs attention' },
    { percent: 59, label: 'At risk' },
    { percent: 1, label: 'At risk' },
    { percent: 0, label: 'No data' },
  ])('percent=$percent → "$label"', ({ percent, label }) => {
    expect(qualityLabel(percent)).toBe(label);
  });
});
