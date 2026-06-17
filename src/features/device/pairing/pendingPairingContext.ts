import { getItem, removeItem, setItem } from '@/services/storage/asyncStorage';

const PENDING_PAIRING_CONTEXT_KEY = 'tbot.device.pendingPairingContext';

export interface PendingPairingContext {
  deviceId: string;
  provisioningAttemptId: string;
  serialNumber?: string;
}

function normalizeContext(context: PendingPairingContext): PendingPairingContext | null {
  const deviceId = context.deviceId?.trim();
  const provisioningAttemptId = context.provisioningAttemptId?.trim();
  const serialNumber = context.serialNumber?.trim();
  if (!deviceId || !provisioningAttemptId) return null;
  return {
    deviceId,
    provisioningAttemptId,
    ...(serialNumber ? { serialNumber } : {}),
  };
}

export async function savePendingPairingContext(context: PendingPairingContext): Promise<void> {
  const normalized = normalizeContext(context);
  if (!normalized) return;
  await setItem(PENDING_PAIRING_CONTEXT_KEY, JSON.stringify(normalized));
}

export async function getPendingPairingContext(): Promise<PendingPairingContext | null> {
  const raw = await getItem(PENDING_PAIRING_CONTEXT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PendingPairingContext>;
    return normalizeContext({
      deviceId: parsed.deviceId ?? '',
      provisioningAttemptId: parsed.provisioningAttemptId ?? '',
      serialNumber: parsed.serialNumber,
    });
  } catch {
    return null;
  }
}

export async function clearPendingPairingContext(): Promise<void> {
  await removeItem(PENDING_PAIRING_CONTEXT_KEY);
}
