import client from '../http/client';

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

export interface UpdatePrefsPayload {
  email_digest_enabled?: boolean;
  email_digest_frequency?: 'daily' | 'weekly' | 'never';
  safety_alerts_enabled?: boolean;
  push_enabled?: boolean;
}

export interface NotificationHistoryItem {
  id: string;
  parent_id: string;
  type: string;
  channel: 'email' | 'push' | 'sms';
  subject: string;
  status: 'sent' | 'failed' | 'skipped';
  sent_at: string;
}

export async function getPreferences(): Promise<NotificationPreferences> {
  const res = await client.get('/notifications/preferences');
  return res.data.data ?? res.data;
}

export async function updatePreferences(prefs: UpdatePrefsPayload): Promise<NotificationPreferences> {
  const res = await client.put('/notifications/preferences', prefs);
  return res.data.data ?? res.data;
}

// `/v1/me/notifications` is a modular-runtime route and the modular bridge is
// mounted nowhere (render.yaml sets TBOT_ENABLE_MODULAR_ROUTES=false). The live
// Nest equivalent is /v1/notifications/history — verified 401 in production
// while /v1/me/notifications answers 404.
export async function getHistory(limit = 20): Promise<NotificationHistoryItem[]> {
  const res = await client.get('/notifications/history', { params: { limit } });
  return res.data.data ?? res.data;
}

export async function registerPushToken(token: string, platform: 'ios' | 'android' | 'web'): Promise<void> {
  await client.post('/notifications/push-token', { token, platform });
}

// Same story: the modular DELETE /v1/notifications/push-token (token in the
// BODY) is unmounted. NotificationsController serves DELETE
// /v1/notifications/push-token/:token, with the token in the PATH.
export async function removePushToken(token: string): Promise<void> {
  await client.delete(`/notifications/push-token/${encodeURIComponent(token)}`);
}
