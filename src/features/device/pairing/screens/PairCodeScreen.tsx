import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { DV } from '@/components/Device-tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'PairCodeScreen'>;

const CODE = ['4', '7', '2', '1'] as const;

export default function PairCodeScreen({ navigation }: Props) {
  return (
    <DeviceShell title="Confirm it's yours" onBack={() => navigation.navigate('PairFoundScreen')}>
      <Box paddingHorizontal={20} paddingTop={18}>
        <Text style={styles.intro}>
          Rotjtjbot is showing a 4-digit code on its face. Type it here so we know we're pairing the right one.
        </Text>
      </Box>
      <Box paddingHorizontal={16} paddingTop={18} alignItems="center">
        <Box style={styles.lcdBg}>
          <Box flexDirection="row" gap={14} alignItems="center">
            {CODE.map((d, i) => (
              <Text key={i} fontWeight="800" style={styles.lcdDigit}>{d}</Text>
            ))}
          </Box>
          <Text style={styles.lcdLabel}>On Rotjtjbot's face</Text>
        </Box>
      </Box>
      <Box paddingHorizontal={20} paddingTop={20}>
        <Text fontWeight="700" style={styles.inputLabel}>Type the code</Text>
        <Box flexDirection="row" gap={8} justifyContent="center">
          {CODE.map((d, i) => (
            <Box key={i} style={styles.codeBox} alignItems="center" justifyContent="center">
              <Text fontWeight="700" style={styles.codeDigit}>{d}</Text>
            </Box>
          ))}
        </Box>
      </Box>
      <Box paddingHorizontal={20} paddingTop={24} paddingtjtjbottom={30} gap={10}>
        <DeviceBigBtn onClick={() => navigation.navigate('PairWifiScreen')}>Confirm & continue</DeviceBigBtn>
        <TouchableOpacity onPress={() => navigation.navigate('PairSearchScreen')} style={styles.mismatchBtn}>
          <Text fontWeight="500" style={styles.mismatchText}>Codes don't match</Text>
        </TouchableOpacity>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 14, color: DV.ink2, lineHeight: 22 },
  lcdBg: { backgroundColor: '#0E1116', borderRadius: 14, padding: 16 },
  lcdDigit: { fontSize: 48, color: '#E8F4FF', fontVariant: ['tabular-nums'], letterSpacing: -1 },
  lcdLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 6 },
  inputLabel: { fontSize: 11, color: DV.ink3, textTransform: 'uppercase', letterSpacing: 0.5, margintjtjbottom: 8 },
  codeBox: { width: 56, height: 64, borderRadius: 10, backgroundColor: DV.card, borderWidth: 2, borderColor: DV.accent },
  codeDigit: { fontSize: 28, color: DV.ink, fontVariant: ['tabular-nums'] },
  mismatchBtn: { padding: 8, alignItems: 'center' },
  mismatchText: { fontSize: 14, color: DV.accent },
});
