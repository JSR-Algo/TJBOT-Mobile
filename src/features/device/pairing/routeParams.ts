import type { RootStackParamList } from '@/navigation/routes';

type PairWifiPasswordParams = NonNullable<RootStackParamList['PairWifiPasswordScreen']>;
type PairWifiParams = NonNullable<RootStackParamList['PairWifiScreen']>;

const FALLBACK_SSID = 'Selected network';

export function buildPairWifiParams(input: {
  code: string;
  deviceId?: string;
  serial?: string;
  espDeviceName?: string;
}): PairWifiParams {
  const params: PairWifiParams = { code: input.code };
  if (input.deviceId) params.deviceId = input.deviceId;
  if (input.serial) params.serial = input.serial;
  if (input.espDeviceName) params.espDeviceName = input.espDeviceName;
  return params;
}

export function buildPairWifiPasswordParams(
  ssid: string,
  context?: {
    deviceId?: string;
    code?: string;
    serial?: string;
    espDeviceName?: string;
  },
): PairWifiPasswordParams {
  const params: PairWifiPasswordParams = { ssid: sanitizeSsid(ssid) };
  if (context?.deviceId) params.deviceId = context.deviceId;
  if (context?.code) params.code = context.code;
  if (context?.serial) params.serial = context.serial;
  if (context?.espDeviceName) params.espDeviceName = context.espDeviceName;
  return params;
}

export function getPairWifiPasswordSsid(params: RootStackParamList['PairWifiPasswordScreen']): string {
  return sanitizeSsid(params?.ssid);
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
