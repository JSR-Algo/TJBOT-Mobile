import { readFileSync } from 'fs';
import { join } from 'path';
import { LOCAL_OWNED_AI_V1, LOCAL_OWNED_API_V1, OWNED_AI_V1, OWNED_API_V1 } from '../../src/constants/ownedBackend';

/**
 * Resolution-order tests for src/config.ts::getApiBaseUrl()
 *
 * Guards against regressions of the 2026-05-03 onboarding Network Error fix
 * (.omc/plans/2026-05-03-mobile-onboarding-network-error-fix.md).
 *
 * The function re-reads process.env / NativeModules / Device.isDevice on each
 * call, but it captures __DEV__ and Platform.OS lazily through closures, so the
 * cleanest way to vary inputs per test is jest.isolateModules + per-test mocks
 * of 'react-native' and 'expo-device'.
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
    scriptURL?: string | null | undefined;
    isDevice?: boolean;
    platformOS?: 'ios' | 'android';
    dev?: boolean;
  }): Pick<typeof import('../../src/config'), 'getApiBaseUrl' | 'getAiBaseUrl'> {
    const {
      envApiUrl = '',
      envAiUrl = '',
      scriptURL = null,
      isDevice = true,
      platformOS = 'ios',
      dev = true,
    } = opts;

    jest.doMock('../../src/__env__', () => ({
      ENV: {
        TBOT_API_URL: envApiUrl,
        TBOT_AI_URL: envAiUrl,
        EXPO_PUBLIC_GEMINI_LIVE_MODEL: '',
        EXPO_PUBLIC_SENTRY_DSN: '',
        EXPO_PUBLIC_POSTHOG_API_KEY: '',
        EXPO_PUBLIC_POSTHOG_HOST: '',
        EXPO_PUBLIC_VOICE_TEST_HARNESS: '',
        EXPO_PUBLIC_VOICE_BARGE_IN_BUDGET_MS: '',
        EXPO_PUBLIC_VOICE_CANCEL_UNACK_RECOVERY: '',
      },
    }));
    process.env.EXPO_PUBLIC_TBOT_API_URL = envApiUrl;
    process.env.EXPO_PUBLIC_TBOT_AI_URL = envAiUrl;

    jest.doMock('expo-device', () => ({ isDevice }));

    jest.doMock('react-native', () => ({
      Platform: { OS: platformOS },
      NativeModules:
        scriptURL === undefined
          ? {}
          : { SourceCode: { scriptURL } },
    }));

    // __DEV__ is a global the RN bundler injects. Override on globalThis so
    // the module-under-test sees the requested value.
    (globalThis as unknown as { __DEV__: boolean }).__DEV__ = dev;

    return require('../../src/config') as Pick<typeof import('../../src/config'), 'getApiBaseUrl' | 'getAiBaseUrl'>;
  }

  function loadGetApiBaseUrl(opts: Parameters<typeof loadConfig>[0]): () => string {
    return loadConfig(opts).getApiBaseUrl;
  }

  it('explicit non-localhost ENV.TBOT_API_URL wins (with /v1 appended)', () => {
    const get = loadGetApiBaseUrl({ envApiUrl: 'https://staging.TJBot.app' });
    expect(get()).toBe('https://staging.TJBot.app/v1');
  });

  it('preserves /v1 when explicit URL already has it', () => {
    const get = loadGetApiBaseUrl({ envApiUrl: 'https://staging.TJBot.app/v1' });
    expect(get()).toBe('https://staging.TJBot.app/v1');
  });

  it('treats literal http://localhost:3000 as "user forgot" and runs the auto-derive path', () => {
    const get = loadGetApiBaseUrl({
      envApiUrl: 'http://localhost:3000',
      scriptURL: 'http://192.168.1.50:8081/index.bundle?platform=ios&dev=true',
      isDevice: true,
      dev: true,
    });
    expect(get()).toBe('http://192.168.1.50:3000/v1');
  });

  it('auto-derives http://<host>:3000 from Metro bundle URL on real device in __DEV__', () => {
    const get = loadGetApiBaseUrl({
      envApiUrl: '',
      scriptURL: 'http://10.0.5.21:8081/index.bundle?platform=android',
      isDevice: true,
      dev: true,
    });
    expect(get()).toBe('http://10.0.5.21:3000/v1');
  });

  it('does NOT auto-derive in production builds (__DEV__ false) — falls through to hosted URL', () => {
    const get = loadGetApiBaseUrl({
      envApiUrl: '',
      scriptURL: 'http://192.168.1.50:8081/index.bundle',
      isDevice: true,
      dev: false,
    });
    expect(get()).toBe(OWNED_API_V1);
  });

  it('iOS Simulator (Device.isDevice=false, OS=ios) returns local owned backend', () => {
    const get = loadGetApiBaseUrl({
      envApiUrl: '',
      isDevice: false,
      platformOS: 'ios',
    });
    expect(get()).toBe(LOCAL_OWNED_API_V1);
  });

  it('Android Emulator (Device.isDevice=false, OS=android) returns 10.0.2.2:3000/v1', () => {
    const get = loadGetApiBaseUrl({
      envApiUrl: '',
      isDevice: false,
      platformOS: 'android',
    });
    expect(get()).toBe('http://10.0.2.2:3000/v1');
  });

  it('null scriptURL on real device falls through to hosted URL', () => {
    const get = loadGetApiBaseUrl({
      envApiUrl: '',
      scriptURL: null,
      isDevice: true,
      dev: true,
    });
    expect(get()).toBe(OWNED_API_V1);
  });

  it('scriptURL with localhost host is rejected (would not help on a real device)', () => {
    const get = loadGetApiBaseUrl({
      envApiUrl: '',
      scriptURL: 'http://localhost:8081/index.bundle',
      isDevice: true,
      dev: true,
    });
    expect(get()).toBe(OWNED_API_V1);
  });

  it('ignores committed localhost AI URLs in production builds', () => {
    const { getAiBaseUrl } = loadConfig({
      envAiUrl: 'http://localhost:3001/api/ai',
      isDevice: true,
      dev: false,
    });

    expect(getAiBaseUrl()).toBe(OWNED_AI_V1);
  });

  it('malformed scriptURL falls through gracefully', () => {
    const get = loadGetApiBaseUrl({
      envApiUrl: '',
      scriptURL: 'not-a-url',
      isDevice: true,
      dev: true,
    });
    expect(get()).toBe(OWNED_API_V1);
  });
});
