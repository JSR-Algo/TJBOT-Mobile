/**
 * usePairedDeviceStatus — shared real-status query for the device screens.
 *
 * Extracted from DeviceHomeScreen so every device surface reads Robot status
 * the same way (and never fabricates it): the locally paired device id wins,
 * otherwise fall back to the backend household lookup ('primary'). The 8s
 * screen timeout keeps a hung status call from pinning a screen on its
 * loading state; query keys are identical to the original DeviceHomeScreen
 * keys so cache sharing is unchanged.
 *
 * Timeout rejects with `Network Error` so mapErrorToLinkState returns
 * `server_unavailable` legitimately — screens must never coerce null.
 *
 * Manual impact note (new module, P2 mobile de-fake): consumers are
 * DeviceHomeScreen, DeviceOverviewScreen, DeviceLostScreen (all in
 * src/features/device/screens/).
 */
import { useQuery } from '@tanstack/react-query';
import { getDeviceStatus, type DeviceStatus } from '@/services/api/device.api';
import { getLocalPairedDeviceId } from '../pairing/localPairedDevice';

const DEVICE_STATUS_SCREEN_TIMEOUT_MS = 8_000;

function getDeviceStatusForScreen(deviceId: string): Promise<DeviceStatus> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<DeviceStatus>((_, reject) => {
    // Transport-style failure so mapErrorToLinkState → server_unavailable.
    timeoutId = setTimeout(() => reject(new Error('Network Error')), DEVICE_STATUS_SCREEN_TIMEOUT_MS);
  });

  return Promise.race([getDeviceStatus(deviceId), timeout]).finally(() => {
    clearTimeout(timeoutId);
  });
}

export function usePairedDeviceStatus() {
  const localDeviceQuery = useQuery({
    queryKey: ['devices', 'local-paired-id'],
    queryFn: getLocalPairedDeviceId,
  });
  const localDeviceId = localDeviceQuery.data;
  const hasLocalDevice = typeof localDeviceId === 'string' && localDeviceId.length > 0;
  const deviceIdForStatus = hasLocalDevice ? localDeviceId : 'primary';
  const deviceQuery = useQuery({
    queryKey: ['devices', 'paired', deviceIdForStatus],
    queryFn: () => getDeviceStatusForScreen(deviceIdForStatus),
    enabled: !localDeviceQuery.isLoading,
    retry: false,
  });

  return { localDeviceQuery, deviceQuery, localDeviceId, hasLocalDevice, deviceIdForStatus };
}
