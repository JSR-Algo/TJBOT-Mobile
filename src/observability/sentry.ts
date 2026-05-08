import * as Sentry from '@sentry/react-native';
import { ENV } from '../__env__';

const SENTRY_DSN = ENV.EXPO_PUBLIC_SENTRY_DSN?.trim();
let sentryEnabled = false;

export function initSentry(): void {
  if (!SENTRY_DSN) {
    sentryEnabled = false;
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    enableAutoSessionTracking: true,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
  sentryEnabled = true;
}

export function isSentryEnabled(): boolean {
  return sentryEnabled;
}

export function captureError(error: unknown): void {
  if (!sentryEnabled) return;
  Sentry.captureException(error);
}
