import NetworkErrorScreen from './screens/NetworkErrorScreen';
import AppErrorScreen from './screens/AppErrorScreen';
import MicMissingScreen from './screens/MicMissingScreen';
import VoiceFailedScreen from './screens/VoiceFailedScreen';
import AudioRecoveryScreen from './screens/AudioRecoveryScreen';
import SafetyRedirectScreen from './screens/SafetyRedirectScreen';
import HelpFaqScreen from './screens/HelpFaqScreen';
import KidSettingsScreen from './screens/KidSettingsScreen';
import LessonResumeScreen from './screens/LessonResumeScreen';
import ReconnectingOverlay from './ReconnectingOverlay';
import { ROUTES } from '@/navigation/routes';
import type { FeatureNavigationConfig } from '@/navigation/types';
import { defineFeatureScreens } from '@/navigation/types';

export const FALLBACK_SCREENS = defineFeatureScreens([
  { name: ROUTES.NetworkErrorScreen, component: NetworkErrorScreen, role: 'fallback-entry', backTarget: ROUTES.HomeHubScreen, forwardCycleGroup: 'network-retry', stateMachineId: 'network_error' },
  { name: ROUTES.AppErrorScreen, component: AppErrorScreen, role: 'fallback-entry', backTarget: ROUTES.HomeHubScreen, stateMachineId: 'app_error' },
  { name: ROUTES.MicMissingScreen, component: MicMissingScreen, role: 'fallback-entry', backTarget: ROUTES.HomeHubScreen, stateMachineId: 'mic_missing' },
  { name: ROUTES.VoiceFailedScreen, component: VoiceFailedScreen, role: 'fallback-entry', backTarget: ROUTES.HomeHubScreen, stateMachineId: 'voice_failed' },
  { name: ROUTES.AudioRecoveryScreen, component: AudioRecoveryScreen, role: 'stack', backTarget: ROUTES.MicMissingScreen, stateMachineId: 'audio_recovery' },
  { name: ROUTES.SafetyRedirectScreen, component: SafetyRedirectScreen, role: 'fallback-entry', backTarget: ROUTES.HomeHubScreen, stateMachineId: 'safety_redirect' },
  { name: ROUTES.HelpFaqScreen, component: HelpFaqScreen, role: 'fallback-entry', backTarget: ROUTES.ParentSummaryScreen, stateMachineId: 'help_faq' },
  { name: ROUTES.KidSettingsScreen, component: KidSettingsScreen, role: 'fallback-entry', backTarget: ROUTES.HomeHubScreen, stateMachineId: 'kid_settings' },
  { name: ROUTES.LessonResumeScreen, component: LessonResumeScreen, role: 'fallback-entry', backTarget: ROUTES.HomeHubScreen, stateMachineId: 'lesson_resume' },
]);

export const FALLBACK_MODAL_SCREENS = defineFeatureScreens([
  { name: ROUTES.ReconnectingOverlay, component: ReconnectingOverlay, role: 'modal-entry', backTarget: ROUTES.NetworkErrorScreen, forwardCycleGroup: 'network-retry', stateMachineId: 'reconnecting_overlay' },
]);

export const FALLBACK_NAVIGATION = {
  owner: 'fallback',
  rootBranch: 'protected',
  stackScreens: FALLBACK_SCREENS,
  modalScreens: FALLBACK_MODAL_SCREENS,
} as const satisfies FeatureNavigationConfig;
