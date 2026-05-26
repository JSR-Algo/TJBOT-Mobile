import * as Sentry from '@sentry/react-native';
import type { Breadcrumb, ErrorEvent } from '@sentry/react-native';
import type { UserRole } from './analytics';
import { ENV } from '../../__env__';

const SENTRY_DSN = ENV.EXPO_PUBLIC_SENTRY_DSN?.trim();
const SAFE_ERROR_MESSAGE = 'An unexpected error occurred. Please try again.';
const SENSITIVE_KEY_PATTERN =
  /(?:email|token|secret|password|transcript|audio|childName|parent_name|displayName|first_name|last_name|dob|birthdate|address|phone|ip_address)/i;

let sentryEnabled = false;

export interface InitSentryOptions {
  userRole?: UserRole | 'unknown';
  enableAutoSessionTracking?: boolean;
}

export function initSentry(opts?: InitSentryOptions): void {
  if (!SENTRY_DSN) {
    sentryEnabled = false;
    return;
  }
  const role = opts?.userRole ?? 'unknown';
  const defaultAutoSession = role === 'adult' || role === 'teen';
  const enableAutoSessionTracking = opts?.enableAutoSessionTracking ?? defaultAutoSession;

  Sentry.init({
    dsn: SENTRY_DSN,
    enableAutoSessionTracking,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    beforeBreadcrumb,
    beforeSend,
  });
  sentryEnabled = true;
  setSentryUserRole(role);
}

export function setSentryUserRole(role: UserRole | 'unknown'): void {
  if (!sentryEnabled) return;
  Sentry.getCurrentScope().setUser({ role });
}

export function isSentryEnabled(): boolean {
  return sentryEnabled;
}

export function captureError(error: unknown): void {
  if (!sentryEnabled) return;
  Sentry.captureException(sanitizeError(error));
}

function beforeBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  return redactObject(breadcrumb);
}

function beforeSend(event: ErrorEvent): ErrorEvent | null {
  return redactObject(event);
}

function sanitizeError(error: unknown): Error {
  if (error instanceof Error) {
    return new Error(SAFE_ERROR_MESSAGE);
  }
  return new Error(SAFE_ERROR_MESSAGE);
}

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(item => redactValue(item));
  }
  if (isRecord(value)) {
    return redactObject(value);
  }
  return value;
}

function redactObject<T extends object>(source: T): T {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      continue;
    }
    cleaned[key] = redactValue(value);
  }
  return cleaned as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
