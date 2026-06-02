import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import SpeechBubble from '@/design-system/components/SpeechBubble';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';
import { useAppLanguage } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'SafetyScreen'>;

export default function SafetyScreen({ navigation }: Props) {
  const { t } = useAppLanguage();
  return (
    <ScreenShell bg="#E8E5F0">
      <Box style={[StyleSheet.absoluteFillObject, styles.center]} alignItems="center" gap={20}>
        <Robot emotion="gentle" size={220} accent="#9B8FB8" />
        <SpeechBubble>Let's pause for a moment.{'\n'}A grown-up can help if you need.</SpeechBubble>
        <Box style={styles.helpCard} flexDirection="row" alignItems="center" gap={12}>
          <Box style={styles.shieldIcon} alignItems="center" justifyContent="center">
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="#fff">
              <Path d="M12 2a5 5 0 015 5v3a5 5 0 01-10 0V7a5 5 0 015-5zm-7 14a7 7 0 0014 0v-1H5v1z" />
            </Svg>
          </Box>
          <Text fontWeight="600" style={styles.helpText}>We can take a break or ask for a grown-up.</Text>
        </Box>
      </Box>
      <Box style={styles.footer} gap={10}>
        <PrimaryCTA onPress={() => navigation.navigate(ROUTES.HomeHubScreen)} color="#9B8FB8">Take a break</PrimaryCTA>
        <TouchableOpacity
          onPress={() => navigation.navigate(ROUTES.HomeHubScreen)}
          accessibilityRole="button"
          accessibilityLabel={t('Get a grown-up')}
        >
          <Text fontWeight="700" style={styles.grownUpText}>Get a grown-up</Text>
        </TouchableOpacity>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { paddingTop: 80, paddingHorizontal: 28, paddingBottom: 220 },
  helpCard: { backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 20, padding: 16, maxWidth: 320, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  shieldIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#9B8FB8', flexShrink: 0 },
  helpText: { fontSize: 15, color: '#1A1A1F', flex: 1 },
  footer: { position: 'absolute', left: 24, right: 24, bottom: 48 },
  grownUpText: { fontSize: 16, color: 'rgba(0,0,0,0.5)', textAlign: 'center', padding: 8 },
});
