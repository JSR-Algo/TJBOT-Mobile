import { readFileSync } from 'fs';
import { join } from 'path';
import { OWNED_AI_V1, OWNED_API_V1 } from '../../src/constants/ownedBackend';

/**
 * Resolution-order tests for src/config.ts::getApiBaseUrl()
 *
 * Guards against regressions of the 2026-05-03 onboarding Network Error fix
 * (.omc/plans/2026-05-03-mobile-onboarding-network-error-fix.md).
 *
 * The function re-reads process.env on each call. All platforms share the same
 * canonical Linux backend unless an explicit EXPO_PUBLIC_* URL is provided.
 */

describe('getApiBaseUrl resolution order', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('does not rewrite the static env bridge when Metro config is loaded', () => {
    const envPath = join(__dirname, '..', '..', 'src', '__env__.ts');
    const before = readFileSync(envPath, 'utf8');

    try {
      jest.resetModules();
      jest.doMock('expo/metro-config', () => ({
        getDefaultConfig: () => ({ resolver: { sourceExts: [], resolverMainFields: [] } }),
      }));

      require('../../metro.config.js');

      expect(readFileSync(envPath, 'utf8')).toBe(before);
    } finally {
      jest.dontMock('expo/metro-config');
    }
  });

  function loadConfig(opts: {
    envApiUrl?: string;
    envAiUrl?: string;
  }): Pick<typeof import('../../src/config'), 'getApiBaseUrl' | 'getAiBaseUrl'> {
    const {
      envApiUrl = '',
      envAiUrl = '',
    } = opts;

    process.env.EXPO_PUBLIC_TBOT_API_URL = envApiUrl;
    process.env.EXPO_PUBLIC_TBOT_AI_URL = envAiUrl;

    return require('../../src/config') as Pick<typeof import('../../src/config'), 'getApiBaseUrl' | 'getAiBaseUrl'>;
  }

  function loadGetApiBaseUrl(opts: Parameters<typeof loadConfig>[0]): () => string {
    return loadConfig(opts).getApiBaseUrl;
  }

  it('explicit EXPO_PUBLIC_TBOT_API_URL wins (with /v1 appended)', () => {
    const get = loadGetApiBaseUrl({ envApiUrl: 'https://staging.TJBot.app' });
    expect(get()).toBe('https://staging.TJBot.app/v1');
  });

  it('preserves /v1 when explicit URL already has it', () => {
    const get = loadGetApiBaseUrl({ envApiUrl: 'https://staging.TJBot.app/v1' });
    expect(get()).toBe('https://staging.TJBot.app/v1');
  });

  it('honors an explicit localhost API for intentional local development', () => {
    const get = loadGetApiBaseUrl({ envApiUrl: 'http://localhost:3000' });
    expect(get()).toBe('http://localhost:3000/v1');
  });

  it('uses the Linux backend when no API env is configured', () => {
    const get = loadGetApiBaseUrl({ envApiUrl: '' });
    expect(get()).toBe(OWNED_API_V1);
  });

  it('honors an explicit localhost AI URL for intentional local development', () => {
    const { getAiBaseUrl } = loadConfig({ envAiUrl: 'http://localhost:3001/api/ai/' });
    expect(getAiBaseUrl()).toBe('http://localhost:3001/api/ai');
  });

  it('uses the Linux backend when no AI env is configured', () => {
    const { getAiBaseUrl } = loadConfig({ envAiUrl: '' });
    expect(getAiBaseUrl()).toBe(OWNED_AI_V1);
  });
});
