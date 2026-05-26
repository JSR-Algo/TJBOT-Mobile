import { ERROR_MESSAGES, normalizeError } from '../../src/utils/errors';

describe('normalized HTTP error stability', () => {
  it('keeps network errors retryable and user-safe', () => {
    expect(normalizeError({ request: {}, message: 'Network Error' })).toEqual({
      code: 'NETWORK_ERROR',
      message: ERROR_MESSAGES.NETWORK_ERROR,
      retryable: true,
    });
  });

  it('keeps timeout errors retryable and user-safe', () => {
    expect(normalizeError({ code: 'ECONNABORTED', message: 'timeout of 30000ms exceeded' })).toEqual({
      code: 'NETWORK_ERROR',
      message: ERROR_MESSAGES.NETWORK_ERROR,
      retryable: true,
    });
  });

  it('keeps 401 errors mapped to invalid credentials', () => {
    expect(normalizeError({ response: { status: 401, data: { message: 'Unauthorized' } } })).toEqual({
      code: 'INVALID_CREDENTIALS',
      message: ERROR_MESSAGES.INVALID_CREDENTIALS,
      retryable: false,
      status: 401,
    });
  });

  it('keeps unknown failures controlled', () => {
    expect(normalizeError('raw failure')).toEqual({
      code: 'UNKNOWN_ERROR',
      message: ERROR_MESSAGES.UNKNOWN_ERROR,
      retryable: false,
    });
  });

  it.each([
    ['invalid_access_token', 'Your session expired. Please sign in again.'],
    ['invalid_refresh_token', 'Your session expired. Please sign in again.'],
    ['validation_failed', ERROR_MESSAGES.VALIDATION_ERROR],
    ['parent_auth_required', 'Parent sign-in is required.'],
    ['stale_coppa_policy_version', 'Please review the latest consent policy.'],
    ['missing_coppa_consent', 'Parental consent is required before continuing.'],
  ])('maps documented backend error code %s', (code, message) => {
    expect(normalizeError({ response: { status: 400, data: { error: { code, message: 'backend detail' } } } })).toMatchObject({
      code,
      message,
    });
  });

  it('maps ACCOUNT_ALREADY_EXISTS to specific copy', () => {
    expect(
      normalizeError({ response: { status: 409, data: { error: { code: 'ACCOUNT_ALREADY_EXISTS' } } } })
    ).toMatchObject({
      code: 'ACCOUNT_ALREADY_EXISTS',
      message: ERROR_MESSAGES.ACCOUNT_ALREADY_EXISTS,
    });
  });

  it('joins NestJS class-validator array message (Shape 5)', () => {
    const result = normalizeError({
      response: {
        status: 400,
        data: { message: ['email must be an email', 'password is too short'] },
      },
    });
    expect(result).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'email must be an email. password is too short',
      retryable: false,
    });
  });

  it('extracts numeric Retry-After header on 429', () => {
    const result = normalizeError({
      response: {
        status: 429,
        headers: { 'retry-after': 60 },
        data: { message: 'Too Many Requests' },
      },
    });
    expect(result).toMatchObject({
      code: 'RATE_LIMIT_EXCEEDED',
      retryable: true,
      retryAfterSeconds: 60,
    });
  });

  it('extracts string Retry-After header on 429', () => {
    const result = normalizeError({
      response: {
        status: 429,
        headers: { 'retry-after': '30' },
        data: { message: 'Too Many Requests' },
      },
    });
    expect(result).toMatchObject({
      code: 'RATE_LIMIT_EXCEEDED',
      retryable: true,
      retryAfterSeconds: 30,
    });
  });

  it('maps 504 to GATEWAY_TIMEOUT', () => {
    expect(
      normalizeError({ response: { status: 504, data: { message: 'Gateway Timeout' } } })
    ).toMatchObject({
      code: 'GATEWAY_TIMEOUT',
      message: ERROR_MESSAGES.GATEWAY_TIMEOUT,
      retryable: true,
    });
  });

  it('maps bare 504 to GATEWAY_TIMEOUT', () => {
    expect(normalizeError({ response: { status: 504 } })).toMatchObject({
      code: 'GATEWAY_TIMEOUT',
      retryable: true,
    });
  });

  it('maps 503 to SERVICE_UNAVAILABLE', () => {
    expect(
      normalizeError({ response: { status: 503, data: { message: 'Service Unavailable' } } })
    ).toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      message: ERROR_MESSAGES.SERVICE_UNAVAILABLE,
      retryable: true,
    });
  });

  it('maps bare 503 to SERVICE_UNAVAILABLE', () => {
    expect(normalizeError({ response: { status: 503 } })).toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      retryable: true,
    });
  });
});
