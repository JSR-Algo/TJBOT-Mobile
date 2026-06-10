import type { RootStackParamList } from '@/navigation/routes';

type PairWifiPasswordParams = NonNullable<RootStackParamList['PairWifiPasswordScreen']>;

const FALLBACK_SSID = 'Selected network';

export function buildPairWifiPasswordParams(ssid: string): PairWifiPasswordParams {
  return { ssid: sanitizeSsid(ssid) };
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
