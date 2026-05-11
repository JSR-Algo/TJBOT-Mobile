import LessonReadyScreen from './screens/LessonReadyScreen';
import ConnectingScreen from './screens/ConnectingScreen';
import GreetingScreen from './screens/GreetingScreen';
import ActivityIntroScreen from './screens/ActivityIntroScreen';
import RobotSpeakingScreen from './screens/RobotSpeakingScreen';
import RobotListeningScreen from './screens/RobotListeningScreen';
import UserSpeakingScreen from './screens/UserSpeakingScreen';
import ThinkingScreen from './screens/ThinkingScreen';
import SuccessScreen from './screens/SuccessScreen';
import GentleScreen from './screens/GentleScreen';
import RetryScreen from './screens/RetryScreen';
import SilenceScreen from './screens/SilenceScreen';
import OfftopicScreen from './screens/OfftopicScreen';
import BargeinScreen from './screens/BargeinScreen';
import ActivityDoneScreen from './screens/ActivityDoneScreen';
import LessonDoneScreen from './screens/LessonDoneScreen';
import ReconnectingScreen from './screens/ReconnectingScreen';
import AudioErrorScreen from './screens/AudioErrorScreen';
import SafetyScreen from './screens/SafetyScreen';
import ExitConfirmScreen from './screens/ExitConfirmScreen';

import { STATES } from './states';

export const SCREEN_MAP = {
  lesson_ready:    LessonReadyScreen,
  connecting:      ConnectingScreen,
  greeting:        GreetingScreen,
  activity_intro:  ActivityIntroScreen,
  robot_speaking:  RobotSpeakingScreen,
  robot_listening: RobotListeningScreen,
  user_speaking:   UserSpeakingScreen,
  thinking:        ThinkingScreen,
  success:         SuccessScreen,
  gentle:          GentleScreen,
  retry:           RetryScreen,
  silence:         SilenceScreen,
  offtopic:        OfftopicScreen,
  bargein:         BargeinScreen,
  activity_done:   ActivityDoneScreen,
  lesson_done:     LessonDoneScreen,
  reconnecting:    ReconnectingScreen,
  audio_error:     AudioErrorScreen,
  safety:          SafetyScreen,
  exit_confirm:    ExitConfirmScreen,
};
export { STATES };
