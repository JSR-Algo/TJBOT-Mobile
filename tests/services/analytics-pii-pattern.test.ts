import { SENSITIVE_PROPERTY_PATTERN } from '../../src/services/observability/analytics';

describe('analytics SENSITIVE_PROPERTY_PATTERN', () => {
  const sensitiveKeys = [
    'email',
    'token',
    'accessToken',
    'refresh_token',
    'secret',
    'password',
    'transcript',
    'audio',
    'childName',
    'child_name',
    'deviceName',
    'device_name',
    'parentName',
    'parent_name',
    'displayName',
    'display_name',
    'firstName',
    'first_name',
    'lastName',
    'last_name',
    'dob',
    'birthdate',
    'address',
    'phone',
  ];

  it.each(sensitiveKeys)('matches sensitive key "%s"', (key) => {
    expect(SENSITIVE_PROPERTY_PATTERN.test(key)).toBe(true);
  });

  const safeKeys = ['retryable', 'status', 'duration_ms', 'eventCount', 'role', 'success'];

  it.each(safeKeys)('does not match safe key "%s"', (key) => {
    expect(SENSITIVE_PROPERTY_PATTERN.test(key)).toBe(false);
  });
});
