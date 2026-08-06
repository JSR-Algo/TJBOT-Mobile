import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import Screen from '@/components/Screen';
import TopBar from '@/components/TopBar';
import { ROUTES } from '@/navigation/routes';
import { useAppLanguage } from '@/services/i18n/i18n';
import { openAppSettings } from '@/features/device/pairing/deviceSettings';
import { decideLessonRecovery } from '@/features/fallback/recoveryTypes';

type Props = NativeStackScreenProps<RootStackParamList, 'AudioRecoveryScreen'>;

const STEPS = [
  { n: 1, title: 'Open device Settings', body: 'Leave the app and open Settings on this device.' },
  { n: 2, title: 'Find Robot English', body: 'Scroll to find the Robot English app in your installed apps.' },
  { n: 3, title: 'Allow Microphone', body: 'Toggle Microphone on. Then return to the app.' },
] as const;

export default function AudioRecoveryScreen({ navigation, route }: Props) {
  const { t } = useAppLanguage();
  const handleAudioWorking = (): void => {
    const decision = decideLessonRecovery(route.params?.checkpoint);
    if (decision.kind === 'resume' || decision.kind === 'reauth') {
      navigation.navigate(ROUTES.LessonResumeScreen, {
        checkpoint: {
          ...decision.checkpoint,
          reason: 'audio_recovered',
        },
      });
      return;
    }
    navigation.navigate(ROUTES.HomeHubScreen);
  };

  return (
    <Screen header={<TopBar title="Microphone access" onBack={() => navigation.goBack()} />} scroll>
      <Box paddingHorizontal={20} paddingTop={18} paddingBottom={8}>
        <Text fontWeight="600" style={styles.heading}>Microphone access is needed for speaking practice.</Text>
        <Text style={styles.sub}>
          The mic only turns on during a lesson. No recordings are saved. Follow these steps to enable it on this device.
        </Text>
      </Box>

      <Box paddingHorizontal={16} paddingTop={14} paddingBottom={4}>
        <Box style={styles.card} borderRadius={14} overflow="hidden">
          {STEPS.map(s => (
            <Box key={s.n} flexDirection="row" gap={14} style={styles.step}>
              <Box style={styles.stepNum} alignItems="center" justifyContent="center">
                <Text fontWeight="600" style={{ fontSize: 13, color: '#2B2140' }}>{s.n}</Text>
              </Box>
              <Box flex={1}>
                <Text fontWeight="500" style={{ fontSize: 15, color: '#2B2140', marginBottom: 2 }}>{s.title}</Text>
                <Text style={{ fontSize: 13, color: '#5C4F77', lineHeight: 19 }}>{s.body}</Text>
              </Box>
            </Box>
          ))}
          <Box paddingHorizontal={14} paddingVertical={12} flexDirection="row" gap={14}>
            <Box width={28} />
            <Text style={{ fontSize: 13, color: '#5C4F77', lineHeight: 19, flex: 1 }}>
              We'll detect the change automatically and your child can keep going.
            </Text>
          </Box>
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={12} gap={10} paddingBottom={36}>
        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.8}
          onPress={() => { void openAppSettings(); }}
          accessibilityRole="button"
          accessibilityLabel={t('Open device Settings')}
        >
          <Text fontWeight="600" style={{ fontSize: 15, color: '#fff' }}>Open device Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleAudioWorking}
          style={styles.secondaryBtn}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('Audio is working')}
        >
          <Text fontWeight="500" style={{ fontSize: 15, color: '#2B2140' }}>Audio is working</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate(ROUTES.HomeHubScreen)} style={styles.secondaryBtn} activeOpacity={0.7}>
          <Text fontWeight="500" style={{ fontSize: 15, color: '#2B2140' }}>Back to play area</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate(ROUTES.HelpFaqScreen)}
          style={styles.secondaryBtn}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('Need help?')}
        >
          <Text fontWeight="500" style={{ fontSize: 15, color: '#2B2140' }}>Need help?</Text>
        </TouchableOpacity>
      </Box>

      <Text style={styles.footer}>
        No lesson transcript is shown in this version. Your child's voice is processed in real time and not stored.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 18, color: '#2B2140', marginBottom: 6, letterSpacing: -0.2 },
  sub: { fontSize: 14, color: '#5C4F77', lineHeight: 21 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(0,0,0,0.07)' },
  step: { padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.07)' },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#EEF1F5', flexShrink: 0 },
  primaryBtn: { width: '100%', minHeight: 48, borderRadius: 10, backgroundColor: '#2A6FDB', alignItems: 'center', justifyContent: 'center' },
  secondaryBtn: { width: '100%', minHeight: 48, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(0,0,0,0.07)', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  footer: { fontSize: 12, color: '#8B8B96', lineHeight: 18, paddingHorizontal: 20, paddingBottom: 36 },
});
