import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import ScreenShell from '@/components/ScreenShell';
import TopBar from '@/components/TopBar';
import Robot from '@/design-system/components/Robot';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import SpeechBubble from '@/design-system/components/SpeechBubble';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';

type Props = NativeStackScreenProps<RootStackParamList, 'MicMissingScreen'>;

export default function MicMissingScreen({ navigation }: Props) {
  return (
    <ScreenShell bg="#FFE5DC">
      <TopBar onBack={() => navigation.navigate('HomeHubScreen')} />
      <Box style={[StyleSheet.absoluteFillObject, styles.content]} alignItems="center" justifyContent="center">
        <Robot emotion="sad" size={220} accent="#FF6F61" />
        <SpeechBubble>Hmm, I can't hear yet.{'\n'}Let's check the microphone.</SpeechBubble>
        <Box style={styles.hint}>
          <Text fontWeight="700" style={{ fontSize: 15, color: '#5C4F77', textAlign: 'center', lineHeight: 21 }}>
            A grown-up can turn on the microphone in Settings.
          </Text>
        </Box>
      </Box>
      <Box style={styles.cta} gap={10}>
        <PrimaryCTA color="#FF6F61" onPress={() => navigation.navigate('AudioRecoveryScreen')}>Get a grown-up</PrimaryCTA>
        <TouchableOpacity onPress={() => navigation.navigate('HomeHubScreen')} activeOpacity={0.7}>
          <Text fontWeight="700" style={{ fontSize: 16, color: '#5C4F77', textAlign: 'center' }}>Back home</Text>
        </TouchableOpacity>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 100, paddingBottom: 220, paddingHorizontal: 24, gap: 18 },
  hint: { backgroundColor: '#fff', padding: 18, borderRadius: 20, maxWidth: 300 },
  cta: { position: 'absolute', left: 24, right: 24, bottom: 48 },
});
