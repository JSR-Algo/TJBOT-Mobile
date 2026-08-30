export const WIFI_SETUP_HEARTBEAT_MAX_AGE_MS = 5 * 60 * 1000;

export function isDeviceHeartbeatFresh(
  lastSeenAt: string | undefined,
  nowMs = Date.now(),
): boolean {
  if (!lastSeenAt) return false;
  const lastSeenMs = Date.parse(lastSeenAt);
  if (!Number.isFinite(lastSeenMs)) return false;
  const ageMs = nowMs - lastSeenMs;
  return ageMs >= 0 && ageMs <= WIFI_SETUP_HEARTBEAT_MAX_AGE_MS;
}
