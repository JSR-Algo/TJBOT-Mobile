import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import MicTestScreen from '../../../src/features/robot-mgmt/screens/MicTestScreen';
import { runMicTest } from '../../../src/services/api/robot-mgmt.api';

jest.mock('../../../src/services/api/robot-mgmt.api', () => ({
  runMicTest: jest.fn(),
}));

jest.mock('@/config/feature-flags', () => ({
  FEATURE_DEVICE_MANAGEMENT: true,
}));

const apiMocks = {
  runMicTest: runMicTest as jest.MockedFunction<typeof runMicTest>,
};

const navigationMock = {
  navigate: jest.fn(),
};
const navigation = navigationMock as never;

const emptyRoute = {
  key: 'MicTestScreen',
  name: 'MicTestScreen',
  params: undefined,
} as never;

describe('MicTestScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiMocks.runMicTest.mockRejectedValue(new Error('mic API unavailable'));
  });

  it('shows mic test visual phases and allows rerun', async () => {
    apiMocks.runMicTest.mockResolvedValue({ passed: true });
    const screen = render(<MicTestScreen navigation={navigation} route={emptyRoute} />);

    expect(screen.getByText('Ready to listen')).toBeTruthy();
    fireEvent.press(screen.getByText('Start mic test'));
    expect(await screen.findByText('Listening...')).toBeTruthy();
    expect(await screen.findByText('Mic test heard sound', {}, { timeout: 1500 })).toBeTruthy();
    expect(apiMocks.runMicTest).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByText('Run test again'));
    expect(await screen.findByText('Listening...')).toBeTruthy();
    expect(apiMocks.runMicTest).toHaveBeenCalledTimes(2);
    screen.unmount();
  });

  it('shows mic test failure when native mic does not detect speech', async () => {
    apiMocks.runMicTest.mockResolvedValueOnce({ passed: false });
    const screen = render(<MicTestScreen navigation={navigation} route={emptyRoute} />);

    fireEvent.press(screen.getByText('Start mic test'));

    expect(await screen.findByText('A little too quiet')).toBeTruthy();
    expect(screen.getByText('Try again in a quieter spot.')).toBeTruthy();
    screen.unmount();
  });
});
