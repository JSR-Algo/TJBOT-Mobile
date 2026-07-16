import type { RootStackParamList } from '@/navigation/routes';

type PairWifiPasswordParams = NonNullable<RootStackParamList['PairWifiPasswordScreen']>;
type PairingRetryParams = {
  deviceId?: string;
  serialNumber?: string;
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
  if (params.provisioningTransport === 'ble_reconnect') {
    return reconnectSearchParams(params);
  }
  if (params.provisioningAttemptId?.startsWith('reconnect:')) {
    return reconnectSearchParams(params);
  }
  return undefined;
}

function reconnectSearchParams(params: NonNullable<PairingRetryParams>): NonNullable<RootStackParamList['PairSearchScreen']> {
  return {
    reconnectMode: true,
    ...(params.deviceId ? { reconnectDeviceId: params.deviceId } : {}),
    ...(params.serialNumber ? { reconnectSerialNumber: params.serialNumber } : {}),
  };
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
