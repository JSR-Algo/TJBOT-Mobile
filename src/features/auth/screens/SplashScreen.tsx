import React from 'react';
import { Image, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ROUTES, type RootStackParamList } from '@/navigation/routes';
import ScreenShell from '@/components/ScreenShell';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { referenceColors, referenceImages, referenceShadow } from '@/design-system/referenceTheme';

type Props = NativeStackScreenProps<RootStackParamList, 'SplashScreen'>;

export default function SplashScreen({ navigation }: Props) {
  React.useEffect(() => {
    const t = setTimeout(() => navigation.navigate(ROUTES.WelcomeScreen), 1700);
    return () => clearTimeout(t);
  }, [navigation]);

  return (
    <ScreenShell bg={referenceColors.bg}>
      <Box style={StyleSheet.absoluteFillObject} alignItems="center" justifyContent="center" gap={20}>
        <Image
          source={referenceImages.tjbotLogo}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="TJBot Future Tech"
          accessibilityIgnoresInvertColors
        />
        <Text fontWeight="600" style={styles.tagline}>Voice English for kids</Text>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  logo: { width: 280, height: 271, borderRadius: 36, ...referenceShadow.card },
  tagline: { fontSize: 15, color: referenceColors.inkSoft },
});
