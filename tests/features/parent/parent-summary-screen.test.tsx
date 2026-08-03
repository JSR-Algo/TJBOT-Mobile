import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ParentSummaryScreen from '@/features/parent/screens/ParentSummaryScreen';
import { ROUTES } from '@/navigation/routes';

const mockLogout = jest.fn(async () => undefined);
const mockAuthState = {
  user: { id: 'parent-1', name: 'Alex Morgan', email: 'alex@example.com' },
  logout: mockLogout,
};

jest.mock('@/features/parent/hooks/useParentGateGuard', () => ({
  useParentGateGuard: jest.fn(),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 59, left: 0, right: 0, bottom: 34 },
};

function renderScreen(navigation = { navigate: jest.fn() }) {
  return {
    navigation,
    screen: render(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <ParentSummaryScreen
          navigation={navigation as never}
          route={{ key: 'parent-summary', name: 'ParentSummaryScreen', params: undefined } as never}
        />
      </SafeAreaProvider>,
    ),
  };
}

describe('ParentSummaryScreen parent-zone hub', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the signed-in parent profile and blueprint menu sections', () => {
    const { screen } = renderScreen();

    expect(screen.getByText('Parent Zone')).toBeTruthy();
    expect(screen.getByText('Alex Morgan')).toBeTruthy();
    expect(screen.getByText('alex@example.com')).toBeTruthy();
    expect(screen.getByText('AM')).toBeTruthy();
    expect(screen.getByText('Safety & Limits')).toBeTruthy();
    expect(screen.getByText('Daily Limit')).toBeTruthy();
    expect(screen.getByText('Safety Filter')).toBeTruthy();
    expect(screen.getByText('Subscription')).toBeTruthy();
    expect(screen.getByText('Help & FAQ')).toBeTruthy();
    expect(screen.getByText('Sign out')).toBeTruthy();
  });

  it('routes profile, safety, subscription, and help actions to existing screens', () => {
    const navigation = { navigate: jest.fn() };
    const { screen } = renderScreen(navigation);

    fireEvent.press(screen.getByTestId('parentProfileCard'));
    fireEvent.press(screen.getByText('Daily Limit'));
    fireEvent.press(screen.getByText('Subscription'));
    fireEvent.press(screen.getByText('Help & FAQ'));

    expect(navigation.navigate).toHaveBeenNthCalledWith(1, ROUTES.ParentAccountPrivacyScreen);
    expect(navigation.navigate).toHaveBeenNthCalledWith(2, ROUTES.ParentSafetyScreen);
    expect(navigation.navigate).toHaveBeenNthCalledWith(3, ROUTES.SubscriptionsScreen);
    expect(navigation.navigate).toHaveBeenNthCalledWith(4, ROUTES.HelpFaqScreen);
  });

  it('requires destructive confirmation before signing out', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { screen } = renderScreen();

    fireEvent.press(screen.getByTestId('parentSignOut'));

    expect(mockLogout).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      'Sign out',
      'Sign out of TeeBot on this device?',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
        expect.objectContaining({ text: 'Sign out', style: 'destructive' }),
      ]),
    );

    const actions = alertSpy.mock.calls[0]?.[2] ?? [];
    const destructive = actions.find((action) => action.style === 'destructive');
    destructive?.onPress?.();
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
