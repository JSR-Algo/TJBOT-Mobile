import ConnectingScreen from './screens/ConnectingScreen';
import GreetingScreen from './screens/GreetingScreen';
import LessonReadyScreen from './screens/LessonReadyScreen';
import RobotListeningScreen from './screens/RobotListeningScreen';
import UserSpeakingScreen from './screens/UserSpeakingScreen';
import RobotSpeakingScreen from './screens/RobotSpeakingScreen';
import ThinkingScreen from './screens/ThinkingScreen';
import ActivityIntroScreen from './screens/ActivityIntroScreen';
import ActivityDoneScreen from './screens/ActivityDoneScreen';
import SuccessScreen from './screens/SuccessScreen';
import LessonDoneScreen from './screens/LessonDoneScreen';
import ExitConfirmScreen from './screens/ExitConfirmScreen';
import RetryScreen from './screens/RetryScreen';
import SilenceScreen from './screens/SilenceScreen';
import BargeinScreen from './screens/BargeinScreen';
import GentleScreen from './screens/GentleScreen';
import OfftopicScreen from './screens/OfftopicScreen';
import SafetyScreen from './screens/SafetyScreen';
import CostCappedScreen from './screens/CostCappedScreen';
import ParentStoppedScreen from './screens/ParentStoppedScreen';
import TimedOutScreen from './screens/TimedOutScreen';
import AudioErrorScreen from './screens/AudioErrorScreen';
import AbandonedDisconnectScreen from './screens/AbandonedDisconnectScreen';
import ReconnectingScreen from './screens/ReconnectingScreen';
import { ROUTES } from '@/navigation/routes';
import type { FeatureNavigationConfig } from '@/navigation/types';
import { defineFeatureScreens } from '@/navigation/types';

export const LESSON_SESSION_SCREENS = defineFeatureScreens([
  { name: ROUTES.ConnectingScreen, component: ConnectingScreen, role: 'state-machine', stateMachineId: 'connecting', forwardCycleGroup: 'lesson-session-loop' },
  { name: ROUTES.GreetingScreen, component: GreetingScreen, role: 'state-machine', stateMachineId: 'greeting', forwardCycleGroup: 'lesson-session-loop' },
  { name: ROUTES.LessonReadyScreen, component: LessonReadyScreen, role: 'state-machine', stateMachineId: 'lesson_ready', forwardCycleGroup: 'lesson-session-loop' },
  { name: ROUTES.RobotListeningScreen, component: RobotListeningScreen, role: 'state-machine', stateMachineId: 'robot_listening', forwardCycleGroup: 'lesson-session-loop' },
  { name: ROUTES.UserSpeakingScreen, component: UserSpeakingScreen, role: 'state-machine', stateMachineId: 'user_speaking', forwardCycleGroup: 'lesson-session-loop' },
  { name: ROUTES.RobotSpeakingScreen, component: RobotSpeakingScreen, role: 'state-machine', stateMachineId: 'robot_speaking', forwardCycleGroup: 'lesson-session-loop' },
  { name: ROUTES.ThinkingScreen, component: ThinkingScreen, role: 'state-machine', stateMachineId: 'thinking', forwardCycleGroup: 'lesson-session-loop' },
  { name: ROUTES.ActivityIntroScreen, component: ActivityIntroScreen, role: 'state-machine', stateMachineId: 'activity_intro', forwardCycleGroup: 'lesson-session-loop' },
  { name: ROUTES.ActivityDoneScreen, component: ActivityDoneScreen, role: 'state-machine', stateMachineId: 'activity_done', forwardCycleGroup: 'lesson-session-loop' },
  { name: ROUTES.SuccessScreen, component: SuccessScreen, role: 'state-machine', stateMachineId: 'success', forwardCycleGroup: 'lesson-session-loop' },
  { name: ROUTES.LessonDoneScreen, component: LessonDoneScreen, role: 'state-machine', stateMachineId: 'lesson_done', forwardCycleGroup: 'lesson-session-loop' },
  { name: ROUTES.ExitConfirmScreen, component: ExitConfirmScreen, role: 'state-machine', stateMachineId: 'exit_confirm', forwardCycleGroup: 'lesson-session-loop' },
  { name: ROUTES.RetryScreen, component: RetryScreen, role: 'state-machine', stateMachineId: 'retry', forwardCycleGroup: 'lesson-session-loop' },
  { name: ROUTES.SilenceScreen, component: SilenceScreen, role: 'state-machine', stateMachineId: 'silence', forwardCycleGroup: 'lesson-session-loop' },
  { name: ROUTES.BargeinScreen, component: BargeinScreen, role: 'state-machine', stateMachineId: 'bargein', forwardCycleGroup: 'lesson-session-loop' },
  { name: ROUTES.GentleScreen, component: GentleScreen, role: 'state-machine', stateMachineId: 'gentle', forwardCycleGroup: 'lesson-session-loop' },
  { name: ROUTES.OfftopicScreen, component: OfftopicScreen, role: 'state-machine', stateMachineId: 'offtopic', forwardCycleGroup: 'lesson-session-loop' },
  { name: ROUTES.SafetyScreen, component: SafetyScreen, role: 'state-machine', stateMachineId: 'safety', forwardCycleGroup: 'lesson-session-loop' },
  { name: ROUTES.CostCappedScreen, component: CostCappedScreen, role: 'state-machine', stateMachineId: 'cost_capped', forwardCycleGroup: 'lesson-session-loop' },
  { name: ROUTES.ParentStoppedScreen, component: ParentStoppedScreen, role: 'state-machine', stateMachineId: 'parent_stopped', forwardCycleGroup: 'lesson-session-loop' },
  { name: ROUTES.TimedOutScreen, component: TimedOutScreen, role: 'state-machine', stateMachineId: 'timed_out', forwardCycleGroup: 'lesson-session-loop' },
  { name: ROUTES.AudioErrorScreen, component: AudioErrorScreen, role: 'state-machine', stateMachineId: 'audio_error', forwardCycleGroup: 'lesson-session-loop' },
  { name: ROUTES.AbandonedDisconnectScreen, component: AbandonedDisconnectScreen, role: 'state-machine', stateMachineId: 'abandoned_disconnect', forwardCycleGroup: 'lesson-session-loop' },
  { name: ROUTES.ReconnectingScreen, component: ReconnectingScreen, role: 'state-machine', stateMachineId: 'reconnecting', forwardCycleGroup: 'lesson-session-loop' },
]);

export const LESSON_SESSION_NAVIGATION = {
  owner: 'lesson-session',
  rootBranch: 'protected',
  stackScreens: LESSON_SESSION_SCREENS,
  modalScreens: [],
} as const satisfies FeatureNavigationConfig;
