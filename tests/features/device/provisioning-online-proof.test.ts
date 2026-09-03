import { hasFreshProvisioningOnlineProof } from '@/features/device/pairing/provisioningOnlineProof';

const boundary = Date.parse('2026-09-03T04:05:06.000Z');

it.each([
  ['started', null],
  ['started', '2026-09-03T04:05:07.000Z'],
  ['ble_paired', '2026-09-03T04:05:07.000Z'],
  ['device_authenticated', undefined],
  ['device_authenticated', null],
  ['device_authenticated', 'not-a-date'],
  ['device_authenticated', '2026-09-03T04:05:05.999Z'],
  ['completed', undefined],
  ['completed', null],
  ['completed', 'not-a-date'],
  ['completed', '2026-09-03T04:05:05.999Z'],
] as const)('rejects status=%s timestamp=%s', (status, deviceLastSeenAt) => {
  expect(hasFreshProvisioningOnlineProof({ status, deviceLastSeenAt }, boundary)).toBe(false);
});

it.each([
  '2026-09-03T04:05:06.000Z',
  '2026-09-03T04:05:06.001Z',
])('accepts device_authenticated at or after the handoff boundary: %s', (deviceLastSeenAt) => {
  expect(hasFreshProvisioningOnlineProof({
    status: 'device_authenticated',
    deviceLastSeenAt,
  }, boundary)).toBe(true);
});

it('accepts completed with a fresh heartbeat for late recovery', () => {
  expect(hasFreshProvisioningOnlineProof({
    status: 'completed',
    deviceLastSeenAt: '2026-09-03T04:05:06.001Z',
  }, boundary)).toBe(true);
});
