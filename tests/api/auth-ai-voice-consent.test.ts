import client from '@/services/http/client';
import { recordAiVoiceConsent, withdrawAiVoiceConsent } from '@/services/api/auth';

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

  it('withdraws AI voice consent with a parent reason', async () => {
    mockedClient.post.mockResolvedValueOnce({
      data: {
        data: {
          consent_id: 'voice-consent-1',
          status: 'withdrawn',
          withdrawn_at: '2026-07-02T00:00:00.000Z',
        },
      },
    });

    await expect(withdrawAiVoiceConsent({
      reason: 'Parent paused AI voice lessons from mobile settings.',
    })).resolves.toEqual({
      consent_id: 'voice-consent-1',
      status: 'withdrawn',
      withdrawn_at: '2026-07-02T00:00:00.000Z',
    });

    expect(mockedClient.post).toHaveBeenCalledWith('/identity/ai-voice-consent/withdraw', {
      reason: 'Parent paused AI voice lessons from mobile settings.',
    });
  });
});
