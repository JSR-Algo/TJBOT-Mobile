import { VoiceMic } from '@/native/VoiceMic';
import {
  FEATURE_DEVICE_MANAGEMENT,
  FeatureDeviceManagementDisabledError,
} from '@/config/feature-flags';

export interface RobotStatus {
  id: string;
  name: string;
  online: boolean;
  batteryPercent: number;
  firmwareVersion: string;
}

export interface BatteryInfo {
  percent: number;
  charging: boolean;
  estimatedHours: number;
}

export interface StorageInfo {
  totalMb: number;
  usedMb: number;
  coursesCount: number;
}

export interface SupportInfo {
  serialNumber: string;
  firmwareVersion: string;
  supportEmail: string;
}

export async function getRobotStatus(): Promise<RobotStatus> {
  if (!FEATURE_DEVICE_MANAGEMENT) {
    throw new FeatureDeviceManagementDisabledError('getRobotStatus');
  }
  throw new Error('not implemented');
}

export async function getBattery(): Promise<BatteryInfo> {
  if (!FEATURE_DEVICE_MANAGEMENT) {
    throw new FeatureDeviceManagementDisabledError('getBattery');
  }
  throw new Error('not implemented');
}

export async function getStorage(): Promise<StorageInfo> {
  if (!FEATURE_DEVICE_MANAGEMENT) {
    throw new FeatureDeviceManagementDisabledError('getStorage');
  }
  throw new Error('not implemented');
}

export async function runMicTest(): Promise<{ passed: boolean }> {
  if (!FEATURE_DEVICE_MANAGEMENT) {
    throw new FeatureDeviceManagementDisabledError('runMicTest');
  }
  if (!VoiceMic.isAvailable) return { passed: false };

  const { promise, resolve } = Promise.withResolvers<{ passed: boolean }>();
  let settled = false;

  const finish = (passed: boolean): void => {
    if (settled) return;
    settled = true;
    clearTimeout(timeout);
    unsubEngineReady();
    unsubVadStart();
    VoiceMic.stop()
      .catch(() => undefined)
      .then(() => resolve({ passed }));
  };

  const unsubEngineReady = VoiceMic.onEngineReady(() => {
    // Engine readiness alone proves capture started, not that speech was detected.
  });
  const unsubVadStart = VoiceMic.onVadStart(() => finish(true));
  const timeout = setTimeout(() => finish(false), 1800);

  VoiceMic.start({
    sampleRate: 16000,
    channels: 1,
    bitsPerSample: 16,
    aec: 'hw',
  }).catch(() => finish(false));

  return promise;
}

export async function runSpeakerTest(): Promise<{ passed: boolean }> {
  if (!FEATURE_DEVICE_MANAGEMENT) {
    throw new FeatureDeviceManagementDisabledError('runSpeakerTest');
  }
  throw new Error('not implemented');
}

export async function factoryReset(): Promise<void> {
  if (!FEATURE_DEVICE_MANAGEMENT) {
    throw new FeatureDeviceManagementDisabledError('factoryReset');
  }
  throw new Error('not implemented');
}

export async function getSupportInfo(): Promise<SupportInfo> {
  if (!FEATURE_DEVICE_MANAGEMENT) {
    throw new FeatureDeviceManagementDisabledError('getSupportInfo');
  }
  throw new Error('not implemented');
}
