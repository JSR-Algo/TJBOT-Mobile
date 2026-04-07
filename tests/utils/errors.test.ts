import { getErrorMessage, normalizeError, ERROR_MESSAGES } from '../../src/utils/errors';

describe('getErrorMessage', () => {
  it('returns message for INVALID_CREDENTIALS', () => {
    expect(getErrorMessage('INVALID_CREDENTIALS')).toBe(ERROR_MESSAGES.INVALID_CREDENTIALS);
  });

  it('returns message for USER_EXISTS', () => {
    expect(getErrorMessage('USER_EXISTS')).toBe(ERROR_MESSAGES.USER_EXISTS);
  });

  it('returns message for VALIDATION_ERROR', () => {
    expect(getErrorMessage('VALIDATION_ERROR')).toBe(ERROR_MESSAGES.VALIDATION_ERROR);
  });

  it('returns message for INTERNAL_ERROR', () => {
    expect(getErrorMessage('INTERNAL_ERROR')).toBe(ERROR_MESSAGES.INTERNAL_ERROR);
  });

  it('returns message for NETWORK_ERROR', () => {
    expect(getErrorMessage('NETWORK_ERROR')).toBe(ERROR_MESSAGES.NETWORK_ERROR);
  });

  it('falls back to UNKNOWN_ERROR for unknown code', () => {
    expect(getErrorMessage('MADE_UP_CODE')).toBe(ERROR_MESSAGES.UNKNOWN_ERROR);
  });

  it('falls back to UNKNOWN_ERROR when code is undefined', () => {
    expect(getErrorMessage(undefined)).toBe(ERROR_MESSAGES.UNKNOWN_ERROR);
  });
});

describe('normalizeError', () => {
  it('extracts error code from axios-style response and maps to human message', () => {
    const axiosError = {
      response: {
        data: { error: { code: 'INVALID_CREDENTIALS', message: 'Bad credentials' } },
        status: 401,
      },
    };
    const result = normalizeError(axiosError);
    expect(result.code).toBe('INVALID_CREDENTIALS');
    expect(result.message).toBe(ERROR_MESSAGES.INVALID_CREDENTIALS);
  });

  it('returns NETWORK_ERROR for request without response', () => {
    const axiosError = { request: {}, message: 'Network Error' };
    const result = normalizeError(axiosError);
    expect(result.code).toBe('NETWORK_ERROR');
    expect(result.message).toBe(ERROR_MESSAGES.NETWORK_ERROR);
    expect(result.retryable).toBe(true);
  });

  it('handles plain Error objects', () => {
    const result = normalizeError(new Error('Something failed'));
    expect(result.code).toBe('UNKNOWN_ERROR');
    expect(typeof result.message).toBe('string');
  });

  it('handles unknown errors gracefully', () => {
    const result = normalizeError('raw string error');
    expect(result.code).toBe('UNKNOWN_ERROR');
    expect(typeof result.message).toBe('string');
  });
});
