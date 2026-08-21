#!/usr/bin/env bash
# repo: tbot-mobile
# T3.3 repro — parent progress dashboard & realtime.
#
# The probe below is written INTO the worktree at run time, so the identical test
# code executes on the pre-patch base and on the fix branch. It asserts the three
# defects this task fixed:
#   1. "Today's Progress" has no Asia/Ho_Chi_Minh day bucket — the screen's numbers
#      never reset at local midnight (no `householdDayKey`, no today totals).
#   2. Dashboard lesson totals are summed per projection ROW, so a repeated course
#      key doubles a parent's lesson counts (the recurring version-space class).
#   3. `getChildProgress` requests GET /learning/children/:childId/progress, a route
#      the backend does not implement — a guaranteed 404 on the wire.
#   4. WordsPracticedScreen renders hard-coded sample vocabulary ("Hello", "Cat",
#      "Happy", …) as if the child had practised it.
# RED on base, GREEN on the fix branch.
set -euo pipefail

CANON="$TBOT_REPRO_REPO_ROOT"
[ -e node_modules ] || ln -s "${TBOT_REPRO_DEPENDENCY_ROOT:-$CANON}/node_modules" node_modules
PROBE="tests/features/progress/t33-repro-probe.test.tsx"
cleanup() { rm -f "$PROBE"; return 0; }
trap cleanup EXIT

mkdir -p "$(dirname "$PROBE")"
cat >"$PROBE" <<'PROBE_EOF'
import React from 'react';
import { render } from '@testing-library/react-native';
import * as dashboard from '@/features/progress/hooks/useChildProgressDashboardQuery';
import * as progressApi from '@/services/api/progress.api';
import client from '@/services/http/client';
import WordsPracticedScreen from '@/features/progress/screens/WordsPracticedScreen';
import type { ParentLearningStatus } from '@/services/api/parentLearning.api';

jest.mock('@/services/http/client', () => ({ __esModule: true, default: { get: jest.fn() } }));

const status: ParentLearningStatus = {
  activeLearning: null,
  recentSessions: {
    items: [
      { childId: 'c', assignmentId: 'a', sessionId: 'yesterday', courseId: 'course-1', courseTitle: 'English', lessonId: 'l', lessonTitle: 'Farm', terminalState: 'COMPLETED', startedAt: null, completedAt: '2026-08-06T16:59:59Z', durationSec: 600, reportAvailable: true },
      { childId: 'c', assignmentId: 'a', sessionId: 'today', courseId: 'course-1', courseTitle: 'English', lessonId: 'l', lessonTitle: 'Farm', terminalState: 'COMPLETED', startedAt: null, completedAt: '2026-08-06T17:00:01Z', durationSec: 180, reportAvailable: true },
    ],
    nextCursor: null,
  },
  courseProgress: [
    { courseId: 'course-1', title: 'English', currentLessonPosition: 3, completedLessonCount: 2, totalLessonCount: 3, positionPercent: 67, suggestedNextLesson: null },
    { courseId: 'course-1', title: 'English', currentLessonPosition: 3, completedLessonCount: 2, totalLessonCount: 3, positionPercent: 67, suggestedNextLesson: null },
  ],
  projectionRevision: '104',
};

it('buckets "today" on the Asia/Ho_Chi_Minh day boundary', () => {
  expect(typeof dashboard.householdDayKey).toBe('function');
  expect(dashboard.householdDayKey('2026-08-06T16:59:59Z')).toBe('2026-08-06');
  expect(dashboard.householdDayKey('2026-08-06T17:00:00Z')).toBe('2026-08-07');

  // 00:30 local on 2026-08-07 — only the 180 s session belongs to "today".
  const built = dashboard.buildCanonicalProgressDashboard(status, undefined, Date.parse('2026-08-06T17:30:00Z'));
  expect(built.todayActiveSec).toBe(180);
  expect(built.todayLessonsCompleted).toBe(1);
});

it('counts lesson totals per course key, not per projection row', () => {
  const built = dashboard.buildCanonicalProgressDashboard(status, undefined, Date.parse('2026-08-06T17:30:00Z'));
  expect(built.completedLessons).toBe(2);
  expect(built.totalLessons).toBe(3);
});

it('never requests the unimplemented learning/children progress route', async () => {
  await expect(progressApi.getChildProgress('child-1')).rejects.toMatchObject({ code: 'BACKEND_CONTRACT_UNAVAILABLE' });
  expect((client.get as jest.Mock)).not.toHaveBeenCalled();
});

it('does not show fabricated practised words', () => {
  const navigation = { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() };
  const screen = render(<WordsPracticedScreen navigation={navigation as never} route={{ key: 'w', name: 'WordsPracticedScreen' } as never} />);
  for (const fabricated of ['Hello', 'Cat', 'Happy', 'Friend', 'Dog']) {
    expect(screen.queryByText(fabricated)).toBeNull();
  }
  expect(screen.queryByText('These words got stronger today.')).toBeNull();
});
PROBE_EOF

# NOTE: `--selectProjects` is a yargs array option and swallows a trailing positional
# path, so the probe must be selected with an explicit --testPathPattern.
npx jest --selectProjects=unit --testPathPattern='t33-repro-probe'
