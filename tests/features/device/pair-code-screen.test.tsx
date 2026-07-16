import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import PairCodeScreen from '@/features/device/pairing/screens/PairCodeScreen';
import { ROUTES } from '@/navigation/routes';

// US-005 [mb-pair-code] round-2 gap-fill — PairCodeScreen.
//
// PairCodeScreen is the manual-entry escape hatch in the pairing flow: when the
// QR scan path is unavailable, the user types the 6-digit code shown on the
// robot's face. This screen is the trust boundary that decides whether a typed
// string is a valid provisioning code before it is merged onto the in-flight
// provisioning params and carried into the Wi-Fi handoff (PairWifiScreen).
//
// What this suite pins (all observed via the screen's REAL reaction — the
// navigation calls it makes and the copy it renders, never on a mock we set):
//  - submit() input validation against /^\d{6}$/ exactly:
//      * empty / too-short / too-long / non-numeric / whitespace are rejected
//        (NO navigation at all).
//      * a well-formed 6-digit run (including all-zeros / leading zeros) is
//        accepted and forwarded to PairWifiScreen.
//  - The accept path merges { ...(params ?? {}), code } — inbound provisioning
//    identifiers are preserved, the typed code is added, and because `code` is
//    spread LAST it overrides any inbound `code`.
//  - The no-params render path forwards only { code } and does not crash.
//  - "Codes don't match" navigates to PairSearchScreen (with no params).
//  - The back affordance navigates to PairQrScanScreen carrying the inbound
//    params (or undefined when there were none).
//
// The screen reads `code` from local state populated by the TextInput's
// onChangeText. We drive that input through its accessible affordance (the
// "Pairing code" labelled TextInput) so the assertions exercise the real
// state -> submit() path rather than poking internals.

type NavSpy = jest.Mock;

const INBOUND_PARAMS = {
  deviceId: 'device-7',
  serialNumber: 'TBT-2026-004217',
  provisioningAttemptId: 'claim-77',
  bleDeviceId: 'ble-device-77',
  provisioningTransport: 'ble' as const,
};

function renderScreen(
  navigate: NavSpy,
  params?: Record<string, unknown> | undefined,
): ReturnType<typeof render> {
  return render(
    <PairCodeScreen navigation={{ navigate } as never} route={{ params } as never} />,
  );
}

/** The single text-entry affordance, found by its accessibility label. */
function codeInput(utils: ReturnType<typeof render>) {
  return utils.getByLabelText('Pairing code');
}

/** Type into the code field, then press the primary "Confirm & continue" CTA. */
function typeAndConfirm(
  utils: ReturnType<typeof render>,
  value: string,
): void {
  fireEvent.changeText(codeInput(utils), value);
  fireEvent.press(utils.getByText('Confirm & continue'));
}

/** The single Wi-Fi navigation payload, or null if submit() never navigated there. */
function wifiPayload(navigate: NavSpy): Record<string, unknown> | null {
  const call = navigate.mock.calls.find(c => c[0] === ROUTES.PairWifiScreen);
  return call ? (call[1] as Record<string, unknown>) : null;
}

// ---------------------------------------------------------------------------
// submit() — ACCEPT: a valid 6-digit code navigates with merged params.
// ---------------------------------------------------------------------------
describe('submit() — accept (valid 6-digit code)', () => {
  it('navigates to PairWifiScreen merging the typed code onto inbound params', () => {
    const navigate = jest.fn();
    const utils = renderScreen(navigate, INBOUND_PARAMS);

    typeAndConfirm(utils, '123456');

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairWifiScreen, {
      ...INBOUND_PARAMS,
      code: '123456',
    });
  });

  it('preserves every inbound provisioning identifier unchanged on the merged payload', () => {
    const navigate = jest.fn();
    const utils = renderScreen(navigate, INBOUND_PARAMS);

    typeAndConfirm(utils, '424242');

    const payload = wifiPayload(navigate);
    expect(payload).not.toBeNull();
    expect(payload?.deviceId).toBe('device-7');
    expect(payload?.serialNumber).toBe('TBT-2026-004217');
    expect(payload?.provisioningAttemptId).toBe('claim-77');
    expect(payload?.bleDeviceId).toBe('ble-device-77');
    expect(payload?.provisioningTransport).toBe('ble');
    expect(payload?.code).toBe('424242');
  });

  it('accepts the all-zeros boundary code "000000" and forwards it as a string', () => {
    const navigate = jest.fn();
    const utils = renderScreen(navigate, INBOUND_PARAMS);

    typeAndConfirm(utils, '000000');

    const payload = wifiPayload(navigate);
    expect(payload?.code).toBe('000000');
    expect(typeof payload?.code).toBe('string'); // no numeric coercion -> leading zeros kept
  });

  it('accepts the max boundary code "999999"', () => {
    const navigate = jest.fn();
    const utils = renderScreen(navigate, INBOUND_PARAMS);

    typeAndConfirm(utils, '999999');

    expect(wifiPayload(navigate)?.code).toBe('999999');
  });

  it('preserves a leading-zero code exactly (no coercion to a 5-char number)', () => {
    const navigate = jest.fn();
    const utils = renderScreen(navigate, INBOUND_PARAMS);

    typeAndConfirm(utils, '004217');

    expect(wifiPayload(navigate)?.code).toBe('004217');
  });

  it('spreads code LAST so a typed code overrides any inbound code on params', () => {
    const navigate = jest.fn();
    // Inbound params already carry a (stale) code; the typed one must win.
    const utils = renderScreen(navigate, { ...INBOUND_PARAMS, code: '000111' });

    typeAndConfirm(utils, '654321');

    expect(wifiPayload(navigate)?.code).toBe('654321');
  });
});

// ---------------------------------------------------------------------------
// submit() — REJECT: anything failing /^\d{6}$/ must NOT navigate.
// ---------------------------------------------------------------------------
describe('submit() — reject (regex /^\\d{6}$/ failures, no navigation)', () => {
  function expectNoNav(value: string): NavSpy {
    const navigate = jest.fn();
    const utils = renderScreen(navigate, INBOUND_PARAMS);
    typeAndConfirm(utils, value);
    expect(navigate).not.toHaveBeenCalled();
    return navigate;
  }

  it('rejects an empty code (default state, user presses confirm without typing)', () => {
    const navigate = jest.fn();
    const utils = renderScreen(navigate, INBOUND_PARAMS);
    // No changeText at all — code state stays ''.
    fireEvent.press(utils.getByText('Confirm & continue'));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('rejects a 5-digit code (one below the 6-digit boundary)', () => {
    expectNoNav('12345');
  });

  it('rejects a 7-digit code (one above the boundary; $ anchor fails)', () => {
    expectNoNav('1234567');
  });

  it('rejects a 6-char code containing a letter ("12a456")', () => {
    expectNoNav('12a456');
  });

  it('rejects a 6-char code that is all letters', () => {
    expectNoNav('abcdef');
  });

  it('rejects a 6-char code with an embedded space (\\d does not match space)', () => {
    expectNoNav('12 456');
  });

  it('rejects a 6-digit run with leading whitespace (anchored ^ fails)', () => {
    expectNoNav(' 12345');
  });

  it('rejects a 6-digit run with trailing whitespace (anchored $ fails)', () => {
    expectNoNav('123456 ');
  });

  it('rejects a code with a decimal point ("12.456")', () => {
    expectNoNav('12.456');
  });

  it('rejects a code with a unicode/full-width digit that \\d (ASCII in JS default) does not accept', () => {
    // U+FF11.. are full-width digits; JS \d without the u/unicode digit class
    // matches only ASCII 0-9, so a full-width "１２３４５６" is rejected.
    expectNoNav('１２３４５６');
  });

  it('a rejected submit leaves the field usable: a later valid code still navigates', () => {
    const navigate = jest.fn();
    const utils = renderScreen(navigate, INBOUND_PARAMS);

    typeAndConfirm(utils, '123'); // too short -> rejected
    expect(navigate).not.toHaveBeenCalled();

    typeAndConfirm(utils, '778899'); // valid -> navigates
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(wifiPayload(navigate)?.code).toBe('778899');
  });
});

// ---------------------------------------------------------------------------
// No-params render path.
// ---------------------------------------------------------------------------
describe('no-params render', () => {
  it('renders without crashing and submit forwards just { code }', () => {
    const navigate = jest.fn();
    const utils = renderScreen(navigate, undefined);

    typeAndConfirm(utils, '135790');

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairWifiScreen, { code: '135790' });
  });

  it('the merged payload has exactly the code key when params are undefined', () => {
    const navigate = jest.fn();
    const utils = renderScreen(navigate, undefined);

    typeAndConfirm(utils, '246810');

    const payload = wifiPayload(navigate);
    expect(payload).toEqual({ code: '246810' });
    expect(Object.keys(payload ?? {})).toEqual(['code']);
  });

  it('still rejects an invalid code when there are no params (no navigation, no crash)', () => {
    const navigate = jest.fn();
    const utils = renderScreen(navigate, undefined);

    typeAndConfirm(utils, 'nope');

    expect(navigate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// "Codes don't match" — escape to the search/restart flow.
// ---------------------------------------------------------------------------
describe('codes-don\'t-match affordance', () => {
  it('navigates to PairSearchScreen with no params', () => {
    const navigate = jest.fn();
    const utils = renderScreen(navigate, INBOUND_PARAMS);

    fireEvent.press(utils.getByText("Codes don't match"));

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairSearchScreen);
  });

  it('does NOT pass the inbound params through to PairSearchScreen', () => {
    const navigate = jest.fn();
    const utils = renderScreen(navigate, INBOUND_PARAMS);

    fireEvent.press(utils.getByText("Codes don't match"));

    // Exactly one positional arg (the route name); no params object.
    expect(navigate.mock.calls[0]).toHaveLength(1);
  });

  it('works from the no-params render too (still goes to PairSearchScreen)', () => {
    const navigate = jest.fn();
    const utils = renderScreen(navigate, undefined);

    fireEvent.press(utils.getByText("Codes don't match"));

    expect(navigate).toHaveBeenCalledWith(ROUTES.PairSearchScreen);
  });

  it('keeps reconnect mode for an offline/reconnect mismatch', () => {
    const navigate = jest.fn();
    const utils = renderScreen(navigate, {
      ...INBOUND_PARAMS,
      provisioningTransport: 'ble_reconnect',
    });

    fireEvent.press(utils.getByText("Codes don't match"));

    expect(navigate).toHaveBeenCalledWith(ROUTES.PairSearchScreen, {
      reconnectMode: true,
      reconnectDeviceId: 'device-7',
      reconnectSerialNumber: 'TBT-2026-004217',
    });
  });
});

// ---------------------------------------------------------------------------
// Back navigation — DeviceShell header back control.
// ---------------------------------------------------------------------------
describe('back navigation', () => {
  it('navigates back to PairQrScanScreen carrying the inbound params unchanged', () => {
    const navigate = jest.fn();
    const utils = renderScreen(navigate, INBOUND_PARAMS);

    fireEvent.press(utils.getByLabelText('Go back'));

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairQrScanScreen, INBOUND_PARAMS);
  });

  it('passes undefined params through to PairQrScanScreen when none were inbound', () => {
    const navigate = jest.fn();
    const utils = renderScreen(navigate, undefined);

    fireEvent.press(utils.getByLabelText('Go back'));

    expect(navigate).toHaveBeenCalledWith(ROUTES.PairQrScanScreen, undefined);
  });

  it('back does not invent or mutate params (forwards the exact same object reference)', () => {
    const navigate = jest.fn();
    const utils = renderScreen(navigate, INBOUND_PARAMS);

    fireEvent.press(utils.getByLabelText('Go back'));

    // The screen forwards `params` (route.params) directly to PairQrScanScreen.
    expect(navigate.mock.calls[0][1]).toBe(INBOUND_PARAMS);
  });
});

// ---------------------------------------------------------------------------
// Static render surface — the screen shows the manual-entry chrome.
// ---------------------------------------------------------------------------
describe('render surface', () => {
  it('renders the title, intro, primary CTA, mismatch link, and code input', () => {
    const navigate = jest.fn();
    const utils = renderScreen(navigate, INBOUND_PARAMS);

    expect(utils.queryByText("Confirm it's yours")).toBeTruthy();
    expect(utils.queryByText('Type the code')).toBeTruthy();
    expect(utils.queryByText('Confirm & continue')).toBeTruthy();
    expect(utils.queryByText("Codes don't match")).toBeTruthy();
    expect(utils.queryByLabelText('Pairing code')).toBeTruthy();
  });

  it('caps the code input at 6 characters (maxLength guard on the TextInput)', () => {
    const navigate = jest.fn();
    const utils = renderScreen(navigate, INBOUND_PARAMS);

    expect(codeInput(utils).props.maxLength).toBe(6);
    expect(codeInput(utils).props.keyboardType).toBe('number-pad');
  });
});
