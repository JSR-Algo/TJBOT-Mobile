import type { NavigationProp } from '@react-navigation/native';
import { ROUTES, type RootStackParamList } from '@/navigation/routes';
import { completeDeviceProvisioning } from '@/services/api/device.api';
import { markLocalDevicePaired } from './localPairedDevice';

// The terminal "finish pairing" step, shared by every place that turns an
// already-claimed robot into a completed, child-assigned device. It is invoked
// from:
//   - PairRenameScreen (the happy path: a child already exists), and
//   - ChildProfileScreen (the zero-child path: the parent just created a child
//     mid-pairing and must finish the pairing they started, NOT be dropped into
//     onboarding).
// Centralising it keeps the completeDeviceProvisioning + markLocalDevicePaired +
// reset semantics identical across both entries (one definition, no drift).

export interface DevicePairingContext {
  deviceId: string;
  provisioningAttemptId: string;
  serialNumber?: string;
}

// The single fixed device display name used across the pairing flow. The buddy
// avatar is UI-only and never rides the claim payload (see PairRenameScreen).
const PAIRING_DISPLAY_NAME = 'Living-room Robot';

// Best-effort local cache write. Backend completion is authoritative, so a local
// cache failure must never undo a confirmed claim.
async function markLocalDevicePairedBestEffort(deviceId: string): Promise<void> {
  try {
    await markLocalDevicePaired(deviceId);
  } catch {
    // Swallowed on purpose: the backend already owns the device; a failed
    // local-cache write only affects an optimistic offline hint, not the claim.
  }
}

// Completes provisioning for `childId`, marks the device locally paired, then
// resets the stack so the (now-finished) pairing screens are removed from the
// back stack and DeviceHome becomes the root, with PairSuccess on top — the same
// terminus the happy path uses. Throws on completeDeviceProvisioning failure so
// callers can route to their own error UI (PairFailed / inline error) rather
// than silently dead-ending.
export async function finalizeDevicePairing(
  navigation: Pick<NavigationProp<RootStackParamList>, 'reset'>,
  context: DevicePairingContext,
  childId: string,
): Promise<void> {
  await completeDeviceProvisioning({
    provisioningAttemptId: context.provisioningAttemptId,
    deviceId: context.deviceId,
    assignChildProfileId: childId,
    displayName: PAIRING_DISPLAY_NAME,
  });
  await markLocalDevicePairedBestEffort(context.deviceId);
  navigation.reset({
    index: 1,
    routes: [
      { name: ROUTES.DeviceHomeScreen },
      {
        name: ROUTES.PairSuccessScreen,
        params: {
          deviceId: context.deviceId,
          serialNumber: context.serialNumber,
          provisioningAttemptId: context.provisioningAttemptId,
        },
      },
    ],
  });
}
