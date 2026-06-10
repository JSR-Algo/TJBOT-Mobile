import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ROUTES } from '@/navigation/routes';
import PurchaseIntroScreen from '../../src/features/purchase/screens/PurchaseIntroScreen';

const mockNavigate = jest.fn();

const navigation = {
  navigate: mockNavigate,
  replace: jest.fn(),
  goBack: jest.fn(),
  setParams: jest.fn(),
  reset: jest.fn(),
  dispatch: jest.fn(),
  setOptions: jest.fn(),
  isFocused: () => true,
  canGoBack: () => true,
  getId: () => 'PurchaseIntro',
  getParent: () => undefined,
  getState: () => ({}),
  addListener: jest.fn(() => jest.fn()),
  removeListener: jest.fn(),
};

const route = {
  key: 'purchase-intro',
  name: ROUTES.PurchaseIntroScreen,
  params: undefined,
};

describe('PurchaseIntroScreen CTA', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes a stable primary CTA target for native purchase flow automation', () => {
    const screen = render(<PurchaseIntroScreen navigation={navigation as never} route={route as never} />);

    expect(screen.getByTestId('purchaseIntroScroll')).toBeTruthy();
    fireEvent.press(screen.getByTestId('purchaseIntroHowItWorksCta'));

    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.HowItWorksScreen);
  });
});
