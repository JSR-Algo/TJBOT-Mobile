import { resolveCoppaBypassToken } from '@/features/onboarding/screens/ParentConsentScreen';

jest.mock('react-native-svg', () => ({
  __esModule: true,
  default: () => null,
  Path: () => null,
}));

describe('resolveCoppaBypassToken (QA consent bypass gate)', () => {
  const originalToken = process.env.EXPO_PUBLIC_COPPA_BYPASS_TOKEN;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_COPPA_BYPASS_TOKEN = 'tok_qa_test';
  });

  afterAll(() => {
    if (originalToken === undefined) {
      delete process.env.EXPO_PUBLIC_COPPA_BYPASS_TOKEN;
    } else {
      process.env.EXPO_PUBLIC_COPPA_BYPASS_TOKEN = originalToken;
    }
  });

  it('is unavailable in non-dev builds even with the QA flag set', () => {
    expect(resolveCoppaBypassToken(false, 'true')).toBeUndefined();
    expect(resolveCoppaBypassToken(false, '1')).toBeUndefined();
    expect(resolveCoppaBypassToken(false, ' true ')).toBeUndefined();
  });

  it('is unavailable in dev when the QA flag is unset or off', () => {
    expect(resolveCoppaBypassToken(true, '')).toBeUndefined();
    expect(resolveCoppaBypassToken(true, 'false')).toBeUndefined();
    expect(resolveCoppaBypassToken(true, '0')).toBeUndefined();
    expect(resolveCoppaBypassToken(true, 'yes')).toBeUndefined();
  });

  it('never returns the retired OTA mock token', () => {
    expect(resolveCoppaBypassToken(false, 'true')).not.toBe('tok_mock_ota_beta');
    expect(resolveCoppaBypassToken(true, 'true')).not.toBe('tok_mock_ota_beta');
  });

  it('passes through the .env bypass token only for dev builds with the flag on', () => {
    expect(resolveCoppaBypassToken(true, 'true')).toBe('tok_qa_test');
    expect(resolveCoppaBypassToken(true, ' 1 ')).toBe('tok_qa_test');
  });
});
