import React from 'react';
import { fireEvent, render, within } from '@testing-library/react-native';
import PairIntroScreen from '@/features/device/pairing/screens/PairIntroScreen';
import PairAddScreen from '@/features/device/pairing/screens/PairAddScreen';
import PairOfflineScreen from '@/features/device/pairing/screens/PairOfflineScreen';
import PairSuccessScreen from '@/features/device/pairing/screens/PairSuccessScreen';
import { ROUTES } from '@/navigation/routes';

// ---------------------------------------------------------------------------
// US-005 round-2 gap fill — consolidated render + navigation suite for the four
// STATIC pairing screens that have no local state, no effects, and no API
// surface: PairIntroScreen, PairAddScreen, PairOfflineScreen, PairSuccessScreen.
//
// These screens are the "rails" of the pairing funnel: each shows fixed copy
// (steps / option cards / tip rows / fact rows) and wires a small fixed set of
// navigation edges. A regression here silently breaks the funnel topology
// (e.g. a CTA that used to advance now goes nowhere, or back lands on the wrong
// parent), which no other test in the suite covers for these specific screens.
//
// What this suite pins — all observed via the screen's REAL output: the copy it
// renders and the exact navigation.navigate(route, params?) calls it makes when
// its affordances are pressed. We never assert on a value we fed a mock.
//
// No DB / no network: these screens import nothing async. The only collaborator
// is the navigation prop, a jest.fn() spy. i18n is left REAL — translateCopy
// returns the key unchanged for non-key English strings, matching the sibling
// pair-code-screen / pair-failed-screen harnesses, so getByText('...') works on
// the literal copy in the source.
// ---------------------------------------------------------------------------

type NavSpy = jest.Mock;

function makeNav(): NavSpy {
  return jest.fn();
}

function renderIntro(navigate: NavSpy = makeNav()) {
  const utils = render(
    <PairIntroScreen navigation={{ navigate } as never} route={{ params: undefined } as never} />,
  );
  return { utils, navigate };
}

function renderAdd(navigate: NavSpy = makeNav()) {
  const utils = render(
    <PairAddScreen navigation={{ navigate } as never} route={{ params: undefined } as never} />,
  );
  return { utils, navigate };
}

function renderOffline(navigate: NavSpy = makeNav()) {
  const utils = render(
    <PairOfflineScreen navigation={{ navigate } as never} route={{ params: undefined } as never} />,
  );
  return { utils, navigate };
}

function renderSuccess(navigate: NavSpy = makeNav()) {
  const utils = render(
    <PairSuccessScreen navigation={{ navigate } as never} route={{ params: undefined } as never} />,
  );
  return { utils, navigate };
}

// ===========================================================================
// PairIntroScreen — "Turn on Robot": 3 numbered steps + heading; CTA advances
// to PairSearch; header back returns to PairAdd.
// ===========================================================================
describe('PairIntroScreen', () => {
  it('renders without crashing and shows the shell title + main heading', () => {
    const { utils } = renderIntro();
    expect(utils.queryByText('Turn on Robot')).toBeTruthy();   // DeviceShell title
    expect(utils.queryByText('Power on your Robot')).toBeTruthy(); // body heading
  });

  it('renders the supporting sub-copy about the top button + chime', () => {
    const { utils } = renderIntro();
    expect(
      utils.queryByText(/Hold the button on top for 2 seconds/),
    ).toBeTruthy();
  });

  it('renders all three numbered steps with their badge numbers and labels', () => {
    const { utils } = renderIntro();
    // Badge numbers 1..3.
    expect(utils.getByText('1')).toBeTruthy();
    expect(utils.getByText('2')).toBeTruthy();
    expect(utils.getByText('3')).toBeTruthy();
    // Each step's copy.
    expect(utils.getByText('Plug in or use a charged Robot')).toBeTruthy();
    expect(utils.getByText('Hold the top button until it chimes')).toBeTruthy();
    expect(utils.getByText('Place Robot within 1–2 m of your phone')).toBeTruthy();
  });

  it('renders exactly three step badges (no extra/missing numbered rows)', () => {
    const { utils } = renderIntro();
    // The badge digits 1/2/3 are unique to the three steps on this screen.
    expect(utils.queryByText('4')).toBeNull();
    expect(utils.queryByText('0')).toBeNull();
  });

  it('primary CTA "My Robot is on" advances to PairSearchScreen', () => {
    const { utils, navigate } = renderIntro();
    fireEvent.press(utils.getByText('My Robot is on'));
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairSearchScreen);
  });

  it('the CTA forward edge carries no params (single-arg navigate, not search-with-reconnect)', () => {
    const { utils, navigate } = renderIntro();
    fireEvent.press(utils.getByText('My Robot is on'));
    expect(navigate.mock.calls[0]).toHaveLength(1);
    // It must NOT use the reconnect overload that PairOffline uses.
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairSearchScreen, { reconnectMode: true });
  });

  it('header back returns to PairAddScreen (the parent picker)', () => {
    const { utils, navigate } = renderIntro();
    fireEvent.press(utils.getByLabelText('Go back'));
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairAddScreen);
  });

  it('does not navigate on mount (a static screen makes no edges until pressed)', () => {
    const { navigate } = renderIntro();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('back and CTA are distinct edges: back never lands on PairSearch, CTA never on PairAdd', () => {
    const { utils, navigate } = renderIntro();
    fireEvent.press(utils.getByLabelText('Go back'));
    fireEvent.press(utils.getByText('My Robot is on'));
    expect(navigate).toHaveBeenCalledTimes(2);
    expect(navigate.mock.calls).toEqual([
      [ROUTES.PairAddScreen],
      [ROUTES.PairSearchScreen],
    ]);
  });
});

// ===========================================================================
// PairAddScreen — "Add a Robot" picker: two option cards (new Robot ->
// PairIntro, offline Robot -> PairOffline) + back to DeviceOverview.
// ===========================================================================
describe('PairAddScreen', () => {
  it('exposes a stable native route anchor for the pairing picker', () => {
    const { utils } = renderAdd();

    expect(utils.getByTestId('pairAddScreen')).toBeTruthy();
  });

  it('renders without crashing and shows the shell title + the "on the Robot itself" intro', () => {
    const { utils } = renderAdd();
    expect(utils.queryByText('Add a Robot')).toBeTruthy();
    // The intro is split across nested <Text> nodes; match the static fragments.
    expect(utils.queryByText(/Lessons happen/)).toBeTruthy();
    expect(utils.queryByText('on the Robot itself')).toBeTruthy();
  });

  it('renders both option cards (new + offline) with their titles and subtitles', () => {
    const { utils } = renderAdd();
    expect(utils.getByText('I have a new Robot')).toBeTruthy();
    expect(utils.getByText('About 3 minutes — needs Wi-Fi')).toBeTruthy();
    expect(utils.getByText('My Robot is offline')).toBeTruthy();
    expect(utils.getByText('Reconnect or move to new Wi-Fi')).toBeTruthy();
  });

  it('renders the footer "You\'ll need" note', () => {
    const { utils } = renderAdd();
    expect(
      utils.queryByText(/You'll need: Robot, your home Wi-Fi password, and about 3 minutes\./),
    ).toBeTruthy();
  });

  it('exposes both option cards as accessible buttons with translated labels', () => {
    const { utils } = renderAdd();
    expect(utils.getByLabelText('Pair a new Robot')).toBeTruthy();
    expect(utils.getByLabelText('Reconnect offline Robot')).toBeTruthy();
  });

  it('"My Robot is offline" card advances to PairOfflineScreen', () => {
    const { utils, navigate } = renderAdd();
    fireEvent.press(utils.getByText('My Robot is offline'));
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairOfflineScreen);
  });

  it('the offline card can also be pressed via its accessibility label and routes the same', () => {
    const { utils, navigate } = renderAdd();
    fireEvent.press(utils.getByLabelText('Reconnect offline Robot'));
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairOfflineScreen);
  });

  it('"I have a new Robot" card advances to PairIntroScreen', () => {
    const { utils, navigate } = renderAdd();
    fireEvent.press(utils.getByText('I have a new Robot'));
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairIntroScreen);
  });

  it('the two cards route to DIFFERENT destinations (no accidental shared edge)', () => {
    const { utils, navigate } = renderAdd();
    fireEvent.press(utils.getByText('I have a new Robot'));
    fireEvent.press(utils.getByText('My Robot is offline'));
    expect(navigate.mock.calls).toEqual([
      [ROUTES.PairIntroScreen],
      [ROUTES.PairOfflineScreen],
    ]);
  });

  it('header back returns to DeviceOverviewScreen (exit the pairing funnel)', () => {
    const { utils, navigate } = renderAdd();
    fireEvent.press(utils.getByLabelText('Go back'));
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(ROUTES.DeviceOverviewScreen);
  });

  it('the option-card edges carry no params (single-arg navigate)', () => {
    const { utils, navigate } = renderAdd();
    fireEvent.press(utils.getByText('My Robot is offline'));
    expect(navigate.mock.calls[0]).toHaveLength(1);
  });

  it('does not navigate on mount', () => {
    const { navigate } = renderAdd();
    expect(navigate).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// PairOfflineScreen — "Robot is offline": reconnect heading + ordinary tips;
// primary CTA reconnects (search w/ reconnectMode), secondary -> Support;
// header back -> PairAdd.
// ===========================================================================
describe('PairOfflineScreen', () => {
  it('renders without crashing and shows the shell title + reconnect heading', () => {
    const { utils } = renderOffline();
    expect(utils.queryByText('Robot is offline')).toBeTruthy(); // shell title
    expect(utils.queryByText('Robot needs a reconnect')).toBeTruthy(); // body heading
  });

  it('renders the reassurance sub-copy ("Pairing is safe.")', () => {
    const { utils } = renderOffline();
    expect(utils.queryByText(/Pairing is safe\./)).toBeTruthy();
  });

  it('renders the "Try this" section label', () => {
    const { utils } = renderOffline();
    expect(utils.getByText('Try this')).toBeTruthy();
  });

  it('separates ordinary Wi-Fi recovery from last-resort pairing reset guidance', () => {
    const { utils } = renderOffline();
    expect(utils.getByText('Check Robot is plugged in')).toBeTruthy();
    expect(utils.getByText('Or has at least 20% battery')).toBeTruthy();
    const updateWifi = utils.getByLabelText('Update Wi-Fi for offline Robot');
    expect(within(updateWifi).getByText('Double-click the BOOT button to change Wi-Fi without unpairing Robot.')).toBeTruthy();
    expect(within(updateWifi).queryByText('Hold BOOT for 5 seconds only if you want to reset pairing and saved Wi-Fi.')).toBeNull();
    expect(utils.getByText('Pair again (last resort)')).toBeTruthy();
    expect(utils.getByText('Hold BOOT for 5 seconds only if you want to reset pairing and saved Wi-Fi.')).toBeTruthy();
  });

  it('"Update Wi-Fi" is an accessible recovery action that re-enters reconnect search', () => {
    const { utils, navigate } = renderOffline();
    fireEvent.press(utils.getByLabelText('Update Wi-Fi for offline Robot'));
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairSearchScreen, { reconnectMode: true });
  });

  it('primary CTA "Reconnect now" goes to PairSearchScreen WITH reconnectMode: true', () => {
    const { utils, navigate } = renderOffline();
    fireEvent.press(utils.getByText('Reconnect now'));
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairSearchScreen, { reconnectMode: true });
  });

  it('the reconnect edge specifically passes the reconnect flag (not a bare search)', () => {
    const { utils, navigate } = renderOffline();
    fireEvent.press(utils.getByText('Reconnect now'));
    // It must carry params — a single-arg call would skip reconnect mode.
    expect(navigate.mock.calls[0]).toHaveLength(2);
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairSearchScreen);
  });

  it('secondary CTA "Contact support" goes to SupportScreen with the wifi/robot_offline context', () => {
    const { utils, navigate } = renderOffline();
    fireEvent.press(utils.getByText('Contact support'));
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(ROUTES.SupportScreen, {
      context: { topic: 'wifi', errorFamily: 'robot_offline' },
    });
  });

  it('header back returns to PairAddScreen', () => {
    const { utils, navigate } = renderOffline();
    fireEvent.press(utils.getByLabelText('Go back'));
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairAddScreen);
  });

  it('the three exits are distinct: reconnect / support / back never collide', () => {
    const { utils, navigate } = renderOffline();
    fireEvent.press(utils.getByText('Reconnect now'));
    fireEvent.press(utils.getByText('Contact support'));
    fireEvent.press(utils.getByLabelText('Go back'));
    expect(navigate.mock.calls).toEqual([
      [ROUTES.PairSearchScreen, { reconnectMode: true }],
      [ROUTES.SupportScreen, { context: { topic: 'wifi', errorFamily: 'robot_offline' } }],
      [ROUTES.PairAddScreen],
    ]);
  });

  it('does not navigate on mount', () => {
    const { navigate } = renderOffline();
    expect(navigate).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// PairSuccessScreen — terminal success: "ready" heading + 3 fact rows; the
// single CTA continues to the first lesson. NO header back (no onBack).
// ===========================================================================
describe('PairSuccessScreen', () => {
  it('renders without crashing and shows the shell title + "ready" heading', () => {
    const { utils } = renderSuccess();
    expect(utils.queryByText('Robot connected')).toBeTruthy(); // shell title
    expect(utils.queryByText('Your Robot is ready')).toBeTruthy(); // body heading
  });

  it('renders the provisioning-summary sub-copy', () => {
    const { utils } = renderSuccess();
    expect(
      utils.queryByText(/Setup finished after Robot authenticated with the cloud/),
    ).toBeTruthy();
  });

  it('renders all three trust facts with their titles and bodies', () => {
    const { utils } = renderSuccess();
    expect(utils.getByText('Robot authenticated')).toBeTruthy();
    expect(utils.getByText('The device checked in with the cloud before setup completed.')).toBeTruthy();
    expect(utils.getByText('Wi-Fi stayed transient')).toBeTruthy();
    expect(utils.getByText('Network details were used only during setup.')).toBeTruthy();
    expect(utils.getByText('Device assigned')).toBeTruthy();
    expect(utils.getByText('Robot is now linked to your household and child profile.')).toBeTruthy();
  });

  it('primary CTA "Continue" advances to PairFirstLessonScreen', () => {
    const { utils, navigate } = renderSuccess();
    fireEvent.press(utils.getByText('Continue'));
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairFirstLessonScreen);
  });

  it('the continue edge carries no params (single-arg navigate)', () => {
    const { utils, navigate } = renderSuccess();
    fireEvent.press(utils.getByText('Continue'));
    expect(navigate.mock.calls[0]).toHaveLength(1);
  });

  it('is a terminal screen: it renders NO header back affordance (no onBack)', () => {
    const { utils } = renderSuccess();
    // DeviceShell only renders the "Go back" control when onBack is provided;
    // PairSuccessScreen intentionally omits it so the user cannot retreat into
    // the (now-consumed) provisioning flow.
    expect(utils.queryByLabelText('Go back')).toBeNull();
  });

  it('does not navigate on mount (no auto-advance off the success screen)', () => {
    const { navigate } = renderSuccess();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('Continue is the only edge: it never routes anywhere but the first lesson', () => {
    const { utils, navigate } = renderSuccess();
    fireEvent.press(utils.getByText('Continue'));
    expect(navigate.mock.calls).toEqual([[ROUTES.PairFirstLessonScreen]]);
  });
});
