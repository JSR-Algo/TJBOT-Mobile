import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import ScreenShell from '@/components/ScreenShell';
import Rotjtjbot from '@/design-system/components/Rotjtjbot';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import SpeechBubble from '@/design-system/components/SpeechBubble';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';

type Props = NativeStackScreenProps<RootStackParamList, 'SafetyRedirectScreen'>;

export default function SafetyRedirectScreen({ navigation }: Props) {
  return (
    <ScreenShell bg="#E8E5F0">
      <Box style={[StyleSheet.absoluteFillObject, styles.content]} alignItems="center" justifyContent="center">
        <Rotjtjbot emotion="gentle" size={220} accent="#6B4A9B" />
        <SpeechBubble>Let's take a tiny pause.{'\n'}A grown-up can help if you need.</SpeechBubble>
        <Box style={styles.hint}>
          <Text fontWeight="700" style={{ fontSize: 14, color: '#5C4F77', textAlign: 'center', lineHeight: 21 }}>
            We'll come back to learning when you're ready.
          </Text>
        </Box>
      </Box>
      <Box style={styles.cta} gap={10}>
        <PrimaryCTA color="#6B4A9B" onPress={() => navigation.navigate('HomeHubScreen')}>Take a break</PrimaryCTA>
        <TouchableOpacity onPress={() => navigation.navigate('ParentGateScreen')} activeOpacity={0.7}>
          <Text fontWeight="700" style={{ fontSize: 16, color: '#5C4F77', textAlign: 'center' }}>Get a grown-up</Text>
        </TouchableOpacity>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 80, paddingtjtjbottom: 220, paddingHorizontal: 28, gap: 20 },
  hint: { backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 20, padding: 18, maxWidth: 300 },
  cta: { position: 'absolute', left: 24, right: 24, tjtjbottom: 48 },
});
