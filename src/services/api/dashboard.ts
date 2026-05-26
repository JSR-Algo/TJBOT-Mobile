import { backendContractUnavailable } from './undocumented-api-routes';

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
  void page; void limit; void from; void to;
  backendContractUnavailable(`getSessionHistory:${deviceId}`);
}

export async function getSafetyEvents(
  deviceId: string,
  limit = 50,
): Promise<SafetyEvent[]> {
  void limit;
  backendContractUnavailable(`getSafetyEvents:${deviceId}`);
}

export async function getWeeklySummary(deviceId: string): Promise<WeeklySummary[]> {
  backendContractUnavailable(`getWeeklySummary:${deviceId}`);
}

export async function getSessionCost(
  deviceId: string,
  from?: string,
  to?: string,
): Promise<SessionCost> {
  void from; void to;
  backendContractUnavailable(`getSessionCost:${deviceId}`);
}
