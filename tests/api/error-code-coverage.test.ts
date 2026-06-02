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
