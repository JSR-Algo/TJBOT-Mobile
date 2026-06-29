import client from '@/services/http/client';

/**
 * Thrown by learning APIs when the backend endpoint isn't deployed yet.
 * Callers should render an explicit empty/"coming soon" state instead of
 * treating the feature as silently empty.
 */
export class FeatureUnavailableError extends Error {
  readonly code = 'FEATURE_UNAVAILABLE';
  constructor(message = 'Feature not yet available') {
    super(message);
    this.name = 'FeatureUnavailableError';
  }
}

export interface ChildProfile {
  id: string;
  name: string;
  vocabulary_level: 'beginner' | 'basic' | 'intermediate' | 'advanced';
  speaking_confidence: number;
  listening_score: number;
  interests: string[];
  attention_span_seconds: number;
  learning_style: 'visual' | 'audio' | 'interactive';
  parent_career?: string | null;
}

export interface LearningSession {
  id: string;
  session_date: string;
  session_payload: {
    warmup: { greeting: string; question: string };
    core_learning: Array<{ word: string; sentence: string; audio_hint?: string }>;
    interaction: { prompt: string; expected_vocab: string[] };
    reinforcement: { type: 'repeat' | 'quiz' | 'match'; items: string[] };
    reward: { message: string; stars: number };
  };
  difficulty_level: number;
  prompts_shown: number;
  responses_given: number;
  correct_responses: number;
  completed_at: string | null;
}

export interface KPIs {
  vocab_words_this_week: number;
  speaking_confidence: number;
  engagement_score: number;
  retention_rate: number;
  sessions_this_week: number;
  daily_streak: number;
  weak_words: string[];
}

export interface SaveInteractionDto {
  session_id?: string;
  user_message: string;
  ai_response: string;
  confidence_signal?: number;
  phoneme_confidence?: number;
}

export interface PronunciationTrendPoint {
  date: string;
  score: number;
}

export interface PronunciationTrend {
  points: PronunciationTrendPoint[];
  avg_score: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface CompleteSessionDto {
  session_id: string;
  prompts_shown: number;
  responses_given: number;
  correct_responses: number;
}

export interface UpdateProfileDto {
  name?: string;
  interests?: string[];
  learning_style?: 'visual' | 'audio' | 'interactive';
  vocabulary_level?: 'beginner' | 'basic' | 'intermediate' | 'advanced';
  parent_career?: string | null;
}

export async function getChildProfile(childId: string): Promise<ChildProfile> {
  const response = await client.get(`/learning/children/${encodeURIComponent(childId)}/profile`);
  return normalizeChildProfilePayload(response.data);
}

export async function updateChildProfile(childId: string, dto: UpdateProfileDto): Promise<ChildProfile> {
  const response = await client.put(`/learning/children/${encodeURIComponent(childId)}/profile`, dto);
  return normalizeChildProfilePayload(response.data);
}

export async function getTodaySession(childId: string): Promise<LearningSession> {
  const response = await client.get(`/learning/children/${encodeURIComponent(childId)}/session/today`);
  return unwrap<LearningSession>(response.data);
}

export async function saveInteraction(childId: string, dto: SaveInteractionDto): Promise<void> {
  await client.post(`/learning/children/${encodeURIComponent(childId)}/interactions`, dto);
}

export async function getInteractions(childId: string, limit = 50): Promise<Array<{
  id: string;
  user_message: string;
  ai_response: string;
  confidence_signal: number;
  created_at: string;
}>> {
  const response = await client.get(`/learning/children/${encodeURIComponent(childId)}/interactions?limit=${encodeURIComponent(String(limit))}`);
  return unwrap<Array<{
    id: string;
    user_message: string;
    ai_response: string;
    confidence_signal: number;
    created_at: string;
  }>>(response.data);
}

export async function getKPIs(childId: string): Promise<KPIs> {
  const response = await client.get(`/learning/children/${encodeURIComponent(childId)}/kpis`);
  return normalizeKpisPayload(response.data);
}

export async function completeSession(childId: string, dto: CompleteSessionDto): Promise<void> {
  await client.post(`/learning/children/${encodeURIComponent(childId)}/session/complete`, dto);
}

export async function getPronunciationTrend(childId: string, days = 7): Promise<PronunciationTrend> {
  const response = await client.get(`/learning/children/${encodeURIComponent(childId)}/pronunciation-trend?days=${encodeURIComponent(String(days))}`);
  return normalizePronunciationTrendPayload(response.data);
}

function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const data = (payload as { data?: unknown }).data;
    if (data !== undefined) return data as T;
  }
  return payload as T;
}

function asRecord(value: unknown): Record<string, unknown> {
  const unwrapped = unwrap<unknown>(value);
  return unwrapped && typeof unwrapped === 'object' ? unwrapped as Record<string, unknown> : {};
}

function safeLevel(value: unknown): ChildProfile['vocabulary_level'] {
  return value === 'basic' || value === 'intermediate' || value === 'advanced' ? value : 'beginner';
}

function safeStyle(value: unknown): ChildProfile['learning_style'] {
  return value === 'visual' || value === 'audio' ? value : 'interactive';
}

function safeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

export function normalizeChildProfilePayload(payload: unknown): ChildProfile {
  const raw = asRecord(payload);
  const parentCareer = raw.parent_career ?? raw.parentCareer;
  return {
    id: typeof raw.id === 'string' ? raw.id : '',
    name: typeof raw.name === 'string' ? raw.name : '',
    vocabulary_level: safeLevel(raw.vocabulary_level ?? raw.vocabularyLevel),
    speaking_confidence: Number(raw.speaking_confidence ?? raw.speakingConfidence ?? 0),
    listening_score: Number(raw.listening_score ?? raw.listeningScore ?? 0),
    interests: safeStringArray(raw.interests),
    attention_span_seconds: Number(raw.attention_span_seconds ?? raw.attentionSpanSeconds ?? 0),
    learning_style: safeStyle(raw.learning_style ?? raw.learningStyle),
    parent_career: typeof parentCareer === 'string' ? parentCareer : parentCareer === null ? null : undefined,
  };
}

export function normalizeKpisPayload(payload: unknown): KPIs {
  const raw = asRecord(payload);
  return {
    vocab_words_this_week: Number(raw.vocab_words_this_week ?? raw.vocabWordsThisWeek ?? 0),
    speaking_confidence: Number(raw.speaking_confidence ?? raw.speakingConfidence ?? 0),
    engagement_score: Number(raw.engagement_score ?? raw.engagementScore ?? 0),
    retention_rate: Number(raw.retention_rate ?? raw.retentionRate ?? 0),
    sessions_this_week: Number(raw.sessions_this_week ?? raw.sessionsThisWeek ?? 0),
    daily_streak: Number(raw.daily_streak ?? raw.dailyStreak ?? 0),
    weak_words: safeStringArray(raw.weak_words ?? raw.weakWords),
  };
}

export function normalizePronunciationTrendPayload(payload: unknown): PronunciationTrend {
  const raw = asRecord(payload);
  const pointsRaw = raw.points;
  const points = Array.isArray(pointsRaw)
    ? pointsRaw.map((point) => {
        const p = point && typeof point === 'object' ? point as Record<string, unknown> : {};
        return { date: typeof p.date === 'string' ? p.date : '', score: Number(p.score ?? 0) };
      })
    : [];
  const trend = raw.trend === 'improving' || raw.trend === 'declining' ? raw.trend : 'stable';
  return {
    points,
    avg_score: Number(raw.avg_score ?? raw.avgScore ?? 0),
    trend,
  };
}
