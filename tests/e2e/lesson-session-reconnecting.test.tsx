import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ROUTES } from '@/navigation/routes';
import ConnectingScreen from '../../src/features/lesson-session/screens/ConnectingScreen';
import RobotListeningScreen from '../../src/features/lesson-session/screens/RobotListeningScreen';
import RobotSpeakingScreen from '../../src/features/lesson-session/screens/RobotSpeakingScreen';
import ReconnectingScreen from '../../src/features/lesson-session/screens/ReconnectingScreen';
import ThinkingScreen from '../../src/features/lesson-session/screens/ThinkingScreen';
import UserSpeakingScreen from '../../src/features/lesson-session/screens/UserSpeakingScreen';

const navigate = jest.fn();
const navigation = { navigate };

describe('lesson-session reconnecting recovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not let reconnecting UI resume the voice loop without a server resume event', () => {
    const screen = render(<ReconnectingScreen navigation={navigation as never} route={{ params: undefined } as never} />);

    fireEvent.press(screen.getByLabelText('Wait with Robot'));

    expect(navigate).not.toHaveBeenCalledWith(ROUTES.RobotListeningScreen);
  });

  it('labels calm voice lesson motion states for assistive technology', () => {
    const listening = render(<RobotListeningScreen navigation={navigation as never} route={{ params: undefined } as never} />);
    expect(listening.getByLabelText('Robot is listening')).toBeTruthy();
    listening.unmount();

    const userSpeaking = render(<UserSpeakingScreen navigation={navigation as never} route={{ params: undefined } as never} />);
    expect(userSpeaking.getByLabelText('Student voice is being heard')).toBeTruthy();
    userSpeaking.unmount();

    const robotSpeaking = render(<RobotSpeakingScreen navigation={navigation as never} route={{ params: undefined } as never} />);
    expect(robotSpeaking.getByLabelText('Robot is speaking')).toBeTruthy();
    expect(robotSpeaking.getByLabelText('Robot voice waveform')).toBeTruthy();
    robotSpeaking.unmount();

    jest.useFakeTimers();
    const thinking = render(<ThinkingScreen navigation={navigation as never} route={{ params: undefined } as never} />);
    expect(thinking.getByLabelText('Robot is thinking')).toBeTruthy();
    thinking.unmount();

    const connecting = render(<ConnectingScreen navigation={navigation as never} route={{ params: undefined } as never} />);
    expect(connecting.getByLabelText('Robot connection is tuning in')).toBeTruthy();
    expect(connecting.getByLabelText('Connection activity')).toBeTruthy();
    connecting.unmount();

    const reconnecting = render(<ReconnectingScreen navigation={navigation as never} route={{ params: undefined } as never} />);
    expect(reconnecting.getByLabelText('Reconnecting to Robot voice')).toBeTruthy();
    reconnecting.unmount();
  });
});
