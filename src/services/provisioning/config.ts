import { ENV } from '@/__env__';
import { ESPSecurity } from '@orbital-systems/react-native-esp-idf-provisioning';

/** BLE name prefixes tried when searching for provisioning-mode robots. */
export const PROVISIONING_PREFIXES = ['PROV_', 'TBOT', 'TJBot', 'TBT'] as const;

export function resolveDevicePrefix(): string {
  const explicit = ENV.EXPO_PUBLIC_ESP_DEVICE_PREFIX?.trim();
  if (explicit) return explicit;
  return 'PROV_';
}

export function resolveEspSecurity(): ESPSecurity {
  const raw = ENV.EXPO_PUBLIC_ESP_SECURITY?.trim().toLowerCase();
  if (raw === 'unsecure' || raw === '0') return ESPSecurity.unsecure;
  if (raw === 'secure' || raw === 'secure1' || raw === '1') return ESPSecurity.secure;
  return ESPSecurity.secure2;
}

export function resolveProofOfPossession(pairingCode?: string): string | null {
  // Never fall back to a globally bundled POP; per-device pairing code only.
  if (pairingCode?.trim()) return pairingCode.trim();
  return null;
}