export const ERROR_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: 'Please check the information you entered.',
  USER_EXISTS: 'An account with this email already exists.',
  ACCOUNT_ALREADY_EXISTS: 'An account with this email already exists.',
  EMAIL_INVALID: 'Please enter a valid email address.',
  PASSWORD_WEAK: 'Password does not meet the requirements.',
  PASSWORDS_DONT_MATCH: 'Passwords do not match.',
  INVALID_CREDENTIALS: 'Incorrect email or password.',
  HOUSEHOLD_NOT_FOUND: 'Household not found.',
  DEVICE_ALREADY_CLAIMED: 'This device is already paired to another account.',
  FORBIDDEN: 'You do not have permission for this action.',
  CONFLICT: 'Request already exists or cannot start yet.',
  GONE: 'This link or resource has expired.',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please wait a moment.',
  GATEWAY_TIMEOUT: 'The server took too long to respond. Please try again.',
  SERVICE_UNAVAILABLE: 'Service is temporarily unavailable. Please try again later.',
  INTERNAL_ERROR: 'Something went wrong on our end. Please try again.',
  NETWORK_ERROR: 'Check your internet connection and try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  invalid_access_token: 'Your session expired. Please sign in again.',
  invalid_refresh_token: 'Your session expired. Please sign in again.',
  validation_failed: 'Please check the information you entered.',
  parent_auth_required: 'Parent sign-in is required.',
  stale_coppa_policy_version: 'Please review the latest consent policy.',
  missing_coppa_consent: 'Parental consent is required before continuing.',
};

export function getErrorMessage(code: string | undefined): string {
  if (!code) return ERROR_MESSAGES.UNKNOWN_ERROR;
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES.UNKNOWN_ERROR;
}

// Generic backend messages that add no value over our mapped copy.
const GENERIC_BACKEND_MESSAGES = new Set([
  'bad request',
  'request validation failed',
  'internal server error',
  'an unexpected error occurred',
  'unexpected error',
  'unauthorized',
  'forbidden',
  'not found',
  'conflict',
]);

function preferServerMessage(serverMessage: string | undefined, code: string | undefined): string {
  const trimmed = serverMessage?.trim();
  if (trimmed && !GENERIC_BACKEND_MESSAGES.has(trimmed.toLowerCase())) {
    return trimmed;
  }
  return getErrorMessage(code);
}

export interface AppError {
  code: string;
  message: string;
  retryable?: boolean;
  status?: number;
  retryAfterSeconds?: number;
  traceId?: string;
}

function hasStringMessage(error: unknown): error is { message: string } {
  return (
    error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  );
}

function isTransportFailureMessage(message: string): boolean {
  return (
    message.includes('Network Error') ||
    message.includes('ECONNREFUSED') ||
    message.includes('ENOTFOUND') ||
    message.includes('timeout')
  );
}

export function normalizeError(error: unknown): AppError {
  if (hasStringMessage(error) && isTransportFailureMessage(error.message)) {
    return { code: 'NETWORK_ERROR', message: ERROR_MESSAGES.NETWORK_ERROR, retryable: true };
  }

  // Already normalized — return as-is to avoid double-wrapping
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    'message' in error &&
    !('response' in error)
  ) {
    return error as AppError;
  }

  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as {
      response?: {
        status?: number;
        headers?: Record<string, string | number | undefined>;
        data?: {
          error?: { code?: string; message?: string; retryable?: boolean };
          // NestJS / Express common shapes
          message?: string | string[];
          statusCode?: number;
          code?: string;
          traceId?: string;
          meta?: { correlation_id?: string };
        };
      };
    };
    const data = axiosError.response?.data;
    const status = axiosError.response?.status;
    const traceId = data?.traceId ?? data?.meta?.correlation_id;
    const retryAfterHeader =
      axiosError.response?.headers?.['retry-after'] ?? axiosError.response?.headers?.['Retry-After'];
    const retryAfterSeconds =
      typeof retryAfterHeader === 'number'
        ? retryAfterHeader
        : typeof retryAfterHeader === 'string'
          ? Number.parseInt(retryAfterHeader, 10)
          : undefined;
    const metadata = {
      ...(typeof status === 'number' ? { status } : {}),
      ...(typeof retryAfterSeconds === 'number' && Number.isFinite(retryAfterSeconds) ? { retryAfterSeconds } : {}),
      ...(typeof traceId === 'string' && traceId.length > 0 ? { traceId } : {}),
    };

    // Shape 1: { error: { code, message } } — prefer mapped copy; fall back to server message
    // when it adds detail beyond the code (e.g. password policy violation specifics).
    if (data?.error && typeof data.error === 'object') {
      const errData = data.error;
      const code = errData.code ?? 'UNKNOWN_ERROR';
      const mapped = ERROR_MESSAGES[code];
      const message = mapped !== undefined ? mapped : preferServerMessage(errData.message, code);
      return {
        code,
        message,
        retryable: errData.retryable ?? false,
        ...metadata,
      };
    }

    // Shape 2: { code, message } at root
    if (data?.code && typeof data.code === 'string') {
      const rootMessage = typeof data.message === 'string' ? data.message : undefined;
      const mapped = ERROR_MESSAGES[data.code];
      const message = mapped !== undefined ? mapped : preferServerMessage(rootMessage, data.code);
      return {
        code: data.code,
        message,
        retryable: false,
        ...metadata,
      };
    }

    // Shape 3: NestJS { statusCode, message } — keep backend details private.
    if (data?.message) {
      // Shape 5: class-validator array { message: string[] } — join into single sentence.
      if (status === 400 && Array.isArray(data.message)) {
        return { code: 'VALIDATION_ERROR', message: data.message.join('. '), retryable: false, ...metadata };
      }
      if (status === 401) return { code: 'INVALID_CREDENTIALS', message: ERROR_MESSAGES.INVALID_CREDENTIALS, retryable: false, ...metadata };
      if (status === 403) return { code: 'FORBIDDEN', message: ERROR_MESSAGES.FORBIDDEN, retryable: false, ...metadata };
      if (status === 409) return { code: 'CONFLICT', message: ERROR_MESSAGES.CONFLICT, retryable: false, ...metadata };
      if (status === 410) return { code: 'GONE', message: ERROR_MESSAGES.GONE, retryable: false, ...metadata };
      if (status === 429) return { code: 'RATE_LIMIT_EXCEEDED', message: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED, retryable: true, ...metadata };
      if (status === 503) return { code: 'SERVICE_UNAVAILABLE', message: ERROR_MESSAGES.SERVICE_UNAVAILABLE, retryable: true, ...metadata };
      if (status === 504) return { code: 'GATEWAY_TIMEOUT', message: ERROR_MESSAGES.GATEWAY_TIMEOUT, retryable: true, ...metadata };
      if (status && status >= 500) return { code: 'INTERNAL_ERROR', message: ERROR_MESSAGES.INTERNAL_ERROR, retryable: true, ...metadata };
      return { code: 'SERVER_ERROR', message: ERROR_MESSAGES.UNKNOWN_ERROR, retryable: false, ...metadata };
    }

    // Shape 4: bare HTTP error with no body
    if (status === 401) return { code: 'INVALID_CREDENTIALS', message: ERROR_MESSAGES.INVALID_CREDENTIALS, retryable: false, ...metadata };
    if (status === 403) return { code: 'FORBIDDEN', message: ERROR_MESSAGES.FORBIDDEN, retryable: false, ...metadata };
    if (status === 409) return { code: 'CONFLICT', message: ERROR_MESSAGES.CONFLICT, retryable: false, ...metadata };
    if (status === 410) return { code: 'GONE', message: ERROR_MESSAGES.GONE, retryable: false, ...metadata };
    if (status === 429) return { code: 'RATE_LIMIT_EXCEEDED', message: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED, retryable: true, ...metadata };
    if (status === 503) return { code: 'SERVICE_UNAVAILABLE', message: ERROR_MESSAGES.SERVICE_UNAVAILABLE, retryable: true, ...metadata };
    if (status === 504) return { code: 'GATEWAY_TIMEOUT', message: ERROR_MESSAGES.GATEWAY_TIMEOUT, retryable: true, ...metadata };
    if (status && status >= 500) return { code: 'INTERNAL_ERROR', message: ERROR_MESSAGES.INTERNAL_ERROR, retryable: true, ...metadata };
  }

  if (hasStringMessage(error)) {
    return { code: 'UNKNOWN_ERROR', message: ERROR_MESSAGES.UNKNOWN_ERROR, retryable: false };
  }

  return { code: 'UNKNOWN_ERROR', message: ERROR_MESSAGES.UNKNOWN_ERROR, retryable: false };
}
