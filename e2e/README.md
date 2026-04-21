# Detox E2E — TBOT mobile

## What's covered

| File            | Purpose                                                      |
| --------------- | ------------------------------------------------------------ |
| `smoke.test.ts` | Cold-start → Login → staging creds → MainTabs + Home visible |
| `init.ts`       | `beforeAll`/`beforeEach` app-launch + RN reload hooks        |
| `jest.config.js`| Detox-owned Jest runner config (separate from unit/integration jest projects) |

This pass is **scaffold only** — one happy-path test. More flows live under task `task-s5-mobile-detox-ci` follow-ups.

## Prereqs (local)

### iOS

- macOS + Xcode (latest stable)
- iOS 17+ simulator named `iPhone 15 Pro` (Xcode > Settings > Platforms)
- CocoaPods installed, `cd ios && pod install`
- `brew install applesimutils`

### Android

- JDK 17
- Android SDK + cmdline-tools + platform-tools
- AVD named `Pixel_API_34` (Android 14). Create via Android Studio or:
  ```sh
  sdkmanager 'system-images;android-34;google_apis;arm64-v8a'
  avdmanager create avd -n Pixel_API_34 -k 'system-images;android-34;google_apis;arm64-v8a' -d pixel
  ```

## Environment

```sh
export E2E_STAGING_EMAIL='qa+e2e@tbot.local'
export E2E_STAGING_PASSWORD='<from 1Password vault: TBOT Staging E2E>'
```

The test falls back to placeholder creds if unset, so `jest --listTests` and `detox doctor` work without the vault, but the happy-path assertion will fail without real staging creds.

## Run

```sh
# iOS
npm run detox:build:ios
npm run detox:test:ios

# Android
npm run detox:build:android
npm run detox:test:android
```

## Env sanity-check

```sh
npx detox doctor
```

If `detox doctor` reports missing Xcode / adb / simulator, that's an **environment prerequisite** (not a scaffold bug). Install the tooling above, then re-run.

## CI

**This scaffold does not run on CI.** Running Detox on CI needs a macOS runner with a booted simulator (iOS) and a headless emulator with KVM/nested virt (Android) — that's tracked by `task-s5-mobile-detox-ci`. The `mobile-native-build` workflow only compiles both platforms; it does not run the Detox suite.
