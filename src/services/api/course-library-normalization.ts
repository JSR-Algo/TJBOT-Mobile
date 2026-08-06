export interface LibraryItem {
  courseId: string;
  title: string;
  language: string;
  price: number;
  owned: boolean;
  syncedToDevice: boolean;
  locked?: boolean;
  isFree?: boolean;
  description?: string;
  difficulty?: string;
  ageBand?: string;
  thumbnailUrl?: string;
  lessonCount?: number;
}

export interface CourseDetail {
  courseId: string;
  title: string;
  description: string;
  levelCount: number;
  lessonCount: number;
  previewUrl: string | null;
  ageBand?: string;
  difficulty?: string;
  thumbnailUrl?: string;
  locked?: boolean;
  isFree?: boolean;
  lessons?: Array<{
    id: string;
    title: string;
    order: number;
    durationSeconds: number;
  }>;
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
      ? envelope.courses
      : [];

  return rawList.map((raw) => {
    const course = (raw ?? {}) as Record<string, unknown>;
    const locked = Boolean(course.locked ?? false);
    const isFree = Boolean(course.is_free ?? course.isFree ?? !locked);
    const owned = typeof course.owned === 'boolean' ? course.owned : isFree || !locked;
    const lessonCount = course.lesson_count ?? course.lessonCount;
    const description = course.description;
    const difficulty = course.difficulty;
    const ageBand = course.age_band ?? course.ageBand;
    const thumbnailUrl = course.thumbnail_url ?? course.thumbnailUrl;
    return {
      courseId: (course.course_id ?? course.courseId ?? course.id ?? '') as string,
      title: (course.title ?? course.name ?? '') as string,
      language: (course.language ?? 'en') as string,
      price: Number(
        course.price ?? (typeof course.price_cents === 'number' ? course.price_cents / 100 : 0),
      ),
      owned,
      syncedToDevice: Boolean(
        course.synced_to_device ?? course.syncedToDevice ?? course.synced ?? false,
      ),
      locked,
      isFree,
      ...(typeof description === 'string' ? { description } : {}),
      ...(typeof difficulty === 'string' ? { difficulty } : {}),
      ...(typeof ageBand === 'string' ? { ageBand } : {}),
      ...(typeof thumbnailUrl === 'string' ? { thumbnailUrl } : {}),
      ...(lessonCount !== undefined ? { lessonCount: Number(lessonCount) } : {}),
    };
  });
}

export function normalizeCourseLibraryDetailPayload(payload: unknown): CourseDetail {
  const envelope = pickEnvelope<{ course?: unknown }>(payload);
  const raw =
    envelope && typeof envelope === 'object' && 'course' in (envelope as Record<string, unknown>)
      ? ((envelope as Record<string, unknown>).course as Record<string, unknown>)
      : ((envelope ?? {}) as Record<string, unknown>);
  const lessons = Array.isArray(raw.lessons)
    ? raw.lessons.map((entry) => {
        const lesson = (entry ?? {}) as Record<string, unknown>;
        return {
          id: (lesson.id ?? lesson.lessonId ?? '') as string,
          title: (lesson.title ?? '') as string,
          order: Number(lesson.order ?? 0),
          durationSeconds: Number(lesson.durationSeconds ?? lesson.duration_seconds ?? 0),
        };
      })
    : [];
  const thumbnailUrl = raw.thumbnail_url ?? raw.thumbnailUrl;
  return {
    courseId: (raw.course_id ?? raw.courseId ?? raw.id ?? '') as string,
    title: (raw.title ?? raw.name ?? '') as string,
    description: (raw.description ?? '') as string,
    levelCount: Number(raw.level_count ?? raw.levelCount ?? 0),
    lessonCount: Number(raw.lesson_count ?? raw.lessonCount ?? lessons.length),
    previewUrl: (raw.preview_url ?? raw.previewUrl ?? null) as string | null,
    ageBand: (raw.age_band ?? raw.ageBand) as string | undefined,
    difficulty: raw.difficulty as string | undefined,
    ...(typeof thumbnailUrl === 'string' ? { thumbnailUrl } : {}),
    ...(raw.locked !== undefined ? { locked: Boolean(raw.locked) } : {}),
    ...(raw.is_free !== undefined || raw.isFree !== undefined
      ? { isFree: Boolean(raw.is_free ?? raw.isFree) }
      : {}),
    ...(Array.isArray(raw.lessons) ? { lessons } : {}),
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
