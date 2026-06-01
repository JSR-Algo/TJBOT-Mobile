import { getItem, removeItem, setItem } from '@/services/storage/asyncStorage';

const LOCAL_PAIRED_DEVICE_ID_KEY = 'tbot.device.localPairedDeviceId';

export async function getLocalPairedDeviceId(): Promise<string | null> {
  const value = await getItem(LOCAL_PAIRED_DEVICE_ID_KEY);
  return value && value.trim().length > 0 ? value : null;
}

export async function markLocalDevicePaired(deviceId: string): Promise<void> {
  const normalized = deviceId.trim();
  if (!normalized) return;
  await setItem(LOCAL_PAIRED_DEVICE_ID_KEY, normalized);
}

export async function clearLocalPairedDevice(): Promise<void> {
  await removeItem(LOCAL_PAIRED_DEVICE_ID_KEY);
}
