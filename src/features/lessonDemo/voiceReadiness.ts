import { Linking, Platform } from 'react-native';
import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import { isInvestorDemoEnabled } from '@/config/investorDemo';
import { getAccessToken } from '@/services/http/tokens';
import { isGeminiDemoKeyEnabled } from '@/config/geminiDemoKey';

export type VoiceReadinessIssue = 'mic_denied' | 'mic_blocked' | 'auth_missing' | null;

export async function probeVoiceReadiness(): Promise<VoiceReadinessIssue> {
  if (!isGeminiDemoKeyEnabled() && !isInvestorDemoEnabled()) {
    const token = await getAccessToken();
    if (!token) return 'auth_missing';
  }

  const permission = await getRecordingPermissionsAsync();
  if (permission.granted) return null;
  // Only hard-block when iOS has permanently denied mic access.
  if (permission.status === 'denied' && permission.canAskAgain === false) return 'mic_blocked';
  return null;
}

export async function ensureMicPermission(): Promise<boolean> {
  const current = await getRecordingPermissionsAsync();
  if (current.granted) return true;
  const requested = await requestRecordingPermissionsAsync();
  return requested.granted;
}

export function voiceReadinessMessage(issue: VoiceReadinessIssue): string | null {
  switch (issue) {
    case 'auth_missing':
      return 'Robot needs you signed in. Open parent settings and sign in again, then come back.';
    case 'mic_denied':
      return 'Robot needs the microphone. Tap Allow when iOS asks, or turn it on in Settings.';
    case 'mic_blocked':
      return 'Microphone is off for TJBot. A grown-up can enable it in Settings → TJBot → Microphone.';
    default:
      return null;
  }
}

export function openAppSettings(): void {
  void Linking.openSettings();
}

export function isIosSettingsAvailable(): boolean {
  return Platform.OS === 'ios';
}