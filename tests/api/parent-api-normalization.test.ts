import client from '@/services/http/client';
import {
  authenticateParent,
  BackendContractUnavailableError,
  clearParentLockout,
  getParentSummary,
} from '@/services/api/parent.api';

jest.mock('@/services/http/client', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

const mockedClient = client as jest.Mocked<typeof client>;

describe('parent API response normalization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('unwraps parent auth responses from API envelopes', async () => {
    mockedClient.post.mockResolvedValueOnce({
      data: { data: { authenticated: true, authenticated_at: '2026-05-18T00:00:00.000Z' } },
    });

    await expect(authenticateParent({ pin: '1234' })).resolves.toEqual({
      authenticated: true,
      authenticated_at: '2026-05-18T00:00:00.000Z',
    });

    expect(mockedClient.post).toHaveBeenCalledWith('/parent/auth', { pin: '1234' });
  });

  it('normalizes clear-lockout request keys and direct backend responses', async () => {
    mockedClient.post.mockResolvedValueOnce({ data: { cleared: true } });

    await expect(clearParentLockout({ targetUserId: 'parent-1', reason: 'manual review' })).resolves.toEqual({
      cleared: true,
    });

    expect(mockedClient.post).toHaveBeenCalledWith(
      '/parent/lockout/clear',
      { target_user_id: 'parent-1', reason: 'manual review' },
    );
  });

  it('keeps undocumented summary routes explicit instead of returning guessed data', async () => {
    await expect(getParentSummary()).rejects.toMatchObject({
      name: 'BackendContractUnavailableError',
      code: 'BACKEND_CONTRACT_UNAVAILABLE',
    } satisfies Partial<BackendContractUnavailableError>);
  });
});
