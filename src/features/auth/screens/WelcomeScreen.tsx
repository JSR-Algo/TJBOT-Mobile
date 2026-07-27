import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ROUTES, type RootStackParamList } from '@/navigation/routes';
import ScreenShell from '@/components/ScreenShell';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { Pressable } from '@/design-system/primitives/Pressable';
import { referenceShadow } from '@/design-system/referenceTheme';
import OnboardingClayRobot from '@/features/onboarding/components/OnboardingClayRobot';

type Props = NativeStackScreenProps<RootStackParamList, 'WelcomeScreen'>;

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <ScreenShell bg="#E0F7FA" gradient={false} testID="welcomeScreen">
      <Box pointerEvents="none" style={styles.glowTop} />
      <Box pointerEvents="none" style={styles.glowBottom} />

      <Box style={styles.content} alignItems="center">
        <OnboardingClayRobot size={256} testID="welcome-clay-robot" />

        <Box style={styles.speechBubble} flexDirection="row" alignItems="center" gap={8}>
          <Box pointerEvents="none" style={styles.speechTail} />
          <Text fontWeight="800" style={styles.speechText}>Hello! I'm Tee.</Text>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="#FF6B6B">
            <Path d="m12 2 1.55 5.45L19 9l-5.45 1.55L12 16l-1.55-5.45L5 9l5.45-1.55L12 2Zm7 13 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />
          </Svg>
        </Box>

        <Box style={styles.heroCopy} alignItems="center">
          <Text fontWeight="800" style={styles.heroTitle}>Let's learn English together!</Text>
          <Text fontWeight="700" style={styles.subtitle}>A little every day, and you'll speak English fluently.</Text>
          <Text i18n={false} style={styles.decorativeStar}>★</Text>
        </Box>
      </Box>

      <Box style={styles.footer} gap={18}>
        <PrimaryCTA
          onPress={() => navigation.navigate(ROUTES.IntroListenScreen)}
          color="#FF6B6B"
          testID="getStartedButton"
        >
          Get started
        </PrimaryCTA>
        <Pressable
          haptic
          onPress={() => navigation.navigate(ROUTES.LoginScreen)}
          accessibilityLabel="Already have an account? Sign in"
          testID="signInButton"
          style={styles.signInButton}
        >
          <Text fontWeight="800" style={styles.signInText}>Already have an account? Sign in</Text>
        </Pressable>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  glowTop: {
    position: 'absolute',
    top: -90,
    right: -90,
    width: 256,
    height: 256,
    borderRadius: 128,
    backgroundColor: 'rgba(255,255,255,0.42)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -90,
    left: -90,
    width: 256,
    height: 256,
    borderRadius: 128,
    backgroundColor: 'rgba(255,255,255,0.42)',
  },
  content: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 76,
    paddingHorizontal: 28,
  },
  speechBubble: {
    position: 'relative',
    marginTop: 2,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
    ...referenceShadow.card,
  },
  speechTail: {
    position: 'absolute',
    bottom: -7,
    left: '50%',
    width: 16,
    height: 16,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
  },
  speechText: {
    color: '#2D3436',
    fontSize: 14,
    lineHeight: 19,
  },
  heroCopy: {
    marginTop: 34,
    maxWidth: 340,
  },
  heroTitle: {
    color: '#2D3436',
    fontSize: 36,
    lineHeight: 40,
    textAlign: 'center',
  },
  subtitle: {
    color: '#636E72',
    fontSize: 17,
    lineHeight: 25,
    textAlign: 'center',
    marginTop: 14,
    paddingHorizontal: 4,
  },
  decorativeStar: {
    color: 'rgba(255,107,107,0.32)',
    fontSize: 24,
    lineHeight: 28,
    marginTop: 12,
  },
  footer: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 42,
  },
  signInButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInText: {
    color: '#FF6B6B',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
