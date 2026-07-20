# tjbotMobileTests — XCTest bundle

Staged for MB-NATIVE-VOICE-003 spike verification. Contains one test today:

- `SharedEngineSpikeTests.swift` — verifies HW AEC on a shared
  `AVAudioEngine`. PASS criterion: captured-input RMS < 0.02 while an
  8 kHz sine plays at 70 % volume. See
  `docs/adr/mb-native-voice-003-voice-processing-io.md` for context.

## Activation (one-time Xcode session)

1. Open workspace in Xcode:
   ```sh
   cd tjbot-mobile/ios && open tjbotMobile.xcworkspace
   ```

2. Add a test bundle target:
   File → New → Target → iOS → **Unit Testing Bundle**
   - Product Name: `tjbotMobileTests`
   - Target to be Tested: `tjbotMobile`
   - Language: Swift
   - Organization Identifier: default
   - Click Finish.

3. Move the auto-generated `tjbotMobileTests.swift` (if created) into the
   `tjbotMobileTests` group, then add `SharedEngineSpikeTests.swift` from
   this directory:
   - Right-click `tjbotMobileTests` → *Add Files to "tjbotMobile"…*
   - Select `ios/tjbotMobileTests/SharedEngineSpikeTests.swift`
   - Targets: ✓ `tjbotMobileTests`, ✗ `tjbotMobile` (test-only).

4. Run on a **physical device** (⌘U while a device is the active scheme
   run destination). The simulator cannot exercise voiceProcessingIO —
   the test uses `#if targetEnvironment(simulator)` to skip instead of
   false-passing.

5. Expected PASS: test log shows `[spike] captured-input RMS = <value>`
   with value < 0.02. Update
   `docs/adr/mb-native-voice-003-voice-processing-io.md` status to
   **Accepted**.

6. On FAIL, the assertion message spells out the remediation:
   bifurcate `SharedVoiceEngine.attachPlayerNode` to attach the player
   node to a SECOND `AVAudioEngine` instance.

## Running via xcodebuild (CI path — after activation)

```sh
xcodebuild test \
  -workspace ios/tjbotMobile.xcworkspace \
  -scheme tjbotMobile \
  -destination "platform=iOS,id=<device-UDID>" \
  -only-testing:tjbotMobileTests/SharedEngineSpikeTests
```

Cannot run in GitHub Actions — requires a physical device. Staged for
manual spike only.
