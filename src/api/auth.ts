import client from './client';
import { setTokens, clearTokens } from './tokens';
import { AuthTokens, User } from '../types';

export async function signup(name: string, email: string, password: string): Promise<{ partial: boolean }> {
  const response = await client.post('/auth/signup', { name, email, password });
  return response.data.data ?? response.data;
}

export async function login(email: string, password: string): Promise<AuthTokens & { user: User }> {
  const response = await client.post('/auth/login', { email, password });
  const data = response.data.data ?? response.data;
  if (data.access_token) {
    await setTokens(data.access_token, data.refresh_token);
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

export async function verifyEmail(token: string): Promise<void> {
  await client.get(`/auth/verify-email?token=${token}`);
}

export async function resendVerification(email: string): Promise<void> {
  await client.post('/auth/resend-verification', { email });
}

export async function sendConsent(stripeToken?: string): Promise<void> {
  await client.post('/auth/consent', {
    ...(stripeToken ? { stripe_token: stripeToken } : {}),
    consent_given: true,
    timestamp: new Date().toISOString(),
  });
}
