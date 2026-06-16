import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { DV } from '@/components/Device-tokens';
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'PairFailedScreen'>;

type GoScreen =
  | typeof ROUTES.PairIntroScreen
  | typeof ROUTES.PairWifiPasswordScreen
  | typeof ROUTES.PairSearchScreen;

const REASONS: { ic: string; t: string; b: string; go: GoScreen }[] = [
  { ic: '🔋', t: 'Robot looks asleep', b: 'Hold the top button until you hear a chime.', go: ROUTES.PairIntroScreen },
  { ic: '📶', t: 'Wrong Wi-Fi password', b: 'Try entering it again — common typos: O vs 0.', go: ROUTES.PairWifiPasswordScreen },
  { ic: '📡', t: 'Robot is too far', b: 'Bring Robot within 1–2 m of your phone.', go: ROUTES.PairSearchScreen },
  { ic: '🔌', t: 'Battery is low', b: 'Plug Robot in for 5 minutes, then try again.', go: ROUTES.PairIntroScreen },
];

export default function PairFailedScreen({ navigation, route }: Props) {
  const params = route.params;
  const error = typeof params?.error === 'string' && params.error.trim() ? params.error.trim() : null;
  const errorCode = params?.errorCode;

  const reasons = React.useMemo(() => {
    if (errorCode === 'E-PROV-001') {
      // BLE timeout / connect failure — Wi-Fi password recovery is not relevant.
      return REASONS.filter((r) => r.t !== 'Wrong Wi-Fi password');
    }
    return REASONS;
  }, [errorCode]);

  return (
    <DeviceShell title="Pairing didn't work" onBack={() => navigation.navigate(ROUTES.PairIntroScreen)}>
      <Box paddingTop={30} paddingHorizontal={24} alignItems="center">
        <RobotDevice emotion="gentle" size={160} accent="#FF6F61" />
        <Text fontWeight="600" style={styles.heading}>We couldn't reach your Robot</Text>
        <Text style={styles.sub}>
          No worries — pairing usually works on the second try. Pick what likely happened:
        </Text>
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}
      </Box>
      <Box paddingHorizontal={16} paddingTop={20} gap={8}>
        {reasons.map(r => (
          <TouchableOpacity
            key={r.t}
            style={styles.reasonCard}
            activeOpacity={0.7}
            onPress={() => {
              if (r.go === ROUTES.PairWifiPasswordScreen) {
                if (params) navigation.navigate(ROUTES.PairWifiPasswordScreen, params);
                else navigation.navigate(ROUTES.PairWifiPasswordScreen);
                return;
              }
              if (r.go === ROUTES.PairSearchScreen) {
                navigation.navigate(ROUTES.PairSearchScreen);
                return;
              }
              navigation.navigate(ROUTES.PairIntroScreen);
            }}
            accessibilityRole="button"
            accessibilityLabel={r.t === 'Wrong Wi-Fi password' ? 'Fix wrong Wi-Fi password' : r.t}
          >
            <Box style={styles.reasonIcon} alignItems="center" justifyContent="center">
              <Text style={{ fontSize: 16 }}>{r.ic}</Text>
            </Box>
            <Box flex={1}>
              <Text fontWeight="600" style={styles.reasonTitle}>{r.t}</Text>
              <Text style={styles.reasonBody}>{r.b}</Text>
            </Box>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={DV.ink3} strokeWidth="2.5" strokeLinecap="round">
              <Path d="M9 6l6 6-6 6" />
            </Svg>
          </TouchableOpacity>
        ))}
      </Box>
      <Box paddingHorizontal={20} paddingTop={20} paddingBottom={30}>
        <DeviceBigBtn secondary onClick={() => navigation.navigate(ROUTES.PairSearchScreen)}>Try again</DeviceBigBtn>
        <DeviceBigBtn
          secondary
          accessibilityLabel="Contact support"
          onClick={() => navigation.navigate(ROUTES.SupportScreen, {
            context: { topic: 'wifi', errorFamily: 'robot_offline' },
          })}
        >
          Contact support
        </DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 20, color: DV.ink, letterSpacing: -0.3, textAlign: 'center', marginTop: 20 },
  sub: { fontSize: 13, color: DV.ink2, textAlign: 'center', maxWidth: 300, lineHeight: 22, marginTop: 6 },
  errorText: { fontSize: 12, color: '#C0392B', textAlign: 'center', maxWidth: 300, lineHeight: 18, marginTop: 8 },
  reasonCard: { backgroundColor: DV.card, borderWidth: 1, borderColor: DV.hair, borderRadius: 12, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' },
  reasonIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#EEF1F5', flexShrink: 0 },
  reasonTitle: { fontSize: 14, color: DV.ink },
  reasonBody: { fontSize: 12, color: DV.ink2, marginTop: 2, lineHeight: 20 },
});
