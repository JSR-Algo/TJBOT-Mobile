import React from 'react';
import { StyleSheet, Modal } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import OnbShell, { OB } from '@/components/OnbShell';
import OnbBigBtn from '@/components/OnbBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';

type Props = NativeStackScreenProps<RootStackParamList, 'MicAskScreen'>;

const POINTS = [
  'Used only during a lesson',
  'No recording is saved',
  'You can revoke it anytime in Settings',
] as const;

export default function MicAskScreen({ navigation }: Props) {
  const [showSheet, setShowSheet] = React.useState(false);

  return (
    <OnbShell title="Microphone" onBack={() => navigation.navigate('TrustScreen')}>
      <Box paddingTop={30} paddingHorizontal={24} alignItems="center">
        <Box style={styles.micIcon} alignItems="center" justifyContent="center">
          <Svg width={40} height={48} viewBox="0 0 24 28" fill="none">
            <Rect x="8" y="2" width="8" height="14" rx="4" fill={OB.ink} />
            <Path d="M5 12 a7 7 0 0 0 14 0 M12 19 v5 M8 24 h8" stroke={OB.ink} strokeWidth="2.2" strokeLinecap="round" fill="none" />
          </Svg>
        </Box>
        <Text fontWeight="600" style={styles.heading}>Rotjtjbot needs the mic to listen</Text>
        <Text style={styles.sub}>
          The next screen is your phone's permission prompt. Tap <Text fontWeight="700" style={{ color: OB.ink }}>Allow</Text> so your child can speak to Rotjtjbot.
        </Text>
      </Box>
      <Box paddingHorizontal={16} paddingTop={24} gap={8}>
        {POINTS.map((t, i) => (
          <Box key={i} style={styles.pointRow} flexDirection="row" alignItems="center" gap={10}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#1F8A5B" strokeWidth="2.4" strokeLinecap="round">
              <Path d="M5 12l5 5 9-10" />
            </Svg>
            <Text style={styles.pointText}>{t}</Text>
          </Box>
        ))}
      </Box>
      <Box paddingHorizontal={20} paddingTop={22} paddingtjtjbottom={30} gap={10}>
        <OnbBigBtn onClick={() => setShowSheet(true)}>Continue</OnbBigBtn>
        <OnbBigBtn secondary onClick={() => navigation.navigate('LoginScreen' as any)}>Not now</OnbBigBtn>
      </Box>

      <Modal visible={showSheet} transparent animationType="fade">
        <Box style={styles.overlay} alignItems="center" justifyContent="center">
          <Box style={styles.sheet}>
            <Box style={styles.sheetBody} alignItems="center">
              <Text fontWeight="600" style={styles.sheetTitle}>"Rotjtjbot" Would Like to Access the Microphone</Text>
              <Text style={styles.sheetBody2}>So your child can speak with Rotjtjbot during voice lessons.</Text>
            </Box>
            <Box style={styles.sheetBtns} flexDirection="row">
              <Box style={styles.sheetBtn}>
                <Text
                  style={styles.sheetBtnText}
                  onPress={() => { setShowSheet(false); navigation.navigate('LoginScreen' as any); }}
                >Don't Allow</Text>
              </Box>
              <Box style={[styles.sheetBtn, styles.sheetBtnRight]}>
                <Text
                  fontWeight="600"
                  style={styles.sheetBtnText}
                  onPress={() => { setShowSheet(false); navigation.navigate('LoginScreen' as any); }}
                >Allow</Text>
              </Box>
            </Box>
          </Box>
        </Box>
      </Modal>
    </OnbShell>
  );
}

const styles = StyleSheet.create({
  micIcon: { width: 96, height: 96, borderRadius: 24, backgroundColor: OB.card, borderWidth: 1, borderColor: OB.hair, margintjtjbottom: 18 },
  heading: { fontSize: 22, color: OB.ink, letterSpacing: -0.3, textAlign: 'center', margintjtjbottom: 8 },
  sub: { fontSize: 14, color: OB.ink2, lineHeight: 22, textAlign: 'center', maxWidth: 320 },
  pointRow: { backgroundColor: OB.card, borderWidth: 1, borderColor: OB.hair, borderRadius: 12, padding: 14 },
  pointText: { fontSize: 14, color: OB.ink, flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { width: 280, backgroundColor: 'rgba(244,244,247,0.96)', borderRadius: 14, overflow: 'hidden' },
  sheetBody: { padding: 20 },
  sheetTitle: { fontSize: 16, color: '#000', margintjtjbottom: 6, textAlign: 'center' },
  sheetBody2: { fontSize: 13, color: '#3a3a3c', lineHeight: 20, textAlign: 'center' },
  sheetBtns: { borderTopWidth: 0.5, borderTopColor: 'rgba(0,0,0,0.18)' },
  sheetBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  sheetBtnRight: { borderLeftWidth: 0.5, borderLeftColor: 'rgba(0,0,0,0.18)' },
  sheetBtnText: { fontSize: 16, color: '#0a84ff' },
});
