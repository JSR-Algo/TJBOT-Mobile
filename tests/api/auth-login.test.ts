import client from '@/services/http/client';
import { login } from '@/services/api/auth';
import { setTokens } from '@/services/http/tokens';

jest.mock('@/services/http/client', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

jest.mock('@/services/http/tokens', () => ({
  setTokens: jest.fn(async () => undefined),
  clearTokens: jest.fn(async () => undefined),
}));

const mockedClient = client as jest.Mocked<typeof client>;
const mockedSetTokens = setTokens as jest.MockedFunction<typeof setTokens>;

describe('auth login API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards optional session metadata and returns the real backend login response', async () => {
    const backendResponse = {
      access_token: 'access-1',
      refresh_token: 'refresh-1',
      expires_in: 900,
      access_token_expires_at: '2026-07-15T12:15:00.000Z',
      refresh_token_expires_at: '2026-08-14T12:00:00.000Z',
      user_id: 'parent-1',
    };
    mockedClient.post.mockResolvedValueOnce({ data: backendResponse });

    await expect(login('parent@example.test', 'StrongPass1!', {
      deviceName: 'Rewards Live Jest',
      platform: 'test',
    })).resolves.toEqual(backendResponse);

    expect(mockedClient.post).toHaveBeenCalledWith('/auth/login', {
      email: 'parent@example.test',
      password: 'StrongPass1!',
      deviceName: 'Rewards Live Jest',
      platform: 'test',
    });
    expect(mockedSetTokens).toHaveBeenCalledWith('access-1', 'refresh-1');
  });

  it('keeps two-argument callers byte-compatible', async () => {
    mockedClient.post.mockResolvedValueOnce({
      data: {
        access_token: 'access-2',
        refresh_token: 'refresh-2',
        expires_in: 900,
        user_id: 'parent-2',
      },
    });

    await login('legacy@example.test', 'StrongPass1!');

    expect(mockedClient.post).toHaveBeenCalledWith('/auth/login', {
      email: 'legacy@example.test',
      password: 'StrongPass1!',
    });
    expect(mockedSetTokens).toHaveBeenCalledWith('access-2', 'refresh-2');
  });
});
