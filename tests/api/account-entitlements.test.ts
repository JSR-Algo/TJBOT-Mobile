// `GET /account/entitlements` never existed backend-side: @Controller('account')
// serves only `DELETE /` and `GET /export`, and the entitlement read model is
// the server-to-server `GET /internal/v1/entitlements/{householdId}`, which a
// parent JWT cannot reach. This file used to assert the in-flight dedup of a
// call that could only 404; it now pins the fail-closed contract (T5.2).
import client from '@/services/http/client';
import { refreshEntitlementsAfterPurchase } from '@/services/api/account';

jest.mock('@/services/http/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const mockedClient = client as jest.Mocked<typeof client>;

describe('purchase entitlement refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects on the contract sentinel without issuing a request', async () => {
    await expect(refreshEntitlementsAfterPurchase()).rejects.toMatchObject({
      code: 'BACKEND_CONTRACT_UNAVAILABLE',
    });
    expect(mockedClient.get).not.toHaveBeenCalled();
  });

  it('stays rejected across repeated calls', async () => {
    await expect(refreshEntitlementsAfterPurchase()).rejects.toMatchObject({
      code: 'BACKEND_CONTRACT_UNAVAILABLE',
    });
    await expect(refreshEntitlementsAfterPurchase()).rejects.toMatchObject({
      code: 'BACKEND_CONTRACT_UNAVAILABLE',
    });
    expect(mockedClient.get).not.toHaveBeenCalled();
  });
});
