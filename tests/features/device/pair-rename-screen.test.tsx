import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import PairRenameScreen from '@/features/device/pairing/screens/PairRenameScreen';
import { ROUTES } from '@/navigation/routes';
import { completeDeviceProvisioning } from '@/services/api/device.api';
import type { CompleteDeviceProvisioningResult } from '@/services/api/device.api';
import { markLocalDevicePaired } from '@/features/device/pairing/localPairedDevice';
import { useHousehold } from '@/contexts/HouseholdContext';

// US-005 [mb-pair-rename] — PairRenameScreen.tsx (round-2 gap fill).
//
// This is the final "Choose a Buddy" step of the pairing flow. It is the single
// place in the mobile app where a *local* BLE/Wi-Fi handoff is turned into a
// backend-confirmed device claim via completeDeviceProvisioning, then advanced
// to PairSuccess. The invariants this suite pins are the screen's save()
// contract:
//
//  - Context completeness gate: the backend claim-complete call requires a
//    deviceId, a provisioningAttemptId AND an assigned child profile. If ANY of
//    the three is missing the screen must route to PairFailed with the typed
//    PAIRING_CONTEXT_MISSING code and NEVER fire the network call (a half-
//    populated complete request is the failure we are guarding against).
//  - Error-code surfacing: a rejected completeDeviceProvisioning maps to
//    PairFailed; the code is lifted from error.code, then error.response.data.code,
//    then falls back to PROVISIONING_COMPLETE_FAILED — never a raw error message.
//  - Double-submit guard: a second press while a save is in flight is a no-op
//    (one claim-complete call, not two).
//  - In-flight affordance: the CTA flips "Save & continue" -> "Saving..." while
//    the backend call is pending and back on settle.
//  - Buddy selection is local UI state and must not leak into the claim payload
//    (we send a fixed displayName; the avatar choice never rides the request).
//
// We mock the device.api (the claim-complete transport), the local-paired cache
// (a best-effort side effect that must not undo a confirmed claim) and the
// household context (the source of the assigned child). The household child is
// real screen input, not a value we then assert against itself.

jest.mock('@/services/api/device.api', () => ({
  __esModule: true,
  completeDeviceProvisioning: jest.fn(),
}));

jest.mock('@/features/device/pairing/localPairedDevice', () => ({
  __esModule: true,
  markLocalDevicePaired: jest.fn(),
}));

jest.mock('@/contexts/HouseholdContext', () => ({
  __esModule: true,
  useHousehold: jest.fn(),
}));

const mockedComplete = completeDeviceProvisioning as jest.MockedFunction<typeof completeDeviceProvisioning>;
const mockedMarkLocal = markLocalDevicePaired as jest.MockedFunction<typeof markLocalDevicePaired>;
const mockedUseHousehold = useHousehold as jest.MockedFunction<typeof useHousehold>;

const FULL_PARAMS = {
  deviceId: 'device-1',
  serialNumber: 'TBT-2026-004217',
  provisioningAttemptId: 'claim-1',
};

// A minimal but real CompleteDeviceProvisioningResult the screen ignores the
// body of — it only branches on resolve vs reject.
const COMPLETE_OK: CompleteDeviceProvisioningResult = {
  device: {
    id: 'device-1',
    status: 'active',
    lifecycleState: 'provisioned',
    displayName: 'Living-room Robot',
    assignedChildProfileId: 'child-1',
  },
};

// The screen reads `activeChild?.id` from the household context (the resolved
// active child, which the real context derives as the persisted pick or
// children[0]). We mirror that resolution here — activeChild = children[0] when
// present — so the mock matches the context contract the screen depends on.
function householdWith(children: Array<{ id: string }> | undefined): void {
  const activeChild = children && children.length > 0 ? children[0] : null;
  mockedUseHousehold.mockReturnValue({ children, activeChild } as never);
}

// The happy path finalizes pairing via navigation.reset (DeviceHome + PairSuccess),
// not navigate, so the screen needs a reset on its navigation. Tests that care
// about the terminus pass their own reset mock; the rest get a throwaway one.
function renderScreen(navigate: jest.Mock, params?: Record<string, unknown>, reset: jest.Mock = jest.fn()) {
  return render(
    <PairRenameScreen navigation={{ navigate, reset } as never} route={{ params } as never} />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  // Default: a household with one assigned child and a resolving backend.
  householdWith([{ id: 'child-1' }]);
  mockedComplete.mockResolvedValue(COMPLETE_OK);
  mockedMarkLocal.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// Happy path — full context -> backend claim-complete -> reset to PairSuccess.
//
// The screen finalizes via navigation.reset([DeviceHome, PairSuccess]) (not a
// plain navigate): this flow is entered from DeviceOverview, so the back stack
// must be rebased on DeviceHome with PairSuccess on top, otherwise Back walks
// back THROUGH the finished pairing screens.
// ---------------------------------------------------------------------------
describe('PairRenameScreen — save() happy path', () => {
  it('on full context, completes provisioning with the assigned child + fixed displayName and resets to PairSuccess', async () => {
    const navigate = jest.fn();
    const reset = jest.fn();
    const screen = renderScreen(navigate, FULL_PARAMS, reset);

    fireEvent.press(screen.getByText('Save & continue'));

    await waitFor(() => expect(mockedComplete).toHaveBeenCalledTimes(1));
    // The claim-complete request carries the FULL context the backend needs:
    // the attempt to confirm, the device, the child to assign, and a name.
    expect(mockedComplete).toHaveBeenCalledWith({
      provisioningAttemptId: 'claim-1',
      deviceId: 'device-1',
      assignChildProfileId: 'child-1',
      displayName: 'Living-room Robot',
    });

    await waitFor(() =>
      expect(reset).toHaveBeenCalledWith({
        index: 1,
        routes: [
          { name: ROUTES.DeviceHomeScreen },
          {
            name: ROUTES.PairSuccessScreen,
            params: { deviceId: 'device-1', serialNumber: 'TBT-2026-004217', provisioningAttemptId: 'claim-1' },
          },
        ],
      }),
    );
    // Success means the reset terminus only — never a PairFailed hop on the happy path.
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairFailedScreen, expect.anything());
    expect(navigate).not.toHaveBeenCalled();
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('marks the device locally paired (best-effort cache) before advancing to success', async () => {
    const navigate = jest.fn();
    const reset = jest.fn();
    const screen = renderScreen(navigate, FULL_PARAMS, reset);

    fireEvent.press(screen.getByText('Save & continue'));

    await waitFor(() => expect(reset).toHaveBeenCalled());
    // The local cache is keyed by the backend-confirmed deviceId.
    expect(mockedMarkLocal).toHaveBeenCalledWith('device-1');
  });

  it('still reaches PairSuccess when the local-cache write fails (cache failure must not undo a confirmed claim)', async () => {
    mockedMarkLocal.mockRejectedValue(new Error('disk full'));
    const navigate = jest.fn();
    const reset = jest.fn();
    const screen = renderScreen(navigate, FULL_PARAMS, reset);

    fireEvent.press(screen.getByText('Save & continue'));

    // Backend completion is authoritative: a best-effort local-cache failure is
    // swallowed and the flow still advances to success (not PairFailed).
    await waitFor(() => expect(reset).toHaveBeenCalled());
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairFailedScreen, expect.anything());
  });

  it('forwards serialNumber to PairSuccess only when present (omitted when absent)', async () => {
    const navigate = jest.fn();
    const reset = jest.fn();
    const screen = renderScreen(navigate, { deviceId: 'device-1', provisioningAttemptId: 'claim-1' }, reset);

    fireEvent.press(screen.getByText('Save & continue'));

    await waitFor(() => expect(reset).toHaveBeenCalled());
    const [{ routes }] = reset.mock.calls[0] as [{ routes: Array<{ name: string; params?: Record<string, unknown> }> }];
    const successParams = routes.find((r) => r.name === ROUTES.PairSuccessScreen)?.params ?? {};
    expect(successParams).toMatchObject({ deviceId: 'device-1', provisioningAttemptId: 'claim-1' });
    // serialNumber is undefined in params (carried through verbatim), never invented.
    expect(successParams.serialNumber).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Context-missing gate — PairFailed PAIRING_CONTEXT_MISSING, no network call.
// ---------------------------------------------------------------------------
describe('PairRenameScreen — missing-context gate (PAIRING_CONTEXT_MISSING)', () => {
  it('routes to PairFailed with PAIRING_CONTEXT_MISSING and skips the backend call when deviceId is absent', async () => {
    const navigate = jest.fn();
    const screen = renderScreen(navigate, { provisioningAttemptId: 'claim-1', serialNumber: 'TBT-2026-004217' });

    fireEvent.press(screen.getByText('Save & continue'));

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(ROUTES.PairFailedScreen, {
        deviceId: undefined,
        serialNumber: 'TBT-2026-004217',
        provisioningAttemptId: 'claim-1',
        errorCode: 'PAIRING_CONTEXT_MISSING',
      }),
    );
    // The cardinal guard: a half-populated complete request must never fire.
    expect(mockedComplete).not.toHaveBeenCalled();
    expect(mockedMarkLocal).not.toHaveBeenCalled();
  });

  it('routes to PairFailed with PAIRING_CONTEXT_MISSING when provisioningAttemptId is absent', async () => {
    const navigate = jest.fn();
    const screen = renderScreen(navigate, { deviceId: 'device-1', serialNumber: 'TBT-2026-004217' });

    fireEvent.press(screen.getByText('Save & continue'));

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(ROUTES.PairFailedScreen, {
        deviceId: 'device-1',
        serialNumber: 'TBT-2026-004217',
        provisioningAttemptId: undefined,
        errorCode: 'PAIRING_CONTEXT_MISSING',
      }),
    );
    expect(mockedComplete).not.toHaveBeenCalled();
  });

  it('uses the active child as the assignee when several children exist', async () => {
    householdWith([{ id: 'child-A' }, { id: 'child-B' }, { id: 'child-C' }]);
    const navigate = jest.fn();
    const screen = renderScreen(navigate, FULL_PARAMS);

    fireEvent.press(screen.getByText('Save & continue'));

    await waitFor(() => expect(mockedComplete).toHaveBeenCalledTimes(1));
    // The resolved active child (children[0] here) is the assignee — not the last,
    // not an arbitrary one.
    expect(mockedComplete).toHaveBeenCalledWith(expect.objectContaining({ assignChildProfileId: 'child-A' }));
  });

  it('routes to PairFailed with PAIRING_CONTEXT_MISSING when route.params is entirely undefined', async () => {
    const navigate = jest.fn();
    const screen = renderScreen(navigate, undefined);

    fireEvent.press(screen.getByText('Save & continue'));

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(ROUTES.PairFailedScreen, {
        deviceId: undefined,
        serialNumber: undefined,
        provisioningAttemptId: undefined,
        errorCode: 'PAIRING_CONTEXT_MISSING',
      }),
    );
    expect(mockedComplete).not.toHaveBeenCalled();
  });

  it('does NOT flip the CTA to "Saving..." on the context-missing path (no in-flight state when nothing is in flight)', async () => {
    const navigate = jest.fn();
    const screen = renderScreen(navigate, { serialNumber: 'TBT-2026-004217' });

    fireEvent.press(screen.getByText('Save & continue'));

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(ROUTES.PairFailedScreen, expect.anything()),
    );
    // setSaving(true) runs only after the gate passes, so the CTA stays put.
    expect(screen.getByText('Save & continue')).toBeTruthy();
    expect(screen.queryByText('Saving...')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Zero-child path — pairing CONTEXT is present but the household has no child
// profile yet. The robot is already claimed, so this is NOT a failure: route the
// parent into the child-creation UI carrying the pairing context so they can
// finish the pairing once a child exists. (This is the dead-end fix: previously
// no-child was wrongly treated like missing context / sent to PairFailed.)
// ---------------------------------------------------------------------------
describe('PairRenameScreen — zero-child path (route into child creation with pairing context)', () => {
  it('routes to ChildProfileScreen carrying the pairing context when there is no child (children empty)', async () => {
    householdWith([]);
    const navigate = jest.fn();
    const screen = renderScreen(navigate, FULL_PARAMS);

    fireEvent.press(screen.getByText('Save & continue'));

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(ROUTES.ChildProfileScreen, {
        pairing: {
          deviceId: 'device-1',
          provisioningAttemptId: 'claim-1',
          serialNumber: 'TBT-2026-004217',
        },
      }),
    );
    // The robot is already claimed; no finalize fires and we never show PairFailed.
    expect(mockedComplete).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairFailedScreen, expect.anything());
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('treats a falsy active-child id as no child and routes into child creation (id is empty string)', async () => {
    householdWith([{ id: '' }]);
    const navigate = jest.fn();
    const screen = renderScreen(navigate, FULL_PARAMS);

    fireEvent.press(screen.getByText('Save & continue'));

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(
        ROUTES.ChildProfileScreen,
        expect.objectContaining({
          pairing: expect.objectContaining({ deviceId: 'device-1', provisioningAttemptId: 'claim-1' }),
        }),
      ),
    );
    expect(mockedComplete).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairFailedScreen, expect.anything());
  });

  it('still gates to PairFailed (NOT child creation) when the pairing CONTEXT itself is missing and there is no child', async () => {
    // No deviceId/attemptId AND no child: this is a genuine context loss, so the
    // missing-context gate wins over the zero-child path (the gate runs first).
    householdWith([]);
    const navigate = jest.fn();
    const screen = renderScreen(navigate, { serialNumber: 'TBT-2026-004217' });

    fireEvent.press(screen.getByText('Save & continue'));

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(
        ROUTES.PairFailedScreen,
        expect.objectContaining({ errorCode: 'PAIRING_CONTEXT_MISSING' }),
      ),
    );
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.ChildProfileScreen, expect.anything());
    expect(mockedComplete).not.toHaveBeenCalled();
  });

  it('omits serialNumber from the carried pairing context when absent', async () => {
    householdWith([]);
    const navigate = jest.fn();
    const screen = renderScreen(navigate, { deviceId: 'device-1', provisioningAttemptId: 'claim-1' });

    fireEvent.press(screen.getByText('Save & continue'));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.ChildProfileScreen, expect.anything()));
    const [, params] = (navigate.mock.calls.find((c) => c[0] === ROUTES.ChildProfileScreen) ?? []) as [
      string,
      { pairing?: { serialNumber?: string } },
    ];
    expect(params.pairing?.serialNumber).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Error surfacing — rejected complete -> PairFailed with the lifted code.
// ---------------------------------------------------------------------------
describe('PairRenameScreen — completeDeviceProvisioning rejection -> PairFailed', () => {
  it('lifts error.code onto the PairFailed errorCode', async () => {
    mockedComplete.mockRejectedValue(Object.assign(new Error('boom'), { code: 'DEVICE_ALREADY_CLAIMED' }));
    const navigate = jest.fn();
    const screen = renderScreen(navigate, FULL_PARAMS);

    fireEvent.press(screen.getByText('Save & continue'));

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(ROUTES.PairFailedScreen, {
        deviceId: 'device-1',
        serialNumber: 'TBT-2026-004217',
        provisioningAttemptId: 'claim-1',
        errorCode: 'DEVICE_ALREADY_CLAIMED',
      }),
    );
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairSuccessScreen, expect.anything());
  });

  it('lifts error.response.data.code when there is no top-level error.code (axios-shaped error)', async () => {
    mockedComplete.mockRejectedValue({ response: { data: { code: 'PROVISIONING_ATTEMPT_EXPIRED' } } });
    const navigate = jest.fn();
    const screen = renderScreen(navigate, FULL_PARAMS);

    fireEvent.press(screen.getByText('Save & continue'));

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(
        ROUTES.PairFailedScreen,
        expect.objectContaining({ errorCode: 'PROVISIONING_ATTEMPT_EXPIRED' }),
      ),
    );
  });

  it('prefers top-level error.code over error.response.data.code when both are present', async () => {
    mockedComplete.mockRejectedValue(
      Object.assign(new Error('x'), {
        code: 'TOP_LEVEL_WINS',
        response: { data: { code: 'NESTED_SHOULD_LOSE' } },
      }),
    );
    const navigate = jest.fn();
    const screen = renderScreen(navigate, FULL_PARAMS);

    fireEvent.press(screen.getByText('Save & continue'));

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(
        ROUTES.PairFailedScreen,
        expect.objectContaining({ errorCode: 'TOP_LEVEL_WINS' }),
      ),
    );
  });

  it('falls back to PROVISIONING_COMPLETE_FAILED for a plain Error with no code', async () => {
    mockedComplete.mockRejectedValue(new Error('network down'));
    const navigate = jest.fn();
    const screen = renderScreen(navigate, FULL_PARAMS);

    fireEvent.press(screen.getByText('Save & continue'));

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(
        ROUTES.PairFailedScreen,
        expect.objectContaining({ errorCode: 'PROVISIONING_COMPLETE_FAILED' }),
      ),
    );
    // The raw error message must never become the user-facing error code.
    const [, params] = (navigate.mock.calls.find((c) => c[0] === ROUTES.PairFailedScreen) ?? []) as [
      string,
      Record<string, unknown>,
    ];
    expect(params.errorCode).not.toBe('network down');
  });

  it('falls back to PROVISIONING_COMPLETE_FAILED when error.code is a non-string (e.g. a number)', async () => {
    mockedComplete.mockRejectedValue({ code: 503 });
    const navigate = jest.fn();
    const screen = renderScreen(navigate, FULL_PARAMS);

    fireEvent.press(screen.getByText('Save & continue'));

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(
        ROUTES.PairFailedScreen,
        expect.objectContaining({ errorCode: 'PROVISIONING_COMPLETE_FAILED' }),
      ),
    );
  });

  it('falls back to PROVISIONING_COMPLETE_FAILED when the rejection is a bare string (not an object)', async () => {
    mockedComplete.mockRejectedValue('kaboom');
    const navigate = jest.fn();
    const screen = renderScreen(navigate, FULL_PARAMS);

    fireEvent.press(screen.getByText('Save & continue'));

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(
        ROUTES.PairFailedScreen,
        expect.objectContaining({ errorCode: 'PROVISIONING_COMPLETE_FAILED' }),
      ),
    );
  });

  it('falls back to PROVISIONING_COMPLETE_FAILED when the rejection is null', async () => {
    mockedComplete.mockRejectedValue(null);
    const navigate = jest.fn();
    const screen = renderScreen(navigate, FULL_PARAMS);

    fireEvent.press(screen.getByText('Save & continue'));

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(
        ROUTES.PairFailedScreen,
        expect.objectContaining({ errorCode: 'PROVISIONING_COMPLETE_FAILED' }),
      ),
    );
  });

  it('carries the same device/serial/attempt context into PairFailed as into the complete request', async () => {
    mockedComplete.mockRejectedValue(Object.assign(new Error('x'), { code: 'BACKEND_5XX' }));
    const navigate = jest.fn();
    const screen = renderScreen(navigate, FULL_PARAMS);

    fireEvent.press(screen.getByText('Save & continue'));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairFailedScreen, expect.anything()));
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairFailedScreen, {
      deviceId: 'device-1',
      serialNumber: 'TBT-2026-004217',
      provisioningAttemptId: 'claim-1',
      errorCode: 'BACKEND_5XX',
    });
    // A rejected claim must NOT touch the local-paired cache.
    expect(mockedMarkLocal).not.toHaveBeenCalled();
  });

  it.each(['CHILD_PROFILE_NOT_FOUND', 'CHILD_PROFILE_HOUSEHOLD_MISMATCH'])(
    'routes a %s finalize error into ChildProfileScreen with pairing context (NOT PairFailed)',
    async (code) => {
      // The child the screen tried to assign is gone/foreign, but the robot is
      // already claimed — so this is a finalize-only problem: guide the parent to
      // (re)create a child carrying the pairing context, not the scary fail screen.
      mockedComplete.mockRejectedValue(Object.assign(new Error('x'), { code }));
      const navigate = jest.fn();
      const screen = renderScreen(navigate, FULL_PARAMS);

      fireEvent.press(screen.getByText('Save & continue'));

      await waitFor(() =>
        expect(navigate).toHaveBeenCalledWith(ROUTES.ChildProfileScreen, {
          pairing: {
            deviceId: 'device-1',
            provisioningAttemptId: 'claim-1',
            serialNumber: 'TBT-2026-004217',
          },
        }),
      );
      expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairFailedScreen, expect.anything());
    },
  );
});

// ---------------------------------------------------------------------------
// In-flight affordance + double-submit guard.
// ---------------------------------------------------------------------------
describe('PairRenameScreen — in-flight CTA + double-submit guard', () => {
  it('flips the CTA from "Save & continue" to "Saving..." while the backend call is pending, then settles', async () => {
    let resolveComplete: (v: CompleteDeviceProvisioningResult) => void = () => {};
    mockedComplete.mockImplementation(
      () => new Promise<CompleteDeviceProvisioningResult>((resolve) => { resolveComplete = resolve; }),
    );
    const navigate = jest.fn();
    const reset = jest.fn();
    const screen = renderScreen(navigate, FULL_PARAMS, reset);

    expect(screen.getByText('Save & continue')).toBeTruthy();
    fireEvent.press(screen.getByText('Save & continue'));

    // While the claim-complete promise is unsettled, the CTA shows progress.
    await waitFor(() => expect(screen.getByText('Saving...')).toBeTruthy());
    expect(screen.queryByText('Save & continue')).toBeNull();

    // Settle the backend call -> flow advances to success (reset terminus).
    resolveComplete(COMPLETE_OK);
    await waitFor(() => expect(reset).toHaveBeenCalled());
  });

  it('restores the CTA to "Save & continue" after a failed save (finally re-enables retry)', async () => {
    mockedComplete.mockRejectedValue(Object.assign(new Error('x'), { code: 'BACKEND_5XX' }));
    const navigate = jest.fn();
    const screen = renderScreen(navigate, FULL_PARAMS);

    fireEvent.press(screen.getByText('Save & continue'));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairFailedScreen, expect.anything()));
    // finally { setSaving(false) } means the user can retry — CTA is back.
    await waitFor(() => expect(screen.getByText('Save & continue')).toBeTruthy());
    expect(screen.queryByText('Saving...')).toBeNull();
  });

  it('ignores a second press while a save is in flight (exactly one complete call, one reset)', async () => {
    let resolveComplete: (v: CompleteDeviceProvisioningResult) => void = () => {};
    mockedComplete.mockImplementation(
      () => new Promise<CompleteDeviceProvisioningResult>((resolve) => { resolveComplete = resolve; }),
    );
    const navigate = jest.fn();
    const reset = jest.fn();
    const screen = renderScreen(navigate, FULL_PARAMS, reset);

    fireEvent.press(screen.getByText('Save & continue'));
    await waitFor(() => expect(screen.getByText('Saving...')).toBeTruthy());

    // Press again while still saving — the `if (saving) return` guard drops it.
    fireEvent.press(screen.getByText('Saving...'));
    fireEvent.press(screen.getByText('Saving...'));

    resolveComplete(COMPLETE_OK);
    await waitFor(() => expect(reset).toHaveBeenCalled());

    // The guard collapsed the extra presses: one claim-complete, one reset.
    expect(mockedComplete).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('allows a fresh save after the previous one settled (guard is per-flight, not permanent)', async () => {
    mockedComplete.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'BACKEND_5XX' }));
    const navigate = jest.fn();
    const reset = jest.fn();
    const screen = renderScreen(navigate, FULL_PARAMS, reset);

    // First press fails and re-enables the CTA.
    fireEvent.press(screen.getByText('Save & continue'));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairFailedScreen, expect.anything()));
    await waitFor(() => expect(screen.getByText('Save & continue')).toBeTruthy());

    // Second press now succeeds (reset terminus).
    mockedComplete.mockResolvedValueOnce(COMPLETE_OK);
    fireEvent.press(screen.getByText('Save & continue'));
    await waitFor(() => expect(reset).toHaveBeenCalled());

    // Two independent flights = two complete calls.
    expect(mockedComplete).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// Buddy selection — local UI state; never leaks into the claim payload.
// ---------------------------------------------------------------------------
describe('PairRenameScreen — buddy selection', () => {
  // The selected buddy gets the buddyBtnSel style (2px #FF6F61 border) on its
  // TouchableOpacity. We read selection by inspecting the flattened style on the
  // pressable that wraps the buddy's name <Text>.
  function buddyPressable(screen: ReturnType<typeof renderScreen>, name: string) {
    // name Text -> wrapping TouchableOpacity is the nearest ancestor with onPress.
    let node: ReturnType<typeof screen.getByText>['parent'] = screen.getByText(name);
    while (node && typeof node.props?.onPress !== 'function') {
      node = node.parent;
    }
    return node;
  }

  function isSelected(node: { props: { style?: unknown } } | null): boolean {
    const flat = Array.isArray(node?.props?.style) ? node?.props?.style.flat(Infinity) : [node?.props?.style];
    return (flat as Array<Record<string, unknown> | undefined>).some(
      (s) => s && s.borderColor === '#FF6F61' && s.borderWidth === 2,
    );
  }

  it('renders all eight buddy options', () => {
    const screen = renderScreen(jest.fn(), FULL_PARAMS);
    for (const name of ['Panda', 'Fox', 'Bunny', 'Bear', 'Frog', 'Owl', 'Turtle', 'Cat']) {
      expect(screen.getByText(name)).toBeTruthy();
    }
  });

  it('defaults the selection to index 2 (Bunny)', () => {
    const screen = renderScreen(jest.fn(), FULL_PARAMS);
    expect(isSelected(buddyPressable(screen, 'Bunny'))).toBe(true);
    expect(isSelected(buddyPressable(screen, 'Panda'))).toBe(false);
    expect(isSelected(buddyPressable(screen, 'Cat'))).toBe(false);
  });

  it('moves the selection highlight to the tapped buddy (and clears the previous one)', () => {
    const screen = renderScreen(jest.fn(), FULL_PARAMS);

    fireEvent.press(buddyPressable(screen, 'Owl')!);

    expect(isSelected(buddyPressable(screen, 'Owl'))).toBe(true);
    // Selection is single-choice: tapping Owl deselects the default Bunny.
    expect(isSelected(buddyPressable(screen, 'Bunny'))).toBe(false);
  });

  it('changing the buddy does NOT change the claim payload (displayName is fixed, avatar never sent)', async () => {
    const navigate = jest.fn();
    const screen = renderScreen(navigate, FULL_PARAMS);

    fireEvent.press(buddyPressable(screen, 'Frog')!);
    fireEvent.press(screen.getByText('Save & continue'));

    await waitFor(() => expect(mockedComplete).toHaveBeenCalledTimes(1));
    const payload = mockedComplete.mock.calls[0][0];
    // The avatar choice is UI-only — it must not ride the backend request.
    expect(payload.displayName).toBe('Living-room Robot');
    expect(JSON.stringify(payload)).not.toContain('Frog');
    expect(payload).not.toHaveProperty('buddy');
    expect(payload).not.toHaveProperty('avatar');
  });
});

// ---------------------------------------------------------------------------
// COPPA-adjacent privacy copy — the screen explicitly disclaims child PII.
// ---------------------------------------------------------------------------
describe('PairRenameScreen — privacy copy', () => {
  it("states it does not ask for the child's name or photo", () => {
    const screen = renderScreen(jest.fn(), FULL_PARAMS);
    expect(screen.getByText("We don't ask for your child's name or photo.")).toBeTruthy();
  });
});
