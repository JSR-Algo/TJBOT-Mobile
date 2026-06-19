import { createAuthenticatedClient } from '../http/createAuthenticatedAxios';
import { Config } from '../../config';
import { backendContractUnavailable } from './undocumented-api-routes';
import {
  FEATURE_AI_PROXY,
  FeatureAiProxyDisabledError,
} from '@/config/feature-flags';

const AI_BASE_URL = Config.AI_BASE_URL;

const aiClient = createAuthenticatedClient({
  baseURL: AI_BASE_URL,
  timeout: 15000,
});

export async function transcribe(audioUri: string): Promise<{
  text: string;
  confidence: number;
  confidence_signal?: number;
  phoneme_confidence?: number;
}> {
  if (!FEATURE_AI_PROXY) {
    throw new FeatureAiProxyDisabledError('transcribe');
  }
  void audioUri;
  backendContractUnavailable('transcribe');
}

export async function chat(
  message: string,
  sessionId?: string,
  childProfile?: {
    age?: number;
    vocabulary_level?: string;
    interests?: string[];
    speaking_confidence?: number;
    session_context?: { words_to_learn?: string[] };
  },
  history?: Array<{ user: string; assistant: string }>,
): Promise<{ response: string; session_id: string }> {
  if (!FEATURE_AI_PROXY) {
    throw new FeatureAiProxyDisabledError('chat');
  }
  void message; void sessionId; void childProfile; void history;
  backendContractUnavailable('chat');
}

export async function synthesize(text: string): Promise<{ audio_url: string; duration_ms: number }> {
  if (!FEATURE_AI_PROXY) {
    throw new FeatureAiProxyDisabledError('synthesize');
  }
  void text;
  backendContractUnavailable('synthesize');
}

export { aiClient };
