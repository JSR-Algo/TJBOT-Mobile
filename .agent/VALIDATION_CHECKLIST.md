# VALIDATION_CHECKLIST — tbot-mobile

## BUILD — ALL ITEMS REQUIRED BEFORE MERGE

- [ ] Expo build iOS: eas build --platform ios --profile preview → success
- [ ] Expo build Android: eas build --platform android --profile preview → success
- [ ] TypeScript: npx tsc --noEmit → zero errors
- [ ] No Expo SDK incompatibility warnings in build output

## TESTS — ALL ITEMS REQUIRED

- [ ] Unit tests: npx jest → all pass, no skipped safety-critical tests
- [ ] Detox E2E: onboarding flow completes on iOS simulator
- [ ] Detox E2E: onboarding flow completes on Android emulator
- [ ] Detox E2E: login → home navigation works on both platforms
- [ ] Detox E2E: logout clears all stored tokens (verify SecureStore empty)

## AUTH & SECURITY — ALL ITEMS REQUIRED

- [ ] grep -r "AsyncStorage" src/ — zero results for token-related keys
- [ ] SecureStore usage: all token set/get/delete use WHEN_UNLOCKED access level
- [ ] Logout: all SecureStore keys deleted (not just state cleared)
- [ ] HTTPS: no HTTP endpoints in API config
- [ ] No hardcoded tokens, API keys, or secrets in source

## BLE — REQUIRED FOR BLE-TOUCHING CHANGES

- [ ] BLE pairing test on physical iOS device (simulator cannot test BLE)
- [ ] BLE pairing test on physical Android device
- [ ] UUID allowlist enforced: non-allowlisted device rejected
- [ ] BLE permissions requested correctly on both platforms
- [ ] Disconnect cleanup tested: no dangling connections on unmount

## COPPA — ALL ITEMS REQUIRED

- [ ] Consent screen: "I Agree" button requires explicit tap
- [ ] No auto-accept code path exists (grep for programmatic consent calls)
- [ ] Consent timestamp POSTed to backend on acceptance
- [ ] COPPA_CONSENT_REQUIRED error re-shows consent screen
- [ ] Age gate appears before child profile creation

## PUSH NOTIFICATIONS

- [ ] FCM token registered and sent to backend on login
- [ ] Notification received and displayed on iOS (physical device)
- [ ] Notification received and displayed on Android (physical device or emulator)
- [ ] Deep link from notification navigates to correct screen

## CODE QUALITY

- [ ] No console.log, TODO, HACK, or debugger in committed code
- [ ] All new screens registered in navigation linking config
- [ ] All interactive elements have accessibilityLabel
- [ ] Error boundaries present on all new screen-level components
