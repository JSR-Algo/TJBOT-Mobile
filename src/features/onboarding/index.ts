import SplashScreen from './screens/SplashScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import IntroListenScreen from './screens/IntroListenScreen';
import IntroSpeakScreen from './screens/IntroSpeakScreen';
import IntroRetryScreen from './screens/IntroRetryScreen';
import IntroCelebrateScreen from './screens/IntroCelebrateScreen';
import TrustScreen from './screens/TrustScreen';
import MicAskScreen from './screens/MicAskScreen';
import FirstLessonEntryScreen from './screens/FirstLessonEntryScreen';

export { STATES } from './states';

export const SCREEN_MAP = {
  onb_splash:          SplashScreen,
  onb_welcome:         WelcomeScreen,
  onb_intro_listen:    IntroListenScreen,
  onb_intro_speak:     IntroSpeakScreen,
  onb_intro_retry:     IntroRetryScreen,
  onb_intro_celebrate: IntroCelebrateScreen,
  onb_trust:           TrustScreen,
  onb_mic:             MicAskScreen,
  onb_first_lesson:    FirstLessonEntryScreen,
};
