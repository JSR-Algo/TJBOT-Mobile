// Contract breadcrumb: paired with backend/src/errors/error-code.ts; verified by original-app/TJBOT-Mobile/tests/utils/errors.test.ts and backend/tests/http-exception.filter.spec.ts. Update both when this mapping changes.
export const ERROR_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: 'Please check the information you entered.',
  USER_EXISTS: 'An account with this email already exists.',
  ACCOUNT_ALREADY_EXISTS: 'An account with this email already exists.',
  EMAIL_INVALID: 'Please enter a valid email address.',
  PASSWORD_WEAK: 'Password does not meet the requirements.',
  PASSWORDS_DONT_MATCH: 'Passwords do not match.',
  INVALID_CREDENTIALS: 'Incorrect email or password.',
  HOUSEHOLD_NOT_FOUND: 'Household not found.',
  HOUSEHOLD_ACCESS_DENIED: 'You do not have permission for this household.',
  CHILD_PROFILE_NOT_FOUND: 'Child profile not found.',
  DEVICE_ALREADY_CLAIMED: 'This device is already paired to another account.',
  DEVICE_NOT_FOUND: 'Device not found.',
  DEVICE_NOT_CLAIMED: 'Device has not been paired yet.',
  DEVICE_NOT_OWNED: 'This device is not linked to your account.',
  INVALID_BLE_CODE: 'The pairing code is incorrect. Please check and try again.',
  BLE_CODE_EXPIRED: 'The pairing code has expired. Please request a new one.',
  FORBIDDEN: 'You do not have permission for this action.',
  UNAUTHORIZED: 'Please sign in to continue.',
  CONFLICT: 'Request already exists or cannot start yet.',
  GONE: 'This link or resource has expired.',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please wait a moment.',
  GATEWAY_TIMEOUT: 'The server took too long to respond. Please try again.',
  SERVICE_UNAVAILABLE: 'Service is temporarily unavailable. Please try again later.',
  INTERNAL_ERROR: 'Something went wrong on our end. Please try again.',
  NETWORK_ERROR: 'Check your internet connection and try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  AUTH_TOKEN_MISSING: 'Your session is missing. Please sign in again.',
  AUTH_TOKEN_INVALID: 'Your session is invalid. Please sign in again.',
  AUTH_TOKEN_EXPIRED: 'Your session expired. Please sign in again.',
  AUTH_REFRESH_REUSE: 'Your session expired. Please sign in again.',
  AUTH_SERVER_ERROR: 'Sign-in service error. Please try again later.',
  FACTORY_AUTH_MISSING: 'Factory authentication is missing.',
  FACTORY_AUTH_INVALID: 'Factory authentication is invalid.',
  FACTORY_AUTH_NOT_CONFIGURED: 'Factory authentication is not configured.',

  // Validation
  INVALID_CERTIFICATE_PEM: 'Device certificate is invalid.',
  INVALID_HARDWARE_REVISION: 'Device hardware revision is not supported.',
  PAYLOAD_TOO_LARGE: 'The request is too large. Please try again.',
  UNSUPPORTED_MEDIA_TYPE: 'This file type is not supported.',

  // Certificate / crypto
  CERT_EXPIRED: 'Device certificate has expired.',
  CERT_NOT_YET_VALID: 'Device certificate is not yet valid.',
  CERT_NOT_TRUSTED: 'Device certificate is not trusted.',
  CA_NOT_CONFIGURED: 'Certificate authority is not configured.',
  CERT_GENERATION_FAILED: 'Failed to generate device certificate.',

  // Device registry
  DEVICE_ALREADY_REGISTERED: 'This device is already registered.',

  // Household / COPPA
  EXPORT_JOB_FAILED: 'Could not export data. Please try again.',

  // Rate limiting / infra
  TOO_MANY_REQUESTS: 'Too many requests. Please wait a moment.',
  BAD_GATEWAY: 'A connected service failed. Please try again.',
  NOT_FOUND: 'The requested resource was not found.',

  ACCOUNT_LOCKED: 'Account locked for security. Please try again later or contact support.',
  PAYMENT_FAILED: 'Payment could not be processed. Please check your payment method.',
  TOKEN_ALREADY_USED: 'This link or token has already been used.',
  TOKEN_EXPIRED: 'This link or token has expired.',
  invalid_access_token: 'Your session expired. Please sign in again.',
  invalid_refresh_token: 'Your session expired. Please sign in again.',
  validation_failed: 'Please check the information you entered.',
  parent_auth_required: 'Parent sign-in is required.',
  stale_coppa_policy_version: 'Please review the latest consent policy.',
  missing_coppa_consent: 'Parental consent is required before continuing.',

  // US-006 Slice-01 (LANE-MOBILE, M4): lesson-domain codes → parent copy.
  // Lesson codes are net-new (0011); the mobile robot_offline recovery family is
  // reused for UI routing only, not code identity. `<robot>`/`<lesson>` are
  // interpolation tokens — resolve with formatLessonCopy at render.
  // (LOW_STORAGE is NOT a code — it arrives as ASSET_DOWNLOAD_FAILED with
  // context.reason="low_storage"; do not branch on it.)
  ASSET_CHECKSUM_MISMATCH: "Couldn't get this lesson ready. Tap to try again.",
  ASSET_PROFILE_UNAVAILABLE: "This lesson isn't available for <robot> yet.",
  PRELOAD_TIMEOUT: "Couldn't get this lesson ready. Tap to try again.",
  STEP_TIMEOUT: 'Something interrupted the lesson. Tap to restart.',
  ROBOT_OFFLINE: "Couldn't reach <robot>. Check it's on and connected.",
  ROBOT_BUSY: '<robot> is finishing another lesson. Try again in a moment.',
  LOW_BATTERY: '<robot> needs more charge before this lesson can start.',
};

export function getErrorMessage(code: string | undefined): string {
  if (!code) return ERROR_MESSAGES.UNKNOWN_ERROR;
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES.UNKNOWN_ERROR;
}

// Resolves the `<robot>` / `<lesson>` interpolation tokens used by the US-006
// lesson copy (both the M4 error map and the M5 state map). Falls back to
// neutral nouns so a missing name never surfaces a raw token to a parent.
export function formatLessonCopy(copy: string, vars?: { robot?: string; lesson?: string }): string {
  const robot = vars?.robot?.trim() ? vars.robot.trim() : 'your robot';
  const lesson = vars?.lesson?.trim() ? vars.lesson.trim() : 'this lesson';
  return copy.split('<robot>').join(robot).split('<lesson>').join(lesson);
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
          retryable?: boolean;
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
        retryable: typeof data.retryable === 'boolean' ? data.retryable : false,
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
