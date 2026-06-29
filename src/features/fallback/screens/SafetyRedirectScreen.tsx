import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import ScreenShell from '@/components/ScreenShell';
import Robot from '@/design-system/components/Robot';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import SpeechBubble from '@/design-system/components/SpeechBubble';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';
import { useAppLanguage } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'SafetyRedirectScreen'>;

export default function SafetyRedirectScreen({ navigation }: Props) {
  const { t } = useAppLanguage();
  return (
    <ScreenShell bg="#E8E5F0">
      <Box style={[StyleSheet.absoluteFillObject, styles.content]} alignItems="center" justifyContent="center">
        <Robot emotion="gentle" size={220} accent="#6B4A9B" />
        <SpeechBubble>Let's take a tiny pause.{'\n'}A grown-up can help if you need.</SpeechBubble>
        <Box style={styles.hint}>
          <Text fontWeight="700" style={{ fontSize: 14, color: '#5C4F77', textAlign: 'center', lineHeight: 21 }}>
            Your place is saved. A grown-up can help, or you can take a break.
          </Text>
        </Box>
      </Box>
      <Box style={styles.cta} gap={10}>
        <PrimaryCTA color="#6B4A9B" onPress={() => navigation.navigate(ROUTES.HomeHubScreen)} accessibilityLabel="Back to home">Take a break</PrimaryCTA>
        <TouchableOpacity
          onPress={() => navigation.navigate(ROUTES.HelpFaqScreen)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('Need help?')}
        >
          <Text fontWeight="700" style={{ fontSize: 16, color: '#5C4F77', textAlign: 'center' }}>Need help?</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate(ROUTES.ParentGateScreen, { next: ROUTES.ParentSummaryScreen })}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('Get a grown-up')}
        >
          <Text fontWeight="700" style={{ fontSize: 16, color: '#5C4F77', textAlign: 'center' }}>Get a grown-up</Text>
        </TouchableOpacity>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 80, paddingBottom: 220, paddingHorizontal: 28, gap: 20 },
  hint: { backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 20, padding: 18, maxWidth: 300 },
  cta: { position: 'absolute', left: 24, right: 24, bottom: 48 },
});
