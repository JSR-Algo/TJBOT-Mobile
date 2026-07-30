import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ROUTES, type RootStackParamList } from '@/navigation/routes';
import OnboardingClayRobot from '@/features/onboarding/components/OnboardingClayRobot';
import { Text } from '@/design-system/primitives/Text';
import { useAppLanguage } from '@/services/i18n/i18n';
import { referenceColors } from '@/design-system/referenceTheme';

type Props = NativeStackScreenProps<RootStackParamList, 'TrustScreen'>;
type PromiseKind = 'ads' | 'data' | 'content';

const COLORS = {
  background: referenceColors.bg,
  ink: referenceColors.ink,
  muted: referenceColors.inkSoft,
  primary: referenceColors.primary,
  white: '#FFFFFF',
} as const;

const PROMISES: ReadonlyArray<{
  kind: PromiseKind;
  title: string;
  body: string;
  cardColor: string;
  iconColor: string;
  iconBackground: string;
}> = [
  {
    kind: 'ads',
    title: 'No ads',
    body: 'A clean environment, never interrupted by advertising.',
    cardColor: '#FFF2F2',
    iconColor: '#FF6B6B',
    iconBackground: '#FFE2E2',
  },
  {
    kind: 'data',
    title: 'Protected data',
    body: "Your child's personal information is encrypted and protected.",
    cardColor: '#EEFBFA',
    iconColor: '#149F96',
    iconBackground: '#D8F5F2',
  },
  {
    kind: 'content',
    title: 'Content for ages 4–6',
    body: "Every lesson is designed specifically for your child's age.",
    cardColor: '#FFF9DF',
    iconColor: '#D49E00',
    iconBackground: '#FFF0B3',
  },
];

function PromiseIcon({ kind, color }: { kind: PromiseKind; color: string }): React.JSX.Element {
  if (kind === 'ads') {
    return (
      <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
        <Path d="M7.5 16.5 16.5 7.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <Path d="M9 13.8v-3.6c0-1.2 1.1-2.2 2.5-2.2H15v8h-3.5C10.1 16 9 15 9 13.8Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (kind === 'data') {
    return (
      <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
        <Rect x="5" y="10" width="14" height="10" rx="2.5" stroke={color} strokeWidth="2" />
        <Path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <Circle cx="12" cy="15" r="1.2" fill={color} />
      </Svg>
    );
  }

  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth="2" />
      <Path d="M12 7v5l3.4 2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function TrustScreen({ navigation }: Props): React.JSX.Element {
  const { t } = useAppLanguage();

  return (
    <ScrollView
      testID="trustScreen"
      style={styles.page}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity
          testID="trustBackButton"
          accessibilityRole="button"
          accessibilityLabel={t('Back')}
          onPress={() => navigation.navigate(ROUTES.IntroCelebrateScreen)}
          activeOpacity={0.78}
          style={styles.backButton}
        >
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="m15 5-7 7 7 7" stroke={COLORS.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>

        <View style={styles.progressBlock}>
          <View style={styles.progressDots}>
            <View style={styles.progressDotInactive} />
            <View style={styles.progressDotActive} />
            <View style={styles.progressDotInactive} />
          </View>
          <Text fontWeight="800" style={styles.stepLabel}>Step 2/3</Text>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.hero}>
        <OnboardingClayRobot size={126} testID="trustMascot" />
        <Text fontWeight="800" style={styles.eyebrow}>Privacy & trust</Text>
        <Text fontWeight="800" style={styles.title}>Safe for your child, peace of mind for parents</Text>
      </View>

      <View style={styles.promiseList}>
        {PROMISES.map(promise => (
          <View
            key={promise.kind}
            testID={`trustPromise-${promise.kind}`}
            style={[styles.promiseCard, { backgroundColor: promise.cardColor }]}
          >
            <View style={[styles.iconWrap, { backgroundColor: promise.iconBackground }]}>
              <PromiseIcon kind={promise.kind} color={promise.iconColor} />
            </View>
            <Text fontWeight="800" style={styles.promiseTitle}>{promise.title}</Text>
            <Text fontWeight="700" style={styles.promiseBody}>{promise.body}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        testID="trustContinueButton"
        accessibilityRole="button"
        accessibilityLabel={t('I understand, continue')}
        onPress={() => navigation.navigate(ROUTES.LoginScreen)}
        activeOpacity={0.84}
        style={styles.continueButton}
      >
        <Text fontWeight="800" style={styles.continueButtonText}>I understand, continue</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 34,
  },
  header: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  progressBlock: {
    alignItems: 'center',
    gap: 6,
  },
  progressDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressDotInactive: {
    width: 24,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(45,52,54,0.18)',
  },
  progressDotActive: {
    width: 24,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  stepLabel: {
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  headerSpacer: {
    width: 40,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 20,
  },
  eyebrow: {
    color: COLORS.primary,
    fontSize: 13,
    lineHeight: 17,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginTop: 2,
    marginBottom: 6,
  },
  title: {
    color: COLORS.ink,
    fontSize: 27,
    lineHeight: 33,
    letterSpacing: -0.35,
    textAlign: 'center',
    maxWidth: 340,
  },
  promiseList: {
    gap: 14,
  },
  promiseCard: {
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#164E63',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  iconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  promiseTitle: {
    color: COLORS.ink,
    fontSize: 16,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 4,
  },
  promiseBody: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 310,
  },
  continueButton: {
    minHeight: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    marginTop: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 4,
  },
  continueButtonText: {
    color: COLORS.white,
    fontSize: 20,
    lineHeight: 25,
    textAlign: 'center',
  },
});
