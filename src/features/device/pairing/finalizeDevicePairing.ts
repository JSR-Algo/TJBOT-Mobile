import type { NavigationProp } from '@react-navigation/native';
import { ROUTES, type RootStackParamList } from '@/navigation/routes';
import { completeDeviceProvisioning } from '@/services/api/device.api';
import { markLocalDevicePaired } from './localPairedDevice';
import { clearPendingPairingContext } from './pendingPairingContext';

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

export interface DevicePairingSuccessContext {
  deviceId: string;
  provisioningAttemptId?: string;
  serialNumber?: string;
}

// The single fixed device display name used across the pairing flow. The buddy
// avatar is UI-only and never rides the claim payload (see PairRenameScreen).
const PAIRING_DISPLAY_NAME = 'Living-room Robot';

function normalizedDisplayName(displayName: string | undefined): string {
  const trimmed = displayName?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : PAIRING_DISPLAY_NAME;
}

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

function errorCodeFrom(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const record = error as {
    code?: unknown;
    response?: { data?: { code?: unknown; error?: { code?: unknown } } };
  };
  if (typeof record.code === 'string') return record.code;
  if (typeof record.response?.data?.code === 'string') return record.response.data.code;
  if (typeof record.response?.data?.error?.code === 'string') return record.response.data.error.code;
  return undefined;
}

function isAlreadyFinalizedError(error: unknown): boolean {
  const code = errorCodeFrom(error);
  return code === 'DEVICE_ALREADY_ASSIGNED'
    || code === 'DEVICE_ALREADY_CLAIMED'
    || code === 'PROVISIONING_ATTEMPT_ALREADY_COMPLETED'
    || code === 'CLAIM_ALREADY_CONFIRMED';
}

export async function finishDevicePairingSuccess(
  navigation: Pick<NavigationProp<RootStackParamList>, 'reset'>,
  context: DevicePairingSuccessContext,
): Promise<void> {
  await markLocalDevicePairedBestEffort(context.deviceId);
  await Promise.resolve(clearPendingPairingContext()).catch(() => undefined);
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

// Completes provisioning for `childId`, marks the device locally paired, then
// resets the stack so the (now-finished) pairing screens are removed from the
// back stack and DeviceHome becomes the root, with PairSuccess on top — the same
// terminus the happy path uses. If the backend says the device is already
// claimed/assigned, treat it as idempotent success: the physical-claim flow has
// already made the robot owned by this household. Other complete failures still
// throw so callers can route to their own error UI.
export async function finalizeDevicePairing(
  navigation: Pick<NavigationProp<RootStackParamList>, 'reset'>,
  context: DevicePairingContext,
  childId: string,
  displayName?: string,
): Promise<void> {
  try {
    await completeDeviceProvisioning({
      provisioningAttemptId: context.provisioningAttemptId,
      deviceId: context.deviceId,
      assignChildProfileId: childId,
      displayName: normalizedDisplayName(displayName),
    });
  } catch (error) {
    if (!isAlreadyFinalizedError(error)) throw error;
  }
  await finishDevicePairingSuccess(navigation, context);
}
