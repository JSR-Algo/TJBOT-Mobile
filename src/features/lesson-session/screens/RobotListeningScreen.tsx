import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import RobotImage from '@/components/RobotImage';
import ScreenShell from '@/components/ScreenShell';
import LessonHeader from '@/components/LessonHeader';
import PulseRing from '@/design-system/components/PulseRing';
import MicButton from '@/components/MicButton';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';
import { getActiveNestLesson } from '../nestPhoneLesson';
import { useLessonHardwareBack } from '../hooks/useLessonHardwareBack';
import { useAppLanguage } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'RobotListeningScreen'>;

export default function RobotListeningScreen({ navigation, route }: Props) {
  // Android hardware-back during this active voice turn must funnel through
  // ExitConfirm, not silently pop the stack (MOB-2).
  useLessonHardwareBack(navigation, 'LISTENING');
  const { t } = useAppLanguage();
  const activityIndex = route.params?.activityIndex ?? 1;
  const word = getActiveNestLesson()?.session.session_payload?.core_learning?.[activityIndex - 1]?.word ?? 'word';
  return (
    <ScreenShell>
      <Box flex={1}>
      <LessonHeader progress={0.3} onExit={() => navigation.navigate(ROUTES.ExitConfirmScreen, route.params)} />
      <Box
        style={[StyleSheet.absoluteFillObject, styles.center]}
        alignItems="center"
        accessible
        accessibilityLabel={t('Robot is listening')}
      >
        <Text fontWeight="800" style={styles.yourTurn}>Your turn!</Text>
        <Text fontWeight="600" style={styles.prompt}>Say: <Text i18n={false} fontWeight="700" style={{ color: '#1A1A1F' }}>"{word}"</Text></Text>
        <Box style={styles.pulseWrap} alignItems="center" justifyContent="center">
          <PulseRing size={240} color="#FF6F61" />
          <Box style={StyleSheet.absoluteFillObject} alignItems="center" justifyContent="center">
            <RobotImage variant="head" size={150} />
          </Box>
        </Box>
      </Box>
      <Box style={styles.footer} alignItems="center" gap={14}>
        <MicButton on onClick={() => navigation.navigate(ROUTES.UserSpeakingScreen, route.params)} label="speak now" />
        <Text fontWeight="700" style={styles.listeningText}>I'm listening…</Text>
      </Box>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { paddingTop: 120, paddingHorizontal: 24, paddingBottom: 240 },
  yourTurn: { fontSize: 30, color: '#FF6F61', marginBottom: 6 },
  prompt: { fontSize: 18, color: 'rgba(0,0,0,0.5)', marginBottom: 24 },
  pulseWrap: { width: 280, height: 280 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 60 },
  listeningText: { fontSize: 15, color: 'rgba(0,0,0,0.5)' },
});
