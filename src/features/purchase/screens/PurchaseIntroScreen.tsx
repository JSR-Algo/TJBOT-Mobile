import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { PR } from '../purchase.local-tokens';
import RotjtjbotHero from '../components/RotjtjbotHero';
import PRChip from '../components/PRChip';

type Props = NativeStackScreenProps<RootStackParamList, 'PurchaseIntroScreen'>;

const FEATURES = [
  { ic: '🎙️', t: 'Built for spoken English', b: 'Rotjtjbot is a patient listener — kids speak out loud, not type.' },
  { ic: '🪶',  t: 'Calm, never pushy',        b: 'No streaks, no badges that hurt to lose. Just steady warmth.' },
  { ic: '👨‍👩‍👧', t: 'Designed with parents',    b: 'You set the courses. Your child sees only what you choose.' },
];

export default function PurchaseIntroScreen({ navigation }: Props) {
  return (
    <DeviceShell title="Meet Rotjtjbot" onBack={() => navigation.navigate('DeviceHomeScreen')}>
      <Box paddingHorizontal={24} paddingTop={18} alignItems="center">
        <RotjtjbotHero size={220} accent="#FF6F61" />
        <Box style={styles.chipWrap}><PRChip>A gentle English buddy</PRChip></Box>
        <Text fontWeight="600" style={styles.heading}>
          A small rotjtjbot that helps your child practice spoken English
        </Text>
        <Text style={styles.sub}>4 minutes a day. Just talking. No screens, no pressure, no scores.</Text>
      </Box>

      <Box paddingHorizontal={16} paddingTop={28}>
        <Box style={styles.featureCard}>
          {FEATURES.map((r, i) => (
            <Box key={r.t} style={[styles.featureRow, i < FEATURES.length - 1 && styles.featureBorder]}>
              <Box style={styles.featureIcon}><Text style={{ fontSize: 16 }}>{r.ic}</Text></Box>
              <Box flex={1}>
                <Text fontWeight="600" style={styles.featureTitle}>{r.t}</Text>
                <Text style={styles.featureBody}>{r.b}</Text>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      <Box paddingHorizontal={20} paddingTop={24} paddingtjtjbottom={30} gap={10}>
        <DeviceBigBtn onClick={() => navigation.navigate('HowItWorksScreen')}>See how it works</DeviceBigBtn>
        <TouchableOpacity onPress={() => navigation.navigate('PrivacyScreen')} style={styles.privacyBtn} activeOpacity={0.7}>
          <Text fontWeight="500" style={styles.privacyText}>Privacy & safety first</Text>
        </TouchableOpacity>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  chipWrap: { marginTop: 14 },
  heading: { fontSize: 30, color: PR.ink, letterSpacing: -0.6, textAlign: 'center', lineHeight: 33, marginTop: 14 },
  sub: { fontSize: 14, color: PR.ink2, textAlign: 'center', maxWidth: 320, lineHeight: 22, marginTop: 10 },
  featureCard: { backgroundColor: PR.card, borderWidth: 1, borderColor: PR.hair, borderRadius: 16, paddingVertical: 4, paddingHorizontal: 4 },
  featureRow: { flexDirection: 'row', gap: 14, padding: 14 },
  featureBorder: { bordertjtjbottomWidth: 1, bordertjtjbottomColor: PR.hair },
  featureIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#EEF1F5', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  featureTitle: { fontSize: 14, color: PR.ink },
  featureBody: { fontSize: 12, color: PR.ink2, marginTop: 2, lineHeight: 18 },
  privacyBtn: { alignItems: 'center', padding: 8 },
  privacyText: { fontSize: 13, color: PR.ink2 },
});
