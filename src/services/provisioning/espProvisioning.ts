import {
  ESPDevice,
  ESPProvisionManager,
  ESPTransport,
  type ESPWifiList,
  type ESPStatusResponse,
} from '@orbital-systems/react-native-esp-idf-provisioning';
import {
  PROVISIONING_PREFIXES,
  resolveDevicePrefix,
  resolveEspSecurity,
  resolveProofOfPossession,
} from './config';
import type { ProvisioningErrorCode } from '@/state/machines/devicePairing.types';

export type ProvisioningConnectParams = {
  deviceName: string;
  pairingCode?: string;
  username?: string;
};

export type ProvisioningConnectResult = {
  device: ESPDevice;
  deviceName: string;
};

export class ProvisioningError extends Error {
  constructor(
    message: string,
    readonly code: ProvisioningErrorCode,
  ) {
    super(message);
    this.name = 'ProvisioningError';
  }
}

export async function searchProvisionableDevices(): Promise<ESPDevice[]> {
  const security = resolveEspSecurity();
  const primaryPrefix = resolveDevicePrefix();
  const prefixes = [primaryPrefix, ...PROVISIONING_PREFIXES.filter((p) => p !== primaryPrefix)];

  for (const prefix of prefixes) {
    try {
      const devices = await ESPProvisionManager.searchESPDevices(
        prefix,
        ESPTransport.ble,
        security,
      );
      if (devices?.length) return devices;
    } catch {
      /* try next prefix */
    }
  }

  return [];
}

export function stopProvisionSearch(): void {
  ESPProvisionManager.stopESPDevicesSearch();
}

export async function connectProvisionableDevice(
  params: ProvisioningConnectParams,
  retry = true,
): Promise<ProvisioningConnectResult> {
  const security = resolveEspSecurity();
  const pop = resolveProofOfPossession(params.pairingCode);
  const username = params.username?.trim() || params.deviceName;

  const device = new ESPDevice({
    name: params.deviceName,
    transport: ESPTransport.ble,
    security,
  });

  try {
    await device.connect(pop, null, username);
    return { device, deviceName: params.deviceName };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to connect to robot for provisioning';
    const transient = /peripheral disconnected/i.test(message);
    if (transient && retry) {
      return connectProvisionableDevice(params, false);
    }
    throw new ProvisioningError(message, 'E-PROV-001');
  }
}

export async function scanWifiNetworks(device: ESPDevice): Promise<ESPWifiList[]> {
  try {
    const list = await device.scanWifiList();
    return list ?? [];
  } catch (err) {
    throw new ProvisioningError(
      err instanceof Error ? err.message : 'Wi-Fi scan failed',
      'E-PROV-001',
    );
  }
}

export async function provisionWifi(
  device: ESPDevice,
  ssid: string,
  password: string,
): Promise<ESPStatusResponse> {
  try {
    return await device.provision(ssid, password);
  } catch (err) {
    throw new ProvisioningError(
      err instanceof Error ? err.message : 'Wi-Fi provisioning failed',
      'E-PROV-002',
    );
  } finally {
    try {
      device.disconnect();
    } catch {
      /* ignore */
    }
  }
}