import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import PairQrScanScreen from '@/features/device/pairing/screens/PairQrScanScreen';
import { ROUTES } from '@/navigation/routes';
import type { BarcodeScanningResult } from 'expo-camera';

// US-005 [mb-pair-qr] round-2 — PairQrScanScreen.
//
// What this suite pins:
//  - parseTBotQrCode() (exercised end-to-end through the screen's barcode
//    handler, which is the only surface that calls it). The parser is the
//    trust boundary between an arbitrary QR payload and the provisioning code +
//    serial that flow into the BLE/Wi-Fi pairing path, so its accept/reject
//    behavior must be exact.
//  - The three camera-permission render states (loading / denied / granted).
//  - That a *scanned* code navigates to PairWifiScreen carrying the parsed code
//    and serialNumber merged onto the inbound route params (the screen never
//    drops the in-flight provisioning identifiers).
//  - The scan-once guard (one navigation per screen, even on repeated scans).
//  - The manual-entry escape hatch and the scan-error / dismiss cycle.
//
// We override the global expo-camera mock for this file so that:
//  - CameraView forwards the `onBarcodeScanned` prop into a module-level holder
//    so a test can drive a real barcode scan through the component.
//  - useCameraPermissions returns a permission object the test controls.
// We never assert on the camera mock itself — every assertion is on the
// screen's real reaction (rendered copy, navigation target, navigation params).

interface MockPermission {
  granted: boolean;
  canAskAgain: boolean;
  status: string;
}

// Module-level holders the per-file expo-camera mock writes into. Reset in
// beforeEach so state never leaks between tests.
const mockCameraHolder: {
  onBarcodeScanned?: (result: BarcodeScanningResult) => void;
  renderCount: number;
} = { renderCount: 0 };

let mockPermission: MockPermission | null;
const mockRequestPermission = jest.fn();

jest.mock('expo-camera', () => {
   
  const React_ = require('react');
   
  const { View } = require('react-native');
  return {
    __esModule: true,
    CameraView: jest.fn(
      (props: {
        children?: React.ReactNode;
        onBarcodeScanned?: (result: BarcodeScanningResult) => void;
      }) => {
        mockCameraHolder.onBarcodeScanned = props.onBarcodeScanned;
        mockCameraHolder.renderCount += 1;
        return React_.createElement(View, { testID: 'CameraView' }, props.children);
      },
    ),
    useCameraPermissions: jest.fn(() => [mockPermission, mockRequestPermission]),
  };
});

const GRANTED: MockPermission = { granted: true, canAskAgain: true, status: 'granted' };
const DENIED_CAN_ASK: MockPermission = { granted: false, canAskAgain: true, status: 'denied' };
const DENIED_NO_ASK: MockPermission = { granted: false, canAskAgain: false, status: 'denied' };

const INBOUND_PARAMS = {
  deviceId: 'device-1',
  serialNumber: 'TBT-INBOUND-0001',
  provisioningAttemptId: 'claim-1',
  bleDeviceId: 'ble-device-1',
  provisioningTransport: 'ble' as const,
};

function renderScreen(
  navigate: jest.Mock,
  params?: Record<string, unknown> | undefined,
): ReturnType<typeof render> {
  return render(
    <PairQrScanScreen navigation={{ navigate } as never} route={{ params } as never} />,
  );
}

function scan(data: string): void {
  const handler = mockCameraHolder.onBarcodeScanned;
  if (!handler) throw new Error('CameraView.onBarcodeScanned not wired — camera not granted/rendered');
  // The handler may call setScanError (a React state update); wrap so the
  // re-render flushes before assertions and no act() warning is emitted.
  act(() => {
    handler({ data } as BarcodeScanningResult);
  });
}

/**
 * Render granted, drive one scan with `data`, and return the navigation call's
 * payload if it navigated to PairWifiScreen, else null. This is the only path
 * through which parseTBotQrCode's *accept* branch is observable.
 */
function scanAndGetWifiNav(
  data: string,
  params?: Record<string, unknown>,
): { code?: unknown; serialNumber?: unknown } | null {
  mockPermission = GRANTED;
  const navigate = jest.fn();
  renderScreen(navigate, params);
  scan(data);
  const wifiCall = navigate.mock.calls.find(c => c[0] === ROUTES.PairWifiScreen);
  return wifiCall ? (wifiCall[1] as { code?: unknown; serialNumber?: unknown }) : null;
}

beforeEach(() => {
  mockCameraHolder.onBarcodeScanned = undefined;
  mockCameraHolder.renderCount = 0;
  mockPermission = GRANTED;
  mockRequestPermission.mockReset();
  mockRequestPermission.mockResolvedValue(GRANTED);
});

// ---------------------------------------------------------------------------
// parseTBotQrCode — ACCEPT cases (observed via navigation payload).
// ---------------------------------------------------------------------------
describe('parseTBotQrCode — accept (via scanned-code navigation)', () => {
  it('accepts a well-formed https URL with 6-digit code + serial (URL.searchParams path)', () => {
    const nav = scanAndGetWifiNav('https://tbot.app/pair?code=123456&serial=TBT-2026-004217');
    expect(nav).not.toBeNull();
    expect(nav?.code).toBe('123456');
    expect(nav?.serialNumber).toBe('TBT-2026-004217');
  });

  it('accepts when serial precedes code in the query string (param order independent)', () => {
    const nav = scanAndGetWifiNav('https://tbot.app/pair?serial=TBT-XYZ&code=000001');
    expect(nav?.code).toBe('000001');
    expect(nav?.serialNumber).toBe('TBT-XYZ');
  });

  it('preserves a leading-zero 6-digit code exactly as a string (no numeric coercion)', () => {
    const nav = scanAndGetWifiNav('https://tbot.app/pair?code=000000&serial=S1');
    expect(nav?.code).toBe('000000');
  });

  it('accepts a custom (non-http) URL scheme that URL() still parses', () => {
    const nav = scanAndGetWifiNav('tbot://pair?code=654321&serial=TBT-CUSTOM');
    expect(nav?.code).toBe('654321');
    expect(nav?.serialNumber).toBe('TBT-CUSTOM');
  });

  it('URL-decodes serial via searchParams when serial contains percent-encoding', () => {
    // searchParams.get returns the decoded value; "TBT%20A" -> "TBT A".
    const nav = scanAndGetWifiNav('https://tbot.app/pair?code=222222&serial=TBT%20A');
    expect(nav?.serialNumber).toBe('TBT A');
  });
});

// ---------------------------------------------------------------------------
// parseTBotQrCode — REGEX FALLBACK on a valid URL whose searchParams branch
// fails the strict checks but whose raw text still matches the patterns.
// ---------------------------------------------------------------------------
describe('parseTBotQrCode — URL present but searchParams branch rejects, regex fallback', () => {
  it('falls back to regex when code has >6 digits (searchParams rejects, regex grabs the 6-digit run before "&")', () => {
    // searchParams.get('code') = "1234567" fails /^\d{6}$/. Raw text:
    // the TBOT_QR_CODE_PATTERN requires (\d{6}) immediately followed by & or
    // end; "code=1234567&" has no such boundary, so regex also misses -> null.
    const nav = scanAndGetWifiNav('https://tbot.app/pair?code=1234567&serial=S');
    expect(nav).toBeNull();
  });

  it('rejects when searchParams code is non-numeric and regex pattern cannot match', () => {
    const nav = scanAndGetWifiNav('https://tbot.app/pair?code=ABC123&serial=S');
    expect(nav).toBeNull();
  });

  it('falls back to regex serial pattern when searchParams.serial is empty but a later non-empty serial param matches', () => {
    // First serial param is empty (fails length>0 strict check). The regex
    // serial pattern matches the FIRST serial= occurrence ([^&]+ requires >=1
    // char), so it skips the empty one and grabs the second.
    const nav = scanAndGetWifiNav('https://tbot.app/pair?code=333333&serial=&serial=TBT-LATE');
    expect(nav?.code).toBe('333333');
    expect(nav?.serialNumber).toBe('TBT-LATE');
  });

  it('rejects a valid URL with an empty serial and no second serial param (strict + regex both fail)', () => {
    const nav = scanAndGetWifiNav('https://tbot.app/pair?code=444444&serial=');
    expect(nav).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseTBotQrCode — NON-URL text that matches the TBOT regex patterns.
// new URL(text) THROWS, the catch block runs the regex fallback.
// ---------------------------------------------------------------------------
describe('parseTBotQrCode — non-URL text (catch-path regex fallback)', () => {
  it('accepts non-URL query-ish text with code=…&serial=… (catch -> regex match)', () => {
    const nav = scanAndGetWifiNav('?code=555555&serial=TBT-RAW');
    expect(nav?.code).toBe('555555');
    expect(nav?.serialNumber).toBe('TBT-RAW');
  });

  it('accepts plain text with the params separated by & even without a leading ?', () => {
    const nav = scanAndGetWifiNav('garbage&code=666666&serial=TBT-MID&tail=x');
    expect(nav?.code).toBe('666666');
    expect(nav?.serialNumber).toBe('TBT-MID');
  });

  it('matches a 6-digit code at end-of-string in non-URL text (the (?:&|$) alternation)', () => {
    const nav = scanAndGetWifiNav('x?serial=TBT-END&code=777777');
    expect(nav?.code).toBe('777777');
    expect(nav?.serialNumber).toBe('TBT-END');
  });
});

// ---------------------------------------------------------------------------
// parseTBotQrCode — REJECT (null) cases — error/garbage, both code paths.
// A null parse must NOT navigate and MUST surface the scan-error copy.
// ---------------------------------------------------------------------------
describe('parseTBotQrCode — reject / error (null, no navigation)', () => {
  const errorCopy = 'This QR code is not a TBot pairing code.';

  function expectRejected(data: string): void {
    mockPermission = GRANTED;
    const navigate = jest.fn();
    const { queryByText } = renderScreen(navigate, INBOUND_PARAMS);
    scan(data);
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairWifiScreen, expect.anything());
    expect(queryByText(errorCopy)).toBeTruthy();
  }

  it('rejects an arbitrary non-URL string with no TBOT params (throw -> regex miss -> null)', () => {
    expectRejected('just some random text');
  });

  it('rejects an empty payload', () => {
    expectRejected('');
  });

  it('rejects a valid URL with neither code nor serial (URL ok, both branches null)', () => {
    expectRejected('https://example.com/');
  });

  it('rejects a URL carrying only a valid code but no serial', () => {
    expectRejected('https://tbot.app/pair?code=123456');
  });

  it('rejects a URL carrying only a serial but no code', () => {
    expectRejected('https://tbot.app/pair?serial=TBT-ONLY');
  });

  it('rejects a code that is 5 digits (below the 6-digit boundary)', () => {
    expectRejected('https://tbot.app/pair?code=12345&serial=S');
  });

  it('rejects a code embedded with adjacent extra digit so no 6-digit-then-boundary run exists', () => {
    // "code=1234560" -> searchParams "1234560" fails /^\d{6}$/; regex needs the
    // 6 digits immediately followed by &/$, but the 7th digit blocks it -> null.
    expectRejected('https://tbot.app/pair?code=1234560&serial=S');
  });

  it('rejects non-URL text whose code is letters', () => {
    expectRejected('code=abcdef&serial=S');
  });
});

// ---------------------------------------------------------------------------
// Scanned-code navigation — params merge + scan-once guard.
// ---------------------------------------------------------------------------
describe('scanned code -> PairWifiScreen navigation', () => {
  it('navigates to PairWifiScreen merging parsed code+serial onto inbound params', () => {
    mockPermission = GRANTED;
    const navigate = jest.fn();
    renderScreen(navigate, INBOUND_PARAMS);

    scan('https://tbot.app/pair?code=998877&serial=TBT-SCANNED');

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairWifiScreen, {
      ...INBOUND_PARAMS,
      code: '998877',
      serialNumber: 'TBT-SCANNED', // scanned serial overrides the inbound serial
    });
  });

  it('carries forward the BLE provisioning identifiers from inbound params unchanged', () => {
    mockPermission = GRANTED;
    const navigate = jest.fn();
    renderScreen(navigate, INBOUND_PARAMS);

    scan('https://tbot.app/pair?code=112233&serial=TBT-A');

    const payload = navigate.mock.calls[0][1] as Record<string, unknown>;
    expect(payload.provisioningAttemptId).toBe('claim-1');
    expect(payload.bleDeviceId).toBe('ble-device-1');
    expect(payload.provisioningTransport).toBe('ble');
    expect(payload.deviceId).toBe('device-1');
  });

  it('works when inbound params are undefined (spreads empty object, only code+serial set)', () => {
    mockPermission = GRANTED;
    const navigate = jest.fn();
    renderScreen(navigate, undefined);

    scan('https://tbot.app/pair?code=445566&serial=TBT-NOPARAMS');

    expect(navigate).toHaveBeenCalledWith(ROUTES.PairWifiScreen, {
      code: '445566',
      serialNumber: 'TBT-NOPARAMS',
    });
  });

  it('scans only once: a second valid scan after a successful one does not re-navigate (scannedRef guard)', () => {
    mockPermission = GRANTED;
    const navigate = jest.fn();
    renderScreen(navigate, INBOUND_PARAMS);

    scan('https://tbot.app/pair?code=111111&serial=TBT-FIRST');
    scan('https://tbot.app/pair?code=222222&serial=TBT-SECOND');

    expect(navigate).toHaveBeenCalledTimes(1);
    const payload = navigate.mock.calls[0][1] as Record<string, unknown>;
    expect(payload.code).toBe('111111');
    expect(payload.serialNumber).toBe('TBT-FIRST');
  });

  it('a rejected scan does NOT trip the once-guard: a later valid scan still navigates', () => {
    mockPermission = GRANTED;
    const navigate = jest.fn();
    renderScreen(navigate, INBOUND_PARAMS);

    scan('not a tbot code'); // rejected -> sets error, leaves scannedRef false
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairWifiScreen, expect.anything());

    scan('https://tbot.app/pair?code=909090&serial=TBT-RECOVER');
    expect(navigate).toHaveBeenCalledWith(
      ROUTES.PairWifiScreen,
      expect.objectContaining({ code: '909090', serialNumber: 'TBT-RECOVER' }),
    );
  });
});

// ---------------------------------------------------------------------------
// Camera permission render states.
// ---------------------------------------------------------------------------
describe('camera permission states', () => {
  it('renders the checking-permission state while permission is null (no CameraView)', () => {
    mockPermission = null;
    const navigate = jest.fn();
    const { queryByText, queryByTestId } = renderScreen(navigate, INBOUND_PARAMS);

    expect(queryByText('Checking camera permission...')).toBeTruthy();
    expect(queryByTestId('CameraView')).toBeNull();
  });

  it('renders the denied state with Allow Camera + manual fallback when canAskAgain', () => {
    mockPermission = DENIED_CAN_ASK;
    const navigate = jest.fn();
    const { queryByText, queryByTestId } = renderScreen(navigate, INBOUND_PARAMS);

    expect(queryByText('Camera access is needed. Enter the code manually.')).toBeTruthy();
    expect(queryByText('Allow Camera')).toBeTruthy();
    expect(queryByText('Enter code manually')).toBeTruthy();
    expect(queryByTestId('CameraView')).toBeNull();
  });

  it('hides Allow Camera when permission is permanently denied (canAskAgain false)', () => {
    mockPermission = DENIED_NO_ASK;
    const navigate = jest.fn();
    const { queryByText } = renderScreen(navigate, INBOUND_PARAMS);

    expect(queryByText('Allow Camera')).toBeNull();
    expect(queryByText('Enter code manually')).toBeTruthy();
  });

  it('invokes requestPermission when Allow Camera is pressed', () => {
    mockPermission = DENIED_CAN_ASK;
    const navigate = jest.fn();
    const { getByText } = renderScreen(navigate, INBOUND_PARAMS);

    fireEvent.press(getByText('Allow Camera'));
    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
  });

  it('renders the live CameraView + scan instruction when permission is granted', () => {
    mockPermission = GRANTED;
    const navigate = jest.fn();
    const { queryByText, queryByTestId } = renderScreen(navigate, INBOUND_PARAMS);

    expect(queryByTestId('CameraView')).toBeTruthy();
    expect(queryByText('Point the camera at the QR code shown on your Robot.')).toBeTruthy();
    // Error region is not shown until a bad scan happens.
    expect(queryByText('This QR code is not a TBot pairing code.')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Manual-entry escape hatch.
// ---------------------------------------------------------------------------
describe('manual entry', () => {
  it('navigates to PairCodeScreen with inbound params from the granted-state manual button', () => {
    mockPermission = GRANTED;
    const navigate = jest.fn();
    const { getByLabelText } = renderScreen(navigate, INBOUND_PARAMS);

    fireEvent.press(getByLabelText('Enter code manually'));
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairCodeScreen, INBOUND_PARAMS);
  });

  it('navigates to PairCodeScreen with inbound params from the denied-state manual button', () => {
    mockPermission = DENIED_CAN_ASK;
    const navigate = jest.fn();
    const { getByText } = renderScreen(navigate, INBOUND_PARAMS);

    fireEvent.press(getByText('Enter code manually'));
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairCodeScreen, INBOUND_PARAMS);
  });
});

// ---------------------------------------------------------------------------
// Scan-error display + dismiss cycle.
// ---------------------------------------------------------------------------
describe('scan-error display and dismiss', () => {
  const errorCopy = 'This QR code is not a TBot pairing code.';

  it('shows the error copy + Try again affordance after a bad scan', () => {
    mockPermission = GRANTED;
    const navigate = jest.fn();
    const { queryByText, getByText } = renderScreen(navigate, INBOUND_PARAMS);

    scan('definitely not a code');

    expect(getByText(errorCopy)).toBeTruthy();
    expect(queryByText('Try again')).toBeTruthy();
  });

  it('clears the error when Try again is pressed', () => {
    mockPermission = GRANTED;
    const navigate = jest.fn();
    const { getByText, queryByText } = renderScreen(navigate, INBOUND_PARAMS);

    scan('definitely not a code');
    expect(queryByText(errorCopy)).toBeTruthy();

    fireEvent.press(getByText('Try again'));
    return waitFor(() => expect(queryByText(errorCopy)).toBeNull());
  });

  it('a successful scan after an error navigates and does not leave the error showing', () => {
    mockPermission = GRANTED;
    const navigate = jest.fn();
    const { queryByText } = renderScreen(navigate, INBOUND_PARAMS);

    scan('bad'); // error
    expect(queryByText(errorCopy)).toBeTruthy();

    scan('https://tbot.app/pair?code=303030&serial=TBT-OK');
    expect(navigate).toHaveBeenCalledWith(
      ROUTES.PairWifiScreen,
      expect.objectContaining({ code: '303030' }),
    );
  });
});

// ---------------------------------------------------------------------------
// Back navigation.
// ---------------------------------------------------------------------------
describe('back navigation', () => {
  it('goes back to PairFoundScreen with params (granted state header)', () => {
    mockPermission = GRANTED;
    const navigate = jest.fn();
    const { getByLabelText } = renderScreen(navigate, INBOUND_PARAMS);

    // DeviceShell exposes the back control by accessibility label "Go back".
    fireEvent.press(getByLabelText('Go back'));
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairFoundScreen, INBOUND_PARAMS);
  });

  it('goes back to reconnect search for reconnect params even when device context exists', () => {
    mockPermission = GRANTED;
    const navigate = jest.fn();
    const { getByLabelText } = renderScreen(navigate, {
      ...INBOUND_PARAMS,
      provisioningTransport: 'ble_reconnect',
    });

    fireEvent.press(getByLabelText('Go back'));

    expect(navigate).toHaveBeenCalledWith(ROUTES.PairSearchScreen, {
      reconnectMode: true,
      reconnectDeviceId: 'device-1',
      reconnectSerialNumber: 'TBT-INBOUND-0001',
    });
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairFoundScreen, expect.anything());
  });

  it('goes back to PairSearchScreen when no found Robot context exists', () => {
    mockPermission = GRANTED;
    const navigate = jest.fn();
    const { getByLabelText } = renderScreen(navigate, undefined);

    fireEvent.press(getByLabelText('Go back'));

    expect(navigate).toHaveBeenCalledWith(ROUTES.PairSearchScreen);
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairFoundScreen, expect.anything());
  });
});
