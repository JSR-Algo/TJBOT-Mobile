/**
 * RobotStatusConnector — the honest read path for robot status surfaces.
 *
 * Wraps the real device.api getDeviceStatus (GET /devices/household/me via
 * the 'primary' alias) and returns a typed ConnectorResult instead of
 * throwing, so robot-mgmt screens can render ConnectorStateNotice for every
 * blocked state instead of fabricating hardware values.
 *
 * Pairing honesty: missing local pairing ID alone does NOT short-circuit the
 * network call. Always try getDeviceStatus('primary'). `not_connected` is
 * reserved for true no-device outcomes (empty id, DEVICE_NOT_FOUND, 404).
 * Investor demo still returns the seeded device flagged `simulated: true`.
 *
 * Errors are mapped with mapErrorToLinkState. When mapping returns null
 * (auth/validation/ordinary Error), the original error is rethrown — never
 * coerced to `server_unavailable`.
 *
 * Manual impact note (new module, 2026-07-18): no upstream callers by
 * construction. Consumers land in P2 lane A: features/robot-mgmt/telemetry.ts
 * and the robot-mgmt screens.
 */
import { getDeviceStatus, type DeviceStatus } from '@/services/api/device.api';
import { isInvestorDemoEnabled } from '@/config/investorDemo';
import {
  linkBlocked,
  mapErrorToLinkState,
  ok,
  type ConnectorResult,
} from './types';
import { normalizeError } from '@/utils/errors';

/** 'primary' resolves the household's device server-side (GET /devices/household/me). */
export const PRIMARY_ROBOT_DEVICE_ID = 'primary';

export type RobotStatusSnapshot = {
  device: DeviceStatus;
  /** True only in the __DEV__ investor demo: seeded data, never real hardware. */
  simulated: boolean;
};

export async function fetchRobotStatus(options?: {
  childId?: string;
}): Promise<ConnectorResult<RobotStatusSnapshot>> {
  const simulated = isInvestorDemoEnabled();

  try {
    const device = await getDeviceStatus(PRIMARY_ROBOT_DEVICE_ID, options?.childId);
    if (!device?.id) {
      return linkBlocked('not_connected', undefined, true);
    }
    return ok({ device, simulated });
  } catch (error) {
    if (isNoDeviceError(error)) {
      return linkBlocked('not_connected', describeError(error), true);
    }
    const state = mapErrorToLinkState(error);
    if (state === null) {
      throw error;
    }
    return linkBlocked(state, describeError(error), state !== 'unsupported_until_connector');
  }
}

function isNoDeviceError(error: unknown): boolean {
  const status =
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { status?: unknown } }).response?.status === 'number'
      ? (error as { response: { status: number } }).response.status
      : undefined;
  if (status === 404) {
    return true;
  }

  const code = normalizeError(error).code;
  return code === 'DEVICE_NOT_FOUND' || code === 'NOT_FOUND';
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
