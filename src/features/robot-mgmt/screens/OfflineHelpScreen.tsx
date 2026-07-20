import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import { RotjtjbotDevice } from '@/design-system/components/LCDFace';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import RmChip from '../components/RmChip';
import { RM } from '../components/RM';

type Props = NativeStackScreenProps<RootStackParamList, 'OfflineHelpScreen'>;

const STEPS = [
  { n: 1, t: 'Is Rotjtjbot powered on?', b: "Look at the LCD face. If it's dark, place Rotjtjbot on the dock or hold the top button for 2 seconds.", cta: null },
  { n: 2, t: 'Is your Wi-Fi working?', b: 'Open another app on your phone. If that fails too, restart your router.', cta: null },
  { n: 3, t: 'Move Rotjtjbot closer', b: 'Thick walls or a far room can drop the signal. Try the same room as the router.', cta: null },
  { n: 4, t: 'Restart Rotjtjbot', b: 'Hold the top button for 5 seconds. Rotjtjbot will gently chime when it wakes up.', cta: null },
  { n: 5, t: 'Update Wi-Fi', b: 'If your password changed, give Rotjtjbot the new one.', cta: 'Update Wi-Fi' },
] as const;

export default function OfflineHelpScreen({ navigation }: Props) {
  return (
    <DeviceShell title="Rotjtjbot offline help" onBack={() => navigation.navigate('MyRotjtjbotScreen')}>
      <Box paddingTop={24} paddingHorizontal={24} alignItems="center">
        <RotjtjbotDevice emotion="reconnect" size={150} accent="#FF6F61" />
        <Box marginTop={14}><RmChip color={RM.warn} bg="#FFF4D9">⚠️ Rotjtjbot is offline</RmChip></Box>
        <Text fontWeight="600" style={styles.heading}>Let's bring Rotjtjbot back online</Text>
        <Text style={styles.sub}>Try these in order. Most parents fix it in under a minute.</Text>
      </Box>

      <Box paddingHorizontal={16} paddingTop={24} gap={10}>
        {STEPS.map(s => (
          <Box key={s.n} style={styles.stepCard} flexDirection="row" gap={12} alignItems="flex-start">
            <Box style={styles.stepNum} alignItems="center" justifyContent="center">
              <Text fontWeight="700" style={styles.stepNumText}>{s.n}</Text>
            </Box>
            <Box flex={1}>
              <Text fontWeight="600" style={styles.stepTitle}>{s.t}</Text>
              <Text style={styles.stepBody}>{s.b}</Text>
              {s.cta && (
                <TouchableOpacity onPress={() => navigation.navigate('RotjtjbotWifiScreen')} activeOpacity={0.7} style={{ marginTop: 8 }}>
                  <Text fontWeight="600" style={styles.stepCta}>{s.cta} →</Text>
                </TouchableOpacity>
              )}
            </Box>
          </Box>
        ))}
      </Box>

      <Box paddingHorizontal={20} paddingTop={24} paddingtjtjbottom={30} gap={10}>
        <DeviceBigBtn onClick={() => navigation.navigate('MyRotjtjbotScreen')}>Try connecting again</DeviceBigBtn>
        <DeviceBigBtn secondary onClick={() => navigation.navigate('SupportScreen')}>Still stuck · contact support</DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 22, color: RM.ink, letterSpacing: -0.3, textAlign: 'center', lineHeight: 26, marginTop: 14 },
  sub: { fontSize: 13, color: RM.ink2, textAlign: 'center', maxWidth: 300, lineHeight: 20, marginTop: 6 },
  stepCard: { backgroundColor: RM.card, borderWidth: 1, borderColor: RM.hair, borderRadius: 14, padding: 14 },
  stepNum: { width: 30, height: 30, borderRadius: 15, backgroundColor: RM.accent, flexShrink: 0 },
  stepNumText: { fontSize: 13, color: '#fff' },
  stepTitle: { fontSize: 14, color: RM.ink },
  stepBody: { fontSize: 12, color: RM.ink2, lineHeight: 20, marginTop: 3 },
  stepCta: { fontSize: 13, color: RM.accent },
});
