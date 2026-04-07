export interface User {
  id: string;
  email: string;
  name: string;
  email_verified: boolean;
}

export interface Household {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  members?: HouseholdMember[];
}

export interface HouseholdMember {
  user_id: string;
  role: string;
  joined_at: string;
}

export interface Child {
  id: string;
  household_id: string;
  name: string;
  birth_year: number;
  age_gate_passed: boolean;
  created_at: string;
  vocabulary_level?: 'beginner' | 'basic' | 'intermediate' | 'advanced';
  speaking_confidence?: number;
  listening_score?: number;
  interests?: string[];
  attention_span_seconds?: number;
  learning_style?: 'visual' | 'audio' | 'interactive';
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

export interface Device {
  id: string;
  serial_number: string;
  hardware_revision: string;
  firmware_version: string;
  status: 'online' | 'offline' | 'pairing';
  last_seen?: string;
  battery_level?: number;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface Session {
  id: string;
  started_at: string;
  ended_at: string | null;
  state: string;
  child_profile_id: string;
  child_name: string;
  turn_count: number;
  total_latency_ms: number;
  safety_flags: number;
}

export interface SafetyEvent {
  id: string;
  filter_type: string;
  reason: string;
  created_at: string;
  child_profile_id: string;
  child_name: string;
}

export interface SessionCost {
  session_count: number;
  total_cost_usd: number;
  avg_cost_per_session_usd: number;
  from: string;
  to: string;
}

export interface NotificationPreferences {
  id: string;
  parent_id: string;
  email_digest_enabled: boolean;
  email_digest_frequency: 'daily' | 'weekly' | 'never';
  safety_alerts_enabled: boolean;
  push_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  data: T;
  meta: {
    requestId: string;
    timestamp: string;
  };
}
