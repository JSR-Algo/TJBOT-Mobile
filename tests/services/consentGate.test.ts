import { requireParentCoppaConsent } from '@/services/consent/consentGate';
import * as accountApi from '@/services/api/account';

jest.mock('@/services/api/account', () => ({
  isCoppaVerified: jest.fn(),
}));

const mockedIsCoppaVerified = accountApi.isCoppaVerified as jest.MockedFunction<
  typeof accountApi.isCoppaVerified
>;

describe('consentGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows when COPPA is verified', async () => {
    mockedIsCoppaVerified.mockResolvedValueOnce(true);
    await expect(requireParentCoppaConsent()).resolves.toEqual({ allowed: true });
  });

  it('blocks and routes to parent consent when unverified', async () => {
    mockedIsCoppaVerified.mockResolvedValueOnce(false);
    await expect(requireParentCoppaConsent()).resolves.toEqual({
      allowed: false,
      code: 'missing_coppa_consent',
      route: 'ParentConsentScreen',
    });
  });
});