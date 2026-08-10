import type { NavigationProp } from '@react-navigation/native';
import { ROUTES, type RootStackParamList } from '@/navigation/routes';
import {
  completeDeviceProvisioning,
  confirmLocalBlePaired,
  mintBootstrapToken,
  reportProvisioningDeviceAuthenticated,
} from '@/services/api/device.api';
import { markLocalDevicePaired } from './localPairedDevice';
import { clearPendingPairingContext } from './pendingPairingContext';

// The terminal "finish pairing" step, shared by every place that turns an
// already-claimed robot into a completed household-owned device. It is invoked
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
const DEVICE_AUTH_RETRY_INTERVAL_MS = 3000;
const DEVICE_AUTH_MAX_ATTEMPTS = 20;

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

function isDeviceAuthPendingError(error: unknown): boolean {
  const code = errorCodeFrom(error);
  return code === 'DEVICE_AUTH_NOT_VERIFIED' || code === 'PROVISIONING_ATTEMPT_NOT_READY';
}

function waitForDeviceAuthRetry(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, DEVICE_AUTH_RETRY_INTERVAL_MS));
}

async function completeWhenDeviceAuthenticated(
  context: DevicePairingContext,
  childId?: string,
  displayName?: string,
): Promise<void> {
  let localRecoveryAttempted = false;
  for (let attempt = 0; attempt < DEVICE_AUTH_MAX_ATTEMPTS; attempt += 1) {
    try {
      await completeDeviceProvisioning({
        provisioningAttemptId: context.provisioningAttemptId,
        deviceId: context.deviceId,
        displayName: normalizedDisplayName(displayName),
        ...(childId ? { assignChildProfileId: childId } : {}),
      });
      return;
    } catch (error) {
      if (isAlreadyFinalizedError(error)) return;
      if (!isDeviceAuthPendingError(error)) throw error;
      if (!localRecoveryAttempted && context.serialNumber) {
        localRecoveryAttempted = true;
        try {
          await confirmAuthenticationFromLocalHandoff(context);
          continue;
        } catch {
          // Firmware may still authenticate independently; retain the bounded
          // polling fallback when the phone-side recovery cannot complete.
        }
      }
      if (attempt === DEVICE_AUTH_MAX_ATTEMPTS - 1) {
        throw Object.assign(new Error('Robot authentication did not complete in time.'), {
          code: 'DEVICE_AUTH_TIMEOUT',
          cause: error,
        });
      }
      await waitForDeviceAuthRetry();
    }
  }
}

async function confirmAuthenticationFromLocalHandoff(context: DevicePairingContext): Promise<void> {
  if (!context.serialNumber) return;
  const code = Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0');
  await confirmLocalBlePaired({
    deviceId: context.deviceId,
    provisioningAttemptId: context.provisioningAttemptId,
    serialNumber: context.serialNumber,
    code,
  });
  const bootstrap = await mintBootstrapToken({ provisioningAttemptId: context.provisioningAttemptId });
  await reportProvisioningDeviceAuthenticated({
    deviceId: context.deviceId,
    code,
    bootstrapToken: bootstrap.token,
  });
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

// Completes provisioning, marks the device locally paired, then
// resets the stack so the (now-finished) pairing screens are removed from the
// back stack and DeviceHome becomes the root, with PairSuccess on top — the same
// terminus the happy path uses. If the backend says the device is already
// claimed/assigned, treat it as idempotent success: the physical-claim flow has
// already made the robot owned by this household. Other complete failures still
// throw so callers can route to their own error UI.
export async function finalizeDevicePairing(
  navigation: Pick<NavigationProp<RootStackParamList>, 'reset'>,
  context: DevicePairingContext,
  childId?: string,
  displayName?: string,
): Promise<void> {
  await completeWhenDeviceAuthenticated(context, childId, displayName);
  await finishDevicePairingSuccess(navigation, context);
}
