import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import LessonHeader from '@/components/LessonHeader';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';
import { useAppLanguage } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'ExitConfirmScreen'>;

export default function ExitConfirmScreen({ navigation }: Props) {
  const { t } = useAppLanguage();
  return (
    <ScreenShell>
      <LessonHeader progress={0.34} onExit={() => {}} />
      <Box style={styles.overlay} />
      <Box style={styles.sheet}>
        <Box style={{ marginTop: -90 }} alignItems="center">
          <Robot emotion="sad" size={140} accent="#FF6F61" />
        </Box>
        <Text fontWeight="800" style={styles.title}>Stop the lesson?</Text>
        <Text fontWeight="600" style={styles.sub}>We can finish later.</Text>
        <Box gap={12} style={{ marginTop: 22 }}>
          <PrimaryCTA onPress={() => navigation.navigate(ROUTES.RobotListeningScreen)} color="#7BD389">Keep playing</PrimaryCTA>
          <TouchableOpacity
            style={styles.stopBtn}
            onPress={() => navigation.navigate(ROUTES.HomeHubScreen)}
            accessibilityRole="button"
            accessibilityLabel={t('Stop lesson for now')}
          >
            <Text fontWeight="700" style={styles.stopText}>Stop for now</Text>
          </TouchableOpacity>
        </Box>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(43,33,64,0.45)' },
  sheet: { position: 'absolute', left: 20, right: 20, bottom: 30, backgroundColor: '#fff', borderRadius: 32, padding: 24, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 60, shadowOffset: { width: 0, height: 20 } },
  title: { fontSize: 26, color: '#1A1A1F', textAlign: 'center', marginTop: 6 },
  sub: { fontSize: 16, color: 'rgba(0,0,0,0.5)', textAlign: 'center', marginTop: 6 },
  stopBtn: { width: '100%', minHeight: 56, borderRadius: 16, borderWidth: 2, borderColor: 'rgba(0,0,0,0.08)', alignItems: 'center', justifyContent: 'center' },
  stopText: { fontSize: 18, color: 'rgba(0,0,0,0.5)' },
});
