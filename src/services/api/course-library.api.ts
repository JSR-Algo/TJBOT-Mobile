export type { Order, OrderParams } from './purchase.api';
export { createOrder, getOrder } from './purchase.api';
export { pushCourseToDevice } from './device.api';
import client from '@/services/http/client';
import { attachRequestIdHeader } from '@/services/http/idempotency';
import { backendContractUnavailable } from './undocumented-api-routes';
import { isInvestorDemoEnabled } from '@/config/investorDemo';
import {
  INVESTOR_DEMO_ASSIGNMENTS,
  INVESTOR_DEMO_CHILD,
  INVESTOR_DEMO_COURSE_DETAILS,
  INVESTOR_DEMO_DEVICE,
  INVESTOR_DEMO_LIBRARY,
  INVESTOR_DEMO_PUBLISHED_COURSES,
  INVESTOR_DEMO_PUBLISHED_LESSONS,
} from '@/demo/investorDemoSeed';
import {
  normalizeCourseLibraryDetailPayload,
  normalizeCourseLibraryPayload,
  normalizeRobotSyncStatusPayload,
} from './course-library-normalization';
import type {
  CourseDetail,
  LibraryItem,
  RobotSyncStatus,
} from './course-library-normalization';
export type { CourseDetail, LibraryItem, RobotSyncStatus } from './course-library-normalization';
export {
  normalizeCourseLibraryDetailPayload,
  normalizeCourseLibraryPayload,
  normalizeRobotSyncStatusPayload,
} from './course-library-normalization';

function pickEnvelope<T>(payload: unknown): T | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const obj = payload as Record<string, unknown>;
  if ('data' in obj && obj.data && typeof obj.data === 'object') return obj.data as T;
  return obj as T;
}

function cloneLibraryItems(items: readonly LibraryItem[]): LibraryItem[] {
  return items.map((item) => ({ ...item }));
}

function clonePublishedCourses(courses: readonly PublishedCourse[]): PublishedCourse[] {
  return courses.map((course) => ({ ...course }));
}

function clonePublishedLessons(lessons: readonly PublishedLesson[]): PublishedLesson[] {
  return lessons.map((lesson) => ({
    ...lesson,
    topicTags: lesson.topicTags ? [...lesson.topicTags] : undefined,
    personalization: lesson.personalization
      ? {
          ...lesson.personalization,
          matchedTopics: [...lesson.personalization.matchedTopics],
        }
      : undefined,
  }));
}

export async function listLibrary(): Promise<LibraryItem[]> {
  if (isInvestorDemoEnabled()) {
    return cloneLibraryItems(INVESTOR_DEMO_LIBRARY);
  }
  const response = await client.get('/course-library');
  return normalizeCourseLibraryPayload(response.data);
}

export async function getCourseDetail(courseId: string): Promise<CourseDetail> {
  if (isInvestorDemoEnabled()) {
    const detail = INVESTOR_DEMO_COURSE_DETAILS.find((course) => course.courseId === courseId);
    if (detail) return { ...detail };
  }
  const response = await client.get(`/course-library/${courseId}`);
  return normalizeCourseLibraryDetailPayload(response.data);
}

export async function purchaseCourse(_courseId: string): Promise<void> {
  backendContractUnavailable(`purchaseCourse:${_courseId}`);
}

export async function unlockCourse(courseId: string, requestId?: string): Promise<void> {
  const url = `/course-library/${courseId}/unlock`;
  const headers = requestId ? attachRequestIdHeader({}, requestId) : undefined;
  if (headers) {
    await client.post(url, {}, { headers });
  } else {
    await client.post(url, {});
  }
}

// Contract breadcrumb: paired with backend/src/course-library/dto/course-library.dto.ts SendToRobotDto; verified by original-app/TJBOT-Mobile/tests/api/course-library-normalization.test.ts and backend/tests/course-library.integration.spec.ts. Update both when this shape changes.
export async function sendCourseToRobot(
  courseId: string,
  deviceId: string,
  childId: string,
  requestId?: string,
): Promise<void> {
  const url = `/course-library/${courseId}/send-to-robot`;
  // Nest ValidationPipe expects camelCase SendToRobotDto fields.
  const payload = { deviceId, childId };
  const headers = requestId ? attachRequestIdHeader({}, requestId) : undefined;
  if (headers) {
    await client.post(url, payload, { headers });
  } else {
    await client.post(url, payload);
  }
}

export async function getRobotSyncStatus(courseId: string): Promise<RobotSyncStatus> {
  if (isInvestorDemoEnabled()) {
    const libraryItem = INVESTOR_DEMO_LIBRARY.find((course) => course.courseId === courseId);
    return {
      courseId,
      synced: Boolean(libraryItem?.syncedToDevice),
      lastSyncAt: libraryItem?.syncedToDevice ? '2026-06-22T10:48:00.000Z' : null,
    };
  }
  const response = await client.get(`/course-library/${courseId}/sync-status`);
  return normalizeRobotSyncStatusPayload(response.data);
}

// ───────────────────────────────────────────────────────────────────────────
// P4 — authored published catalog endpoints behind the parent AuthGuard.
// The mobile World Map reads these published courses and lessons. Assignment
// APIs remain available for Robot/backend clients even though phone dispatch UI
// is intentionally absent.
//
//   GET /courses                 → [{ courseId, title, lessonCount }]
//   GET /courses/{courseId}/lessons → [{ lessonId, lessonVersion (NUMBER),
//                                        title, profile, manifestReady }]
//
// Paths are BARE (baseURL already carries /v1 via ensureV1 — DIV-MOBILE-PREFIX).
// `lessonVersion` is a JSON NUMBER on the wire (D-LV) — it flows straight into
// createAssignment, which keys the (deviceId, lessonId, childId) idempotency
// triple. `manifestReady` is advisory; the READY gate stays server-authoritative
// (preload-status), never this flag.
// ───────────────────────────────────────────────────────────────────────────

export interface PublishedCourse {
  courseId: string;
  title: string;
  lessonCount: number;
}

export interface PublishedLesson {
  lessonId: string;
  lessonVersion: number; // NUMBER (D-LV)
  lessonType?: 'lesson';
  title: string;
  profile: string | null;
  manifestReady: boolean;
  topicTags?: string[];
  difficultyBand?: string | null;
  estimatedDurationSec?: number | null;
  monitorable?: boolean;
  personalization?: {
    rank: number;
    reasonCode: 'interest_match' | 'personality_match' | 'neutral_order';
    matchedTopics: string[];
  };
}

type PublishedLessonPersonalization = NonNullable<PublishedLesson['personalization']>;

export interface GetCourseLessonsOptions {
  childId?: string;
}

export function normalizePublishedCoursesPayload(payload: unknown): PublishedCourse[] {
  const envelope = pickEnvelope<{ courses?: unknown[] }>(payload);
  const rawList: unknown[] = Array.isArray(envelope)
    ? envelope
    : Array.isArray(envelope?.courses)
      ? envelope!.courses
      : [];

  return rawList.map((raw) => {
    const r = asRecord(raw);
    return {
      courseId: (r.course_id ?? r.courseId ?? r.id ?? '') as string,
      title: (r.title ?? r.name ?? '') as string,
      lessonCount: Number(r.lesson_count ?? r.lessonCount ?? 0),
    };
  });
}

export function normalizePublishedLessonsPayload(payload: unknown): PublishedLesson[] {
  const envelope = pickEnvelope<{ lessons?: unknown[] }>(payload);
  const rawList: unknown[] = Array.isArray(envelope)
    ? envelope
    : Array.isArray(envelope?.lessons)
      ? envelope!.lessons
      : [];

  return rawList.map((raw) => {
    const r = asRecord(raw);
    const personalizationRaw = asRecord(r.personalization);
    const matchedTopicsRaw = personalizationRaw.matchedTopics ?? personalizationRaw.matched_topics;
    const matchedTopics = Array.isArray(matchedTopicsRaw)
      ? matchedTopicsRaw.filter((topic): topic is string => typeof topic === 'string')
      : [];
    const rawReasonCode = personalizationRaw.reasonCode ?? personalizationRaw.reason_code;
    const reasonCode: PublishedLessonPersonalization['reasonCode'] | null = rawReasonCode === 'interest_match' || rawReasonCode === 'personality_match' || rawReasonCode === 'neutral_order'
      ? rawReasonCode
      : null;
    const personalization: PublishedLesson['personalization'] = reasonCode
      ? {
          rank: Number(personalizationRaw.rank ?? 0),
          reasonCode,
          matchedTopics,
        }
      : undefined;
    return {
      lessonId: (r.lesson_id ?? r.lessonId ?? r.id ?? '') as string,
      lessonVersion: Number(r.lesson_version ?? r.lessonVersion ?? 0), // NUMBER (D-LV)
      title: (r.title ?? r.name ?? '') as string,
      // Keep null when the published lesson has no bundle (manifestReady=false);
      // do NOT fabricate 'espTft' — a null-profile lesson is not renderable/sendable.
      profile: (r.profile ?? null) as string | null,
      manifestReady: Boolean(r.manifest_ready ?? r.manifestReady ?? false),
      ...normalizeLessonFilterMetadata(r),
      ...(personalization ? { personalization } : {}),
    };
  });
}

function normalizeLessonFilterMetadata(r: Record<string, unknown>): Pick<PublishedLesson, 'lessonType' | 'topicTags' | 'difficultyBand' | 'estimatedDurationSec' | 'monitorable'> {
  const metadata: Pick<PublishedLesson, 'lessonType' | 'topicTags' | 'difficultyBand' | 'estimatedDurationSec' | 'monitorable'> = {};
  const lessonType = r.lesson_type ?? r.lessonType;
  if (lessonType === 'lesson') metadata.lessonType = 'lesson';

  const topicTagsRaw = r.topic_tags ?? r.topicTags;
  if (Array.isArray(topicTagsRaw)) {
    metadata.topicTags = topicTagsRaw.filter((topic): topic is string => typeof topic === 'string');
  }

  if ('difficulty_band' in r || 'difficultyBand' in r) {
    const difficultyBand = r.difficulty_band ?? r.difficultyBand;
    metadata.difficultyBand = typeof difficultyBand === 'string' ? difficultyBand : null;
  }

  if ('estimated_duration_sec' in r || 'estimatedDurationSec' in r) {
    const estimatedDurationSec = Number(r.estimated_duration_sec ?? r.estimatedDurationSec);
    metadata.estimatedDurationSec = Number.isFinite(estimatedDurationSec) && estimatedDurationSec > 0
      ? estimatedDurationSec
      : null;
  }

  if ('monitorable' in r) metadata.monitorable = Boolean(r.monitorable);
  return metadata;
}

// Published course catalog — the parent's authored courses, AuthGuard-scoped.
export async function getCourses(): Promise<PublishedCourse[]> {
  if (isInvestorDemoEnabled()) {
    return clonePublishedCourses(INVESTOR_DEMO_PUBLISHED_COURSES);
  }
  const response = await client.get('/courses');
  return normalizePublishedCoursesPayload(response.data);
}

// Published lessons for one course, ordered as the backend returns them.
export async function getCourseLessons(courseId: string, options: GetCourseLessonsOptions = {}): Promise<PublishedLesson[]> {
  if (isInvestorDemoEnabled()) {
    const lessons = INVESTOR_DEMO_PUBLISHED_LESSONS[courseId] ?? [];
    return clonePublishedLessons(lessons);
  }
  const response = await client.get(`/courses/${courseId}/lessons`, {
    ...(options.childId ? { params: { childId: options.childId } } : {}),
  });
  return normalizePublishedLessonsPayload(response.data);
}

// ───────────────────────────────────────────────────────────────────────────
// US-006 Slice-01 (LANE-MOBILE, S11): lesson assignment + preload status reads.
//
// All paths are BARE (`/devices/{id}/...`): Config.API_BASE_URL already ends in
// `/v1` via ensureV1 (config.ts), so prefixing `/v1` here would double it
// (DIV-MOBILE-PREFIX). `lessonVersion` is a JSON NUMBER on the wire (D-LV).
// `childId` is caller-supplied (D-CHILD-RESOLUTION); household isolation is
// enforced server-side by the D-HOUSEHOLD-AUTHZ 403, not by the client.
// Live device-scoped normalizers live here (NEW per DIV-MOBILE-NORMALIZER) —
// they are NOT the aggregate progress parser (progress.api.ts).
// ───────────────────────────────────────────────────────────────────────────

export type AssignmentState =
  | 'UNASSIGNED'
  | 'ASSIGNED'
  | 'PRELOADING'
  | 'READY'
  | 'RUNNING'
  | 'COMPLETED'
  | 'PAUSED'
  | 'FAILED'
  | 'CANCELLED';

const ASSIGNMENT_STATES: readonly AssignmentState[] = [
  'UNASSIGNED', 'ASSIGNED', 'PRELOADING', 'READY', 'RUNNING', 'COMPLETED', 'PAUSED', 'FAILED', 'CANCELLED',
];

function toAssignmentState(value: unknown): AssignmentState {
  return typeof value === 'string' && (ASSIGNMENT_STATES as readonly string[]).includes(value)
    ? (value as AssignmentState)
    : 'UNASSIGNED';
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

// The backend accepts the full LESSON_PROFILES set (lesson.constants.ts):
// CreateAssignmentDto @IsIn(['espTft','piTft','mobile']). The client must pass
// the lesson's REAL profile through — collapsing every non-espTft lesson to
// 'espTft' pins the wrong asset bundle/render profile (MOB-3). Omitting it
// still defaults to 'espTft' (back-compat for the espTft-only slice).
export type LessonProfile = 'espTft' | 'piTft' | 'mobile';

const LESSON_PROFILES: readonly LessonProfile[] = ['espTft', 'piTft', 'mobile'];

// Narrow a published lesson's wire profile (string | null) to the backend's
// accepted LESSON_PROFILES set, so the screen can forward the lesson's REAL
// profile to createAssignment instead of coercing everything to 'espTft'.
export function isLessonProfile(value: string | null | undefined): value is LessonProfile {
  return typeof value === 'string' && (LESSON_PROFILES as readonly string[]).includes(value);
}

export interface CreateAssignmentParams {
  deviceId: string;
  lessonId: string;
  lessonVersion: number;
  childId: string;
  profile?: LessonProfile;
}

export interface LessonAssignment {
  assignmentId: string;
  assignmentVersion: number;
  deviceId: string;
  childId: string;
  lessonId: string;
  lessonVersion: number;
  profile: string;
  state: AssignmentState;
  createdAt: string | null;
}

export interface CurrentAssignment {
  assignmentId: string;
  assignmentVersion: number;
  lessonId: string;
  lessonTitle: string;
  lessonVersion: number;
  state: AssignmentState;
  childId: string;
  profile: string;
}

export interface PreloadAsset {
  assetId: string;
  state: string; // PENDING | DOWNLOADING | READY | FAILED | EVICTED
  checksumOk: boolean | null;
}

export interface PreloadStatus {
  assignmentId: string;
  state: AssignmentState;
  profile: string;
  criticalTotal: number;
  criticalReady: number;
  assets: PreloadAsset[];
  errorCode?: string;
}

export function normalizeAssignmentPayload(payload: unknown): LessonAssignment {
  const envelope = pickEnvelope<Record<string, unknown>>(payload) ?? {};
  const r = asRecord(envelope.assignment ?? envelope);
  return {
    assignmentId: (r.assignment_id ?? r.assignmentId ?? '') as string,
    assignmentVersion: Number(r.assignment_version ?? r.assignmentVersion ?? 0),
    deviceId: (r.device_id ?? r.deviceId ?? '') as string,
    childId: (r.child_id ?? r.childId ?? '') as string,
    lessonId: (r.lesson_id ?? r.lessonId ?? '') as string,
    lessonVersion: Number(r.lesson_version ?? r.lessonVersion ?? 0),
    profile: (r.profile ?? 'espTft') as string,
    state: toAssignmentState(r.state),
    createdAt: (r.created_at ?? r.createdAt ?? null) as string | null,
  };
}

export function normalizeCurrentAssignmentPayload(payload: unknown): CurrentAssignment | null {
  const envelope = pickEnvelope<Record<string, unknown>>(payload) ?? {};
  // §3.8: `{ data: { assignment: null } }` means no active assignment.
  if (envelope.assignment === null) return null;
  const r = asRecord(envelope.assignment ?? envelope);
  if (!r.assignment_id && !r.assignmentId) return null;
  return {
    assignmentId: (r.assignment_id ?? r.assignmentId ?? '') as string,
    assignmentVersion: Number(r.assignment_version ?? r.assignmentVersion ?? 0),
    lessonId: (r.lesson_id ?? r.lessonId ?? '') as string,
    lessonTitle: (r.lesson_title ?? r.lessonTitle ?? '') as string,
    lessonVersion: Number(r.lesson_version ?? r.lessonVersion ?? 0),
    state: toAssignmentState(r.state),
    childId: (r.child_id ?? r.childId ?? '') as string,
    profile: (r.profile ?? 'espTft') as string,
  };
}

export function normalizePreloadStatusPayload(payload: unknown): PreloadStatus {
  const envelope = pickEnvelope<Record<string, unknown>>(payload) ?? {};
  const r = asRecord(envelope.preload ?? envelope);
  const assetsRaw = r.assets;
  const assets: PreloadAsset[] = Array.isArray(assetsRaw)
    ? assetsRaw.map((entry) => {
        const a = asRecord(entry);
        const checksum = a.checksum_ok ?? a.checksumOk;
        return {
          assetId: (a.asset_id ?? a.assetId ?? a.id ?? '') as string,
          state: (a.state ?? 'PENDING') as string,
          checksumOk: typeof checksum === 'boolean' ? checksum : null,
        };
      })
    : [];
  const errorCode = r.error_code ?? r.errorCode;
  return {
    assignmentId: (r.assignment_id ?? r.assignmentId ?? '') as string,
    state: toAssignmentState(r.state),
    profile: (r.profile ?? 'espTft') as string,
    criticalTotal: Number(r.critical_total ?? r.criticalTotal ?? 0),
    criticalReady: Number(r.critical_ready ?? r.criticalReady ?? 0),
    assets,
    ...(typeof errorCode === 'string' && errorCode.length > 0 ? { errorCode } : {}),
  };
}

// Advisory idempotency key, stable per (deviceId, lessonId, childId) so a retry
// of the same triple carries the same header. The server still computes the
// authoritative dedup key from the same triple (D-IDEM-SCOPE); the client value
// is advisory. The interceptor folds Idempotency-Key into X-Request-Id
// (client.ts:52), so no client-layer tweak is needed.
export function lessonAssignmentIdempotencyKey(params: Pick<CreateAssignmentParams, 'deviceId' | 'lessonId' | 'childId'>): string {
  return `lesson-assign:${params.deviceId}:${params.lessonId}:${params.childId}`;
}

// M1 — assign one lesson to one device for one child. Device-scoped bare path.
export async function createAssignment(params: CreateAssignmentParams): Promise<LessonAssignment> {
  if (
    isInvestorDemoEnabled() &&
    params.deviceId === INVESTOR_DEMO_DEVICE.id &&
    params.childId === INVESTOR_DEMO_CHILD.id
  ) {
    return {
      assignmentId: 'demo-assignment-ready',
      assignmentVersion: 1,
      deviceId: params.deviceId,
      childId: params.childId,
      lessonId: params.lessonId,
      lessonVersion: params.lessonVersion,
      profile: params.profile ?? 'espTft',
      state: 'READY',
      createdAt: '2026-06-22T10:48:00.000Z',
    };
  }
  const body = {
    lessonId: params.lessonId,
    lessonVersion: params.lessonVersion, // NUMBER (D-LV)
    childId: params.childId,
    profile: params.profile ?? 'espTft',
  };
  const response = await client.post(`/devices/${params.deviceId}/assignments`, body, {
    headers: { 'Idempotency-Key': lessonAssignmentIdempotencyKey(params) },
  });
  return normalizeAssignmentPayload(response.data);
}

// M2 — poll target. Server is the READY/timeout authority.
export async function getPreloadStatus(deviceId: string): Promise<PreloadStatus> {
  if (isInvestorDemoEnabled() && deviceId === INVESTOR_DEMO_DEVICE.id) {
    return {
      assignmentId: 'demo-assignment-ready',
      state: 'READY',
      profile: 'espTft',
      criticalTotal: 3,
      criticalReady: 3,
      assets: [
        { assetId: 'demo-face', state: 'READY', checksumOk: true },
        { assetId: 'demo-audio', state: 'READY', checksumOk: true },
        { assetId: 'demo-script', state: 'READY', checksumOk: true },
      ],
    };
  }
  const response = await client.get(`/devices/${deviceId}/preload-status`);
  return normalizePreloadStatusPayload(response.data);
}

// M2 — current (non-terminal) assignment; carries denormalized lessonTitle.
export async function getCurrentAssignment(deviceId: string): Promise<CurrentAssignment | null> {
  if (isInvestorDemoEnabled() && deviceId === INVESTOR_DEMO_DEVICE.id) {
    const assignment = INVESTOR_DEMO_ASSIGNMENTS[0];
    if (!assignment) return null;
    return {
      assignmentId: assignment.assignmentId,
      assignmentVersion: 1,
      lessonId: assignment.lessonId,
      lessonTitle: assignment.lessonTitle ?? "Today's lesson",
      lessonVersion: assignment.lessonVersion,
      state: assignment.state,
      childId: assignment.childId,
      profile: assignment.profile,
    };
  }
  const response = await client.get(`/devices/${deviceId}/assignment/current`);
  return normalizeCurrentAssignmentPayload(response.data);
}

// M2 — DIV-MOBILE-FAKEREADY kill: readiness is computed from the real server
// state, never a hardcoded literal. The server only reports READY when every
// critical asset exists AND each sha256 passes (READY RULE), so the client gate
// is exactly `state === 'READY'`.
export function isPreloadReady(preload: Pick<PreloadStatus, 'state'>): boolean {
  return preload.state === 'READY';
}

// M5 — assignment lifecycle → existing cl_* screen catalogue + CLChip state +
// parent copy. Pure mapping; drives UI state from fetched data (no schema
// change). `<robot>`/`<lesson>` are interpolation tokens (resolve with
// formatLessonCopy from utils/errors at render). FAILED copy is a fallback —
// the real copy comes from the M4 error code carried in preload errorCode.
export type CLScreenState = 'cl_send' | 'cl_robot_ready' | 'cl_running' | 'cl_complete' | 'cl_needs_sync';
export type CLChipState = 'ready' | 'completed' | 'needs_sync';

export interface AssignmentPresentation {
  clState: CLScreenState;
  chipState?: CLChipState;
  copy: string;
}

// ───────────────────────────────────────────────────────────────────────────
// Course enrollment (parent → child → course). Replaces the retired
// `/course-library/:id/unlock` stub. The backend is AuthGuard-protected and
// verifies parent ownership of childId (and, when provided, deviceId) via
// req.auth.sub — same ownership pattern as lesson-assignment.service.ts.
//
//   POST /v1/courses/:courseId/enroll  body { childId, deviceId? }
//        → { data: { enrollment, assignment } }
//   GET  /v1/children/:childId/enrollments  → { data: { enrollments: [...] } }
//
// Paths are BARE — baseURL already carries /v1 via ensureV1 (DIV-MOBILE-PREFIX).
// `currentLessonKey` is the catalog ordering key (lessons.lesson_key ASC) the
// backend chose as the first/next lesson, NOT a lesson_id.
// ───────────────────────────────────────────────────────────────────────────

export type EnrollmentStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export interface Enrollment {
  id: string;
  childId: string;
  courseId: string;
  deviceId: string | null;
  status: EnrollmentStatus;
  currentLessonKey: string | null;
}

export interface AssignmentRef {
  id: string;
  lessonId: string;
  lessonVersion: number; // NUMBER (D-LV) — same wire shape as createAssignment.
  state: AssignmentState;
}

const ENROLLMENT_STATUSES: readonly EnrollmentStatus[] = ['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'];

function toEnrollmentStatus(value: unknown): EnrollmentStatus {
  return typeof value === 'string' && (ENROLLMENT_STATUSES as readonly string[]).includes(value)
    ? (value as EnrollmentStatus)
    : 'ACTIVE';
}

export function normalizeEnrollmentPayload(payload: unknown): Enrollment {
  const r = asRecord(payload);
  return {
    id: (r.id ?? r.enrollment_id ?? r.enrollmentId ?? '') as string,
    childId: (r.child_id ?? r.childId ?? '') as string,
    courseId: (r.course_id ?? r.courseId ?? '') as string,
    deviceId: (r.device_id ?? r.deviceId ?? null) as string | null,
    status: toEnrollmentStatus(r.status),
    currentLessonKey: (r.current_lesson_key ?? r.currentLessonKey ?? null) as string | null,
  };
}

export function normalizeAssignmentRefPayload(payload: unknown): AssignmentRef {
  const r = asRecord(payload);
  return {
    id: (r.id ?? r.assignment_id ?? r.assignmentId ?? '') as string,
    lessonId: (r.lesson_id ?? r.lessonId ?? '') as string,
    lessonVersion: Number(r.lesson_version ?? r.lessonVersion ?? 0), // NUMBER (D-LV)
    state: toAssignmentState(r.state),
  };
}

// Enroll the given child in the course. When `deviceId` is supplied the backend
// also creates (or returns the existing) lesson assignment for the course's
// first lesson on that device, so the parent lands on a screen that can
// immediately poll the assignment. NO_DEVICE handling is the caller's job —
// the backend will surface a code like `NO_DEVICE` / `ROBOT_OFFLINE` when the
// deviceId is missing or invalid for the child.
export async function enrollCourse(
  courseId: string,
  body: { childId: string; deviceId?: string },
): Promise<{ enrollment: Enrollment; assignment: AssignmentRef }> {
  if (
    isInvestorDemoEnabled() &&
    body.childId === INVESTOR_DEMO_CHILD.id &&
    body.deviceId === INVESTOR_DEMO_DEVICE.id
  ) {
    const lesson = INVESTOR_DEMO_PUBLISHED_LESSONS[courseId]?.[0] ?? INVESTOR_DEMO_PUBLISHED_LESSONS.c_barn?.[0];
    return {
      enrollment: {
        id: `demo-enrollment-${courseId}`,
        childId: body.childId,
        courseId,
        deviceId: body.deviceId ?? null,
        status: 'ACTIVE',
        currentLessonKey: lesson?.lessonId ?? null,
      },
      assignment: {
        id: 'demo-assignment-ready',
        lessonId: lesson?.lessonId ?? 'demo-barn-animals',
        lessonVersion: lesson?.lessonVersion ?? 1,
        state: 'READY',
      },
    };
  }
  const response = await client.post(`/courses/${courseId}/enroll`, body);
  const envelope = pickEnvelope<Record<string, unknown>>(response.data) ?? {};
  return {
    enrollment: normalizeEnrollmentPayload(envelope.enrollment ?? {}),
    assignment: normalizeAssignmentRefPayload(envelope.assignment ?? {}),
  };
}

// List a child's enrollments. AuthGuard-scoped: backend verifies the caller is
// the parent of `childId` (req.auth.sub → child ownership).
export async function listChildEnrollments(childId: string): Promise<{ enrollments: Enrollment[] }> {
  if (isInvestorDemoEnabled() && childId === INVESTOR_DEMO_CHILD.id) {
    return {
      enrollments: [
        {
          id: 'demo-enrollment-c_barn',
          childId,
          courseId: 'c_barn',
          deviceId: INVESTOR_DEMO_DEVICE.id,
          status: 'ACTIVE',
          currentLessonKey: 'demo-barn-animals',
        },
      ],
    };
  }
  const response = await client.get(`/children/${childId}/enrollments`);
  const envelope = pickEnvelope<{ enrollments?: unknown[] }>(response.data) ?? {};
  const rawList: unknown[] = Array.isArray(envelope)
    ? envelope
    : Array.isArray(envelope.enrollments)
      ? envelope.enrollments
      : [];
  return { enrollments: rawList.map((raw) => normalizeEnrollmentPayload(raw)) };
}

export function presentAssignmentState(state: AssignmentState): AssignmentPresentation {
  switch (state) {
    case 'ASSIGNED':
      return { clState: 'cl_send', copy: 'Sending to <robot>…' };
    case 'PRELOADING':
      return { clState: 'cl_send', copy: 'Getting <lesson> ready… (downloading)' };
    case 'READY':
      return { clState: 'cl_robot_ready', chipState: 'ready', copy: 'Ready for today' };
    case 'RUNNING':
      return { clState: 'cl_running', copy: 'Lesson playing on <robot>' };
    case 'COMPLETED':
      return { clState: 'cl_complete', chipState: 'completed', copy: 'Finished! 🎉' };
    case 'FAILED':
      return { clState: 'cl_needs_sync', chipState: 'needs_sync', copy: 'Robot needs sync' };
    default:
      // UNASSIGNED / PAUSED / CANCELLED — transitions DEFERRED this slice.
      return { clState: 'cl_send', copy: 'Sending to <robot>…' };
  }
}
