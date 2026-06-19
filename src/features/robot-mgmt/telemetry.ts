import React from 'react';
import {
  getDeviceStatus,
  getFirmwareVersion,
  isBackendContractUnavailableError,
  type DeviceStatus,
} from '@/services/api/device.api';

export const ROBOT_DETAILS_ERROR_COPY = 'Robot details are temporarily unavailable.';
export const ROBOT_DETAILS_COMING_SOON_COPY = 'Robot details are coming soon.';
export const PRIMARY_ROBOT_ID = 'primary';

const STALE_AFTER_MS = 5 * 60 * 1000;
const UNAVAILABLE_BATTERY = 'Battery unavailable';
const UNAVAILABLE_WIFI = 'Wi-Fi unavailable';
const UNAVAILABLE_FIRMWARE = 'Software unavailable';
const UNAVAILABLE_ROBOT = 'Robot unavailable';

export type RobotTelemetryInput = Partial<DeviceStatus> & {
  firmwareVersion?: string;
};

export type NormalizedRobotTelemetry = {
  deviceId: string | null;
  robotName: string;
  onlineLabel: string;
  batteryLabel: string;
  wifiLabel: string;
  firmwareLabel: string;
  chargingLabel: string;
  stale: boolean;
};

export type RobotTelemetryState = {
  telemetry: NormalizedRobotTelemetry;
  loading: boolean;
  errorMessage: string | null;
  failureReason: string | null;
  featureUnavailable: boolean;
};

export function normalizeRobotTelemetry(input?: RobotTelemetryInput): NormalizedRobotTelemetry {
  const batteryPercent = input?.batteryPercent;
  const wifiSsid = input?.wifiSsid?.trim();
  const firmwareVersion = input?.firmwareVersion?.trim();
  const robotName = input?.name?.trim();

  return {
    deviceId: input?.id ?? null,
    robotName: robotName ? robotName : UNAVAILABLE_ROBOT,
    onlineLabel: input?.online === true ? 'Online' : input?.online === false ? 'Offline' : 'Status unavailable',
    batteryLabel: typeof batteryPercent === 'number' && Number.isFinite(batteryPercent)
      ? `${Math.max(0, Math.min(100, Math.round(batteryPercent)))}%`
      : UNAVAILABLE_BATTERY,
    wifiLabel: wifiSsid ? wifiSsid : UNAVAILABLE_WIFI,
    firmwareLabel: firmwareVersion ? firmwareVersion : UNAVAILABLE_FIRMWARE,
    chargingLabel: input?.charging === true ? 'charging' : 'not charging',
    stale: isTelemetryStale(input?.lastSeenAt),
  };
}

export function useRobotTelemetry(): RobotTelemetryState {
  const [state, setState] = React.useState<RobotTelemetryState>({
    telemetry: normalizeRobotTelemetry(undefined),
    loading: true,
    errorMessage: null,
    failureReason: null,
    featureUnavailable: false,
  });

  React.useEffect(() => {
    let cancelled = false;

    async function loadTelemetry(): Promise<void> {
      try {
        const [status, firmware] = await Promise.all([
          getDeviceStatus(PRIMARY_ROBOT_ID),
          getFirmwareVersion(PRIMARY_ROBOT_ID),
        ]);

        if (cancelled) {
          return;
        }

        setState({
          telemetry: normalizeRobotTelemetry({
            ...status,
            firmwareVersion: firmware.current,
          }),
          loading: false,
          errorMessage: null,
          failureReason: null,
          featureUnavailable: false,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        const featureUnavailable = isBackendContractUnavailableError(error);
        setState({
          telemetry: normalizeRobotTelemetry(undefined),
          loading: false,
          errorMessage: featureUnavailable ? ROBOT_DETAILS_COMING_SOON_COPY : ROBOT_DETAILS_ERROR_COPY,
          failureReason: describeError(error),
          featureUnavailable,
        });
      }
    }

    void loadTelemetry();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

function isTelemetryStale(lastSeenAt: string | undefined): boolean {
  if (!lastSeenAt) {
    return true;
  }

  const lastSeenTime = Date.parse(lastSeenAt);
  if (!Number.isFinite(lastSeenTime)) {
    return true;
  }

  return Date.now() - lastSeenTime > STALE_AFTER_MS;
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
