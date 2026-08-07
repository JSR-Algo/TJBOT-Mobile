import client from '../../src/services/http/client';
import {
  getHistory,
  getPreferences,
  registerPushToken,
  removePushToken,
  updatePreferences,
} from '../../src/services/api/notifications';

jest.mock('../../src/services/http/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    put: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockGet = client.get as jest.MockedFunction<typeof client.get>;
const mockPut = client.put as jest.MockedFunction<typeof client.put>;
const mockPost = client.post as jest.MockedFunction<typeof client.post>;
const mockDelete = client.delete as jest.MockedFunction<typeof client.delete>;

describe('notifications API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers push tokens with the backend token endpoint', async () => {
    mockPost.mockResolvedValueOnce({ data: { data: { id: 'token-1' } } });

    await registerPushToken('ExponentPushToken[abc]', 'ios');

    expect(mockPost).toHaveBeenCalledWith('/notifications/push-token', {
      token: 'ExponentPushToken[abc]',
      platform: 'ios',
    });
  });

  it('unregisters push tokens on the live path-param route (the delete-by-body modular route is unmounted)', async () => {
    mockDelete.mockResolvedValueOnce({ data: { data: { revoked: true } } });

    await removePushToken('ExponentPushToken[abc]');

    expect(mockDelete).toHaveBeenCalledWith('/notifications/push-token/ExponentPushToken%5Babc%5D');
  });

  it('roundtrips notification preferences through GET and PUT', async () => {
    const preferences = {
      id: 'pref-1',
      parent_id: 'parent-1',
      email_digest_enabled: true,
      email_digest_frequency: 'daily' as const,
      safety_alerts_enabled: true,
      push_enabled: false,
      created_at: '2026-05-16T00:00:00.000Z',
      updated_at: '2026-05-16T00:00:00.000Z',
    };
    mockGet.mockResolvedValueOnce({ data: { data: preferences } });
    mockPut.mockResolvedValueOnce({ data: { data: { ...preferences, push_enabled: true } } });

    await expect(getPreferences()).resolves.toEqual(preferences);
    await expect(updatePreferences({ push_enabled: true })).resolves.toMatchObject({ push_enabled: true });

    expect(mockGet).toHaveBeenCalledWith('/notifications/preferences');
    expect(mockPut).toHaveBeenCalledWith('/notifications/preferences', { push_enabled: true });
  });

  it('loads notification history from the live Nest route (/me/notifications is unmounted)', async () => {
    mockGet.mockResolvedValueOnce({ data: { data: [] } });

    await expect(getHistory(10)).resolves.toEqual([]);

    expect(mockGet).toHaveBeenCalledWith('/notifications/history', { params: { limit: 10 } });
  });

  it('surfaces shared-client auth and rate-limit failures unchanged', async () => {
    const authError = { status: 401, code: 'SESSION_EXPIRED' };
    const rateLimitError = { status: 429, retryable: true };
    mockGet.mockRejectedValueOnce(authError);
    mockPut.mockRejectedValueOnce(rateLimitError);

    await expect(getPreferences()).rejects.toBe(authError);
    await expect(updatePreferences({ push_enabled: false })).rejects.toBe(rateLimitError);
  });
});
