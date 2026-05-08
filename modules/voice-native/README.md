# voice-native — Expo config plugin

This local Expo config plugin re-declares the Info.plist + AndroidManifest
changes required by the Gemini Live voice stack (sys-16). It exists so those
changes survive a future `npx expo prebuild --clean`, which would otherwise
regenerate both native files from Expo defaults and wipe the voice
configuration.

See also: `.omc/plans/tbot-mobile-native-voice-stack-2026-04-21.md` §3 and §9
pre-flight item "Expo config-plugin mode decided".

## What the plugin does

**iOS (Info.plist):**
- Ensures `UIBackgroundModes` contains `"audio"` so `AVAudioSession` retains
  mic + playback during screen lock.

**Android (AndroidManifest.xml):**
- Adds `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`, `FOREGROUND_SERVICE`,
  `FOREGROUND_SERVICE_MICROPHONE` permissions.
- Declares `<service android:name=".voicesession.VoiceSessionService"
  android:foregroundServiceType="microphone" android:exported="false"
  android:enabled="true" />` inside `<application>`.

## Status: STAGED but NOT activated

The plugin is written and unit-tested, but **not yet added to `app.json`**.
This is deliberate — activating it requires running `npx expo prebuild` once
and diffing the result to confirm the round-trip preserves all current
changes without drift. That belongs in a focused follow-up session on a
real dev machine.

## Activation checklist (for a future session)

1. Verify current native state is clean:

   ```sh
   git status ios/ android/
   ```

   Must be clean; any uncommitted changes will merge into the prebuild
   output unpredictably.

2. Add to `tbot-mobile/app.json`:

   ```diff
     "expo": {
       "name": "TbotMobile",
       ...
   +   "plugins": [
   +     "./modules/voice-native"
   +   ]
     }
   ```

3. Run prebuild:

   ```sh
   cd tbot-mobile
   npx expo prebuild --platform ios
   npx expo prebuild --platform android
   ```

4. Verify round-trip:

   ```sh
   git diff ios/TbotMobile/Info.plist
   git diff android/app/src/main/AndroidManifest.xml
   ```

   Expected: **zero meaningful diff** for the permissions, `<service>`, and
   `UIBackgroundModes` additions. Any other changes are incidental Expo
   template drift and should be reviewed separately.

5. Run both builds end-to-end:

   ```sh
   npx expo run:ios
   npx expo run:android
   ```

   Both should build without error. The voice-native Kotlin classes
   (`VoiceSessionModule`, `VoiceSessionService`, `PcmStreamModule`) should
   still be picked up by autolinking — this plugin does NOT touch their
   registration.

6. Commit `app.json` + any necessary prebuild regeneration. Document the
   Expo SDK + CLI version used so the round-trip is reproducible.

## Verification today (without activation)

The plugin itself loads cleanly:

```sh
node -e "console.log(typeof require('./modules/voice-native/app.plugin'))"
# → 'function'
```

A unit smoke test at `tests/modules/voice-native.test.ts` applies the plugin
twice to synthetic configs and asserts idempotence — both outputs equal.

## When to deactivate / remove this plugin

- If the mobile team switches to a fully bare RN workflow (no Expo
  prebuild), delete this directory, remove the `plugins` entry from
  `app.json`, and rely on the committed `ios/`/`android/` directories as
  source-of-truth.
- If Expo adds a first-class "microphone-background" capability plugin in
  a future SDK, migrate to that and delete this.

## Non-goals

- This plugin does NOT add, remove, or modify native source files
  (`.swift`/`.kt`/`.mm`). Those live in the committed `ios/` and `android/`
  directories. Adding native source via a config plugin (e.g. copying
  `VoiceSessionModule.swift` into the iOS target) is tracked as a separate
  follow-up because it requires `pbxproj` manipulation, which is fragile.
- This plugin does NOT modify the iOS privacy manifest
  (`PrivacyInfo.xcprivacy`) — current microphone reason string is sufficient.
- This plugin does NOT add `UIBackgroundModes = voip`. We are not a VoIP
  app per App Store review criteria; `audio` alone is the correct mode
  for realtime voice conversation.
