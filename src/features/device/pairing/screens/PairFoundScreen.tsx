import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import { RotjtjbotDevice } from '@/design-system/components/LCDFace';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { DV } from '@/components/Device-tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'PairFoundScreen'>;

export default function PairFoundScreen({ navigation }: Props) {
  return (
    <DeviceShell title="We found your Rotjtjbot" onBack={() => navigation.navigate('PairIntroScreen')}>
      <Box paddingHorizontal={16} paddingTop={24}>
        <Box style={styles.card} flexDirection="row" gap={14} alignItems="center">
          <RotjtjbotDevice emotion="paired" size={84} accent="#FF6F61" />
          <Box flex={1}>
            <Text fontWeight="600" style={styles.rotjtjbotName}>Rotjtjbot · ROB-2A8F</Text>
            <Box flexDirection="row" alignItems="center" gap={6} style={{ marginTop: 2 }}>
              <Box style={styles.greenDot} />
              <Text style={styles.readyText}>Ready to pair</Text>
            </Box>
            <Text style={styles.signalText}>Signal: strong · Battery: 78%</Text>
          </Box>
        </Box>
      </Box>
      <Box paddingHorizontal={20} paddingTop={18}>
        <Text style={styles.warning}>
          Make sure this is <Text fontWeight="600" style={{ color: DV.ink }}>your</Text> Rotjtjbot before pairing.
        </Text>
      </Box>
      <Box paddingHorizontal={20} paddingTop={20} paddingtjtjbottom={30} gap={10}>
        <DeviceBigBtn onClick={() => navigation.navigate('PairCodeScreen')}>This is my Rotjtjbot</DeviceBigBtn>
        <DeviceBigBtn secondary onClick={() => navigation.navigate('PairSearchScreen')}>Search again</DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: DV.card, borderWidth: 1, borderColor: DV.hair, borderRadius: 14, padding: 16 },
  rotjtjbotName: { fontSize: 15, color: DV.ink, margintjtjbottom: 2 },
  greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: DV.good },
  readyText: { fontSize: 13, color: DV.ink2 },
  signalText: { fontSize: 12, color: DV.ink3, marginTop: 2 },
  warning: { fontSize: 13, color: DV.ink2, lineHeight: 22 },
});
