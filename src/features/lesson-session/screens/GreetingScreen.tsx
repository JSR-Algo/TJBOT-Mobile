import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import LessonHeader from '@/components/LessonHeader';
import SpeechBubble from '@/design-system/components/SpeechBubble';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import { Box } from '@/design-system/primitives/Box';
import { ROUTES } from '@/navigation/routes';
import { useAppLanguage } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'GreetingScreen'>;

export default function GreetingScreen({ navigation, route }: Props) {
  const { t } = useAppLanguage();
  return (
    <ScreenShell>
      <LessonHeader progress={0.05} onExit={() => navigation.navigate(ROUTES.ExitConfirmScreen, route.params)} />
      <Box style={[StyleSheet.absoluteFillObject, styles.center]} alignItems="center" justifyContent="center">
        <Robot emotion="greet" size={240} />
        <SpeechBubble>{t('Hi friend!')}{'\n'}{t('Ready to play with words?')}</SpeechBubble>
      </Box>
      <Box style={styles.footer}>
        <PrimaryCTA onPress={() => navigation.navigate(ROUTES.ActivityIntroScreen, route.params)} color="#7BD389">Yes, let's go!</PrimaryCTA>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { paddingTop: 120, paddingHorizontal: 24, paddingBottom: 200, gap: 20 },
  footer: { position: 'absolute', left: 24, right: 24, bottom: 48 },
});
