import type { Child, Household, User } from '@/types';
import type { LibraryItem, CourseDetail, PublishedCourse, PublishedLesson } from '@/services/api/course-library.api';
import type { DeviceStatus } from '@/services/api/device.api';
import type { AssignmentProgress, ChildProgress } from '@/services/api/progress.api';
import type { ChildProfile, KPIs, PronunciationTrend } from '@/services/api/learning';

export const INVESTOR_DEMO_USER: User = {
  id: 'investor-demo-parent',
  email: 'investor-demo@teebot.local',
  name: 'Investor Demo Parent',
};

export const INVESTOR_DEMO_HOUSEHOLD: Household = {
  id: 'investor-demo-household',
  name: 'Demo Family',
  owner_id: INVESTOR_DEMO_USER.id,
  created_at: '2026-06-20T00:00:00.000Z',
};

export const INVESTOR_DEMO_CHILD: Child = {
  id: 'investor-demo-child',
  household_id: INVESTOR_DEMO_HOUSEHOLD.id,
  name: 'Minh',
  birth_year: 2020,
  age_gate_passed: true,
  created_at: '2026-06-20T00:00:00.000Z',
  vocabulary_level: 'beginner',
  learning_style: 'interactive',
};

export const INVESTOR_DEMO_DEVICE: DeviceStatus = {
  id: 'investor-demo-robot',
  name: 'TeeBot Demo',
  serialNumber: 'TBOT-DEMO-0001',
  online: true,
  batteryPercent: 86,
  charging: false,
  wifiSsid: 'Demo Wi-Fi',
  wifiRssi: -52,
  lastSeenAt: '2026-06-22T10:50:00.000Z',
  assignedChildProfileId: INVESTOR_DEMO_CHILD.id,
};

export const INVESTOR_DEMO_LIBRARY: readonly LibraryItem[] = [
  {
    courseId: 'c_barn',
    title: 'Barn Friends',
    language: 'en',
    price: 0,
    owned: true,
    syncedToDevice: true,
    locked: false,
  },
  {
    courseId: 'c_space',
    title: 'Space Adventure',
    language: 'en',
    price: 0,
    owned: true,
    syncedToDevice: false,
    locked: false,
  },
  {
    courseId: 'c_robot',
    title: 'Robot Helpers',
    language: 'en',
    price: 0,
    owned: true,
    syncedToDevice: false,
    locked: false,
  },
];

export const INVESTOR_DEMO_COURSE_DETAILS: readonly CourseDetail[] = [
  {
    courseId: 'c_barn',
    title: 'Barn Friends',
    description: 'Gentle animal words, listening turns, and short repeat-after-me practice.',
    levelCount: 2,
    lessonCount: 6,
    previewUrl: null,
  },
  {
    courseId: 'c_space',
    title: 'Space Adventure',
    description: 'Simple space words with high-energy call-and-response moments.',
    levelCount: 2,
    lessonCount: 5,
    previewUrl: null,
  },
  {
    courseId: 'c_robot',
    title: 'Robot Helpers',
    description: 'Friendly verbs and classroom commands for daily Robot play.',
    levelCount: 1,
    lessonCount: 4,
    previewUrl: null,
  },
];

export const INVESTOR_DEMO_PUBLISHED_COURSES: readonly PublishedCourse[] = [
  { courseId: 'c_barn', title: 'Barn Friends', lessonCount: 2 },
  { courseId: 'c_space', title: 'Space Adventure', lessonCount: 2 },
  { courseId: 'c_robot', title: 'Robot Helpers', lessonCount: 1 },
];

export const INVESTOR_DEMO_PUBLISHED_LESSONS: Readonly<Record<string, readonly PublishedLesson[]>> = {
  c_barn: [
    {
      lessonId: 'demo-barn-animals',
      lessonVersion: 1,
      lessonType: 'lesson',
      title: 'Barn Animals Say Hello',
      profile: 'espTft',
      manifestReady: true,
      topicTags: ['animals', 'speaking'],
      difficultyBand: 'beginner',
      estimatedDurationSec: 240,
      monitorable: true,
      personalization: {
        rank: 1,
        reasonCode: 'interest_match',
        matchedTopics: ['animals'],
      },
    },
    {
      lessonId: 'demo-barn-colors',
      lessonVersion: 1,
      lessonType: 'lesson',
      title: 'Colors Around the Barn',
      profile: 'espTft',
      manifestReady: true,
      topicTags: ['colors', 'animals'],
      difficultyBand: 'beginner',
      estimatedDurationSec: 210,
      monitorable: true,
      personalization: {
        rank: 2,
        reasonCode: 'neutral_order',
        matchedTopics: [],
      },
    },
  ],
  c_space: [
    {
      lessonId: 'demo-space-rocket',
      lessonVersion: 1,
      lessonType: 'lesson',
      title: 'Rocket Words',
      profile: 'espTft',
      manifestReady: true,
      topicTags: ['space', 'movement'],
      difficultyBand: 'beginner',
      estimatedDurationSec: 230,
      monitorable: true,
    },
    {
      lessonId: 'demo-space-stars',
      lessonVersion: 1,
      lessonType: 'lesson',
      title: 'Stars and Counting',
      profile: 'espTft',
      manifestReady: true,
      topicTags: ['space', 'numbers'],
      difficultyBand: 'beginner',
      estimatedDurationSec: 220,
      monitorable: true,
    },
  ],
  c_robot: [
    {
      lessonId: 'demo-robot-helpers',
      lessonVersion: 1,
      lessonType: 'lesson',
      title: 'Robot Helpers',
      profile: 'espTft',
      manifestReady: true,
      topicTags: ['routines', 'commands'],
      difficultyBand: 'beginner',
      estimatedDurationSec: 200,
      monitorable: true,
    },
  ],
};

export const INVESTOR_DEMO_CHILD_PROGRESS: ChildProgress = {
  childId: INVESTOR_DEMO_CHILD.id,
  lessonsCompleted: 3,
  currentStreakDays: 4,
  masteredWords: 12,
  byCourse: [
    { courseId: 'c_barn', lessonsCompleted: 2, lessonsTotal: 6 },
    { courseId: 'c_space', lessonsCompleted: 1, lessonsTotal: 5 },
  ],
};

export const INVESTOR_DEMO_ASSIGNMENTS: readonly AssignmentProgress[] = [
  {
    assignmentId: 'demo-assignment-ready',
    deviceId: INVESTOR_DEMO_DEVICE.id,
    childId: INVESTOR_DEMO_CHILD.id,
    lessonId: 'demo-barn-animals',
    lessonVersion: 1,
    lessonTitle: 'Barn Animals Say Hello',
    profile: 'espTft',
    state: 'READY',
    startedAt: null,
    completedAt: null,
    stepsCompleted: 0,
    stepsSucceeded: 0,
    lastEventAt: '2026-06-22T10:48:00.000Z',
    createdAt: '2026-06-22T10:45:00.000Z',
    updatedAt: '2026-06-22T10:48:00.000Z',
  },
  {
    assignmentId: 'demo-assignment-complete',
    deviceId: INVESTOR_DEMO_DEVICE.id,
    childId: INVESTOR_DEMO_CHILD.id,
    lessonId: 'demo-space-rocket',
    lessonVersion: 1,
    lessonTitle: 'Rocket Words',
    profile: 'espTft',
    state: 'COMPLETED',
    startedAt: '2026-06-21T09:00:00.000Z',
    completedAt: '2026-06-21T09:04:00.000Z',
    stepsCompleted: 6,
    stepsSucceeded: 5,
    lastEventAt: '2026-06-21T09:04:00.000Z',
    createdAt: '2026-06-21T08:55:00.000Z',
    updatedAt: '2026-06-21T09:04:00.000Z',
  },
];

export const INVESTOR_DEMO_CHILD_PROFILE: ChildProfile = {
  id: INVESTOR_DEMO_CHILD.id,
  name: INVESTOR_DEMO_CHILD.name,
  vocabulary_level: 'beginner',
  speaking_confidence: 72,
  listening_score: 78,
  interests: ['animals', 'space', 'robots'],
  attention_span_seconds: 420,
  learning_style: 'interactive',
  parent_career: null,
};

export const INVESTOR_DEMO_KPIS: KPIs = {
  vocab_words_this_week: 18,
  speaking_confidence: 72,
  engagement_score: 84,
  retention_rate: 78,
  sessions_this_week: 4,
  daily_streak: 4,
  weak_words: ['yellow', 'rocket'],
};

export const INVESTOR_DEMO_PRONUNCIATION_TREND: PronunciationTrend = {
  avg_score: 74,
  trend: 'improving',
  points: [
    { date: '2026-06-16', score: 62 },
    { date: '2026-06-17', score: 66 },
    { date: '2026-06-18', score: 70 },
    { date: '2026-06-19', score: 71 },
    { date: '2026-06-20', score: 75 },
    { date: '2026-06-21', score: 77 },
    { date: '2026-06-22', score: 80 },
  ],
};
