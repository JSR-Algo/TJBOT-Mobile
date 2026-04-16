import { BleManager, Device } from 'react-native-ble-plx';
import { BLE_CONFIG, isAllowlistedDevice } from './config';
import { requestBlePermissions } from './permissions';
import type { BleBootstrapResult, BleDeviceCandidate, BleScanResult } from './types';

let bleManager: BleManager | null = null;

export function getBleManager(): BleManager {
  if (!bleManager) {
    bleManager = new BleManager();
  }

  return bleManager;
}

export async function initializeBle(): Promise<BleBootstrapResult> {
  const permission = await requestBlePermissions();
  if (permission !== 'granted') {
    return {
      permission,
      available: false,
      reason: permission === 'denied' ? 'Bluetooth permission was denied.' : 'Bluetooth is unavailable on this platform.',
    };
  }

  getBleManager();

  return {
    permission,
    available: true,
  };
}

function toCandidate(device: Device): BleDeviceCandidate {
  return {
    id: device.id,
    name: device.name,
    localName: device.localName,
    serviceUUIDs: device.serviceUUIDs ?? [],
  };
}

export function splitDevicesByAllowlist(devices: BleDeviceCandidate[]): BleScanResult {
  return devices.reduce<BleScanResult>(
    (acc, device) => {
      if (isAllowlistedDevice(device.id, device.name ?? device.localName)) {
        acc.allowed.push(device);
      } else {
        acc.blocked.push(device);
      }
      return acc;
    },
    { allowed: [], blocked: [] },
  );
}

export async function scanForTbotDevices(timeoutMs = BLE_CONFIG.SCAN_TIMEOUT_MS): Promise<BleScanResult> {
  const manager = getBleManager();
  const seen = new Map<string, BleDeviceCandidate>();

  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      manager.stopDeviceScan();
      resolve();
    }, timeoutMs);

    manager.startDeviceScan([BLE_CONFIG.SERVICE_UUID], null, (error, device) => {
      if (error) {
        clearTimeout(timer);
        manager.stopDeviceScan();
        resolve();
        return;
      }

      if (!device) {
        return;
      }

      seen.set(device.id, toCandidate(device));
    });
  });

  return splitDevicesByAllowlist([...seen.values()]);
}

export async function disposeBle(): Promise<void> {
  if (!bleManager) {
    return;
  }

  bleManager.stopDeviceScan();
  bleManager.destroy();
  bleManager = null;
}
