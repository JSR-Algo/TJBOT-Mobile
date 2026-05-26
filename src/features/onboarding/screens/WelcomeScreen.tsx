import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { ROUTES } from '@/navigation/routes';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { legacyNavigate } from '../legacyNavigation';

type Props = NativeStackScreenProps<RootStackParamList, 'WelcomeScreen'>;

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <ScreenShell bg="#F8F6F1">
      <Box style={styles.content} alignItems="center">
        <Robot emotion="greet" size={200} />
        <Text fontWeight="800" style={styles.heroTitle}>Hi! I'm Robot.{'\n'}I help kids talk in English.</Text>
        <Box style={styles.parentNote} flexDirection="row" alignItems="center" gap={10}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <Circle cx="12" cy="8" r="4" />
            <Path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
          </Svg>
          <Text fontWeight="600" style={styles.parentText}>A grown-up sets things up the first time.</Text>
        </Box>
      </Box>
      <Box style={styles.footer} gap={10}>
        <PrimaryCTA onPress={() => legacyNavigate(navigation, ROUTES.IntroListenScreen)} color="#FF6F61">Get started</PrimaryCTA>
        <TouchableOpacity onPress={() => legacyNavigate(navigation, ROUTES.LoginScreen)}>
          <Text fontWeight="700" style={styles.loginText}>I already have an account</Text>
        </TouchableOpacity>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, paddingTop: 120, paddingHorizontal: 28, paddingBottom: 230 },
  heroTitle: { fontSize: 34, color: '#1A1A1F', textAlign: 'center', marginTop: 14, lineHeight: 38, letterSpacing: -0.4 },
  parentNote: { marginTop: 22, backgroundColor: 'rgba(255,255,255,0.7)', padding: 14, borderRadius: 14, maxWidth: 300 },
  parentText: { fontSize: 13, color: 'rgba(0,0,0,0.5)', flex: 1 },
  footer: { position: 'absolute', left: 24, right: 24, bottom: 48 },
  loginText: { fontSize: 15, color: 'rgba(0,0,0,0.5)', textAlign: 'center', padding: 8 },
});
