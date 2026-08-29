# Fresh Connectivity Wi-Fi Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the mobile app from presenting lifecycle ownership as live Robot connectivity and block remote Wi-Fi setup when the latest heartbeat is missing or stale.

**Architecture:** Device API normalization will only derive realtime connectivity from explicit connectivity metadata or explicit offline status. A focused device-connectivity helper will own the heartbeat freshness rule, and `DeviceHomeScreen` will use it as a precondition for the remote Wi-Fi setup mutation while preserving the current 409 error handling and successful BLE reconnect navigation.

**Tech Stack:** React Native, TypeScript, React Query, Jest, React Native Testing Library

---

## File Structure

- Create `src/features/device/connectivity.ts`: deterministic heartbeat freshness policy for Wi-Fi setup.
- Create `tests/features/device/connectivity.test.ts`: boundary tests for the freshness policy.
- Modify `src/services/api/device.api.ts`: stop mapping lifecycle `active` to realtime online.
- Modify `tests/api/device-api.test.ts`: regression coverage for lifecycle/connectivity normalization.
- Modify `src/features/device/screens/DeviceHomeScreen.tsx`: gate the Wi-Fi setup request on online plus fresh heartbeat.
- Modify `tests/features/device/device-home-screen.test.tsx`: screen behavior for fresh, missing, stale, successful, and 409 paths.

### Task 1: Correct Device Connectivity Normalization

**Files:**
- Modify: `tests/api/device-api.test.ts`
- Modify: `src/services/api/device.api.ts:121`

- [ ] **Step 1: Write the failing lifecycle regression test**

Add this case to `tests/api/device-api.test.ts` after the first household-device test:

```ts
it('does not treat the active ownership lifecycle as realtime connectivity', async () => {
  jest.resetModules();
  const get = jest.fn().mockResolvedValueOnce({
    data: [{
      id: 'device-owned',
      status: 'active',
      battery_level: 50,
      last_seen_at: '2026-08-29T07:00:00.000Z',
    }],
  });
  jest.doMock('@/services/http/client', () => ({ __esModule: true, default: { get } }));
  const { getDeviceStatus } = require('@/services/api/device.api') as typeof import('@/services/api/device.api');

  await expect(getDeviceStatus('primary')).resolves.toMatchObject({
    id: 'device-owned',
    online: null,
  });
});
```

- [ ] **Step 2: Run the focused API test and verify RED**

Run:

```bash
pnpm exec jest --selectProjects unit --runInBand tests/api/device-api.test.ts
```

Expected: FAIL because `status: 'active'` currently normalizes to `online: true`.

- [ ] **Step 3: Implement the minimal normalization change**

Replace the lifecycle-based expression in `normalizeDevice` with explicit connectivity semantics:

```ts
const connectivityState = dto.connectivity_metrics?.connectivity_state;
const operationalState = connectivityState === 'online'
  ? 'online'
  : dto.status === 'offline' || connectivityState === 'offline'
    ? 'offline'
    : null;
```

Do not change ownership selection, device naming, battery, Wi-Fi, or child-binding logic.

- [ ] **Step 4: Run the focused API test and verify GREEN**

Run:

```bash
pnpm exec jest --selectProjects unit --runInBand tests/api/device-api.test.ts
```

Expected: all tests in `device-api.test.ts` pass, including explicit online connectivity and explicit offline status.

- [ ] **Step 5: Commit the normalization fix**

```bash
git add src/services/api/device.api.ts tests/api/device-api.test.ts
git commit -m "fix(device): separate ownership from connectivity"
```

### Task 2: Add A Deterministic Heartbeat Freshness Policy

**Files:**
- Create: `tests/features/device/connectivity.test.ts`
- Create: `src/features/device/connectivity.ts`

- [ ] **Step 1: Write failing freshness tests**

Create `tests/features/device/connectivity.test.ts`:

```ts
import { isDeviceHeartbeatFresh, WIFI_SETUP_HEARTBEAT_MAX_AGE_MS } from '@/features/device/connectivity';

describe('isDeviceHeartbeatFresh', () => {
  const nowMs = Date.parse('2026-08-29T08:30:00.000Z');

  it('accepts a heartbeat at the freshness boundary', () => {
    const heartbeat = new Date(nowMs - WIFI_SETUP_HEARTBEAT_MAX_AGE_MS).toISOString();
    expect(isDeviceHeartbeatFresh(heartbeat, nowMs)).toBe(true);
  });

  it.each([undefined, '', 'not-a-date'])('rejects a missing or invalid heartbeat: %p', value => {
    expect(isDeviceHeartbeatFresh(value, nowMs)).toBe(false);
  });

  it('rejects a stale heartbeat', () => {
    const heartbeat = new Date(nowMs - WIFI_SETUP_HEARTBEAT_MAX_AGE_MS - 1).toISOString();
    expect(isDeviceHeartbeatFresh(heartbeat, nowMs)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the new helper test and verify RED**

Run:

```bash
pnpm exec jest --selectProjects unit --runInBand tests/features/device/connectivity.test.ts
```

Expected: FAIL because `@/features/device/connectivity` does not exist.

- [ ] **Step 3: Implement the minimal helper**

Create `src/features/device/connectivity.ts`:

```ts
export const WIFI_SETUP_HEARTBEAT_MAX_AGE_MS = 5 * 60 * 1000;

export function isDeviceHeartbeatFresh(
  lastSeenAt: string | undefined,
  nowMs = Date.now(),
): boolean {
  if (!lastSeenAt) return false;
  const lastSeenMs = Date.parse(lastSeenAt);
  if (!Number.isFinite(lastSeenMs)) return false;
  const ageMs = nowMs - lastSeenMs;
  return ageMs >= 0 && ageMs <= WIFI_SETUP_HEARTBEAT_MAX_AGE_MS;
}
```

- [ ] **Step 4: Run the helper test and verify GREEN**

Run:

```bash
pnpm exec jest --selectProjects unit --runInBand tests/features/device/connectivity.test.ts
```

Expected: 4 test cases pass with no warnings.

- [ ] **Step 5: Commit the freshness helper**

```bash
git add src/features/device/connectivity.ts tests/features/device/connectivity.test.ts
git commit -m "feat(device): define fresh heartbeat policy"
```

### Task 3: Gate Remote Wi-Fi Setup On Fresh Connectivity

**Files:**
- Modify: `tests/features/device/device-home-screen.test.tsx`
- Modify: `src/features/device/screens/DeviceHomeScreen.tsx:1-170`

- [ ] **Step 1: Make the existing success case provide a fresh heartbeat**

In `changes Wi-Fi without unpairing through reconnect search`, add:

```ts
lastSeenAt: new Date().toISOString(),
```

to the mocked device status. This preserves the success-path intent under the new precondition.

- [ ] **Step 2: Write failing missing and stale heartbeat screen tests**

Add these tests after the success case:

```ts
it.each([
  ['missing', undefined],
  ['stale', new Date(Date.now() - 5 * 60 * 1000 - 1).toISOString()],
])('blocks Wi-Fi setup when the heartbeat is %s', async (_case, lastSeenAt) => {
  apiMocks.getDeviceStatus.mockResolvedValue({
    id: 'seed-device',
    name: 'Seed Robot',
    online: true,
    batteryPercent: 87,
    lastSeenAt,
  });
  const navigation = { navigate: jest.fn() };
  const screen = renderWithQuery(
    <DeviceHomeScreen navigation={navigation as never} route={{ params: undefined } as never} />,
  );

  await expect(screen.findByText('Seed Robot')).resolves.toBeTruthy();
  expect(screen.getByText('Robot must be online with a recent heartbeat.')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Change Wi‑Fi. Robot must be online with a recent heartbeat.'));

  expect(apiMocks.startDeviceWifiSetup).not.toHaveBeenCalled();
  expect(navigation.navigate).not.toHaveBeenCalledWith(ROUTES.PairSearchScreen, expect.anything());
});
```

- [ ] **Step 3: Run the screen tests and verify RED**

Run:

```bash
pnpm exec jest --selectProjects unit --runInBand tests/features/device/device-home-screen.test.tsx
```

Expected: FAIL because the screen still shows the automatic setup copy and sends the mutation without checking `lastSeenAt`.

- [ ] **Step 4: Implement the screen precondition**

Import the helper:

```ts
import { isDeviceHeartbeatFresh } from '../connectivity';
```

After computing `wifiLabel`, add:

```ts
const canStartWifiSetup = device.online === true && isDeviceHeartbeatFresh(device.lastSeenAt);
const wifiSetupBody = wifiSetupMutation.isPending
  ? 'Opening setup mode...'
  : canStartWifiSetup
    ? 'Robot will open setup mode automatically.'
    : 'Robot must be online with a recent heartbeat.';
```

Then update the Change Wi-Fi row:

```tsx
<DeviceRow
  icon="📶"
  title="Change Wi‑Fi"
  body={wifiSetupBody}
  onClick={() => {
    if (canStartWifiSetup && !wifiSetupMutation.isPending) {
      wifiSetupMutation.mutate(device.id);
    }
  }}
/>
```

Keep the existing mutation `onSuccess` navigation and existing `isError` 409 message unchanged.

- [ ] **Step 5: Add explicit 409 regression coverage**

Add this test after the blocked cases:

```ts
it('keeps a backend Wi-Fi setup conflict visible without navigating', async () => {
  apiMocks.getDeviceStatus.mockResolvedValue({
    id: 'seed-device',
    name: 'Seed Robot',
    online: true,
    batteryPercent: 87,
    lastSeenAt: new Date().toISOString(),
  });
  apiMocks.startDeviceWifiSetup.mockRejectedValue(new Error('409 DEVICE_NOT_ONLINE'));
  const navigation = { navigate: jest.fn() };
  const screen = renderWithQuery(
    <DeviceHomeScreen navigation={navigation as never} route={{ params: undefined } as never} />,
  );

  await expect(screen.findByText('Seed Robot')).resolves.toBeTruthy();
  fireEvent.press(screen.getByLabelText('Change Wi‑Fi. Robot will open setup mode automatically.'));

  await expect(screen.findByText('Could not open Wi-Fi setup. Make sure Robot is online and try again.')).resolves.toBeTruthy();
  expect(navigation.navigate).not.toHaveBeenCalledWith(ROUTES.PairSearchScreen, expect.anything());
});
```

- [ ] **Step 6: Run screen and helper tests and verify GREEN**

Run:

```bash
pnpm exec jest --selectProjects unit --runInBand \
  tests/features/device/connectivity.test.ts \
  tests/features/device/device-home-screen.test.tsx
```

Expected: all connectivity and device-home tests pass.

- [ ] **Step 7: Commit the screen gate**

```bash
git add src/features/device/screens/DeviceHomeScreen.tsx tests/features/device/device-home-screen.test.tsx
git commit -m "fix(device): gate wifi setup on fresh heartbeat"
```

### Task 4: Full Mobile Verification And Android Demo Build

**Files:**
- Verify only; no planned source edits.

- [ ] **Step 1: Run all mobile unit tests**

Run:

```bash
pnpm test -- --runInBand
```

Expected: every unit suite passes with zero failed tests.

- [ ] **Step 2: Run TypeScript validation**

Run:

```bash
pnpm typecheck
```

Expected: exit code 0 with no TypeScript errors.

- [ ] **Step 3: Check the complete diff**

Run:

```bash
git diff --check HEAD~3..HEAD
git status --short
```

Expected: no whitespace errors and no uncommitted files.

- [ ] **Step 4: Build and install the Android APK**

Use the repository runtime wrapper so the bundled Node runtime is selected:

```bash
pnpm build:android
/Users/manhhodinh/Library/Android/sdk/platform-tools/adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Expected: Android build succeeds and ADB reports `Success`.

- [ ] **Step 5: Verify the stale-device UI physically**

Open the Device screen on the attached phone. With no live Robot socket and a stale heartbeat, verify:

```text
The screen does not report lifecycle `active` as confirmed Online.
Change Wi-Fi shows the recent-heartbeat requirement.
Pressing Change Wi-Fi sends no backend request and does not enter BLE reconnect search.
```

- [ ] **Step 6: Record the remaining firmware gate accurately**

Do not claim full Wi-Fi E2E completion until the Robot runs firmware `2.2.90`. Record that serial auto-reset does not enter ROM download mode and USB-JTAG cannot currently claim the debug interface. Once firmware installation becomes available, resume the already requested three Wi-Fi-change and three unpair/re-pair physical cycles.
