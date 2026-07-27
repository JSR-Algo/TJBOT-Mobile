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
  it('filters help topics and exposes an honest empty state', () => {
    const { screen } = renderHelpFaq(false);

    fireEvent.changeText(screen.getByTestId('helpFaqSearchInput'), 'subscription');
    expect(screen.getByText('How do I cancel my subscription?')).toBeTruthy();
    expect(screen.queryByText("Is my child's voice recorded?")).toBeNull();

    fireEvent.changeText(screen.getByTestId('helpFaqSearchInput'), 'no matching topic');
    expect(screen.getByTestId('helpFaqEmptyResult')).toHaveTextContent('No help topics found.');

    fireEvent.changeText(screen.getByTestId('helpFaqSearchInput'), '');
    expect(screen.getByText("Is my child's voice recorded?")).toBeTruthy();
  });

});
