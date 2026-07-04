import apiClient from '../http/client';
import { getGeminiDemoApiKey } from '@/config/geminiDemoKey';

export type GeminiKeySource = 'demo_env' | 'backend_token';

export interface ResolvedGeminiApiKey {
  apiKey: string;
  source: GeminiKeySource;
}

export async function resolveGeminiApiKey(): Promise<ResolvedGeminiApiKey> {
  const demoKey = getGeminiDemoApiKey();
  if (demoKey) {
    return { apiKey: demoKey, source: 'demo_env' };
  }

  const { data } = await apiClient.post<{ token: string }>('/gemini/token', {});
  if (!data?.token || typeof data.token !== 'string') {
    throw new Error('Token response missing token');
  }

  return { apiKey: data.token, source: 'backend_token' };
}