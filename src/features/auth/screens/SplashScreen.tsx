import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ROUTES, type RootStackParamList } from '@/navigation/routes';
import ScreenShell from '@/components/ScreenShell';
import RobotImage from '@/components/RobotImage';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { referenceColors } from '@/design-system/referenceTheme';

type Props = NativeStackScreenProps<RootStackParamList, 'SplashScreen'>;

export default function SplashScreen({ navigation }: Props) {
  React.useEffect(() => {
    const t = setTimeout(() => navigation.navigate(ROUTES.WelcomeScreen), 1700);
    return () => clearTimeout(t);
  }, [navigation]);

  return (
    <ScreenShell bg={referenceColors.bg}>
      <Box style={StyleSheet.absoluteFillObject} alignItems="center" justifyContent="center" gap={20}>
        <Box style={styles.mascotStage} alignItems="center" justifyContent="center">
          <Box pointerEvents="none" style={styles.mascotGlow} />
          <RobotImage variant="body" size={224} accessibilityLabel="TeeBot robot" />
        </Box>
        <Text i18n={false} fontWeight="800" style={styles.wordmark}>TeeBot</Text>
        <Text fontWeight="600" style={styles.tagline}>Voice English for kids</Text>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  mascotStage: { width: 252, height: 252 },
  mascotGlow: {
    position: 'absolute',
    width: 224,
    height: 224,
    borderRadius: 112,
    backgroundColor: referenceColors.primarySoft,
  },
  wordmark: { marginTop: -8, fontSize: 36, lineHeight: 42, color: referenceColors.ink },
  tagline: { fontSize: 15, color: referenceColors.inkSoft },
});
