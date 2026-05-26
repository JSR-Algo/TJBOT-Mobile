import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import LessonHeader from '@/components/LessonHeader';
import SpeechBubble from '@/design-system/components/SpeechBubble';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'ReconnectingScreen'>;

export default function ReconnectingScreen({ navigation }: Props) {
  return (
    <ScreenShell bg="#E8E5F0">
      <Box accessible accessibilityLabel="Reconnecting to Robot voice" flex={1}>
        <LessonHeader progress={0.34} onExit={() => navigation.navigate(ROUTES.ExitConfirmScreen)} />
        <Box style={[StyleSheet.absoluteFillObject, styles.center]} alignItems="center" gap={20}>
          <Robot emotion="worry" size={220} accent="#9B8FB8" />
          <SpeechBubble>One sec — finding my voice again.</SpeechBubble>
          <Box flexDirection="row" gap={6}>
            {[0, 1, 2].map(i => (
              <Box key={i} style={styles.thinkDot} />
            ))}
          </Box>
        </Box>
        <Box style={styles.footer}>
          <TouchableOpacity
            accessibilityLabel="Wait with Robot"
            accessibilityRole="button"
            style={styles.waitBtn}
            onPress={() => { /* no-op — resume must come from server */ }}
          >
            <Text fontWeight="700" style={styles.waitText}>Wait with Robot</Text>
          </TouchableOpacity>
        </Box>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { paddingTop: 120, paddingHorizontal: 24, paddingBottom: 200 },
  thinkDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#9B8FB8' },
  footer: { position: 'absolute', left: 24, right: 24, bottom: 48 },
  waitBtn: { width: '100%', minHeight: 60, borderRadius: 16, borderWidth: 2, borderColor: 'rgba(0,0,0,0.1)', alignItems: 'center', justifyContent: 'center' },
  waitText: { fontSize: 18, color: 'rgba(0,0,0,0.5)' },
});
