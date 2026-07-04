/**
 * In-app diagnostic ring buffer — captures API, voice, navigation, and runtime
 * problems for parent-gated export. Redacts secrets before storage.
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { Config } from '@/config';
import { isGeminiDemoKeyEnabled } from '@/config/geminiDemoKey';

export type DiagnosticSeverity = 'debug' | 'info' | 'warn' | 'error';

export type DiagnosticCategory =
  | 'app'
  | 'api'
  | 'auth'
  | 'gemini'
  | 'voice'
  | 'lesson'
  | 'navigation'
  | 'runtime';

export interface DiagnosticEntry {
  id: string;
  at: string;
  severity: DiagnosticSeverity;
  category: DiagnosticCategory;
  event: string;
  message: string;
  detail?: Record<string, unknown>;
}

const MAX_ENTRIES = 300;
const API_KEY_RE = /AIza[A-Za-z0-9_-]{10,}/g;
const BEARER_RE = /Bearer\s+[A-Za-z0-9._-]+/gi;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

let seq = 0;
const entries: DiagnosticEntry[] = [];
const listeners = new Set<() => void>();
const errorListeners = new Set<(entry: DiagnosticEntry) => void>();

function notify(): void {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* listener fault */
    }
  });
}

export function redactDiagnosticText(input: string): string {
  return input
    .replace(API_KEY_RE, 'AIza[REDACTED]')
    .replace(BEARER_RE, 'Bearer [REDACTED]')
    .replace(EMAIL_RE, '[email-redacted]');
}

export function redactDiagnosticValue(value: unknown): unknown {
  if (typeof value === 'string') return redactDiagnosticText(value);
  if (Array.isArray(value)) return value.map(redactDiagnosticValue);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      if (/password|secret|token|transcript|audio|authorization/i.test(key)) {
        out[key] = '[redacted]';
        continue;
      }
      out[key] = redactDiagnosticValue(child);
    }
    return out;
  }
  return value;
}

function nextId(): string {
  seq += 1;
  return `diag-${Date.now()}-${seq}`;
}

export interface DiagnosticLogInput {
  severity?: DiagnosticSeverity;
  category: DiagnosticCategory;
  event: string;
  message: string;
  detail?: Record<string, unknown>;
}

export function diagnosticLog(input: DiagnosticLogInput): DiagnosticEntry {
  const entry: DiagnosticEntry = {
    id: nextId(),
    at: new Date().toISOString(),
    severity: input.severity ?? 'info',
    category: input.category,
    event: input.event,
    message: redactDiagnosticText(input.message),
    detail: input.detail
      ? (redactDiagnosticValue(input.detail) as Record<string, unknown>)
      : undefined,
  };

  entries.push(entry);
  if (entries.length > MAX_ENTRIES) {
    entries.splice(0, entries.length - MAX_ENTRIES);
  }

  if (__DEV__) {
    const prefix = `[diag:${entry.category}] ${entry.event}`;
    if (entry.severity === 'error') {
      console.error(prefix, entry.message, entry.detail ?? '');
    } else if (entry.severity === 'warn') {
      console.warn(prefix, entry.message, entry.detail ?? '');
    } else {
      console.info(prefix, entry.message, entry.detail ?? '');
    }
  }

  notify();
  if (entry.severity === 'error') {
    errorListeners.forEach((fn) => {
      try {
        fn(entry);
      } catch {
        /* listener fault */
      }
    });
  }
  return entry;
}

export function getDiagnosticEntries(): readonly DiagnosticEntry[] {
  return entries;
}

export function subscribeDiagnosticLog(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function subscribeDiagnosticErrors(
  listener: (entry: DiagnosticEntry) => void,
): () => void {
  errorListeners.add(listener);
  return () => errorListeners.delete(listener);
}

export function clearDiagnosticLog(): void {
  entries.length = 0;
  notify();
}

export function getDiagnosticSessionHeader(): Record<string, string> {
  const version =
    Constants.expoConfig?.version ??
    Constants.nativeAppVersion ??
    'unknown';
  const build =
    Constants.expoConfig?.ios?.buildNumber ??
    Constants.nativeBuildVersion ??
    'unknown';

  return {
    platform: Platform.OS,
    appVersion: String(version),
    build: String(build),
    apiBase: Config.API_BASE_URL,
    aiBase: Config.AI_BASE_URL,
    geminiModel: Config.GEMINI_LIVE_MODEL,
    geminiDemoKey: String(isGeminiDemoKeyEnabled()),
    qaMode: String(Config.QA_MODE),
    dev: String(__DEV__),
  };
}

export function formatDiagnosticExport(): string {
  const header = getDiagnosticSessionHeader();
  const lines: string[] = [
    '=== TJBot Diagnostic Log ===',
    `exportedAt: ${new Date().toISOString()}`,
    ...Object.entries(header).map(([k, v]) => `${k}: ${v}`),
    `entryCount: ${entries.length}`,
    '---',
  ];

  for (const e of entries) {
    lines.push(
      `${e.at} [${e.severity}] ${e.category}.${e.event}: ${e.message}`,
    );
    if (e.detail && Object.keys(e.detail).length > 0) {
      lines.push(`  detail: ${JSON.stringify(e.detail)}`);
    }
  }

  return lines.join('\n');
}

export function logApiFailure(
  method: string | undefined,
  url: string | undefined,
  status: number | undefined,
  code: string | undefined,
  message: string | undefined,
  traceId?: string,
): void {
  diagnosticLog({
    severity: status && status >= 500 ? 'error' : 'warn',
    category: url?.includes('/gemini/') ? 'gemini' : 'api',
    event: 'http_error',
    message: message ?? `HTTP ${status ?? 'unknown'} on ${method ?? '?'} ${url ?? '?'}`,
    detail: {
      method,
      url,
      status,
      code,
      traceId,
    },
  });
}

export function logGeminiEvent(
  event: string,
  message: string,
  detail?: Record<string, unknown>,
  severity: DiagnosticSeverity = 'info',
): void {
  diagnosticLog({
    severity,
    category: 'gemini',
    event,
    message,
    detail,
  });
}

export function logVoiceEvent(
  event: string,
  message: string,
  detail?: Record<string, unknown>,
  severity: DiagnosticSeverity = 'info',
): void {
  diagnosticLog({
    severity,
    category: 'voice',
    event,
    message,
    detail,
  });
}