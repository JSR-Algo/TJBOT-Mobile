# ble-provisioning Audit

## Scope
BLE scan/connect/pair flow, error recovery, permissions, provisioning reliability, and concurrency bottlenecks for TJBot-mobile robot onboarding.

## Files reviewed

### Mobile implementation
- `src/services/ble/service.ts`
- `src/services/ble/types.ts`
- `src/services/ble/permissions.ts`
- `src/services/ble/config.ts`
- `src/services/provisioning/espProvisioning.ts`
- `src/services/provisioning/config.ts`
- `src/services/api/device.api.ts`
- `src/features/device/pairing/pairingSession.ts`
- `src/features/device/pairing/routeParams.ts`
- `src/features/device/pairing/screens/PairSearchScreen.tsx`
- `src/features/device/pairing/screens/PairFoundScreen.tsx`
- `src/features/device/pairing/screens/PairCodeScreen.tsx`
- `src/features/device/pairing/screens/PairWifiScreen.tsx`
- `src/features/device/pairing/screens/PairWifiPasswordScreen.tsx`
- `src/features/device/pairing/screens/PairConnectingScreen.tsx`
- `src/features/device/pairing/screens/PairFailedScreen.tsx`
- `src/features/device/pairing/screens/PairOfflineScreen.tsx`
- `src/state/machines/devicePairing.machine.ts`
- `src/state/machines/devicePairing.types.ts`
- `tests/ble/service.test.ts`
- `tests/ble/permissions.test.ts`
- `tests/features/device/pairingSession.test.ts`
- `tests/state/machines/devicePairing.machine.test.ts`
- `tests/navigation/device-pairing-route-params.test.ts`
- `tests/__mocks__/react-native-ble-plx.ts`
- `ios/TJBotMobile/Info.plist`
- `android/app/src/main/AndroidManifest.xml`
- `package.json`
- `app.json`

### Reference cards reviewed
- `docs/reference/ios/extractions/espressif__esp-idf-provisioning-ios.md`
- `docs/reference/ios/extractions/futuristiclabs__react-native-esp32-idf-provisioning.md`
- `docs/reference/ios/extractions/parkyang__bluetooth.md`
- `docs/reference/ios/extractions/purpln__swiftui-bluetooth.md`
- `docs/reference/ios/extractions/gundrabur__BLEScanner.md`
- `docs/reference/ios/extractions/thomsmed__ble-chat-ios.md`
- `docs/reference/ios/extractions/dan-rodrigues__mobile-fpga-bluetooth-demo.md`
- `docs/reference/ios/extractions/stevenselcuk__fridge-monitor.md`

## Reference benchmarks

- **Espressif `esp-idf-provisioning-ios`** — production iOS SDK for ESP32 onboarding. Strengths: prefix filtering, encrypted session negotiation (Security0/1/2), proof-of-possession handling, transport abstraction (BLE/SoftAP), polling until the device joins Wi-Fi, and explicit retry on disconnect.
- **gundrabur/BLEScanner** — small SwiftUI scanner. Strengths: throttles high-frequency `didDiscover` callbacks, buckets RSSI into stable signal bars, shows “last seen”, and keeps the list tappable while scanning.
- **purpln/swiftui-bluetooth** / parkyang — minimal CoreBluetooth examples. Strengths: singleton BLE manager, duplicate filtering by peripheral UUID, live RSSI, and service/characteristic discovery.
- **thomsmed/ble-chat-ios** — BLE chat demo. Strengths: MVVM-ish architecture, Combine publishers, `NavigationStack` driven by a page enum, and serialized CoreBluetooth work on a dedicated queue.
- **dan-rodrigues/mobile-fpga-bluetooth-demo** — SwiftUI + ESP32 demo. Strengths: explicit connection state enum (`readyToConnect`/`scanning`/`connecting`/`connected`/`unauthorized`/`off`/`unknown`), automatic retry on failed connections, and scene-phase refresh on foreground.
- **stevenselcuk/fridge-monitor** — IoT monitor. Strengths: auto-scan on launch, connection state enum, standard battery-level characteristic (`0x2A19`), and background notifications.

## Findings

### Improvements

- **`src/services/ble/permissions.ts:5-7`** — iOS permissions return `'granted'` unconditionally. The function never checks `CBCentralManager` state, so a user with Bluetooth turned off or denied sees a silent scan failure rather than a clear prompt. Add a state subscription (via `react-native-ble-plx`’s `onStateChange` or a tiny native wrapper) and surface `poweredOff`/`unauthorized` before starting the scan.

- **`src/services/ble/types.ts:3-8` + `src/services/ble/service.ts:34-41` + `src/features/device/pairing/screens/PairSearchScreen.tsx:45`** — `BleDeviceCandidate` omits RSSI, `toCandidate` discards it, and the screen picks the first allowlisted device regardless of proximity. A distant or weak robot can be selected while a stronger one is right next to the phone. Capture `device.rssi`, sort by signal, and optionally reject devices below a threshold (e.g. −85 dBm).

- **`src/services/ble/config.ts:4` vs `src/state/machines/devicePairing.machine.ts:52`** — the live BLE scan timeout is `10000 ms`, but the canonical XState machine specifies `30000 ms`. In noisy environments ESP32 advertisements can take >10 s to appear. Align the production scan timeout with the machine spec.

- **`src/features/device/pairing/screens/PairWifiScreen.tsx:31-75` and `src/features/device/pairing/screens/PairConnectingScreen.tsx:34-107`** — effect cleanup only sets a `cancelled` boolean. If the user navigates back after `connectProvisionableDevice` succeeds, the ESP BLE session and any in-flight Wi-Fi scan/provision are left open. Add cleanup that calls `device.disconnect()` and `stopProvisionSearch()` in the `useEffect` return.

- **`src/features/device/pairing/pairingSession.ts:14-16` + `src/features/device/pairing/screens/PairWifiScreen.tsx:27-28` + `PairConnectingScreen.tsx:54`** — pairing state (`activeCandidate`, `connectedDevice`) is stored in mutable module-level variables, not in React or a store. Process death, deep-link entry, or concurrent pairing attempts can corrupt the session. Move it to a React Context, Zustand store, or the existing XState actor so lifecycle is explicit.

- **`src/services/provisioning/espProvisioning.ts:26-34` + `src/features/device/pairing/screens/PairFailedScreen.tsx:21-26`** — `ProvisioningError` only exposes four coarse codes, and the failure screen hard-codes four generic reasons. The XState machine already defines richer error codes (`E-PROV-001`…`005`), but the screens do not consume them. Map native/ESP errors to the machine codes and render context-aware recovery actions.

- **`src/services/provisioning/espProvisioning.ts:61-83`** — `connectProvisionableDevice` is a single attempt with no retry. Reference projects retry failed connections with backoff. Wrap connect and `provisionWifi` in a small retry helper (e.g. 2 retries, 500 ms apart) for transient BLE disconnects.

- **`src/features/device/pairing/screens/PairWifiScreen.tsx:22-75`** — the Wi-Fi network list is scanned once on mount and never refreshed. Add pull-to-refresh and a manual “Scan again” action so users can recover from transient empty lists.

- **`ios/TJBotMobile/Info.plist:40-41`** — `NSLocationWhenInUseUsageDescription` is declared but the current BLE-only provisioning flow does not need it. If SoftAP fallback is not implemented, this creates an unnecessary permission prompt. Either implement SoftAP/SSID verification or remove the key.

### Simplifications

- **`src/features/device/pairing/screens/PairSearchScreen.tsx:38-61`** — the screen runs two independent discovery mechanisms in parallel (`react-native-ble-plx` by service UUID and `ESPProvisionManager.searchESPDevices` by prefix), then correlates results by name. This is fragile and hard to test. Simplify to one source of truth: let `ESPProvisionManager` discover provisioning-mode robots, and use `react-native-ble-plx` only for RSSI enrichment if needed.

- **`src/state/machines/devicePairing.machine.ts:17-48` + pairing screens** — the XState machine exists and is tested, but its services are stubs and the screens implement the same flow imperatively with `useState`/`useEffect`. Either delete the unused machine or drive the screens from an actor. Wiring the machine would remove duplicated state logic and guarantee the documented timeout/error semantics.

- **`src/features/device/pairing/screens/PairConnectingScreen.tsx:147-151`** — a local `getParamString` helper is used to extract `code`/`ssid`/`password`. The route param types already come from `RootStackParamList`; using typed selectors or deriving from the actor context would remove this defensive parsing.

- **`src/features/device/pairing/screens/PairWifiPasswordScreen.tsx:20-29`** — the screen pulls `code` from params with a tiny `getPairCode` helper. Since the type is already known, the helper adds no value; inline the typed access or read from the pairing actor.

### Bottlenecks

- **`src/services/ble/service.ts:57-84` + `src/services/provisioning/espProvisioning.ts:36-55`** — scans run without throttling or duplicate suppression beyond `Map.set`. On iOS, `didDiscover` callbacks can arrive tens of times per second; the TJBot screen re-renders for every advertisement. Add a throttle/debounce and update the UI only when RSSI changes significantly, as `BLEScanner` does.

- **`src/services/provisioning/espProvisioning.ts:97-116` + `src/features/device/pairing/screens/PairConnectingScreen.tsx:51-101`** — provisioning is a single long native promise with no cancellation. If the user kills the screen, the JS side sets `cancelled = true` but the native operation continues, potentially completing provisioning while the app thinks it failed. There is no `AbortController`-style cancellation; at minimum, eagerly disconnect in cleanup.

- **`src/features/device/pairing/screens/PairConnectingScreen.tsx:72-84`** — backend claim (`pairDevice`) happens after Wi-Fi provisioning succeeds. If the backend claim fails, the robot has joined the home network but is not registered to the account, leaving it in an orphaned state. Consider a pre-provisioning claim/token step so the backend transaction is committed before credentials are sent to the robot.

- **`src/services/ble/config.ts:7-15`** — allowlist matching relies only on device name and id prefixes. There is no check of manufacturer data or the provisioning service UUID, so a maliciously renamed peripheral could pass the filter. Harden matching by validating the advertised service UUID and/or firmware-provided manufacturer data.

## Top 3 quick wins

1. **Check real Bluetooth state on iOS before scanning.** Replace the unconditional `return 'granted'` in `src/services/ble/permissions.ts:5-7` with a `CBCentralManager` state check and show a clear “Turn on Bluetooth” prompt.
2. **Increase scan timeout and sort by RSSI.** Change `BLE_CONFIG.SCAN_TIMEOUT_MS` to `30000`, add `rssi` to `BleDeviceCandidate`, and select the strongest allowlisted device in `PairSearchScreen.tsx`.
3. **Clean up BLE sessions on unmount.** In `PairWifiScreen.tsx` and `PairConnectingScreen.tsx`, call `device.disconnect()` and `stopProvisionSearch()` from the `useEffect` cleanup to prevent leaked native connections.

## Risk / effort estimates

| Recommendation | Risk | Effort | Notes |
|---|---|---|---|
| iOS Bluetooth state check + prompt | **HIGH** (user-visible failure) | **LOW** | Add state subscription + UI prompt. |
| RSSI-aware scan/sort | **MEDIUM** (pairing wrong robot) | **LOW** | Type + service change; small UI update. |
| Align scan timeout to 30 s | **LOW** | **LOW** | One constant change. |
| Effect cleanup disconnect/stop | **HIGH** (leaked sessions) | **LOW** | Add `useEffect` return handlers. |
| Move pairing state to actor/store | **MEDIUM** (lifecycle bugs) | **MEDIUM** | Refactor screens + tests. |
| Error-code propagation to UI | **MEDIUM** (recovery UX) | **MEDIUM** | Map errors and update `PairFailedScreen`. |
| Retry connect/provision | **MEDIUM** (transient failures) | **LOW** | Small wrapper in `espProvisioning.ts`. |
| Wi-Fi list refresh | **LOW** | **LOW** | Add pull-to-refresh. |
| Remove/justify location usage string | **LOW** | **LOW** | Product/governance decision. |
| Unify dual-scan discovery | **MEDIUM** (complexity, bugs) | **MEDIUM** | Pick one discovery source. |
| Wire screens to XState machine | **MEDIUM** (architectural) | **HIGH** | Biggest refactor; highest long-term payoff. |
| Add cancellation/disconnect on long native ops | **HIGH** (race conditions) | **MEDIUM** | May need native-module support. |
| Pre-provisioning backend claim | **HIGH** (orphaned robots) | **MEDIUM** | Requires backend contract change. |
| Harden allowlist with service UUID/manufacturer data | **MEDIUM** (security) | **LOW** | Add validation in `isAllowlistedDevice`. |
