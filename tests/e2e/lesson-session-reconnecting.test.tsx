import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { createActor } from 'xstate';
import { ROUTES } from '@/navigation/routes';
import * as SessionContext from '../../src/features/lesson-session/sessionContext';
import { createLessonSessionMachine, noopLessonSessionServices } from '../../src/state/machines/lessonSession.machine';
import ConnectingScreen from '../../src/features/lesson-session/screens/ConnectingScreen';
import RobotListeningScreen from '../../src/features/lesson-session/screens/RobotListeningScreen';
import RobotSpeakingScreen from '../../src/features/lesson-session/screens/RobotSpeakingScreen';
import ReconnectingScreen from '../../src/features/lesson-session/screens/ReconnectingScreen';
import ThinkingScreen from '../../src/features/lesson-session/screens/ThinkingScreen';
import UserSpeakingScreen from '../../src/features/lesson-session/screens/UserSpeakingScreen';

const navigate = jest.fn();
const navigation = { navigate };

const LessonSessionProvider = (SessionContext as any).LessonSessionProvider as
  | typeof SessionContext.LessonSessionProvider
  | undefined;

function wrapWithSession(node: React.ReactElement): React.ReactElement {
  if (!LessonSessionProvider) return node;
  const machine = createLessonSessionMachine(noopLessonSessionServices);
  const actor = createActor(machine).start();
  return <LessonSessionProvider actor={actor}>{node}</LessonSessionProvider>;
}

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

    const connecting = render(wrapWithSession(<ConnectingScreen navigation={navigation as never} route={{ params: undefined } as never} />));
    expect(connecting.getByLabelText('Robot connection is tuning in')).toBeTruthy();
    expect(connecting.getByLabelText('Connection activity')).toBeTruthy();
    connecting.unmount();

    const reconnecting = render(<ReconnectingScreen navigation={navigation as never} route={{ params: undefined } as never} />);
    expect(reconnecting.getByLabelText('Reconnecting to Robot voice')).toBeTruthy();
    reconnecting.unmount();
  });
});
