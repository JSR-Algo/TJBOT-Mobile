import KidSettingsScreen from './screens/KidSettingsScreen';
import MicMissingScreen from './screens/MicMissingScreen';
import NetworkErrorScreen from './screens/NetworkErrorScreen';
import VoiceFailedScreen from './screens/VoiceFailedScreen';
import SafetyRedirectScreen from './screens/SafetyRedirectScreen';
import HelpFaqScreen from './screens/HelpFaqScreen';
import ReconnectingOverlay from './ReconnectingOverlay';
import AudioRecoveryScreen from './screens/AudioRecoveryScreen';
import LessonResumeScreen from './screens/LessonResumeScreen';
import AppErrorScreen from './screens/AppErrorScreen';

import { STATES } from './states';

export const SCREEN_MAP = {
  kid_settings:         KidSettingsScreen,
  mic_missing:          MicMissingScreen,
  network_error:        NetworkErrorScreen,
  voice_failed:         VoiceFailedScreen,
  safety_redirect:      SafetyRedirectScreen,
  help_faq:             HelpFaqScreen,
  reconnecting_overlay: ReconnectingOverlay,
  audio_recovery:       AudioRecoveryScreen,
  lesson_resume:        LessonResumeScreen,
  app_error:            AppErrorScreen,
};
export { STATES };
