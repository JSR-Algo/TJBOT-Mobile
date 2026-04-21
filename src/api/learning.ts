import client from './client';

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
  interests?: string[];
  learning_style?: 'visual' | 'audio' | 'interactive';
  vocabulary_level?: 'beginner' | 'basic' | 'intermediate' | 'advanced';
}

export async function getChildProfile(childId: string): Promise<ChildProfile> {
  const res = await client.get(`/learning/children/${childId}/profile`);
  return res.data.data ?? res.data;
}

export async function updateChildProfile(childId: string, dto: UpdateProfileDto): Promise<ChildProfile> {
  const res = await client.put(`/learning/children/${childId}/profile`, dto);
  return res.data.data ?? res.data;
}

export async function getTodaySession(childId: string): Promise<LearningSession> {
  const res = await client.get(`/learning/children/${childId}/session/today`);
  return res.data.data ?? res.data;
}

export async function saveInteraction(childId: string, dto: SaveInteractionDto): Promise<void> {
  await client.post(`/learning/children/${childId}/interactions`, dto);
}

export async function getInteractions(childId: string, limit = 50): Promise<Array<{
  id: string;
  user_message: string;
  ai_response: string;
  confidence_signal: number;
  created_at: string;
}>> {
  const res = await client.get(`/learning/children/${childId}/interactions`, { params: { limit } });
  return res.data.data ?? res.data;
}

export async function getKPIs(childId: string): Promise<KPIs> {
  // Backend exposes /v1/learning/progress/{child_id} — map to KPIs shape
  const res = await client.get(`/learning/progress/${childId}`);
  const d = res.data.data ?? res.data;
  return {
    vocab_words_this_week: d.total_words_learned ?? 0,
    speaking_confidence: Math.round((d.confidence_score ?? 0.5) * 100),
    engagement_score: Math.min(100, (d.session_count ?? 0) * 10),
    retention_rate: d.struggling_words?.length > 0
      ? Math.round(((d.known_words?.length ?? 0) / ((d.known_words?.length ?? 0) + (d.struggling_words?.length ?? 1))) * 100)
      : 100,
    sessions_this_week: d.session_count ?? 0,
    daily_streak: 0,
    weak_words: d.struggling_words ?? [],
  };
}

export async function completeSession(childId: string, dto: CompleteSessionDto): Promise<void> {
  await client.post(`/learning/children/${childId}/session/complete`, dto);
}

export async function getPronunciationTrend(childId: string, days = 7): Promise<PronunciationTrend> {
  // TODO(backend): endpoint not deployed yet — see task-s5-backend-learning-controls-summaries-deploy.
  // Attempt the call so the client picks up the real trend as soon as the
  // backend ships it; on 404, raise FeatureUnavailableError so the UI can
  // render an honest "coming soon" empty state instead of a blank chart.
  try {
    const res = await client.get(`/learning/children/${childId}/pronunciation-trend`, {
      params: { days },
    });
    const data = res.data.data ?? res.data;
    return {
      points: Array.isArray(data?.points) ? data.points : [],
      avg_score: typeof data?.avg_score === 'number' ? data.avg_score : 0,
      trend: data?.trend === 'improving' || data?.trend === 'declining' ? data.trend : 'stable',
    };
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number }; status?: number })?.response?.status
      ?? (err as { status?: number })?.status;
    if (status === 404) {
      throw new FeatureUnavailableError('Pronunciation trend endpoint not deployed');
    }
    throw err;
  }
}
