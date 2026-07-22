/**
 * RobotControlConnector — the hardware action boundary for robot-mgmt
 * surfaces.
 *
 * This build has no robot-control bridge, so actions that would drive robot
 * hardware (speaker test, robot mic test, sound controls, full factory erase)
 * report `unsupported_until_connector` instead of faking success.
 *
 * Honest unpair lives on `unpairRobot`: it delegates to device.api
 * unpairDevice (DELETE /devices/:id) and maps failures with
 * mapErrorToLinkState. When mapping returns null (auth/validation/ordinary
 * Error), the original error is rethrown so screens keep normal error UX —
 * never coerced to `server_unavailable`.
 *
 * Manual impact note (new module, 2026-07-18): no upstream callers by
 * construction. Consumers land in P2 lane A: SpeakerTestScreen,
 * FactoryResetScreen, RobotSoundScreen.
 */
import { unpairDevice } from '@/services/api/device.api';
import { linkBlocked, mapErrorToLinkState, ok, type ConnectorResult } from './types';

export type RobotSoundControls = {
  volume?: number;
  softChimes?: boolean;
  quietHours?: boolean;
  voiceId?: string;
};

const HARDWARE_ACTION_REASON = 'Robot control is not available in this build.';
const FACTORY_RESET_REASON =
  'Full factory erase is not available until a robot connector ships. Use unpair to remove the device from this household.';

export async function runSpeakerTest(): Promise<ConnectorResult<null>> {
  return linkBlocked('unsupported_until_connector', HARDWARE_ACTION_REASON, false);
}

export async function runMicTest(): Promise<ConnectorResult<null>> {
  return linkBlocked('unsupported_until_connector', HARDWARE_ACTION_REASON, false);
}

export async function setControls(_controls: RobotSoundControls): Promise<ConnectorResult<null>> {
  return linkBlocked('unsupported_until_connector', HARDWARE_ACTION_REASON, false);
}

/**
 * Full factory erase is not implemented in this build. Returning
 * unsupported_until_connector is the honest outlet — do not silently unpair.
 * Callers that only need household unpair must use `unpairRobot`.
 */
export async function factoryReset(_deviceId: string): Promise<ConnectorResult<null>> {
  return linkBlocked('unsupported_until_connector', FACTORY_RESET_REASON, false);
}

/**
 * Honest household unpair via DELETE /devices/:id.
 * Optional requestId is accepted for screen correlation; the current API
 * surface does not forward it.
 */
export async function unpairRobot(
  deviceId: string,
  _requestId?: string,
): Promise<ConnectorResult<null>> {
  try {
    await unpairDevice(deviceId);
    return ok(null);
  } catch (error) {
    const state = mapErrorToLinkState(error);
    if (state === null) {
      throw error;
    }
    return linkBlocked(state, describeError(error), state !== 'unsupported_until_connector');
  }
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
