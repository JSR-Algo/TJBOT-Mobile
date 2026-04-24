/**
 * Smoke test for the voice-native Expo config plugin.
 *
 * Locks the idempotence contract: applying the plugin twice must produce
 * the same output as applying it once. This is the gate that lets us
 * activate the plugin in `app.json` with confidence that a future
 * `npx expo prebuild --clean` will not duplicate permissions or services.
 *
 * Scope: pure-function JS smoke test. Does NOT run the real Expo `withX`
 * mod chain (that needs the full Expo CLI runtime). Instead, we extract
 * the mod mutation functions that each `withInfoPlist` / `withAndroidManifest`
 * would install and invoke them directly on synthetic `modResults`.
 */

// Minimal shim: @expo/config-plugins' `withInfoPlist` / `withAndroidManifest`
// install a mod under `_internal.modifiers` etc., then the Expo CLI runs
// those against a real plist/manifest at prebuild time. For this unit test
// we intercept: mock them to simply call the mutation callback directly.

const syntheticInfoPlist: Record<string, unknown> = {};
const syntheticManifest = {
  manifest: {
    $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' },
    'uses-permission': [{ $: { 'android:name': 'android.permission.INTERNET' } }] as Array<{
      $: Record<string, string>;
    }>,
    application: [
      {
        $: { 'android:name': '.BootstrapApplication' },
        activity: [{ $: { 'android:name': '.MainActivity' } }],
        service: [] as Array<{ $: Record<string, string> }>,
      },
    ],
  },
};

jest.mock('@expo/config-plugins', () => ({
  withInfoPlist: (config: unknown, modifier: (cfg: { modResults: Record<string, unknown> }) => { modResults: Record<string, unknown> }) => {
    const cfg = { modResults: syntheticInfoPlist };
    modifier(cfg);
    return config;
  },
  withAndroidManifest: (
    config: unknown,
    modifier: (cfg: { modResults: typeof syntheticManifest }) => { modResults: typeof syntheticManifest },
  ) => {
    const cfg = { modResults: syntheticManifest };
    modifier(cfg);
    return config;
  },
  AndroidConfig: {
    Manifest: {
      getMainApplicationOrThrow: (m: typeof syntheticManifest) => m.manifest.application[0],
    },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const withVoiceNative = require('../../modules/voice-native/withVoiceNative');

describe('voice-native Expo config plugin', () => {
  beforeEach(() => {
    // Reset synthetic targets to a known pre-plugin state.
    for (const k of Object.keys(syntheticInfoPlist)) delete syntheticInfoPlist[k];
    syntheticManifest.manifest['uses-permission'] = [
      { $: { 'android:name': 'android.permission.INTERNET' } },
    ];
    syntheticManifest.manifest.application[0].service = [];
  });

  it('loads without error and exposes a function', () => {
    expect(typeof withVoiceNative).toBe('function');
    expect(typeof withVoiceNative._internal.withUIBackgroundAudio).toBe('function');
  });

  it('adds UIBackgroundModes = [audio] when absent', () => {
    withVoiceNative({ name: 'TbotMobile' });
    expect(syntheticInfoPlist.UIBackgroundModes).toEqual(['audio']);
  });

  it('preserves other UIBackgroundModes entries', () => {
    syntheticInfoPlist.UIBackgroundModes = ['fetch', 'processing'];
    withVoiceNative({ name: 'TbotMobile' });
    expect(syntheticInfoPlist.UIBackgroundModes).toEqual(['fetch', 'processing', 'audio']);
  });

  it('adds audio permissions + VoiceSessionService when absent', () => {
    withVoiceNative({ name: 'TbotMobile' });
    const perms = syntheticManifest.manifest['uses-permission'].map((p) => p.$['android:name']);
    expect(perms).toEqual(
      expect.arrayContaining([
        'android.permission.INTERNET',
        'android.permission.RECORD_AUDIO',
        'android.permission.MODIFY_AUDIO_SETTINGS',
        'android.permission.FOREGROUND_SERVICE',
        'android.permission.FOREGROUND_SERVICE_MICROPHONE',
      ]),
    );
    const services = syntheticManifest.manifest.application[0].service;
    expect(services).toHaveLength(1);
    expect(services[0].$).toEqual({
      'android:name': '.voicesession.VoiceSessionService',
      'android:foregroundServiceType': 'microphone',
      'android:exported': 'false',
      'android:enabled': 'true',
    });
  });

  it('is idempotent — second application produces same output', () => {
    withVoiceNative({ name: 'TbotMobile' });
    const plistSnapshot = JSON.stringify(syntheticInfoPlist);
    const manifestSnapshot = JSON.stringify(syntheticManifest);

    withVoiceNative({ name: 'TbotMobile' });
    expect(JSON.stringify(syntheticInfoPlist)).toBe(plistSnapshot);
    expect(JSON.stringify(syntheticManifest)).toBe(manifestSnapshot);
  });

  it('does not duplicate an already-present audio entry', () => {
    syntheticInfoPlist.UIBackgroundModes = ['audio'];
    withVoiceNative({ name: 'TbotMobile' });
    expect(syntheticInfoPlist.UIBackgroundModes).toEqual(['audio']);
  });

  it('does not duplicate an already-present service declaration', () => {
    syntheticManifest.manifest.application[0].service.push({
      $: {
        'android:name': '.voicesession.VoiceSessionService',
        'android:foregroundServiceType': 'microphone',
        'android:exported': 'false',
        'android:enabled': 'true',
      },
    });
    withVoiceNative({ name: 'TbotMobile' });
    expect(syntheticManifest.manifest.application[0].service).toHaveLength(1);
  });
});
