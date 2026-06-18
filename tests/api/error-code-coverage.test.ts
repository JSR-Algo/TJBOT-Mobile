import { ERROR_MESSAGES, getErrorMessage, normalizeError } from '../../src/utils/errors';

const MUST_MAP_CODES = [
  'USER_EXISTS',
  'ACCOUNT_ALREADY_EXISTS',
  'INVALID_CREDENTIALS',
  'VALIDATION_ERROR',
  'RATE_LIMIT_EXCEEDED',
  'INTERNAL_ERROR',
  'NETWORK_ERROR',
  'missing_coppa_consent',
  'AUTH_REFRESH_REUSE',
  'AUTH_TOKEN_EXPIRED',
  'ACCOUNT_LOCKED',
  'DEVICE_NOT_OWNED',
  'DEVICE_NOT_CLAIMED',
  'PAYMENT_FAILED',
  'TOKEN_ALREADY_USED',
  'TOKEN_EXPIRED',
  // Expanded coverage for backend error-code.ts union
  'AUTH_TOKEN_MISSING',
  'AUTH_TOKEN_INVALID',
  'AUTH_SERVER_ERROR',
  'FACTORY_AUTH_MISSING',
  'FACTORY_AUTH_INVALID',
  'FACTORY_AUTH_NOT_CONFIGURED',
  'INVALID_CERTIFICATE_PEM',
  'INVALID_HARDWARE_REVISION',
  'PAYLOAD_TOO_LARGE',
  'UNSUPPORTED_MEDIA_TYPE',
  'CERT_EXPIRED',
  'CERT_NOT_YET_VALID',
  'CERT_NOT_TRUSTED',
  'CA_NOT_CONFIGURED',
  'CERT_GENERATION_FAILED',
  'DEVICE_ALREADY_REGISTERED',
  'DEVICE_NOT_FOUND',
  'DEVICE_ALREADY_CLAIMED',
  'INVALID_BLE_CODE',
  'BLE_CODE_EXPIRED',
  'HOUSEHOLD_NOT_FOUND',
  'HOUSEHOLD_ACCESS_DENIED',
  'CHILD_PROFILE_NOT_FOUND',
  'EXPORT_JOB_FAILED',
  'TOO_MANY_REQUESTS',
  'BAD_GATEWAY',
  'NOT_FOUND',
  'FORBIDDEN',
  'UNAUTHORIZED',
  'CONFLICT',
  'GONE',
  'GATEWAY_TIMEOUT',
  'SERVICE_UNAVAILABLE',
] as const;

describe('error code coverage — user-facing codes must not fall through to UNKNOWN', () => {
  it.each(MUST_MAP_CODES)('getErrorMessage(%s) returns non-UNKNOWN copy', (code) => {
    const message = getErrorMessage(code);
    expect(message).toBeDefined();
    expect(message).not.toBe(ERROR_MESSAGES.UNKNOWN_ERROR);
  });

  it('USER_EXISTS via Shape 1 maps to specific copy', () => {
    const result = normalizeError({
      response: { status: 409, data: { error: { code: 'USER_EXISTS' } } },
    });
    expect(result.message).not.toBe(ERROR_MESSAGES.UNKNOWN_ERROR);
    expect(result.code).toBe('USER_EXISTS');
  });

  it('ACCOUNT_ALREADY_EXISTS via Shape 1 maps to specific copy', () => {
    const result = normalizeError({
      response: { status: 409, data: { error: { code: 'ACCOUNT_ALREADY_EXISTS' } } },
    });
    expect(result.message).not.toBe(ERROR_MESSAGES.UNKNOWN_ERROR);
    expect(result.code).toBe('ACCOUNT_ALREADY_EXISTS');
  });

  it('INVALID_CREDENTIALS via Shape 1 maps to specific copy', () => {
    const result = normalizeError({
      response: { status: 401, data: { error: { code: 'INVALID_CREDENTIALS' } } },
    });
    expect(result.message).not.toBe(ERROR_MESSAGES.UNKNOWN_ERROR);
    expect(result.code).toBe('INVALID_CREDENTIALS');
  });

  it('RATE_LIMIT_EXCEEDED via Shape 1 maps to specific copy', () => {
    const result = normalizeError({
      response: { status: 429, data: { error: { code: 'RATE_LIMIT_EXCEEDED' } } },
    });
    expect(result.message).not.toBe(ERROR_MESSAGES.UNKNOWN_ERROR);
    expect(result.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('missing_coppa_consent via Shape 1 maps to specific copy', () => {
    const result = normalizeError({
      response: { status: 403, data: { error: { code: 'missing_coppa_consent' } } },
    });
    expect(result.message).toBe(ERROR_MESSAGES.missing_coppa_consent);
    expect(result.code).toBe('missing_coppa_consent');
  });
});
