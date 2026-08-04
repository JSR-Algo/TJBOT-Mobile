import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import { RobotImage } from '@/components/RobotImage';
import { Icon, type IconName } from '@/design-system/icons';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { gardenColors, gardenShadows } from '@/design-system/tokens';
import { ROUTES } from '@/navigation/routes';
import { useAppLanguage } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'PairSuccessScreen'>;

const TRUST_FACTS = [
  {
    icon: 'ShieldCheck',
    title: 'Robot authenticated',
    body: 'The device checked in with the cloud before setup completed.',
  },
  {
    icon: 'Wifi',
    title: 'Wi-Fi stayed transient',
    body: 'Network details were used only during setup.',
  },
  {
    icon: 'HousePlug',
    title: 'Device assigned',
    body: 'Robot is now linked to your household and child profile.',
  },
] as const satisfies ReadonlyArray<{ icon: IconName; title: string; body: string }>;

export default function PairSuccessScreen({ navigation }: Props) {
  const { t } = useAppLanguage();
  return (
    <DeviceShell title="Robot connected">
      <Box paddingTop={40} paddingHorizontal={24} alignItems="center">
        <Box
          accessible
          accessibilityLabel={t('Three setup stars earned')}
          flexDirection="row"
          gap={8}
          style={styles.stars}
        >
          {[0, 1, 2].map((star) => (
            <Icon key={star} name="Star" size={26} color={gardenColors.sun} strokeWidth={2.5} />
          ))}
        </Box>
        <View style={styles.robotWrapper}>
          <RobotImage variant="body" size={200} />
        </View>
        <Text fontWeight="600" style={styles.heading}>Your Robot is ready</Text>
        <Text style={styles.subheading}>
          Setup finished after Robot authenticated with the cloud and your account completed the provisioning attempt.
        </Text>
      </Box>
      <Box paddingHorizontal={16} paddingTop={24}>
        <Box style={styles.factCard}>
          {TRUST_FACTS.map((fact, index) => (
            <Box
              key={fact.title}
              style={[
                styles.factRow,
                index < TRUST_FACTS.length - 1 && styles.factBorder,
              ]}
              flexDirection="row"
              gap={12}
              alignItems="flex-start"
            >
              <Box style={styles.factIcon} alignItems="center" justifyContent="center">
                <Icon name={fact.icon} size={18} color={gardenColors.sky} strokeWidth={2.4} />
              </Box>
              <Box flex={1}>
                <Text fontWeight="600" style={styles.factTitle}>{fact.title}</Text>
                <Text style={styles.factBody}>{fact.body}</Text>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30} alignItems="center">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('Continue after Robot setup')}
          style={styles.ctaButton}
          onPress={() => navigation.navigate(ROUTES.PairFirstLessonScreen)}
          activeOpacity={0.8}
        >
          <Text style={styles.ctaText} fontWeight="600">Continue</Text>
        </TouchableOpacity>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  stars: {
    marginBottom: 12,
  },
  robotWrapper: {
    ...gardenShadows.card,
  },
  heading: {
    fontSize: 24,
    color: gardenColors.ink,
    textAlign: 'center',
    marginTop: 30,
    letterSpacing: -0.3,
  },
  subheading: {
    fontSize: 14,
    color: gardenColors.inkSoft,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 22,
    marginTop: 8,
  },
  factCard: {
    backgroundColor: gardenColors.paper,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: gardenColors.line,
  },
  factRow: {
    padding: 12,
  },
  factBorder: {
    borderBottomWidth: 1,
    borderBottomColor: gardenColors.line,
  },
  factIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: gardenColors.skySoft,
    flexShrink: 0,
  },
  factTitle: {
    fontSize: 13,
    color: gardenColors.ink,
  },
  factBody: {
    fontSize: 12,
    color: gardenColors.inkSoft,
    lineHeight: 20,
    marginTop: 2,
  },
  ctaButton: {
    backgroundColor: gardenColors.coral,
    borderRadius: 16,
    maxWidth: 200,
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...gardenShadows.cta,
  },
  ctaText: {
    fontSize: 16,
    color: gardenColors.paper,
  },
});
