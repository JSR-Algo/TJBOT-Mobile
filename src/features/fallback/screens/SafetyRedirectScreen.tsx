import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import ScreenShell from '@/components/ScreenShell';
import RobotImage from '@/components/RobotImage';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Icon } from '@/design-system/icons';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { referenceColors, referenceShadow } from '@/design-system/referenceTheme';
import { ROUTES } from '@/navigation/routes';
import { useAppLanguage } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'SafetyRedirectScreen'>;

export default function SafetyRedirectScreen({ navigation }: Props) {
  const { t } = useAppLanguage();
  return (
    <ScreenShell bg={referenceColors.bg} gradient={false}>
      <Box style={[StyleSheet.absoluteFillObject, styles.content]} alignItems="center" justifyContent="center">
        <Box style={styles.robotStage} alignItems="center" justifyContent="center">
          <RobotImage variant="body" size={184} />
        </Box>
        <Box style={styles.hint}>
          <Box style={styles.iconBadge} alignItems="center" justifyContent="center">
            <Icon name="HeartHandshake" size={24} color={referenceColors.primary} strokeWidth={2.3} />
          </Box>
          <Text fontWeight="800" style={styles.title}>Let's take a tiny pause.</Text>
          <Text style={styles.bubbleCopy}>A grown-up can help if you need.</Text>
          <Text fontWeight="700" style={styles.hintCopy}>
            Your place is saved. A grown-up can help, or you can take a break.
          </Text>
        </Box>
      </Box>
      <Box style={styles.cta} gap={10}>
        <DeviceBigBtn
          onClick={() => navigation.navigate(ROUTES.HomeHubScreen)}
          accessibilityLabel="Back to home"
        >
          Take a break
        </DeviceBigBtn>
        <TouchableOpacity
          onPress={() => navigation.navigate(ROUTES.HelpFaqScreen)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('Need help?')}
        >
          <Text fontWeight="800" style={styles.helpLink}>Need help?</Text>
        </TouchableOpacity>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 80, paddingBottom: 220, paddingHorizontal: 28, gap: 20 },
  robotStage: {
    width: 206,
    height: 206,
    borderRadius: 103,
    backgroundColor: referenceColors.bgWarm,
  },
  hint: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: referenceColors.card,
    borderColor: referenceColors.line,
    borderRadius: 28,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    ...referenceShadow.card,
  },
  iconBadge: { width: 50, height: 50, borderRadius: 18, backgroundColor: referenceColors.primarySoft },
  title: { fontSize: 22, color: referenceColors.ink, marginTop: 13, textAlign: 'center' },
  bubbleCopy: { fontSize: 14, color: referenceColors.inkSoft, marginTop: 4, textAlign: 'center' },
  hintCopy: {
    fontSize: 13,
    color: referenceColors.inkSoft,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 14,
  },
  cta: { position: 'absolute', left: 24, right: 24, bottom: 48 },
  helpLink: { fontSize: 15, color: referenceColors.inkSoft, textAlign: 'center', paddingVertical: 10 },
});
