import React from 'react';
import {
  getDeviceStatus,
  getFirmwareVersion,
  type DeviceStatus,
} from '@/services/api/device.api';
import { getDemoBadgeState } from '@/config/investorDemo';
import {
  mapErrorToLinkState,
  type RobotLinkState,
} from '@/services/connectors/types';

export const ROBOT_DETAILS_ERROR_COPY = 'Robot details are temporarily unavailable.';
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
  wifiRssi: number | null;
  deviceId: string | null;
  robotName: string;
  serialNumber: string;
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
  linkState: RobotLinkState | null;
  simulated: boolean;
  retry: () => void;
};

type RobotTelemetrySnapshot = Omit<RobotTelemetryState, 'retry'>;

export function normalizeRobotTelemetry(input?: RobotTelemetryInput): NormalizedRobotTelemetry {
  const batteryPercent = input?.batteryPercent;
  const wifiSsid = input?.wifiSsid?.trim();
  const wifiRssi = typeof input?.wifiRssi === 'number' && Number.isFinite(input.wifiRssi)
    ? input.wifiRssi
    : null;
  const firmwareVersion = input?.firmwareVersion?.trim();
  const robotName = input?.name?.trim();
  const serialNumber = input?.serialNumber?.trim();

  return {
    deviceId: input?.id ?? null,
    robotName: robotName ? robotName : UNAVAILABLE_ROBOT,
    onlineLabel: input?.online === true ? 'Online' : input?.online === false ? 'Offline' : 'Status unavailable',
    serialNumber: serialNumber || 'Serial number unavailable',
    batteryLabel: typeof batteryPercent === 'number' && Number.isFinite(batteryPercent)
      ? `${Math.max(0, Math.min(100, Math.round(batteryPercent)))}%`
      : UNAVAILABLE_BATTERY,
    wifiLabel: wifiSsid ? wifiSsid : UNAVAILABLE_WIFI,
    wifiRssi,
    firmwareLabel: firmwareVersion ? firmwareVersion : UNAVAILABLE_FIRMWARE,
    chargingLabel: input?.charging === true ? 'charging' : 'not charging',
    stale: isTelemetryStale(input?.lastSeenAt),
  };
}

export function useRobotTelemetry(): RobotTelemetryState {
  const simulated = getDemoBadgeState().simulated;
  const [attempt, setAttempt] = React.useState(0);
  const [state, setState] = React.useState<RobotTelemetrySnapshot>({
    telemetry: normalizeRobotTelemetry(undefined),
    loading: true,
    errorMessage: null,
    failureReason: null,
    featureUnavailable: false,
    linkState: null,
    simulated,
  });
  const retry = React.useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    async function loadTelemetry(): Promise<void> {
      setState((current) => ({
        ...current,
        loading: true,
        errorMessage: null,
        failureReason: null,
        linkState: null,
        simulated,
      }));
      try {
        const status = await getDeviceStatus(PRIMARY_ROBOT_ID);
        let firmwareVersion: string | undefined;
        try {
          firmwareVersion = (await getFirmwareVersion(PRIMARY_ROBOT_ID)).current;
        } catch {
          // Firmware metadata is optional. A missing firmware route must not
          // hide otherwise valid robot status and controls.
        }

        if (cancelled) {
          return;
        }

        const linkState = status.id ? null : 'not_connected';
        setState({
          telemetry: normalizeRobotTelemetry({
            ...status,
            firmwareVersion,
          }),
          loading: false,
          errorMessage: null,
          failureReason: null,
          featureUnavailable: false,
          linkState,
          simulated,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setState({
          telemetry: normalizeRobotTelemetry(undefined),
          loading: false,
          errorMessage: ROBOT_DETAILS_ERROR_COPY,
          failureReason: describeError(error),
          featureUnavailable: false,
          linkState: mapErrorToLinkState(error) ?? 'server_unavailable',
          simulated,
        });
      }
    }

    void loadTelemetry();

    return () => {
      cancelled = true;
    };
  }, [attempt, simulated]);

  return { ...state, retry };
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
