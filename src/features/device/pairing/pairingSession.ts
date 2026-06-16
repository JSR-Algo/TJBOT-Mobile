import type { ESPDevice } from '@orbital-systems/react-native-esp-idf-provisioning';
import type { BleDeviceCandidate } from '@/services/ble/types';
import { usePairingStore } from './pairingStore';

export interface PairingCandidate {
  bleId: string;
  name: string;
  serial: string;
  /** Shown on robot face for parent confirmation (when available). */
  displayCode: string;
  /** ESP-IDF provisioning BLE advertised name. */
  espDeviceName: string;
}

export function deriveSerialFromBle(candidate: BleDeviceCandidate): string {
  const label = (candidate.name ?? candidate.localName ?? candidate.id).trim();
  const suffix = label.split(/[-_]/).pop()?.toUpperCase() ?? candidate.id.slice(-4).toUpperCase();
  return label.length > 0 ? label : `ROB-${suffix}`;
}

export function deriveDisplayCode(candidate: BleDeviceCandidate): string {
  const label = (candidate.name ?? candidate.localName ?? '').trim();
  const match = label.match(/(\d{4,6})/);
  if (match) return match[1];
  return candidate.id.replace(/[^0-9A-Za-z]/g, '').slice(-4).padStart(4, '0');
}

export function setPairingCandidate(candidate: PairingCandidate | null): void {
  usePairingStore.setState({ activeCandidate: candidate });
  if (!candidate) {
    usePairingStore.setState({ connectedDevice: null });
  }
}

export function getPairingCandidate(): PairingCandidate | null {
  return usePairingStore.getState().activeCandidate;
}

export function setConnectedEspDevice(device: ESPDevice | null): void {
  usePairingStore.setState({ connectedDevice: device });
}

export function getConnectedEspDevice(): ESPDevice | null {
  return usePairingStore.getState().connectedDevice;
}

export function clearPairingSession(): void {
  const { connectedDevice } = usePairingStore.getState();
  if (connectedDevice) {
    try {
      connectedDevice.disconnect();
    } catch {
      /* ignore */
    }
  }
  usePairingStore.setState({ activeCandidate: null, connectedDevice: null });
}