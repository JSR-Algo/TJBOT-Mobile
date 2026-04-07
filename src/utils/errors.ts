export const ERROR_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: 'Please check the information you entered.',
  USER_EXISTS: 'An account with this email already exists.',
  INVALID_CREDENTIALS: 'Incorrect email or password.',
  HOUSEHOLD_NOT_FOUND: 'Household not found.',
  DEVICE_ALREADY_CLAIMED: 'This device is already paired to another account.',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please wait a moment.',
  INTERNAL_ERROR: 'Something went wrong on our end. Please try again.',
  NETWORK_ERROR: 'Check your internet connection and try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
};

export function getErrorMessage(code: string | undefined): string {
  if (!code) return ERROR_MESSAGES.UNKNOWN_ERROR;
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES.UNKNOWN_ERROR;
}

export interface AppError {
  code: string;
  message: string;
  retryable?: boolean;
}

export function normalizeError(error: unknown): AppError {
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
        data?: {
          error?: { code?: string; message?: string; retryable?: boolean };
          // NestJS / Express common shapes
          message?: string | string[];
          statusCode?: number;
          code?: string;
        };
      };
    };
    const data = axiosError.response?.data;
    const status = axiosError.response?.status;

    // Shape 1: { error: { code, message } }
    if (data?.error && typeof data.error === 'object') {
      const errData = data.error;
      return {
        code: errData.code ?? 'UNKNOWN_ERROR',
        message: getErrorMessage(errData.code) !== ERROR_MESSAGES.UNKNOWN_ERROR
          ? getErrorMessage(errData.code)
          : (errData.message ?? ERROR_MESSAGES.UNKNOWN_ERROR),
        retryable: errData.retryable ?? false,
      };
    }

    // Shape 2: { code, message } at root
    if (data?.code && typeof data.code === 'string') {
      return {
        code: data.code,
        message: getErrorMessage(data.code) !== ERROR_MESSAGES.UNKNOWN_ERROR
          ? getErrorMessage(data.code)
          : (typeof data.message === 'string' ? data.message : ERROR_MESSAGES.UNKNOWN_ERROR),
        retryable: false,
      };
    }

    // Shape 3: NestJS { statusCode, message } — surface message directly
    if (data?.message) {
      const msg = Array.isArray(data.message) ? data.message[0] : data.message;
      if (status === 409) return { code: 'USER_EXISTS', message: ERROR_MESSAGES.USER_EXISTS, retryable: false };
      if (status === 401) return { code: 'INVALID_CREDENTIALS', message: ERROR_MESSAGES.INVALID_CREDENTIALS, retryable: false };
      if (status === 429) return { code: 'RATE_LIMIT_EXCEEDED', message: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED, retryable: true };
      if (status === 500) return { code: 'INTERNAL_ERROR', message: ERROR_MESSAGES.INTERNAL_ERROR, retryable: true };
      return { code: 'SERVER_ERROR', message: msg ?? ERROR_MESSAGES.UNKNOWN_ERROR, retryable: false };
    }

    // Shape 4: bare HTTP error with no body
    if (status && status >= 500) return { code: 'INTERNAL_ERROR', message: ERROR_MESSAGES.INTERNAL_ERROR, retryable: true };
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as { message: string }).message;
    if (msg.includes('Network Error') || msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND') || msg.includes('timeout')) {
      return { code: 'NETWORK_ERROR', message: ERROR_MESSAGES.NETWORK_ERROR, retryable: true };
    }
    // Surface the raw message rather than hiding it behind UNKNOWN_ERROR
    return { code: 'UNKNOWN_ERROR', message: msg, retryable: false };
  }

  return { code: 'UNKNOWN_ERROR', message: ERROR_MESSAGES.UNKNOWN_ERROR, retryable: false };
}
