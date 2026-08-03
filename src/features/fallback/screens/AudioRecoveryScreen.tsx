import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Icon } from '@/design-system/icons';
import { referenceColors, referenceShadow } from '@/design-system/referenceTheme';
import { ROUTES } from '@/navigation/routes';
import { useAppLanguage } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'AudioRecoveryScreen'>;

const STEPS = [
  { n: 1, title: 'Open device Settings', body: 'Leave the app and open Settings on this device.' },
  { n: 2, title: 'Find Robot English', body: 'Scroll to find the Robot English app in your installed apps.' },
  { n: 3, title: 'Allow Microphone', body: 'Toggle Microphone on. Then return to the app.' },
] as const;

export default function AudioRecoveryScreen({ navigation }: Props) {
  const { t } = useAppLanguage();
  return (
    <DeviceShell title="Microphone access" onBack={() => navigation.navigate(ROUTES.MicMissingScreen)}>
      <Box paddingHorizontal={20} paddingTop={18}>
        <Box style={styles.heroCard} alignItems="center">
          <Box style={styles.micIcon} alignItems="center" justifyContent="center">
            <Icon name="Mic2" size={30} color={referenceColors.primary} strokeWidth={2.3} />
          </Box>
          <Text fontWeight="800" style={styles.heading}>Microphone access is needed for speaking practice.</Text>
          <Text style={styles.sub}>
            The mic only turns on during a lesson. No recordings are saved. Follow these steps to enable it on this device.
          </Text>
        </Box>
      </Box>

      <Box paddingHorizontal={20} paddingTop={18} paddingBottom={4}>
        <Box style={styles.card} overflow="hidden">
          {STEPS.map(s => (
            <Box key={s.n} flexDirection="row" gap={14} style={styles.step}>
              <Box style={styles.stepNum} alignItems="center" justifyContent="center">
                <Text fontWeight="800" style={styles.stepNumber}>{s.n}</Text>
              </Box>
              <Box flex={1}>
                <Text fontWeight="800" style={styles.stepTitle}>{s.title}</Text>
                <Text style={styles.stepBody}>{s.body}</Text>
              </Box>
            </Box>
          ))}
          <Box paddingHorizontal={14} paddingVertical={12} flexDirection="row" gap={14}>
            <Box width={28} />
            <Text style={styles.autoDetect}>
              We'll detect the change automatically and your child can keep going.
            </Text>
          </Box>
        </Box>
      </Box>

      <Box paddingHorizontal={20} paddingTop={18} gap={10} paddingBottom={24}>
        <DeviceBigBtn
          secondary
          disabled
          accessibilityLabel={t('Open device Settings, Unavailable')}
        >
          Open device Settings
        </DeviceBigBtn>
        <DeviceBigBtn onClick={() => navigation.navigate(ROUTES.HomeHubScreen)}>
          Back to play area
        </DeviceBigBtn>
        <DeviceBigBtn
          secondary
          onClick={() => navigation.navigate(ROUTES.HelpFaqScreen)}
          accessibilityLabel={t('Need help?')}
        >
          Need help?
        </DeviceBigBtn>
      </Box>

      <Text style={styles.footer}>
        No lesson transcript is shown in this version. Your child's voice is processed in real time and not stored.
      </Text>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: referenceColors.card,
    borderColor: referenceColors.line,
    borderRadius: 26,
    borderWidth: 1,
    padding: 22,
    ...referenceShadow.card,
  },
  micIcon: { width: 62, height: 62, borderRadius: 22, backgroundColor: referenceColors.primarySoft },
  heading: {
    fontSize: 19,
    color: referenceColors.ink,
    marginTop: 16,
    marginBottom: 7,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  sub: { fontSize: 14, color: referenceColors.inkSoft, lineHeight: 21, textAlign: 'center' },
  card: {
    backgroundColor: referenceColors.card,
    borderWidth: 1,
    borderColor: referenceColors.line,
    borderRadius: 22,
  },
  step: { padding: 14, borderBottomWidth: 1, borderBottomColor: referenceColors.line },
  stepNum: { width: 30, height: 30, borderRadius: 15, backgroundColor: referenceColors.primarySoft, flexShrink: 0 },
  stepNumber: { fontSize: 13, color: referenceColors.primaryDeep },
  stepTitle: { fontSize: 15, color: referenceColors.ink, marginBottom: 2 },
  stepBody: { fontSize: 13, color: referenceColors.inkSoft, lineHeight: 19 },
  autoDetect: { fontSize: 13, color: referenceColors.inkSoft, lineHeight: 19, flex: 1 },
  footer: {
    fontSize: 12,
    color: referenceColors.inkMuted,
    lineHeight: 18,
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
});
