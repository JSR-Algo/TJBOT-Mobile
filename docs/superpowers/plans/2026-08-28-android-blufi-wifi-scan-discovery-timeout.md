# Android BluFi Wi-Fi Scan Discovery Timeout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow Android BluFi Wi-Fi scanning to survive physical GATT service discovery that completes just after 10 seconds.

**Architecture:** Keep the existing generic 10-second GATT operation timeout for characteristic writes and security operations. Add a dedicated 15-second discovery timeout and pass it only around `discoverAllServicesAndCharacteristics()` in Wi-Fi scanning and provisioning.

**Tech Stack:** TypeScript, React Native BLE PLX, Jest fake timers, Android ADB.

---

### Task 1: Lock the physical discovery timing regression

**Files:**
- Modify: `tests/ble/service.test.ts`

- [ ] **Step 1: Write the failing public-seam test**

Add a `scanRobotWifiNetworks()` test whose first and only connection resolves service discovery after 10.5 seconds. The discovered device exposes the existing mock writer and monitor, and the monitor returns a known `Casa` Wi-Fi-list frame.

```ts
test('allows Android service discovery to complete after the generic 10-second GATT bound', async () => {
  jest.useFakeTimers();

  const writeCharacteristicWithResponseForService = jest.fn().mockResolvedValue({});
  const remove = jest.fn();
  const monitorCharacteristicForService = jest.fn((_serviceUuid, _characteristicUuid, listener) => {
    listener(null, { value: encodeBase64([0x45, 0x04, 0x00, 0x06, 0x05, 0xc9, ...asciiBytes('Casa')]) });
    return { remove };
  });
  const cancelConnection = jest.fn().mockResolvedValue(undefined);
  const discovered = {
    writeCharacteristicWithResponseForService,
    monitorCharacteristicForService,
    cancelConnection,
  };
  const discoverAllServicesAndCharacteristics = jest.fn(() => new Promise(resolve => {
    setTimeout(() => resolve(discovered), 10500);
  }));
  const connect = jest.fn().mockResolvedValue({
    discoverAllServicesAndCharacteristics,
    cancelConnection,
  });

  const scan = scanRobotWifiNetworks({
    device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
    connectDevice: connect,
  });
  const expectation = expect(scan).resolves.toEqual([{ ssid: 'Casa', rssi: -55 }]);

  await jest.advanceTimersByTimeAsync(10500);
  await expectation;

  expect(connect).toHaveBeenCalledTimes(1);
  expect(writeCharacteristicWithResponseForService).toHaveBeenCalled();
  expect(cancelConnection).toHaveBeenCalled();
  jest.useRealTimers();
});
```

- [ ] **Step 2: Run the new test and verify RED**

Run:

```bash
npm test -- --runInBand tests/ble/service.test.ts -t "allows Android service discovery"
```

Expected: FAIL because the current 10-second timeout rejects the first discovery and starts retry behavior before the 10.5-second resolution.

### Task 2: Add the dedicated discovery timeout

**Files:**
- Modify: `src/services/ble/service.ts`
- Test: `tests/ble/service.test.ts`

- [ ] **Step 1: Add the minimal timeout constant**

Place it beside the existing GATT timeout:

```ts
const BLE_GATT_OPERATION_TIMEOUT_MS = 10000;
const BLE_SERVICE_DISCOVERY_TIMEOUT_MS = 15000;
```

- [ ] **Step 2: Apply it only to service discovery**

Pass `BLE_SERVICE_DISCOVERY_TIMEOUT_MS` as the fourth argument to `withBleOperationTimeout()` for every production call to `discoverAllServicesAndCharacteristics()` used by local provisioning, claim-token delivery, and robot Wi-Fi scanning. Do not change write, security, response, connection, or Wi-Fi-join timeout calls.

```ts
const discovered = await withBleOperationTimeout(
  connected.discoverAllServicesAndCharacteristics(),
  'BLE_PROVISIONING_GATT_ERROR',
  BLE_PROVISIONING_STATIC_MESSAGE,
  BLE_SERVICE_DISCOVERY_TIMEOUT_MS,
);
```

The Wi-Fi scan call keeps its existing error code/message and gains only the fourth timeout argument.

- [ ] **Step 3: Run focused tests and verify GREEN**

Run:

```bash
npm test -- --runInBand tests/ble/service.test.ts tests/ble/blufiProtocol.test.ts tests/features/device/pair-wifi-flow.test.tsx tests/features/device/pair-connecting-flow.test.tsx
```

Expected: all suites pass, including the new 10.5-second regression and existing permanently-stuck discovery retry tests.

- [ ] **Step 4: Run static validation**

Run:

```bash
npm run typecheck
git diff --check
```

Expected: both commands exit 0.

- [ ] **Step 5: Commit the code and test**

```bash
git add src/services/ble/service.ts tests/ble/service.test.ts docs/superpowers/plans/2026-08-28-android-blufi-wifi-scan-discovery-timeout.md
git commit -m "fix(ble): allow slow Android service discovery"
```

### Task 3: Verify on the attached Android phone and robot

**Files:**
- No source changes expected.

- [ ] **Step 1: Build and install the current Android app**

Run:

```bash
npm run build:android
$HOME/Library/Android/sdk/platform-tools/adb -s efc5314f install -r android/app/build/outputs/apk/debug/app-debug.apk
```

If the runtime build script emits a different APK path, install the exact debug APK path reported by that successful build.

- [ ] **Step 2: Open the pairing flow**

Run:

```bash
$HOME/Library/Android/sdk/platform-tools/adb -s efc5314f shell am start -W -a android.intent.action.VIEW -d 'TJBot://device/pair-intro' com.TJBotmobile
```

Expected: `Status: ok`, then the app finds `TBOT-14C19FD1AC20`.

- [ ] **Step 3: Verify the robot-provided Wi-Fi list**

Select the robot and wait for the Wi-Fi screen. Verify UIAutomator reports at least one selectable network rather than `Robot scan unavailable`, and inspect credential-redacted logs for GATT connection, service discovery completion, scan request, and scan result.

- [ ] **Step 4: Verify repository state**

Run:

```bash
git status --short --branch
git diff --check
```

Expected: no uncommitted implementation changes and no whitespace errors.
