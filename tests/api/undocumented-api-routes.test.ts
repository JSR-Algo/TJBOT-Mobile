import client from '@/services/http/client';
import { controlsApi } from '@/services/api/controls';
import {
  getSafetyEvents,
  getSessionCost,
  getSessionHistory,
  getWeeklySummary,
} from '@/services/api/dashboard';
import { getBillingProviderStatus } from '@/services/api/purchase.api';

jest.mock('@/services/http/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  },
}));

jest.mock('@/config/feature-flags', () => ({
  FEATURE_AI_PROXY: true,
  FeatureAiProxyDisabledError: jest.requireActual('@/config/feature-flags')
    .FeatureAiProxyDisabledError,
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
    ['getBillingProviderStatus', () => getBillingProviderStatus()],
  ])('%s throws explicit contract-unavailable error before HTTP', async (_name, call) => {
    await expect(call()).rejects.toMatchObject({
      code: 'BACKEND_CONTRACT_UNAVAILABLE',
    });
    expect(mockedClient.get).not.toHaveBeenCalled();
    expect(mockedClient.post).not.toHaveBeenCalled();
    expect(mockedClient.put).not.toHaveBeenCalled();
  });
});
