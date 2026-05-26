import AbandonedDisconnectScreen from './screens/AbandonedDisconnectScreen';
import ActivityDoneScreen from './screens/ActivityDoneScreen';
import ActivityIntroScreen from './screens/ActivityIntroScreen';
import AudioErrorScreen from './screens/AudioErrorScreen';
import BargeinScreen from './screens/BargeinScreen';
import ConnectingScreen from './screens/ConnectingScreen';
import CostCappedScreen from './screens/CostCappedScreen';
import ExitConfirmScreen from './screens/ExitConfirmScreen';
import GentleScreen from './screens/GentleScreen';
import GreetingScreen from './screens/GreetingScreen';
import LessonDoneScreen from './screens/LessonDoneScreen';
import LessonReadyScreen from './screens/LessonReadyScreen';
import OfftopicScreen from './screens/OfftopicScreen';
import ParentStoppedScreen from './screens/ParentStoppedScreen';
import ReconnectingScreen from './screens/ReconnectingScreen';
import RetryScreen from './screens/RetryScreen';
import RobotListeningScreen from './screens/RobotListeningScreen';
import RobotSpeakingScreen from './screens/RobotSpeakingScreen';
import SafetyScreen from './screens/SafetyScreen';
import SilenceScreen from './screens/SilenceScreen';
import SuccessScreen from './screens/SuccessScreen';
import ThinkingScreen from './screens/ThinkingScreen';
import TimedOutScreen from './screens/TimedOutScreen';
import UserSpeakingScreen from './screens/UserSpeakingScreen';

export { STATES } from './states';

export const SCREEN_MAP = {
  lesson_ready: LessonReadyScreen,
  connecting: ConnectingScreen,
  greeting: GreetingScreen,
  activity_intro: ActivityIntroScreen,
  robot_speaking: RobotSpeakingScreen,
  robot_listening: RobotListeningScreen,
  user_speaking: UserSpeakingScreen,
  thinking: ThinkingScreen,
  success: SuccessScreen,
  gentle: GentleScreen,
  retry: RetryScreen,
  silence: SilenceScreen,
  offtopic: OfftopicScreen,
  bargein: BargeinScreen,
  activity_done: ActivityDoneScreen,
  lesson_done: LessonDoneScreen,
  reconnecting: ReconnectingScreen,
  audio_error: AudioErrorScreen,
  safety: SafetyScreen,
  exit_confirm: ExitConfirmScreen,
  abandoned_disconnect: AbandonedDisconnectScreen,
  cost_capped: CostCappedScreen,
  parent_stopped: ParentStoppedScreen,
  timed_out: TimedOutScreen,
};
