import { backendContractUnavailable } from './undocumented-api-routes';
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
  backendContractUnavailable('getRobotStatus');
}

export async function getBattery(): Promise<BatteryInfo> {
  backendContractUnavailable('getBattery');
}

export async function getStorage(): Promise<StorageInfo> {
  backendContractUnavailable('getStorage');
}

export async function runMicTest(): Promise<{ passed: boolean }> {
  if (!VoiceMic.isAvailable) return { passed: false };

  return new Promise((resolve) => {
    let settled = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const finish = (passed: boolean): void => {
      if (settled) return;
      settled = true;
      if (timeout !== null) clearTimeout(timeout);
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

    timeout = setTimeout(() => finish(false), 1800);

    VoiceMic.start({
      sampleRate: 16000,
      channels: 1,
      bitsPerSample: 16,
      aec: 'hw',
    }).catch(() => finish(false));
  });
}

export async function runSpeakerTest(): Promise<{ passed: boolean }> {
  backendContractUnavailable('runSpeakerTest');
}

export async function factoryReset(): Promise<void> {
  backendContractUnavailable('factoryReset');
}

export async function getSupportInfo(): Promise<SupportInfo> {
  backendContractUnavailable('getSupportInfo');
}
import { VoiceMic } from '@/native/VoiceMic';
