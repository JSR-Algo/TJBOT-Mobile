import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import LessonHeader from '@/components/LessonHeader';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';

type Props = NativeStackScreenProps<RootStackParamList, 'ThinkingScreen'>;

export default function ThinkingScreen({ navigation }: Props) {
  React.useEffect(() => {
    const t = setTimeout(() => navigation.navigate('SuccessScreen'), 1600);
    return () => clearTimeout(t);
  }, []);

  return (
    <ScreenShell bg="#E8F4FF">
      <LessonHeader progress={0.34} onExit={() => navigation.navigate('ExitConfirmScreen')} />
      <Box style={[StyleSheet.absoluteFillObject, styles.center]} alignItems="center" gap={24}>
        <Robot emotion="think" size={220} />
        <Text fontWeight="700" style={styles.thinking}>Thinking…</Text>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { paddingTop: 120, paddingHorizontal: 24, paddingBottom: 200 },
  thinking: { fontSize: 20, color: 'rgba(0,0,0,0.5)' },
});
