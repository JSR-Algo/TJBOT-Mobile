import {
  isDeviceHeartbeatFresh,
  WIFI_SETUP_HEARTBEAT_MAX_AGE_MS,
} from '@/features/device/connectivity';

describe('isDeviceHeartbeatFresh', () => {
  const nowMs = Date.parse('2026-08-29T08:30:00.000Z');

  it('accepts a heartbeat at the freshness boundary', () => {
    const heartbeat = new Date(nowMs - WIFI_SETUP_HEARTBEAT_MAX_AGE_MS).toISOString();
    expect(isDeviceHeartbeatFresh(heartbeat, nowMs)).toBe(true);
  });

  it.each([undefined, '', 'not-a-date'])('rejects a missing or invalid heartbeat: %p', value => {
    expect(isDeviceHeartbeatFresh(value, nowMs)).toBe(false);
  });

  it('rejects a stale heartbeat', () => {
    const heartbeat = new Date(nowMs - WIFI_SETUP_HEARTBEAT_MAX_AGE_MS - 1).toISOString();
    expect(isDeviceHeartbeatFresh(heartbeat, nowMs)).toBe(false);
  });
});
