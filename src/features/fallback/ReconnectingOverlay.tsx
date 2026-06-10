import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import ScreenShell from '@/components/ScreenShell';
import Robot from '@/design-system/components/Robot';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';
import { useAppLanguage } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'ReconnectingOverlay'>;

export default function ReconnectingOverlay({ navigation, route }: Props) {
  const { t } = useAppLanguage();
  const maxAttempts = Math.max(1, route.params?.maxAttempts ?? 3);
  const attempt = Math.min(Math.max(1, route.params?.attempt ?? 1), maxAttempts);
  const failureTarget = route.params?.failureTarget ?? ROUTES.HelpFaqScreen;

  React.useEffect(() => {
    const t = setTimeout(() => {
      if (attempt >= maxAttempts) {
        if (failureTarget === ROUTES.HomeHubScreen) {
          navigation.navigate(ROUTES.HomeHubScreen);
        } else {
          navigation.navigate(ROUTES.HelpFaqScreen);
        }
      } else {
        navigation.navigate(ROUTES.HomeHubScreen);
      }
    }, 2400);
    return () => clearTimeout(t);
  }, [attempt, failureTarget, maxAttempts, navigation]);

  return (
    <ScreenShell testID="reconnectingOverlay">
      <Box style={[StyleSheet.absoluteFillObject, styles.bgHint]} opacity={0.35}>
        <Robot emotion="idle" size={180} />
      </Box>

      <Box style={[StyleSheet.absoluteFillObject, styles.dimmer]} />

      <Box style={styles.card} alignItems="center" gap={14}>
        <Robot emotion="worry" size={140} accent="#6B4A9B" />
        <Text fontWeight="800" style={styles.cardTitle}>I'm trying to connect again…</Text>
        <Text style={styles.attemptText}>Attempt {attempt} of {maxAttempts}</Text>
        <Text style={styles.cardBody}>Your lesson is still here. You can wait, or stop and go home.</Text>
        <Box flexDirection="row" gap={6} marginTop={2}>
          {[0, 1, 2].map(i => (
            <Box key={i} style={styles.dot} />
          ))}
        </Box>
        <TouchableOpacity
          testID="reconnectingStopHomeCta"
          onPress={() => navigation.navigate(ROUTES.HomeHubScreen)}
          style={styles.homeBtn}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('Stop reconnecting and go home')}
        >
          <Text fontWeight="700" style={{ fontSize: 14, color: '#5C4F77' }}>Stop and go home</Text>
        </TouchableOpacity>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  bgHint: { alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' },
  dimmer: { backgroundColor: 'rgba(43,33,64,0.45)' },
  card: {
    position: 'absolute', left: 24, right: 24,
    top: '50%', transform: [{ translateY: -160 }],
    backgroundColor: '#fff', borderRadius: 28, padding: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.25, shadowRadius: 60,
    elevation: 10,
  },
  cardTitle: { fontSize: 22, color: '#2B2140', textAlign: 'center' },
  attemptText: { fontSize: 13, color: '#5C4F77', textAlign: 'center' },
  cardBody: { fontSize: 14, color: '#5C4F77', textAlign: 'center', lineHeight: 20 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#6B4A9B' },
  homeBtn: { marginTop: 6, backgroundColor: 'transparent' },
});
