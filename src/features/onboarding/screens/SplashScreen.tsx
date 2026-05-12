import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';

type Props = NativeStackScreenProps<RootStackParamList, 'SplashScreen'>;

export default function SplashScreen({ navigation }: Props) {
  React.useEffect(() => {
    const t = setTimeout(() => navigation.navigate('WelcomeScreen'), 1700);
    return () => clearTimeout(t);
  }, []);

  return (
    <ScreenShell bg="#F8F6F1">
      <Box style={StyleSheet.absoluteFillObject} alignItems="center" justifyContent="center" gap={18}>
        <Robot emotion="happy" size={220} />
        <Text fontWeight="800" style={styles.wordmark}>Robot</Text>
        <Text fontWeight="600" style={styles.tagline}>Voice English for kids</Text>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  wordmark: { fontSize: 48, color: '#1A1A1F', letterSpacing: -0.5 },
  tagline: { fontSize: 15, color: 'rgba(0,0,0,0.5)' },
});
