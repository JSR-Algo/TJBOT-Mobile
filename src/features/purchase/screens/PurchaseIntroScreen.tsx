import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { PR } from '../purchase.local-tokens';
import RobotHero from '../components/RobotHero';
import PRChip from '../components/PRChip';
import { ROUTES } from '@/navigation/routes';
import { useAppLanguage } from '@/services/i18n/i18n';
import { Icon, type IconName } from '@/design-system/icons';

type Props = NativeStackScreenProps<RootStackParamList, 'PurchaseIntroScreen'>;

const FEATURES = [
  { icon: 'Mic' as IconName, t: 'Built for spoken English', b: 'Robot is a patient listener — kids speak out loud, not type.' },
  { icon: 'Feather' as IconName, t: 'Calm, never pushy', b: 'No streaks, no badges that hurt to lose. Just steady warmth.' },
  { icon: 'UsersRound' as IconName, t: 'Designed with parents', b: 'You set the courses. Your child sees only what you choose.' },
] as const;

export default function PurchaseIntroScreen({ navigation }: Props) {
  const { t } = useAppLanguage();
  return (
    <DeviceShell
      title="Meet Robot"
      screenTestID="purchaseIntroScreen"
      scrollTestID="purchaseIntroDeviceShellScroll"
      onBack={() => navigation.navigate(ROUTES.DeviceHomeScreen)}
    >
      <Box testID="purchaseIntroScroll">
      <Box paddingHorizontal={24} paddingTop={18} alignItems="center">
        <RobotHero size={220} accent="#FF6F61" />
        <Box style={styles.chipWrap}><PRChip>A gentle English buddy</PRChip></Box>
        <Text fontWeight="600" style={styles.heading}>
          A small robot that helps your child practice spoken English
        </Text>
        <Text style={styles.sub}>4 minutes a day. Just talking. No screens, no pressure, no scores.</Text>
      </Box>

      <Box paddingHorizontal={16} paddingTop={28}>
        <Box style={styles.featureCard}>
          {FEATURES.map((r, i) => (
            <Box key={r.t} style={[styles.featureRow, i < FEATURES.length - 1 && styles.featureBorder]}>
              <Box style={styles.featureIcon}>
                <Icon name={r.icon} size={18} color={PR.accent} strokeWidth={2.3} />
              </Box>
              <Box flex={1}>
                <Text fontWeight="600" style={styles.featureTitle}>{r.t}</Text>
                <Text style={styles.featureBody}>{r.b}</Text>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30} gap={10}>
        <TouchableOpacity
          testID="purchaseIntroHowItWorksCta"
          accessibilityRole="button"
          accessibilityLabel={t('See how it works')}
          onPress={() => navigation.navigate(ROUTES.HowItWorksScreen)}
          style={styles.primaryCta}
          activeOpacity={0.7}
        >
          <Text fontWeight="600" style={styles.primaryCtaText}>See how it works</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate(ROUTES.PrivacyScreen)} style={styles.privacyBtn} activeOpacity={0.7}>
          <Text fontWeight="500" style={styles.privacyText}>Privacy & safety first</Text>
        </TouchableOpacity>
      </Box>
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
  featureBorder: { borderBottomWidth: 1, borderBottomColor: PR.hair },
  featureIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#EEF1F5', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  featureTitle: { fontSize: 14, color: PR.ink },
  featureBody: { fontSize: 12, color: PR.ink2, marginTop: 2, lineHeight: 18 },
  primaryCta: { width: '100%', minHeight: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: PR.accent },
  primaryCtaText: { fontSize: 16, color: '#fff' },
  privacyBtn: { alignItems: 'center', padding: 8 },
  privacyText: { fontSize: 13, color: PR.ink2 },
});
