export type { Order, OrderParams } from './purchase.api';
export { createOrder, getOrder } from './purchase.api';
export { pushCourseToDevice } from './device.api';
import client from '@/services/http/client';
import { attachRequestIdHeader } from '@/services/http/idempotency';
import { backendContractUnavailable } from './undocumented-api-routes';

export interface LibraryItem {
  courseId: string;
  title: string;
  language: string;
  price: number;
  owned: boolean;
  syncedToDevice: boolean;
  locked?: boolean;
}

export interface CourseDetail {
  courseId: string;
  title: string;
  description: string;
  levelCount: number;
  lessonCount: number;
  previewUrl: string | null;
}

export interface RobotSyncStatus {
  courseId: string;
  synced: boolean;
  lastSyncAt: string | null;
}

function pickEnvelope<T>(payload: unknown): T | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const obj = payload as Record<string, unknown>;
  if ('data' in obj && obj.data && typeof obj.data === 'object') return obj.data as T;
  return obj as T;
}

export function normalizeCourseLibraryPayload(payload: unknown): LibraryItem[] {
  const envelope = pickEnvelope<{ courses?: unknown[] }>(payload);
  const rawList: unknown[] = Array.isArray(envelope)
    ? envelope
    : Array.isArray(envelope?.courses)
      ? envelope!.courses
      : [];

  return rawList.map((raw) => {
    const r = (raw ?? {}) as Record<string, unknown>;
    return {
      courseId: (r.course_id ?? r.courseId ?? r.id ?? '') as string,
      title: (r.title ?? r.name ?? '') as string,
      language: (r.language ?? 'en') as string,
      price: 0,
      owned: true,
      syncedToDevice: Boolean(r.synced_to_device ?? r.syncedToDevice ?? r.synced ?? false),
      locked: false,
    };
  });
}

export function normalizeCourseLibraryDetailPayload(payload: unknown): CourseDetail {
  const envelope = pickEnvelope<{ course?: unknown }>(payload);
  const raw =
    envelope && typeof envelope === 'object' && 'course' in (envelope as Record<string, unknown>)
      ? ((envelope as Record<string, unknown>).course as Record<string, unknown>)
      : ((envelope ?? {}) as Record<string, unknown>);
  return {
    courseId: (raw.course_id ?? raw.courseId ?? raw.id ?? '') as string,
    title: (raw.title ?? raw.name ?? '') as string,
    description: (raw.description ?? '') as string,
    levelCount: Number(raw.level_count ?? raw.levelCount ?? 0),
    lessonCount: Number(raw.lesson_count ?? raw.lessonCount ?? 0),
    previewUrl: (raw.preview_url ?? raw.previewUrl ?? null) as string | null,
  };
}

export function normalizeRobotSyncStatusPayload(payload: unknown): RobotSyncStatus {
  const raw = pickEnvelope<Record<string, unknown>>(payload) ?? {};
  return {
    courseId: (raw.course_id ?? raw.courseId ?? '') as string,
    synced: Boolean(raw.synced ?? false),
    lastSyncAt: (raw.last_sync_at ?? raw.lastSyncAt ?? null) as string | null,
  };
}

export async function listLibrary(): Promise<LibraryItem[]> {
  const response = await client.get('/course-library');
  return normalizeCourseLibraryPayload(response.data);
}

export async function getCourseDetail(courseId: string): Promise<CourseDetail> {
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
  const payload = { device_id: deviceId, child_id: childId };
  const headers = requestId ? attachRequestIdHeader({}, requestId) : undefined;
  if (headers) {
    await client.post(url, payload, { headers });
  } else {
    await client.post(url, payload);
  }
}

export async function getRobotSyncStatus(courseId: string): Promise<RobotSyncStatus> {
  const response = await client.get(`/course-library/${courseId}/sync-status`);
  return normalizeRobotSyncStatusPayload(response.data);
}
