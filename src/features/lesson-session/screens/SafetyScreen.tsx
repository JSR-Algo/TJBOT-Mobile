import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import LessonHeader from '@/components/LessonHeader';
import SpeechBubble from '@/design-system/components/SpeechBubble';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import { Icon } from '@/design-system/icons';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { referenceColors, referenceShadow } from '@/design-system/referenceTheme';
import { ROUTES } from '@/navigation/routes';
import { useAppLanguage } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'SafetyScreen'>;

export default function SafetyScreen({ navigation }: Props) {
  const { t } = useAppLanguage();
  return (
    <ScreenShell bg={referenceColors.bg} gradient={false}>
      <LessonHeader progress={0.5} onExit={() => navigation.navigate(ROUTES.HomeHubScreen)} />
      <Box style={[StyleSheet.absoluteFillObject, styles.center]} alignItems="center" gap={20}>
        <Robot emotion="gentle" size={220} accent="#9B8FB8" />
        <SpeechBubble>Let's pause for a moment.{'\n'}A grown-up can help if you need.</SpeechBubble>
        <Box style={styles.helpCard} flexDirection="row" alignItems="center" gap={12}>
          <Box style={styles.shieldIcon} alignItems="center" justifyContent="center">
            <Icon name="ShieldCheck" size={24} color={referenceColors.card} strokeWidth={2.5} />
          </Box>
          <Text fontWeight="600" style={styles.helpText}>We can take a break or ask for a grown-up.</Text>
        </Box>
      </Box>
      <Box style={styles.footer} gap={10}>
        <PrimaryCTA onPress={() => navigation.navigate(ROUTES.HomeHubScreen)} color="#9B8FB8">Take a break</PrimaryCTA>
        <TouchableOpacity
          onPress={() => navigation.navigate(ROUTES.ParentGateScreen, { next: ROUTES.ParentSafetyScreen })}
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
  center: { paddingTop: 124, paddingHorizontal: 28, paddingBottom: 220 },
  helpCard: {
    backgroundColor: referenceColors.card,
    borderColor: referenceColors.line,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    maxWidth: 320,
    ...referenceShadow.card,
  },
  shieldIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: referenceColors.lavender, flexShrink: 0 },
  helpText: { fontSize: 15, color: referenceColors.ink, flex: 1 },
  footer: { position: 'absolute', left: 24, right: 24, bottom: 48 },
  grownUpText: { fontSize: 16, color: referenceColors.inkSoft, textAlign: 'center', padding: 8 },
});
