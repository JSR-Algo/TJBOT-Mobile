/**
 * FirmwareUpdateConnector — the honest boundary for Robot firmware update.
 *
 * Today the backend has no firmware contract: device.api getFirmwareVersion /
 * runFirmwareUpdate throw BackendContractUnavailableError, which maps to
 * `unsupported_until_connector` (see services/connectors/types.ts). Every
 * method therefore returns a blocked ConnectorResult instead of a fabricated
 * version string or a fake "update started" success. When a real contract
 * lands, these methods start returning `ok(...)` with no screen changes.
 *
 * `scheduleUpdate` (update tonight) has no device.api function at all, so it
 * returns `unsupported_until_connector` directly — it must NOT call
 * runFirmwareUpdate, because once that contract becomes real it would trigger
 * an immediate update the parent never asked for.
 *
 * Retryability: `unsupported_until_connector` is not retryable (this build
 * cannot succeed); transport/server states stay retryable.
 *
 * mapErrorToLinkState null (auth/validation/ordinary Error) rethrows — never
 * falls back to `server_unavailable`.
 *
 * Manual impact note (new module, P2 mobile de-fake): consumers are
 * DeviceFirmwareScreen and the DeviceHomeScreen firmware row.
 */
import {
  getFirmwareVersion,
  runFirmwareUpdate,
  type FirmwareVersion,
} from '@/services/api/device.api';
import {
  linkBlocked,
  mapErrorToLinkState,
  ok,
  type ConnectorResult,
  type RobotLinkState,
} from '@/services/connectors/types';

const RETRYABLE_STATES: ReadonlySet<RobotLinkState> = new Set([
  'server_unavailable',
  'robot_offline',
  'queued_for_robot',
]);

function toBlockedResult(error: unknown): ConnectorResult<never> {
  const state = mapErrorToLinkState(error);
  if (state === null) {
    throw error;
  }
  return linkBlocked(state, undefined, RETRYABLE_STATES.has(state));
}

export interface FirmwareUpdateConnector {
  getVersion(deviceId: string): Promise<ConnectorResult<FirmwareVersion>>;
  scheduleUpdate(deviceId: string): Promise<ConnectorResult<null>>;
  updateNow(deviceId: string): Promise<ConnectorResult<null>>;
}

export const firmwareUpdateConnector: FirmwareUpdateConnector = {
  async getVersion(deviceId) {
    try {
      return ok(await getFirmwareVersion(deviceId));
    } catch (error) {
      return toBlockedResult(error);
    }
  },

  async scheduleUpdate(_deviceId) {
    return linkBlocked('unsupported_until_connector', undefined, false);
  },

  async updateNow(deviceId) {
    try {
      await runFirmwareUpdate(deviceId);
      return ok(null);
    } catch (error) {
      return toBlockedResult(error);
    }
  },
};
