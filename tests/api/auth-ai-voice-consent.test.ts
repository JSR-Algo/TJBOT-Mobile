import client from '@/services/http/client';
import { recordAiVoiceConsent } from '@/services/api/auth';

jest.mock('@/services/http/client', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

const mockedClient = client as jest.Mocked<typeof client>;

describe('AI voice consent API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('posts versioned AI voice consent for Google sub-processing', async () => {
    mockedClient.post.mockResolvedValueOnce({
      data: { data: { consent_id: 'voice-consent-1' } },
    });

    await expect(recordAiVoiceConsent({
      consent_version: 'ai-voice-google-v1',
      google_subprocessors_version: 'google-subprocessors-v1',
    })).resolves.toEqual({ consent_id: 'voice-consent-1' });

    expect(mockedClient.post).toHaveBeenCalledWith('/identity/ai-voice-consent', {
      consent_version: 'ai-voice-google-v1',
      google_subprocessors_version: 'google-subprocessors-v1',
    });
  });
});
