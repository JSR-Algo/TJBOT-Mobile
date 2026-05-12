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
  throw new Error('not implemented');
}

export async function getBattery(): Promise<BatteryInfo> {
  throw new Error('not implemented');
}

export async function getStorage(): Promise<StorageInfo> {
  throw new Error('not implemented');
}

export async function runMicTest(): Promise<{ passed: boolean }> {
  throw new Error('not implemented');
}

export async function runSpeakerTest(): Promise<{ passed: boolean }> {
  throw new Error('not implemented');
}

export async function factoryReset(): Promise<void> {
  throw new Error('not implemented');
}

export async function getSupportInfo(): Promise<SupportInfo> {
  throw new Error('not implemented');
}
