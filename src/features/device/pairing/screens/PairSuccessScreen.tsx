import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import { RobotImage } from '@/components/RobotImage';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { gardenColors, gardenShadows } from '@/design-system/tokens';
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'PairSuccessScreen'>;

const TRUST_FACTS = [
  {
    title: 'Robot authenticated',
    body: 'The device checked in with the cloud before setup completed.',
  },
  {
    title: 'Wi-Fi stayed transient',
    body: 'Network details were used only during setup.',
  },
  {
    title: 'Device assigned',
    body: 'Robot is now linked to your household and child profile.',
  },
] as const;

export default function PairSuccessScreen({ navigation }: Props) {
  return (
    <DeviceShell title="Robot connected">
      <Box paddingTop={40} paddingHorizontal={24} alignItems="center">
        <Text style={styles.stars}>⭐⭐⭐</Text>
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
                <Text style={styles.factIconText}>
                  {index === 0 ? '✓' : index === 1 ? 'Wi' : 'ID'}
                </Text>
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
    fontSize: 32,
    letterSpacing: 6,
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
  factIconText: {
    fontSize: 16,
    color: gardenColors.ink,
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
