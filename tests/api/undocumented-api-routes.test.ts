import client from '@/services/http/client';
import {
  chat,
  synthesize,
  transcribe,
} from '@/services/api/ai';
import { controlsApi } from '@/services/api/controls';
import {
  getSafetyEvents,
  getSessionCost,
  getSessionHistory,
  getWeeklySummary,
} from '@/services/api/dashboard';
import {
  completeSession,
  getChildProfile,
  getInteractions,
  getKPIs,
  getPronunciationTrend,
  getTodaySession,
  saveInteraction,
  updateChildProfile,
} from '@/services/api/learning';
import { getBillingProviderStatus } from '@/services/api/purchase.api';

jest.mock('@/services/http/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  },
}));

const mockedClient = client as jest.Mocked<typeof client>;

describe('undocumented API routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ['controlsApi.getControls', () => controlsApi.getControls('device-1')],
    ['controlsApi.updateControls', () => controlsApi.updateControls('device-1', {})],
    ['getSessionHistory', () => getSessionHistory('device-1')],
    ['getSafetyEvents', () => getSafetyEvents('device-1')],
    ['getWeeklySummary', () => getWeeklySummary('device-1')],
    ['getSessionCost', () => getSessionCost('device-1')],
    ['getChildProfile', () => getChildProfile('child-1')],
    ['updateChildProfile', () => updateChildProfile('child-1', {})],
    ['getTodaySession', () => getTodaySession('child-1')],
    ['saveInteraction', () => saveInteraction('child-1', { user_message: 'hi', ai_response: 'hello' })],
    ['getInteractions', () => getInteractions('child-1')],
    ['getKPIs', () => getKPIs('child-1')],
    ['completeSession', () => completeSession('child-1', { session_id: 's1', prompts_shown: 1, responses_given: 1, correct_responses: 1 })],
    ['getPronunciationTrend', () => getPronunciationTrend('child-1')],
    ['getBillingProviderStatus', () => getBillingProviderStatus()],
    ['transcribe', () => transcribe('file:///tmp/audio.m4a')],
    ['chat', () => chat('hello')],
    ['synthesize', () => synthesize('hello')],
  ])('%s throws explicit contract-unavailable error before HTTP', async (_name, call) => {
    await expect(call()).rejects.toMatchObject({
      code: 'BACKEND_CONTRACT_UNAVAILABLE',
    });
    expect(mockedClient.get).not.toHaveBeenCalled();
    expect(mockedClient.post).not.toHaveBeenCalled();
    expect(mockedClient.put).not.toHaveBeenCalled();
  });
});
