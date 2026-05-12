import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { DV } from '@/components/Device-tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'PairWifiPasswordScreen'>;

export default function PairWifiPasswordScreen({ navigation }: Props) {
  return (
    <DeviceShell title="Casa-Familia" onBack={() => navigation.navigate('PairWifiScreen')}>
      <Box paddingHorizontal={20} paddingTop={18}>
        <Text style={styles.intro}>
          Enter the Wi-Fi password. Robot will remember it — your child won't need to.
        </Text>
      </Box>
      <Box paddingHorizontal={16} paddingTop={18}>
        <Box style={styles.pwCard}>
          <Text fontWeight="600" style={styles.pwLabel}>Password</Text>
          <Text style={styles.pwDots}>•••••••••</Text>
        </Box>
      </Box>
      <Box paddingHorizontal={20} paddingTop={12} flexDirection="row" alignItems="center" gap={10}>
        <Box style={styles.checkBox} alignItems="center" justifyContent="center">
          <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
            <Path d="M5 12l5 5 9-10" />
          </Svg>
        </Box>
        <Text style={styles.showPw}>Show password</Text>
      </Box>
      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30} gap={10}>
        <DeviceBigBtn onClick={() => navigation.navigate('PairConnectingScreen')}>Connect Robot</DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 14, color: DV.ink2, lineHeight: 22 },
  pwCard: { backgroundColor: DV.card, borderWidth: 1, borderColor: DV.hair, borderRadius: 12, padding: 14 },
  pwLabel: { fontSize: 11, color: DV.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  pwDots: { fontSize: 18, color: DV.ink, letterSpacing: 2 },
  checkBox: { width: 18, height: 18, borderRadius: 4, backgroundColor: DV.accent },
  showPw: { fontSize: 13, color: DV.ink2 },
});
