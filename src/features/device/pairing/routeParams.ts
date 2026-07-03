import type { RootStackParamList } from '@/navigation/routes';

type PairWifiPasswordParams = NonNullable<RootStackParamList['PairWifiPasswordScreen']>;
type PairingRetryParams = {
  provisioningAttemptId?: string;
  provisioningTransport?: PairWifiPasswordParams['provisioningTransport'];
} | undefined;

const FALLBACK_SSID = 'Selected network';

export function buildPairWifiPasswordParams(ssid: string): PairWifiPasswordParams {
  return { ssid: sanitizeSsid(ssid) };
}

export function getPairWifiPasswordSsid(params: RootStackParamList['PairWifiPasswordScreen']): string {
  return sanitizeSsid(params?.ssid);
}

export function buildPairSearchRetryParams(params: PairingRetryParams): RootStackParamList['PairSearchScreen'] {
  if (!params) return undefined;
  if (params.provisioningTransport === 'ble_reconnect' || params.provisioningTransport === 'ble_offline') {
    return { reconnectMode: true };
  }
  if (params.provisioningAttemptId?.startsWith('reconnect:') || params.provisioningAttemptId?.startsWith('offline:')) {
    return { reconnectMode: true };
  }
  return undefined;
}

export function hasPairFoundContext(params: RootStackParamList['PairQrScanScreen']): boolean {
  return !!(params?.deviceId || params?.serialNumber || params?.bleDeviceId);
}

function sanitizeSsid(value: string | undefined): string {
  if (!value) {
    return FALLBACK_SSID;
  }

  const trimmed = value.trim();
  if (!trimmed || hasControlCharacter(trimmed)) {
    return FALLBACK_SSID;
  }

  return trimmed.slice(0, 32);
}

function hasControlCharacter(value: string): boolean {
  return Array.from(value).some((char) => {
    const codePoint = char.codePointAt(0);
    return codePoint !== undefined && (codePoint <= 31 || codePoint === 127);
  });
}
