const WIFI_PASSWORD_TTL_MS = 2 * 60 * 1000;
const BOOTSTRAP_TOKEN_TTL_MS = 5 * 60 * 1000;

const wifiPasswordsByAttempt = new Map<string, {
  wifiPassword: string;
  timeoutId: ReturnType<typeof setTimeout>;
}>();

const bootstrapTokensByAttempt = new Map<string, {
  token: string;
  timeoutId: ReturnType<typeof setTimeout>;
}>();

export function putPairingWifiPassword(provisioningAttemptId: string, wifiPassword: string): void {
  clearPairingWifiPassword(provisioningAttemptId);
  const timeoutId = setTimeout(() => {
    wifiPasswordsByAttempt.delete(provisioningAttemptId);
  }, WIFI_PASSWORD_TTL_MS);
  (timeoutId as { unref?: () => void }).unref?.();
  wifiPasswordsByAttempt.set(provisioningAttemptId, { wifiPassword, timeoutId });
}

export function consumePairingWifiPassword(provisioningAttemptId: string): string | undefined {
  const entry = wifiPasswordsByAttempt.get(provisioningAttemptId);
  if (!entry) return undefined;
  clearTimeout(entry.timeoutId);
  wifiPasswordsByAttempt.delete(provisioningAttemptId);
  return entry.wifiPassword;
}

function clearPairingWifiPassword(provisioningAttemptId: string): void {
  const entry = wifiPasswordsByAttempt.get(provisioningAttemptId);
  if (entry) clearTimeout(entry.timeoutId);
  wifiPasswordsByAttempt.delete(provisioningAttemptId);
}

export function putPairingBootstrapToken(provisioningAttemptId: string, token: string): void {
  clearPairingBootstrapToken(provisioningAttemptId);
  const timeoutId = setTimeout(() => {
    bootstrapTokensByAttempt.delete(provisioningAttemptId);
  }, BOOTSTRAP_TOKEN_TTL_MS);
  (timeoutId as { unref?: () => void }).unref?.();
  bootstrapTokensByAttempt.set(provisioningAttemptId, { token, timeoutId });
}

export function getPairingBootstrapToken(provisioningAttemptId: string): string | undefined {
  return bootstrapTokensByAttempt.get(provisioningAttemptId)?.token;
}

export function clearPairingBootstrapToken(provisioningAttemptId: string): void {
  const entry = bootstrapTokensByAttempt.get(provisioningAttemptId);
  if (entry) clearTimeout(entry.timeoutId);
  bootstrapTokensByAttempt.delete(provisioningAttemptId);
}
