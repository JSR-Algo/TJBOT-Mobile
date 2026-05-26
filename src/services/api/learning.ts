import { backendContractUnavailable } from './undocumented-api-routes';

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
  backendContractUnavailable(`getChildProfile:${childId}`);
}

export async function updateChildProfile(childId: string, dto: UpdateProfileDto): Promise<ChildProfile> {
  void dto;
  backendContractUnavailable(`updateChildProfile:${childId}`);
}

export async function getTodaySession(childId: string): Promise<LearningSession> {
  backendContractUnavailable(`getTodaySession:${childId}`);
}

export async function saveInteraction(childId: string, dto: SaveInteractionDto): Promise<void> {
  void dto;
  backendContractUnavailable(`saveInteraction:${childId}`);
}

export async function getInteractions(childId: string, limit = 50): Promise<Array<{
  id: string;
  user_message: string;
  ai_response: string;
  confidence_signal: number;
  created_at: string;
}>> {
  void limit;
  backendContractUnavailable(`getInteractions:${childId}`);
}

export async function getKPIs(childId: string): Promise<KPIs> {
  backendContractUnavailable(`getKPIs:${childId}`);
}

export async function completeSession(childId: string, dto: CompleteSessionDto): Promise<void> {
  void dto;
  backendContractUnavailable(`completeSession:${childId}`);
}

export async function getPronunciationTrend(childId: string, days = 7): Promise<PronunciationTrend> {
  void days;
  backendContractUnavailable(`getPronunciationTrend:${childId}`);
}
