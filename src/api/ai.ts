import axios, { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { getAccessToken } from './tokens';
import { Config } from '../config';
import {
  isRefreshing,
  setRefreshing,
  enqueue,
  processQueue,
  refreshAuthTokens,
  clearAuthTokens,
} from './refresh-queue';

const AI_BASE_URL = Config.AI_BASE_URL;

let onAuthInvalidated: (() => void) | null = null;

export function setAiAuthInvalidatedHandler(handler: (() => void) | null): void {
  onAuthInvalidated = handler;
}

const _aiClient = axios.create({
  baseURL: AI_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

_aiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

_aiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;

    if (status === 401 && originalRequest && !originalRequest._retry) {
      if (isRefreshing()) {
        return new Promise<string>((resolve, reject) => {
          enqueue({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return _aiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      setRefreshing(true);
      try {
        const access_token = await refreshAuthTokens();
        processQueue(null, access_token);
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
        }
        return _aiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await clearAuthTokens();
        if (onAuthInvalidated) {
          try { onAuthInvalidated(); } catch { /* best-effort */ }
        }
        return Promise.reject(refreshError);
      } finally {
        setRefreshing(false);
      }
    }

    return Promise.reject(error);
  },
);

export async function transcribe(audioUri: string): Promise<{ text: string; confidence: number; confidence_signal?: number; phoneme_confidence?: number }> {
  const form = new FormData();
  const filename = audioUri.split('/').pop() ?? 'audio.m4a';
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'm4a';
  const mimeMap: Record<string, string> = {
    m4a: 'audio/mp4', mp4: 'audio/mp4', wav: 'audio/wav',
    webm: 'audio/webm', ogg: 'audio/ogg', flac: 'audio/flac',
  };
  const mimeType = mimeMap[ext] ?? 'audio/m4a';
  form.append('audio', { uri: audioUri, name: filename, type: mimeType } as unknown as Blob);

  const response = await _aiClient.post('/v1/stt/transcribe', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  });
  return response.data;
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
  const http = _aiClient;
  const response = await http.post('/v1/llm/chat', {
    message,
    session_id: sessionId ?? `session_${Date.now()}`,
    ...(childProfile ? { child_profile: childProfile } : {}),
    ...(history && history.length > 0 ? { history: history.slice(-5) } : {}),
  });
  return response.data;
}

export async function synthesize(text: string): Promise<{ audio_url: string; duration_ms: number }> {
  const http = _aiClient;
  const response = await http.post('/v1/tts/synthesize', { text });
  return response.data;
}
