import { finalizeDevicePairing } from '@/features/device/pairing/finalizeDevicePairing';
import { ROUTES } from '@/navigation/routes';
import { completeDeviceProvisioning } from '@/services/api/device.api';
import type { CompleteDeviceProvisioningResult } from '@/services/api/device.api';
import { markLocalDevicePaired } from '@/features/device/pairing/localPairedDevice';

// finalizeDevicePairing is the single shared "finish pairing" step used by both
// PairRenameScreen (child already exists) and ChildProfileScreen (child just
// created mid-pairing). This suite pins its contract directly, independent of
// either screen:
//   - completeDeviceProvisioning gets the full claim payload with the FIXED
//     display name (avatar/buddy never rides the request);
//   - the local-paired cache is written best-effort and a cache failure does NOT
//     undo the confirmed claim (no throw, reset still fires);
//   - the stack is reset to [DeviceHome, PairSuccess] so Back can't walk back
//     through the finished pairing screens;
//   - an already-completed/claimed physical-claim finalize rejection is treated
//     as idempotent success (the robot is already owned by the household); and
//   - unrelated completeDeviceProvisioning rejections PROPAGATE (callers own the
//     error UI) and the reset/cache side effects do NOT fire.

jest.mock('@/services/api/device.api', () => ({
  __esModule: true,
  completeDeviceProvisioning: jest.fn(),
}));

jest.mock('@/features/device/pairing/localPairedDevice', () => ({
  __esModule: true,
  markLocalDevicePaired: jest.fn(),
}));

const mockedComplete = completeDeviceProvisioning as jest.MockedFunction<typeof completeDeviceProvisioning>;
const mockedMarkLocal = markLocalDevicePaired as jest.MockedFunction<typeof markLocalDevicePaired>;

const COMPLETE_OK: CompleteDeviceProvisioningResult = {
  device: {
    id: 'device-1',
    status: 'active',
    lifecycleState: 'provisioned',
    displayName: 'Living-room Robot',
    assignedChildProfileId: 'child-1',
  },
};

const CONTEXT = { deviceId: 'device-1', provisioningAttemptId: 'claim-1', serialNumber: 'TBT-2026-004217' };

beforeEach(() => {
  jest.clearAllMocks();
  mockedComplete.mockResolvedValue(COMPLETE_OK);
  mockedMarkLocal.mockResolvedValue(undefined);
});

describe('finalizeDevicePairing', () => {
  it.each(['DEVICE_AUTH_NOT_VERIFIED', 'PROVISIONING_ATTEMPT_NOT_READY'])('retries %s until robot authentication completes', async (code) => {
    jest.useFakeTimers();
    try {
      mockedComplete
        .mockRejectedValueOnce(Object.assign(new Error('robot is initializing'), { code }))
        .mockResolvedValueOnce(COMPLETE_OK);
      const reset = jest.fn();

      const finalizing = finalizeDevicePairing({ reset }, CONTEXT, 'child-9');
      await Promise.resolve();
      expect(mockedComplete).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(3000);
      await expect(finalizing).resolves.toBeUndefined();
      expect(mockedComplete).toHaveBeenCalledTimes(2);
      expect(reset).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('bounds the authentication wait and returns a retryable DEVICE_AUTH_TIMEOUT', async () => {
    jest.useFakeTimers();
    try {
      mockedComplete.mockRejectedValue(Object.assign(new Error('robot is initializing'), {
        code: 'DEVICE_AUTH_NOT_VERIFIED',
      }));
      const reset = jest.fn();

      const finalizing = finalizeDevicePairing({ reset }, CONTEXT, 'child-9');
      const rejection = expect(finalizing).rejects.toMatchObject({ code: 'DEVICE_AUTH_TIMEOUT' });
      await jest.advanceTimersByTimeAsync(60_000);
      await rejection;

      expect(mockedComplete).toHaveBeenCalledTimes(20);
      expect(mockedMarkLocal).not.toHaveBeenCalled();
      expect(reset).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('completes provisioning with the assigned child + fixed display name, marks paired, then resets to PairSuccess', async () => {
    const reset = jest.fn();

    await finalizeDevicePairing({ reset }, CONTEXT, 'child-9');

    expect(mockedComplete).toHaveBeenCalledWith({
      provisioningAttemptId: 'claim-1',
      deviceId: 'device-1',
      assignChildProfileId: 'child-9',
      displayName: 'Living-room Robot',
    });
    expect(mockedMarkLocal).toHaveBeenCalledWith('device-1');
    expect(reset).toHaveBeenCalledWith({
      index: 1,
      routes: [
        { name: ROUTES.DeviceHomeScreen },
        {
          name: ROUTES.PairSuccessScreen,
          params: { deviceId: 'device-1', serialNumber: 'TBT-2026-004217', provisioningAttemptId: 'claim-1' },
        },
      ],
    });
  });

  it('uses the supplied display name when the parent edits the robot name', async () => {
    const reset = jest.fn();

    await finalizeDevicePairing({ reset }, CONTEXT, 'child-9', 'Robot phòng ngủ');

    expect(mockedComplete).toHaveBeenCalledWith(expect.objectContaining({
      displayName: 'Robot phòng ngủ',
    }));
  });

  it('carries serialNumber=undefined through to PairSuccess when the context omits it', async () => {
    const reset = jest.fn();

    await finalizeDevicePairing({ reset }, { deviceId: 'device-1', provisioningAttemptId: 'claim-1' }, 'child-9');

    const [{ routes }] = reset.mock.calls[0] as [{ routes: Array<{ name: string; params?: { serialNumber?: string } }> }];
    const successParams = routes.find((r) => r.name === ROUTES.PairSuccessScreen)?.params ?? {};
    expect(successParams.serialNumber).toBeUndefined();
  });

  it('still resets to success when the local-cache write fails (cache failure must not undo a confirmed claim)', async () => {
    mockedMarkLocal.mockRejectedValue(new Error('disk full'));
    const reset = jest.fn();

    await expect(finalizeDevicePairing({ reset }, CONTEXT, 'child-9')).resolves.toBeUndefined();
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it.each([
    Object.assign(new Error('already claimed'), { code: 'DEVICE_ALREADY_CLAIMED' }),
    Object.assign(new Error('already assigned'), { code: 'DEVICE_ALREADY_ASSIGNED' }),
    Object.assign(new Error('already completed'), { code: 'PROVISIONING_ATTEMPT_ALREADY_COMPLETED' }),
    Object.assign(new Error('claim already confirmed'), { code: 'CLAIM_ALREADY_CONFIRMED' }),
    { response: { data: { code: 'DEVICE_ALREADY_CLAIMED' } } },
    { response: { data: { error: { code: 'DEVICE_ALREADY_ASSIGNED' } } } },
  ])('treats an already-finalized rejection as idempotent success', async (err) => {
    mockedComplete.mockRejectedValue(err);
    const reset = jest.fn();

    await expect(finalizeDevicePairing({ reset }, CONTEXT, 'child-9')).resolves.toBeUndefined();
    expect(mockedMarkLocal).toHaveBeenCalledWith('device-1');
    expect(reset).toHaveBeenCalledWith({
      index: 1,
      routes: [
        { name: ROUTES.DeviceHomeScreen },
        {
          name: ROUTES.PairSuccessScreen,
          params: { deviceId: 'device-1', serialNumber: 'TBT-2026-004217', provisioningAttemptId: 'claim-1' },
        },
      ],
    });
  });

  it('propagates an unrelated completeDeviceProvisioning rejection and does NOT mark paired or reset', async () => {
    const err = Object.assign(new Error('boom'), { code: 'BACKEND_5XX' });
    mockedComplete.mockRejectedValue(err);
    const reset = jest.fn();

    await expect(finalizeDevicePairing({ reset }, CONTEXT, 'child-9')).rejects.toBe(err);
    expect(mockedMarkLocal).not.toHaveBeenCalled();
    expect(reset).not.toHaveBeenCalled();
  });
});
