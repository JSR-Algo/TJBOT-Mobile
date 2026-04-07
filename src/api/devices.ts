import client from './client';
import { Device } from '../types';

export async function listByHousehold(householdId: string): Promise<Device[]> {
  const response = await client.get(`/devices/household/${householdId}`);
  const data = response.data.data ?? response.data;
  return Array.isArray(data) ? data : [];
}

export async function register(dto: {
  serial_number: string;
  hardware_revision: string;
  certificate_pem?: string;
}): Promise<Device> {
  const response = await client.post('/devices/register', {
    serial_number: dto.serial_number,
    hardware_revision: dto.hardware_revision,
    ...(dto.certificate_pem ? { certificate_pem: dto.certificate_pem } : {}),
  });
  return response.data.data ?? response.data;
}

export async function heartbeat(
  deviceId: string,
  data: { battery_level?: number; firmware_version?: string },
): Promise<void> {
  await client.post('/devices/heartbeat', { device_id: deviceId, ...data });
}

export async function getDevice(deviceId: string): Promise<Device> {
  const response = await client.get(`/devices/${deviceId}`);
  return response.data.data ?? response.data;
}
