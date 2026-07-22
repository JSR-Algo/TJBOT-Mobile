import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import SupportScreen from '@/features/robot-mgmt/screens/SupportScreen';
import { ROUTES } from '@/navigation/routes';

jest.mock('@/features/robot-mgmt/telemetry', () => ({
  useRobotTelemetry: () => ({
    loading: false,
    telemetry: {
      robotName: 'Robot unavailable',
      serialNumber: null,
      firmwareLabel: 'Software unavailable',
      wifiLabel: 'Wi-Fi unavailable',
      wifiRssi: null,
      batteryLabel: 'Battery unavailable',
    },
  }),
  wifiSignalLabel: (rssi: number) => `${rssi}`,
}));

describe('SupportScreen honesty', () => {
  it('does not claim chat/email hours or fake a successful send', () => {
    const navigation = { navigate: jest.fn() };
    const screen = render(
      <SupportScreen navigation={navigation as never} route={{ params: undefined } as never} />,
    );

    expect(screen.getByTestId('support-honest-outlet')).toBeTruthy();
    expect(screen.getByText(/In-app support messages are not available yet/i)).toBeTruthy();
    expect(screen.queryByText('Chat with us')).toBeNull();
    expect(screen.queryByText(/hello@robotbuddy/i)).toBeNull();
    expect(screen.queryByText(/Mon–Fri/i)).toBeNull();
    expect(screen.queryByText('Send to support')).toBeNull();
    expect(screen.queryByText(/We'll attach/i)).toBeNull();
    expect(screen.queryByText(/Describe what you see/i)).toBeNull();
    expect(screen.getByText('Help articles')).toBeTruthy();
    expect(screen.getByText('Robot offline help')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Open help articles'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.HelpFaqScreen);
    expect(navigation.navigate).not.toHaveBeenCalledWith(ROUTES.MyRobotScreen);
  });

  it('back action returns to My Robot without claiming a ticket was filed', () => {
    const navigation = { navigate: jest.fn() };
    const screen = render(
      <SupportScreen navigation={navigation as never} route={{ params: undefined } as never} />,
    );

    fireEvent.press(screen.getByText('Back to My Robot'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.MyRobotScreen);
  });
});
