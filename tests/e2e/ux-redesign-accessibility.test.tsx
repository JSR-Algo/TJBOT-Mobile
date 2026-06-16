import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ROUTES } from '@/navigation/routes';
import AudioErrorScreen from '../../src/features/lesson-session/screens/AudioErrorScreen';
import SafetyScreen from '../../src/features/lesson-session/screens/SafetyScreen';
import ExitConfirmScreen from '../../src/features/lesson-session/screens/ExitConfirmScreen';
import PairAddScreen from '../../src/features/device/pairing/screens/PairAddScreen';
import PairWifiScreen from '../../src/features/device/pairing/screens/PairWifiScreen';
import PairWifiPasswordScreen from '../../src/features/device/pairing/screens/PairWifiPasswordScreen';
import PairFailedScreen from '../../src/features/device/pairing/screens/PairFailedScreen';
import PairCodeScreen from '../../src/features/device/pairing/screens/PairCodeScreen';
import PairConnectingScreen from '../../src/features/device/pairing/screens/PairConnectingScreen';
import { pairDevice } from '../../src/services/api/device.api';

jest.mock('../../src/services/api/device.api', () => ({
  pairDevice: jest.fn(),
}));

const apiMocks = {
  pairDevice: pairDevice as jest.MockedFunction<typeof pairDevice>,
};

const navigate = jest.fn();
const navigation = { navigate };

describe('mobile UX redesign accessibility coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('labels child recovery secondary actions', () => {
    const audio = render(<AudioErrorScreen navigation={navigation as never} route={{ params: undefined } as never} />);
    expect(audio.getByLabelText('Go home')).toBeTruthy();

    const safety = render(<SafetyScreen navigation={navigation as never} route={{ params: undefined } as never} />);
    expect(safety.getByLabelText('Get a grown-up')).toBeTruthy();

    const exit = render(<ExitConfirmScreen navigation={navigation as never} route={{ params: undefined } as never} />);
    expect(exit.getByLabelText('Stop lesson for now')).toBeTruthy();
  });

  it('labels pairing choice cards and failure reasons', () => {
    const add = render(<PairAddScreen navigation={navigation as never} route={{ params: undefined } as never} />);
    fireEvent.press(add.getByLabelText('Pair a new Robot'));
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairIntroScreen);

    const failed = render(<PairFailedScreen navigation={navigation as never} route={{ params: undefined } as never} />);
    fireEvent.press(failed.getByLabelText('Fix wrong Wi-Fi password'));
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairWifiPasswordScreen);
  });

  it('requires a 6-digit pairing code before carrying it to Wi-Fi selection', () => {
    const screen = render(
      <PairCodeScreen
        navigation={navigation as never}
        route={{ params: { deviceId: 'TJBot-001' } } as never}
      />,
    );

    fireEvent.changeText(screen.getByPlaceholderText('Pairing code'), '1234');
    fireEvent.press(screen.getByText('Confirm & continue'));
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairWifiScreen, expect.anything());

    fireEvent.changeText(screen.getByPlaceholderText('Pairing code'), '123456');
    fireEvent.press(screen.getByText('Confirm & continue'));
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairWifiScreen, {
      deviceId: 'TJBot-001',
      code: '123456',
    });
  });

  it('toggles Wi-Fi password visibility from an accessible control', () => {
    const screen = render(
      <PairWifiPasswordScreen
        navigation={navigation as never}
        route={{ params: { ssid: 'Casa Wi-Fi' } } as never}
      />,
    );

    expect(screen.getByPlaceholderText('Wi-Fi password').props.secureTextEntry).toBe(true);
    fireEvent.press(screen.getByLabelText('Show Wi-Fi password'));
    expect(screen.getByPlaceholderText('Wi-Fi password').props.secureTextEntry).toBe(false);
  });

  it('labels manual Wi-Fi entry without changing pairing context', () => {
    const screen = render(
      <PairWifiScreen
        navigation={navigation as never}
        route={{ params: { deviceId: 'TJBot-001', code: '123456' } } as never}
      />,
    );

    fireEvent.press(screen.getByLabelText('Enter another Wi-Fi network'));
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairWifiPasswordScreen, {
      ssid: 'Other network',
      deviceId: 'TJBot-001',
      code: '123456',
    });
  });

  it('submits pairing once Wi-Fi password params are complete', async () => {
    apiMocks.pairDevice.mockResolvedValue({ deviceId: 'device-1' });
    const screen = render(
      <PairConnectingScreen
        navigation={navigation as never}
        route={{ params: { deviceId: 'TJBot-001', code: '123456', ssid: 'Casa Wi-Fi', password: 'secret123' } } as never}
      />,
    );

    expect(apiMocks.pairDevice).toHaveBeenCalledWith({
      serialNumber: 'TJBot-001',
      code: '123456',
      wifiSsid: 'Casa Wi-Fi',
      wifiPassword: 'secret123',
    });
    await expect(screen.findByText('Pairing complete')).resolves.toBeTruthy();
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairSuccessScreen, { deviceId: 'device-1' });
  });

  it('routes pairing submit failures to the retry screen', async () => {
    apiMocks.pairDevice.mockRejectedValue(new Error('claim rejected'));
    const screen = render(
      <PairConnectingScreen
        navigation={navigation as never}
        route={{ params: { deviceId: 'TJBot-001', code: '123456', ssid: 'Casa Wi-Fi', password: 'secret123' } } as never}
      />,
    );

    await expect(screen.findByText('Pairing failed')).resolves.toBeTruthy();
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairFailedScreen, {
      deviceId: 'TJBot-001',
      serial: undefined,
      espDeviceName: undefined,
      code: '123456',
      ssid: 'Casa Wi-Fi',
      error: 'claim rejected',
      errorCode: 'E-PROV-001',
    });
  });

  it('preserves pairing context when retrying a failed Wi-Fi password', () => {
    const failed = render(
      <PairFailedScreen
        navigation={navigation as never}
        route={{ params: { deviceId: 'TJBot-001', code: '123456', ssid: 'Casa Wi-Fi' } } as never}
      />,
    );

    fireEvent.press(failed.getByLabelText('Fix wrong Wi-Fi password'));
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairWifiPasswordScreen, {
      deviceId: 'TJBot-001',
      code: '123456',
      ssid: 'Casa Wi-Fi',
    });
  });
});
