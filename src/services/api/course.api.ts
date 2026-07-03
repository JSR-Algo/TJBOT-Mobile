import client from '@/services/http/client';
import { backendContractUnavailable } from './undocumented-api-routes';

export interface Course {
  id: string;
  title: string;
  language: string;
  levelCount: number;
  lessonCount?: number;
  locked?: boolean;
  progress?: number;
}

export interface CourseCatalogItem {
  id: string;
  title: string;
  language: string;
  levelCount: number;
  lessonCount: number;
  locked: boolean;
  progress: number;
}

export interface Level {
  id: string;
  courseId: string;
  number: number;
  unitCount: number;
}

export interface Unit {
  id: string;
  levelId: string;
  title: string;
  lessonCount: number;
}

export interface LessonDetail {
  id: string;
  unitId: string;
  title: string;
  durationMinutes: number;
  wordsCount: number;
  state?: string;
  stars?: number;
}

export interface CourseDetail {
  courseId: string;
  title: string;
  description: string;
  levelCount: number;
  lessonCount: number;
  previewUrl: string | null;
  owned: boolean;
  locked: boolean;
}

export interface ReviewQueueItem {
  lessonId: string;
  dueAt: string;
}

export interface DailyMission {
  targetMinutes: number;
  lessonsRemaining: number;
  wordsToReview: number;
}

function pickEnvelope<T>(payload: unknown): T | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const obj = payload as Record<string, unknown>;
  if ('data' in obj && obj.data && typeof obj.data === 'object') return obj.data as T;
  return obj as T;
}

export function normalizeCourseCatalogPayload(payload: unknown): CourseCatalogItem[] {
  const envelope = pickEnvelope<{ courses?: unknown[] }>(payload);
  const rawList: unknown[] = Array.isArray(envelope)
    ? envelope
    : Array.isArray(envelope?.courses)
      ? envelope!.courses
      : [];
  return rawList.map((raw) => {
    const r = (raw ?? {}) as Record<string, unknown>;
    const id = (r.course_id ?? r.id ?? '') as string;
    const title = (r.title ?? r.name ?? '') as string;
    const language = (r.language ?? 'en') as string;
    const levelCount = Number(r.level_count ?? r.levelCount ?? 0);
    const lessonCount = Number(r.lessons ?? r.lesson_count ?? r.lessonCount ?? 0);
    const locked = Boolean(r.locked ?? false);
    const progress = Number(r.progress ?? 0);
    return { id, title, language, levelCount, lessonCount, locked, progress };
  });
}

export function normalizeLessonListPayload(payload: unknown): LessonDetail[] {
  const envelope = pickEnvelope<{ lesson_list?: unknown[]; lessons?: unknown[] }>(payload);
  const rawList: unknown[] = Array.isArray(envelope)
    ? envelope
    : Array.isArray(envelope?.lesson_list)
      ? envelope!.lesson_list
      : Array.isArray(envelope?.lessons)
        ? envelope!.lessons
        : [];
  return rawList.map((raw) => {
    const r = (raw ?? {}) as Record<string, unknown>;
    const id = (r.lesson_id ?? r.id ?? '') as string;
    const unitId = (r.unit_id ?? r.unitId ?? '') as string;
    const title = (r.name ?? r.title ?? '') as string;
    const estimatedDurationSec = Number(r.estimated_duration_sec ?? r.estimatedDurationSec ?? 0);
    const durationMinutes = Number(
      r.duration_minutes ??
      r.durationMinutes ??
      (estimatedDurationSec > 0 ? Math.ceil(estimatedDurationSec / 60) : 0),
    );
    const wordsCount = Number(r.words_count ?? r.wordsCount ?? 0);
    const explicitStatus = (r.status ?? r.state) as string | undefined;
    const locked = Boolean(r.locked);
    const state = explicitStatus ?? (locked ? 'locked' : 'available');
    const stars = Number(r.stars ?? 0);
    return { id, unitId, title, durationMinutes, wordsCount, state, stars };
  });
}

export function normalizeCourseDetailPayload(payload: unknown): CourseDetail {
  const envelope = pickEnvelope<{ course?: unknown }>(payload);
  const courseRaw =
    envelope && typeof envelope === 'object' && 'course' in (envelope as Record<string, unknown>)
      ? ((envelope as Record<string, unknown>).course as Record<string, unknown>)
      : ((envelope ?? {}) as Record<string, unknown>);
  const courseId = (courseRaw.course_id ?? courseRaw.id ?? '') as string;
  const title = (courseRaw.title ?? courseRaw.name ?? '') as string;
  const description = (courseRaw.description ?? '') as string;
  const levelCount = Number(courseRaw.level_count ?? courseRaw.levelCount ?? 0);
  const lessonCount = Number(courseRaw.lesson_count ?? courseRaw.lessonCount ?? 0);
  const previewUrl = (courseRaw.preview_url ?? courseRaw.previewUrl ?? null) as string | null;
  const owned = Boolean(courseRaw.owned ?? false);
  const locked = Boolean(courseRaw.locked ?? false);
  return { courseId, title, description, levelCount, lessonCount, previewUrl, owned, locked };
}

export async function listCourseCatalog(): Promise<CourseCatalogItem[]> {
  const response = await client.get('/courses');
  return normalizeCourseCatalogPayload(response.data);
}

export async function getCourse(_courseId: string): Promise<Course> {
  backendContractUnavailable(`getCourse:${_courseId}`);
}

export async function getLevel(_levelId: string): Promise<Level> {
  backendContractUnavailable(`getLevel:${_levelId}`);
}

export async function getUnit(_unitId: string): Promise<Unit> {
  backendContractUnavailable(`getUnit:${_unitId}`);
}

export async function getLessonDetail(_lessonId: string): Promise<LessonDetail> {
  backendContractUnavailable(`getLessonDetail:${_lessonId}`);
}

export async function getLessonList(courseId: string): Promise<LessonDetail[]> {
  const response = await client.get(`/courses/${courseId}/lessons`);
  return normalizeLessonListPayload(response.data).map((lesson) => ({
    ...lesson,
    unitId: lesson.unitId || courseId,
  }));
}

export async function getReviewQueue(_userId: string): Promise<ReviewQueueItem[]> {
  backendContractUnavailable(`getReviewQueue:${_userId}`);
}

export async function getDailyMission(_userId: string): Promise<DailyMission> {
  backendContractUnavailable(`getDailyMission:${_userId}`);
}
