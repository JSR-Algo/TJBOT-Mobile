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

type Props = NativeStackScreenProps<RootStackParamList, 'VoiceFailedScreen'>;

export default function VoiceFailedScreen({ navigation }: Props) {
  return (
    <ScreenShell bg="#FFF1DA">
      <TopBar onBack={() => navigation.navigate('HomeHubScreen')} />
      <Box style={[StyleSheet.absoluteFillObject, styles.content]} alignItems="center" justifyContent="center">
        <Robot emotion="gentle" size={220} accent="#FFC857" />
        <SpeechBubble>My voice got tangled up.{'\n'}Let's start the lesson fresh.</SpeechBubble>
      </Box>
      <Box style={styles.cta} gap={10}>
        <PrimaryCTA color="#FF6F61" onPress={() => navigation.navigate('LessonResumeScreen')}>Pick up where we left off</PrimaryCTA>
        <TouchableOpacity onPress={() => navigation.navigate('HomeHubScreen')} activeOpacity={0.7}>
          <Text fontWeight="700" style={{ fontSize: 16, color: '#5C4F77', textAlign: 'center' }}>Back home</Text>
        </TouchableOpacity>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 100, paddingBottom: 220, paddingHorizontal: 24, gap: 18 },
  cta: { position: 'absolute', left: 24, right: 24, bottom: 48 },
});
