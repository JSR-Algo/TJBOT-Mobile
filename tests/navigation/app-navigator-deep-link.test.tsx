import React from 'react';
import EventEmitter from 'react-native/Libraries/vendor/emitter/EventEmitter';
import { act, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { AppNavigator } from '@/navigation/AppNavigator';
import { ROUTES } from '@/navigation/routes';

type LinkEvent = { url: string };
type LinkListener = (event: LinkEvent) => void;

let activeLinkListener: LinkListener | null = null;
const mockCreateElement = React.createElement;
const mockLinkingEmitter = new EventEmitter();

jest.mock('@/navigation/RootStackNavigator', () => ({
  RootStackNavigator: ({ pendingDeepLinkTarget }: { pendingDeepLinkTarget?: { name: string } | null }) => (
    mockCreateElement('Text', { testID: 'pending-deep-link-target' }, pendingDeepLinkTarget?.name ?? 'none')
  ),
}));

describe('AppNavigator deep links', () => {
  beforeEach(() => {
    activeLinkListener = null;
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
    jest.spyOn(Linking, 'addEventListener').mockImplementation((_eventName, listener) => {
      activeLinkListener = listener as LinkListener;
      return mockLinkingEmitter.addListener(_eventName, listener);
    });
  });

  it('queues configured feature route links for the protected navigator', async () => {
    render(<AppNavigator />);

    expect(await screen.findByTestId('pending-deep-link-target')).toHaveTextContent('none');
    expect(activeLinkListener).not.toBeNull();

    act(() => {
      activeLinkListener?.({ url: 'TJBot://device/pair-intro' });
    });

    expect(screen.getByTestId('pending-deep-link-target')).toHaveTextContent(ROUTES.PairIntroScreen);
  });
});
