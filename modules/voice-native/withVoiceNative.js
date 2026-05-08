/**
 * voice-native — Expo config plugin for sys-16 realtime voice stack.
 *
 * Re-declares the Info.plist and AndroidManifest changes that currently
 * live as in-place edits in:
 *   - ios/TbotMobile/Info.plist
 *   - android/app/src/main/AndroidManifest.xml
 *
 * Purpose: make those changes survive a future `npx expo prebuild --clean`.
 * Without this plugin, a clean prebuild regenerates both files from Expo
 * defaults and wipes the voice-stack configuration.
 *
 * Design contract:
 *   - Idempotent — running twice produces the same output as running once.
 *   - Additive — does NOT remove permissions, services, or Info.plist keys
 *     the app has declared for other reasons.
 *   - Silent no-op on already-present values — safe to co-exist with the
 *     current in-place edits in a hybrid-bare repo.
 *
 * NOT auto-activated. To activate, add to `app.json`:
 *   "plugins": ["./modules/voice-native"]
 * Then run `npx expo prebuild` once and diff to confirm the round-trip.
 * See README.md in this directory for the full activation checklist.
 */
const { withInfoPlist, withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

const ANDROID_PERMISSIONS = [
  'android.permission.RECORD_AUDIO',
  'android.permission.MODIFY_AUDIO_SETTINGS',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_MICROPHONE',
];

const ANDROID_SERVICE_NAME = '.voicesession.VoiceSessionService';

/**
 * Plist: ensure UIBackgroundModes contains "audio" so AVAudioSession retains
 * mic + playback while the screen is locked during a Gemini Live session.
 */
function withUIBackgroundAudio(config) {
  return withInfoPlist(config, (cfg) => {
    const existing = Array.isArray(cfg.modResults.UIBackgroundModes)
      ? cfg.modResults.UIBackgroundModes
      : [];
    if (!existing.includes('audio')) {
      cfg.modResults.UIBackgroundModes = [...existing, 'audio'];
    } else {
      cfg.modResults.UIBackgroundModes = existing;
    }
    return cfg;
  });
}

/**
 * Manifest: add RECORD_AUDIO / MODIFY_AUDIO_SETTINGS / FOREGROUND_SERVICE /
 * FOREGROUND_SERVICE_MICROPHONE permissions, and declare
 * VoiceSessionService with foregroundServiceType="microphone".
 */
function withAudioPermissionsAndService(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;

    // 1. Permissions — use the canonical AndroidConfig helper so we get the
    //    correct node shape and don't duplicate existing entries.
    manifest.manifest['uses-permission'] = manifest.manifest['uses-permission'] || [];
    const perms = manifest.manifest['uses-permission'];
    for (const name of ANDROID_PERMISSIONS) {
      const exists = perms.some((p) => p.$ && p.$['android:name'] === name);
      if (!exists) {
        perms.push({ $: { 'android:name': name } });
      }
    }

    // 2. Service declaration inside <application>. AndroidManifest is parsed
    //    as an xml2js tree; each <application> is an entry in the array.
    const apps = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
    apps.service = apps.service || [];
    const hasService = apps.service.some(
      (s) => s.$ && s.$['android:name'] === ANDROID_SERVICE_NAME,
    );
    if (!hasService) {
      apps.service.push({
        $: {
          'android:name': ANDROID_SERVICE_NAME,
          'android:foregroundServiceType': 'microphone',
          'android:exported': 'false',
          'android:enabled': 'true',
        },
      });
    }

    return cfg;
  });
}

/**
 * Plugin entry point. Chains the two platform-specific mods.
 */
function withVoiceNative(config) {
  config = withUIBackgroundAudio(config);
  config = withAudioPermissionsAndService(config);
  return config;
}

module.exports = withVoiceNative;
module.exports.default = withVoiceNative;
// Exposed for unit testing.
module.exports._internal = {
  withUIBackgroundAudio,
  withAudioPermissionsAndService,
  ANDROID_PERMISSIONS,
  ANDROID_SERVICE_NAME,
};
