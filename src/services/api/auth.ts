import client from '../http/client';
import { setTokens, clearTokens } from '../http/tokens';
import type { AuthTokens, User } from '../../types';

export interface LoginMetadata {
  deviceName?: string;
  platform?: string;
}

export type LoginResponse = AuthTokens & {
  user_id: string;
  access_token_expires_at?: string;
  refresh_token_expires_at?: string;
  user?: User;
};

export async function signup(name: string, email: string, password: string): Promise<{ access_token?: string }> {
  const response = await client.post('/auth/signup', { name, email, password });
  const data = response.data.data ?? response.data;
  if (data.access_token) {
    await setTokens(data.access_token, data.refresh_token ?? '');
  }
  return data;
}

export async function login(
  email: string,
  password: string,
  metadata: LoginMetadata = {},
): Promise<LoginResponse> {
  const response = await client.post('/auth/login', {
    email,
    password,
    ...(metadata.deviceName !== undefined ? { deviceName: metadata.deviceName } : {}),
    ...(metadata.platform !== undefined ? { platform: metadata.platform } : {}),
  });
  const data = response.data.data ?? response.data;
  if (data.access_token) {
    await setTokens(data.access_token, data.refresh_token ?? '');
  }
  return data;
}

export async function refresh(): Promise<AuthTokens> {
  const response = await client.post('/auth/refresh');
  return response.data.data ?? response.data;
}

export async function logout(): Promise<void> {
  try {
    await client.post('/auth/logout');
  } finally {
    await clearTokens();
  }
}

export async function forgotPassword(email: string): Promise<void> {
  await client.post('/auth/forgot-password', { email });
}

export async function sendConsent(stripeToken?: string): Promise<void> {
  await client.post('/auth/consent', {
    ...(stripeToken ? { stripe_token: stripeToken } : {}),
    consent_given: true,
    timestamp: new Date().toISOString(),
  });
}

export type AiVoiceConsentPayload = {
  consent_version: string;
  google_subprocessors_version: string;
};

export const AI_VOICE_CONSENT_VERSION = 'ai-voice-google-v1' as const;
export const GOOGLE_SUBPROCESSORS_VERSION = 'google-subprocessors-v1' as const;

export type AiVoiceConsentStatus = 'active' | 'withdrawn';

export type AiVoiceConsentResponse = {
  consent_id: string;
  household_id?: string;
  consent_version?: string;
  google_subprocessors_version?: string;
  status?: AiVoiceConsentStatus;
  granted_at?: string;
};

export async function recordAiVoiceConsent(payload: AiVoiceConsentPayload): Promise<AiVoiceConsentResponse> {
  const response = await client.post('/identity/ai-voice-consent', payload);
  return response.data.data ?? response.data;
}

export type WithdrawAiVoiceConsentPayload = {
  reason?: string;
};

export type WithdrawAiVoiceConsentResponse = {
  consent_id: string;
  household_id?: string;
  status: 'withdrawn';
  withdrawn_at: string;
};

export async function withdrawAiVoiceConsent(
  payload: WithdrawAiVoiceConsentPayload = {},
): Promise<WithdrawAiVoiceConsentResponse> {
  const response = await client.post('/identity/ai-voice-consent/withdraw', payload);
  return response.data.data ?? response.data;
}
