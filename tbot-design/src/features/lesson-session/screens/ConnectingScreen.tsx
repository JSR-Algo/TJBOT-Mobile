import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import WaveBars from '@/design-system/components/WaveBars';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';

type Props = NativeStackScreenProps<RootStackParamList, 'ConnectingScreen'>;

export default function ConnectingScreen({ navigation }: Props) {
  React.useEffect(() => {
    const t = setTimeout(() => navigation.navigate('GreetingScreen'), 1800);
    return () => clearTimeout(t);
  }, []);

  return (
    <ScreenShell bg="#E8F4FF">
      <Box style={StyleSheet.absoluteFillObject} alignItems="center" justifyContent="center" gap={28}>
        <Robot emotion="curious" size={220} />
        <Text fontWeight="700" style={styles.title}>Tuning in…</Text>
        <WaveBars color="#6FC1FF" height={28} count={10} />
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, color: '#1A1A1F' },
});
