import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import ScreenShell from '@/components/ScreenShell';
import TopBar from '@/components/TopBar';
import Robot from '@/design-system/components/Robot';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import SpeechBubble from '@/design-system/components/SpeechBubble';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'VoiceFailedScreen'>;

export default function VoiceFailedScreen({ navigation, route }: Props) {
  const checkpoint = route.params?.checkpoint;
  return (
    <ScreenShell bg="#FFF1DA">
      <TopBar onBack={() => navigation.navigate(ROUTES.HomeHubScreen)} />
      <Box style={[StyleSheet.absoluteFillObject, styles.content]} alignItems="center" justifyContent="center">
        <Robot emotion="gentle" size={220} accent="#FFC857" />
        <Text fontWeight="800" style={styles.title}>Robot voice paused</Text>
        <SpeechBubble>
          {checkpoint
            ? 'Your progress is safe. The voice session was interrupted.'
            : 'Progress is safe. This activity needs to start again.'}
        </SpeechBubble>
      </Box>
      <Box style={styles.cta} gap={10}>
        {checkpoint ? (
          <PrimaryCTA color="#FF6F61" onPress={() => navigation.navigate(ROUTES.LessonResumeScreen, { checkpoint })}>Resume lesson</PrimaryCTA>
        ) : null}
        <TouchableOpacity onPress={() => navigation.navigate(ROUTES.HomeHubScreen)} activeOpacity={0.7}>
          <Text fontWeight="700" style={{ fontSize: 16, color: '#5C4F77', textAlign: 'center' }}>Back home</Text>
        </TouchableOpacity>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 100, paddingBottom: 220, paddingHorizontal: 24, gap: 18 },
  title: { fontSize: 22, color: '#2B2140', textAlign: 'center' },
  cta: { position: 'absolute', left: 24, right: 24, bottom: 48 },
});
