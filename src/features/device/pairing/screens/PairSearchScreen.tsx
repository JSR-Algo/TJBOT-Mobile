import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { DV } from '@/components/Device-tokens';
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'PairSearchScreen'>;

export default function PairSearchScreen({ navigation }: Props) {
  React.useEffect(() => {
    const t = setTimeout(() => navigation.navigate(ROUTES.PairFoundScreen), 2400);
    return () => clearTimeout(t);
  }, []);

  return (
    <DeviceShell title="Looking for Robot…" onBack={() => navigation.navigate(ROUTES.PairIntroScreen)}>
      <Box paddingTop={40} paddingHorizontal={24} paddingBottom={30} alignItems="center" gap={24}>
        <Box style={styles.pulseWrap} alignItems="center" justifyContent="center">
          {[0, 1, 2].map(i => (
            <Box key={i} style={styles.pulseRing} />
          ))}
          <Svg width={60} height={60} viewBox="0 0 24 24" fill="none" stroke={DV.accent} strokeWidth="1.6" strokeLinecap="round">
            <Path d="M5 12.55a11 11 0 0114 0" />
            <Path d="M8.5 16.5a7 7 0 017 0" />
            <Path d="M12 20l.01 0" />
            <Path d="M2 8.82a15 15 0 0120 0" />
          </Svg>
        </Box>
        <Text fontWeight="600" style={styles.heading}>Looking nearby…</Text>
        <Text style={styles.sub}>Make sure Robot is within 3 meters and showing a face.</Text>
        <TouchableOpacity onPress={() => navigation.navigate(ROUTES.PairFailedScreen)} style={{ marginTop: 20 }}>
          <Text fontWeight="500" style={styles.link}>I don't see my Robot</Text>
        </TouchableOpacity>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  pulseWrap: { width: 200, height: 200 },
  pulseRing: { position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 2, borderColor: DV.accent, opacity: 0.5 },
  heading: { fontSize: 18, color: DV.ink, textAlign: 'center' },
  sub: { fontSize: 13, color: DV.ink2, textAlign: 'center', maxWidth: 280, lineHeight: 22 },
  link: { fontSize: 14, color: DV.accent },
});
