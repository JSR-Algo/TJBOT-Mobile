import type { ProvisioningAttemptStatus } from '@/services/api/device.api';

export function hasFreshProvisioningOnlineProof(
  value: { status?: ProvisioningAttemptStatus; deviceLastSeenAt?: string | null },
  handoffStartedAtMs: number,
): boolean {
  if (value.status !== 'device_authenticated' && value.status !== 'completed') return false;
  if (!value.deviceLastSeenAt) return false;
  const lastSeenAtMs = Date.parse(value.deviceLastSeenAt);
  return Number.isFinite(lastSeenAtMs) && lastSeenAtMs >= handoffStartedAtMs;
}
