import { refresh } from '@/services/api/auth';
import client from '@/services/http/client';
import { getRefreshToken, setTokens } from '@/services/http/tokens';

jest.mock('@/services/http/client', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

jest.mock('@/services/http/tokens', () => ({
  getRefreshToken: jest.fn(),
  setTokens: jest.fn(),
  clearTokens: jest.fn(),
}));

const mockedClient = client as jest.Mocked<typeof client>;
const mockedGetRefresh = getRefreshToken as jest.MockedFunction<typeof getRefreshToken>;
const mockedSetTokens = setTokens as jest.MockedFunction<typeof setTokens>;

describe('auth.refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('posts stored refresh_token and persists rotated tokens', async () => {
    mockedGetRefresh.mockResolvedValue('rt-old');
    mockedClient.post.mockResolvedValue({
      data: {
        access_token: 'at-new',
        refresh_token: 'rt-new',
        expires_in: 900,
      },
    });

    const result = await refresh('req-1');

    expect(mockedClient.post).toHaveBeenCalledWith(
      '/auth/refresh',
      { refresh_token: 'rt-old' },
      expect.objectContaining({ headers: expect.any(Object) }),
    );
    expect(mockedSetTokens).toHaveBeenCalledWith('at-new', 'rt-new');
    expect(result.access_token).toBe('at-new');
    expect(result.refresh_token).toBe('rt-new');
  });

  it('throws when no refresh token is stored', async () => {
    mockedGetRefresh.mockResolvedValue(null);
    await expect(refresh()).rejects.toThrow('No refresh token');
    expect(mockedClient.post).not.toHaveBeenCalled();
  });

  it('posts body without headers when requestId omitted', async () => {
    mockedGetRefresh.mockResolvedValue('rt-old');
    mockedClient.post.mockResolvedValue({
      data: { access_token: 'at-new', refresh_token: 'rt-new' },
    });
    await refresh();
    expect(mockedClient.post).toHaveBeenCalledWith(
      '/auth/refresh',
      { refresh_token: 'rt-old' },
    );
  });
});
