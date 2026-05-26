import { normalizeError, type AppError } from './errors';

export type ApiFailureState =
  | 'validation'
  | 'auth'
  | 'permission'
  | 'conflict'
  | 'gone'
  | 'rate_limited'
  | 'provider_outage'
  | 'offline'
  | 'timeout'
  | 'unknown';

export interface ApiFailureDescription {
  state: ApiFailureState;
  title: string;
  body: string;
  retryable: boolean;
}

function hasMessage(error: unknown): error is { message: string } {
  return error !== null && typeof error === 'object' && 'message' in error && typeof error.message === 'string';
}

function isTimeout(error: unknown, normalized: AppError): boolean {
  return normalized.code === 'ECONNABORTED'
    || (hasMessage(error) && error.message.toLowerCase().includes('timeout'))
    || normalized.message.toLowerCase().includes('timeout');
}

function rateLimitBody(retryAfterSeconds: number | undefined): string {
  if (typeof retryAfterSeconds === 'number' && Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return `Try again in ${retryAfterSeconds} seconds.`;
  }
  return 'Try again in a moment.';
}

export function describeApiFailure(error: unknown): ApiFailureDescription {
  const normalized = normalizeError(error);
  const status = normalized.status;

  if (isTimeout(error, normalized)) {
    return { state: 'timeout', title: 'Request timed out', body: 'Retry when the connection is stronger.', retryable: true };
  }
  if (normalized.code === 'NETWORK_ERROR') {
    return { state: 'offline', title: 'You are offline', body: 'Check your internet connection and try again.', retryable: true };
  }
  if (status === 400 || normalized.code === 'VALIDATION_ERROR') {
    return { state: 'validation', title: 'Check the details', body: 'Some information needs attention before retrying.', retryable: false };
  }
  if (status === 401 || normalized.code === 'INVALID_CREDENTIALS') {
    return { state: 'auth', title: 'Sign in again', body: 'Your session needs a fresh sign-in.', retryable: false };
  }
  if (status === 403) {
    return { state: 'permission', title: 'Not allowed', body: 'This account cannot access that action.', retryable: false };
  }
  if (status === 409 || normalized.code === 'USER_EXISTS' || normalized.code === 'DEVICE_ALREADY_CLAIMED') {
    return { state: 'conflict', title: 'Already changed', body: 'Refresh and try the latest state.', retryable: true };
  }
  if (status === 410) {
    return { state: 'gone', title: 'No longer available', body: 'Refresh to continue with the latest state.', retryable: true };
  }
  if (status === 429 || normalized.code === 'RATE_LIMIT_EXCEEDED') {
    return {
      state: 'rate_limited',
      title: 'Too many requests',
      body: rateLimitBody(normalized.retryAfterSeconds),
      retryable: true,
    };
  }
  if (status === 502 || status === 503 || status === 504) {
    return { state: 'provider_outage', title: 'Service is having trouble', body: 'Retry in a moment.', retryable: true };
  }

  return { state: 'unknown', title: 'Something went wrong', body: 'Try again.', retryable: true };
}
