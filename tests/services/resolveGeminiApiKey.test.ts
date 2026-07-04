jest.mock('@/config/geminiDemoKey', () => ({
  getGeminiDemoApiKey: jest.fn(),
}));

jest.mock('@/services/http/client', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

import apiClient from '@/services/http/client';
import { getGeminiDemoApiKey } from '@/config/geminiDemoKey';
import { resolveGeminiApiKey } from '@/services/gemini/resolveGeminiApiKey';

const mockGetDemoKey = getGeminiDemoApiKey as jest.MockedFunction<typeof getGeminiDemoApiKey>;
const mockPost = apiClient.post as jest.Mock;

describe('resolveGeminiApiKey', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns demo env key without calling backend', async () => {
    mockGetDemoKey.mockReturnValue('AIzaDemoKeyOnlyForTestPurposes123');
    const result = await resolveGeminiApiKey();
    expect(result).toEqual({
      apiKey: 'AIzaDemoKeyOnlyForTestPurposes123',
      source: 'demo_env',
    });
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('falls back to backend token when demo key absent', async () => {
    mockGetDemoKey.mockReturnValue(null);
    mockPost.mockResolvedValue({ data: { token: 'ephemeral-token-abc' } });
    const result = await resolveGeminiApiKey();
    expect(result).toEqual({
      apiKey: 'ephemeral-token-abc',
      source: 'backend_token',
    });
    expect(mockPost).toHaveBeenCalledWith('/gemini/token', {});
  });
});