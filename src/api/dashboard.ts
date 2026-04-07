import client from './client';

export interface SessionHistoryItem {
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

export interface SessionHistoryResponse {
  data: SessionHistoryItem[];
  total: number;
  page: number;
  limit: number;
}

export interface SafetyEvent {
  id: string;
  filter_type: string;
  reason: string;
  created_at: string;
  child_profile_id: string;
  child_name: string;
}

export interface WeeklySummary {
  date: string;
  session_count: number;
  total_duration_minutes: number;
  top_topics: string[];
}

export interface SessionCost {
  session_count: number;
  total_cost_usd: number;
  avg_cost_per_session_usd: number;
  from: string;
  to: string;
}

export async function getSessionHistory(
  deviceId: string,
  page = 1,
  limit = 20,
  from?: string,
  to?: string,
): Promise<SessionHistoryResponse> {
  const params: Record<string, unknown> = { page, limit };
  if (from) params.from = from;
  if (to) params.to = to;
  const res = await client.get(`/summaries/sessions/${deviceId}`, { params });
  return res.data.data ?? res.data;
}

export async function getSafetyEvents(
  deviceId: string,
  limit = 50,
): Promise<SafetyEvent[]> {
  const res = await client.get(`/summaries/safety/${deviceId}`, { params: { limit } });
  return res.data.data ?? res.data;
}

export async function getWeeklySummary(deviceId: string): Promise<WeeklySummary[]> {
  const res = await client.get(`/summaries/weekly/${deviceId}`);
  return res.data.data ?? res.data;
}

export async function getSessionCost(
  deviceId: string,
  from?: string,
  to?: string,
): Promise<SessionCost> {
  const params: Record<string, unknown> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  const res = await client.get(`/summaries/cost/${deviceId}`, { params });
  return res.data.data ?? res.data;
}
