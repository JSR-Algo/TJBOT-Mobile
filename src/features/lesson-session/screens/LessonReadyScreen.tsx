import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'LessonReadyScreen'>;

export default function LessonReadyScreen({ navigation }: Props) {
  return (
    <ScreenShell>
      <Box style={[StyleSheet.absoluteFillObject, styles.center]} alignItems="center">
        <Text fontWeight="600" style={styles.lessonLabel}>Today's lesson</Text>
        <Text fontWeight="800" style={styles.lessonTitle}>Animal Friends</Text>
        <Robot emotion="happy" size={240} />
        <Box style={styles.headphonesPill} flexDirection="row" alignItems="center" gap={8}>
          <Text style={{ fontSize: 18 }}>🎧</Text>
          <Text fontWeight="700" style={styles.headphonesText}>Wear headphones if you can</Text>
        </Box>
      </Box>
      <Box style={styles.footer}>
        <PrimaryCTA onPress={() => navigation.navigate(ROUTES.ConnectingScreen)} color="#FF6F61">I'm ready!</PrimaryCTA>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { paddingTop: 120, paddingHorizontal: 28, paddingBottom: 220 },
  lessonLabel: { fontSize: 18, color: 'rgba(0,0,0,0.5)', marginBottom: 6 },
  lessonTitle: { fontSize: 30, color: '#1A1A1F', marginBottom: 24 },
  headphonesPill: { marginTop: 8, backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  headphonesText: { fontSize: 14, color: 'rgba(0,0,0,0.5)' },
  footer: { position: 'absolute', left: 24, right: 24, bottom: 48 },
});
