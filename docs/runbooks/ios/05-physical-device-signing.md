# iOS Runbook 05 - Physical Device Signing

Last verified: 2026-07-10  
App workspace: mobile repo root (`TJBOT-Mobile`)  
Default physical device: `00008130-0019745E02F0001C` (iPad)  
Default Apple development team override (build-time only): `EG7TK62A7Q`  
Bundle id: `net.jasonle.tjbot`

This runbook signs and installs the app on a connected iPad or iPhone without
writing `DEVELOPMENT_TEAM` into the shared Xcode project. The project can keep a
shared/CI team value, while local physical builds pass the team at build time.

> Monorepo mirror: `TbotREAL/docs/runbooks/ios/05-physical-device-signing.md`  
> Keep both copies aligned when the monorepo integration lane can accept a docs PR.

## Default: Release (self-contained, no Metro)

Physical install/demo/proof uses **Release**. Release embeds Hermes
`main.jsbundle` and does **not** require Metro.

```bash
npm run ios:device:signed
# equivalent explicit aliases:
npm run ios:device:release
npm run ios:device:signed -- --configuration Release
```

Optional device/team overrides:

```bash
npm run ios:device:signed -- \
  --device-id 00008130-0019745E02F0001C \
  --team-id EG7TK62A7Q
```

The command runs:

1. `xcodebuild` for `iphoneos` with:
   - `-configuration Release` (default)
   - `DEVELOPMENT_TEAM=<team>`
   - `CODE_SIGN_STYLE=Automatic`
   - `-allowProvisioningUpdates`
2. Reads the built `.app` path from Xcode build settings.
3. Installs the signed app with `xcrun devicectl device install app`.
4. Attempts a foreground launch with `xcrun devicectl device process launch`.
5. Writes `artifacts/ios-runtime/ios-device-sign-summary.json`.

## Debug + Metro (explicit opt-in only)

Debug native code loads JS from Metro (`AppDelegate` `#if DEBUG`). Without
Metro the app shows the React Native shell **"Connect to Metro to develop
JavaScript"** even if `main.jsbundle` exists in the `.app` (Debug does not load
that file).

Bare Debug is **refused**:

```bash
# fails with a clear error (no Metro opt-in)
npm run ios:device:signed -- --configuration Debug
```

Allowed Debug path:

```bash
npm run start -- --port 8081
npm run ios:device:debug
# or:
npm run ios:device:signed -- --configuration Debug --allow-metro-debug
```

Env equivalent: `TBOT_IOS_ALLOW_METRO_DEBUG=1`.

## Device Locked Boundary

Install can succeed while remote launch fails if macOS still sees the device as
locked. That is not a signing failure.

When launch fails with a locked-device error:

1. Wake the iPad.
2. Enter passcode or Face ID.
3. Keep the device on the home screen.
4. Tap the TJBOT app icon manually, or rerun the command.

For stricter automation:

```bash
npm run ios:device:signed -- --strict-launch
```

## Options

```bash
npm run ios:device:signed -- --help
npm run ios:device:signed -- --dry-run
npm run ios:device:signed -- --device-id <UDID>
npm run ios:device:signed -- --team-id <TEAM_ID>
npm run ios:device:signed -- --configuration Release
npm run ios:device:signed -- --configuration Debug --allow-metro-debug
npm run ios:device:signed -- --bundle-id net.jasonle.tjbot
```

Environment overrides:

```bash
TBOT_IOS_DEVICE_ID=00008130-0019745E02F0001C
TBOT_IOS_DEVELOPMENT_TEAM=EG7TK62A7Q
TBOT_IOS_BUNDLE_ID=net.jasonle.tjbot
TBOT_IOS_CONFIGURATION=Release
TBOT_IOS_ALLOW_METRO_DEBUG=0
```

## Pass Criteria

The physical-device signing gate passes when:

- `xcodebuild` exits 0 with **Release** (or explicit Debug+Metro opt-in).
- Xcode automatically provisions or finds a development profile for the device.
- `devicectl device install app` exits 0.
- The app appears on the device.
- Launch either succeeds from CLI or the device-locked boundary is named and the
  app opens manually from the home screen.
- For product proof: the first usable screen is **TJBot UI**, not Metro, RedBox,
  blank, or SpringBoard. Prefer a native device screenshot plus process-alive
  evidence.

Physical-device signing does not prove TestFlight, App Store submission, or
robot BLE/audio behavior. Those remain separate gates.

## Negative Paths

| Path | Expected |
|---|---|
| Default / Release, Metro off | Product UI via embedded bundle |
| Bare Debug, Metro off | Script refuses before build |
| Debug + `--allow-metro-debug`, Metro off | Install may succeed; UI shows Connect to Metro / RedBox |
| Debug + Metro on | Dev JS loads from packager |
| Device locked | Install ok; launch boundary named |
