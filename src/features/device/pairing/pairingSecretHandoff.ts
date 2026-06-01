const WIFI_PASSWORD_TTL_MS = 2 * 60 * 1000;

const wifiPasswordsByAttempt = new Map<string, {
  wifiPassword: string;
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
