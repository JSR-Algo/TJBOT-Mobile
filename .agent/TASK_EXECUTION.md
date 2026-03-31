# TASK_EXECUTION — tbot-mobile

## TASK ID FORMAT
- Pattern: MB-xxx (e.g., MB-023, MB-108)
- REJECT tasks without this prefix

## LANGUAGE & TOOLCHAIN
- TypeScript strict mode throughout (tsconfig strict: true)
- Expo managed workflow — DO NOT eject without explicit approval
- No bare React Native modules without EAS compatibility verification
- Package additions require Expo SDK compatibility check first

## NAVIGATION
- React Navigation v6 only
- Stack, Tab, and Drawer navigators per existing app structure
- Deep link handling: register all new screens in linking config
- NEVER use navigation.navigate with untyped params — use typed param lists

## SECURE STORAGE RULES
- Auth tokens (access + refresh): expo-secure-store ONLY
  ```typescript
  import * as SecureStore from 'expo-secure-store';
  await SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED });
  ```
- FORBIDDEN storage for sensitive data: AsyncStorage, MMKV (unencrypted), hardcoded, global state only
- Keychain access level: WHEN_UNLOCKED (not ALWAYS)
- On logout: DELETE all SecureStore keys, do not just clear state

## BLE INTEGRATION (react-native-ble-plx)
- Scan filter: only devices with TBOT service UUID (load from BLE_CONFIG constant)
- Verify device UUID against allowlist BEFORE initiating pairing
- Request permissions before scanning (iOS: NSBluetoothAlwaysUsageDescription, Android: BLUETOOTH_SCAN + BLUETOOTH_CONNECT)
- Connection timeout: 10 seconds, retry max 2 times
- Disconnect cleanup: always call device.cancelConnection() on unmount or error
- NEVER expose raw BLE error codes to user — map to user-friendly messages

## COPPA CONSENT RULES
- Consent screen: explicit tap required on "I Agree" button
- No pre-checked checkboxes
- No consent inferred from navigation or timeout
- On acceptance: POST consent timestamp to /v1/auth/coppa-consent immediately
- Consent must be re-shown if backend returns COPPA_CONSENT_REQUIRED error

## API CALLS
- Base URL: from environment config (EXPO_PUBLIC_API_BASE_URL), never hardcoded
- Auth header: Bearer token from SecureStore on every authenticated request
- Token refresh: intercept 401, refresh via /v1/auth/refresh, retry once
- On refresh failure: clear tokens, navigate to login
- HTTPS only — reject HTTP endpoints
- Error display: map API error codes to user-friendly strings, never show raw JSON

## COMPONENT PATTERNS
- Functional components with hooks only (no class components)
- Loading states required for all async operations
- Error boundaries on all screen-level components
- Accessibility: all interactive elements need accessibilityLabel

## CODE STYLE
- No console.log in committed code
- No TODO or HACK comments in committed code
- Import order: React → React Native → Expo → third-party → internal
- File naming: PascalCase for components, camelCase for utilities
