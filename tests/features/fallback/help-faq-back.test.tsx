import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import HelpFaqScreen from '@/features/fallback/screens/HelpFaqScreen';
import { ROUTES } from '@/navigation/routes';

function renderHelpFaq(canGoBack: boolean) {
  const navigation = {
    canGoBack: jest.fn(() => canGoBack),
    goBack: jest.fn(),
    navigate: jest.fn(),
  };
  const screen = render(
    <HelpFaqScreen
      navigation={navigation as never}
      route={{ key: 'help', name: ROUTES.HelpFaqScreen, params: undefined } as never}
    />,
  );
  return { screen, navigation };
}

describe('HelpFaqScreen back behavior', () => {
  it('uses goBack when stack history exists (Support → FAQ)', () => {
    const { screen, navigation } = renderHelpFaq(true);

    fireEvent.press(screen.getByLabelText('Back to home'));

    expect(navigation.canGoBack).toHaveBeenCalled();
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).not.toHaveBeenCalledWith(ROUTES.ParentSummaryScreen);
  });

  it('falls back to Parent Summary only when there is no stack history', () => {
    const { screen, navigation } = renderHelpFaq(false);

    fireEvent.press(screen.getByLabelText('Back to home'));

    expect(navigation.canGoBack).toHaveBeenCalled();
    expect(navigation.goBack).not.toHaveBeenCalled();
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.ParentSummaryScreen);
  });
});
