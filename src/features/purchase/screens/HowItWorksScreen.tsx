import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Icon, type IconName } from '@/design-system/icons';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { PR } from '../purchase.local-tokens';
import PRStepTab from '../components/PRStepTab';
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'HowItWorksScreen'>;

const STEPS = [
  { n: 1, t: 'Robot talks and listens',       b: 'A short greeting, a question, a game. Robot speaks with warmth and waits patiently.', icon: 'MessagesSquare' },
  { n: 2, t: 'Your child practices speaking', b: 'They answer out loud. Robot celebrates effort, gently revisits tricky words.', icon: 'Mic2' },
  { n: 3, t: 'You see a calm summary',        b: 'Words your child played with today. No transcripts, no recordings.', icon: 'ClipboardCheck' },
] satisfies ReadonlyArray<{ n: number; t: string; b: string; icon: IconName }>;

export default function HowItWorksScreen({ navigation }: Props) {
  return (
    <DeviceShell title="How it works" screenTestID="howItWorksScreen" onBack={() => navigation.navigate(ROUTES.PurchaseIntroScreen)}>
      <Box paddingHorizontal={24} paddingTop={18}>
        <PRStepTab step={1} total={3} />
      </Box>
      <Box paddingHorizontal={24} paddingTop={24}>
        <Text fontWeight="600" style={styles.heading}>Three small parts, one calm rhythm</Text>
      </Box>

      <Box paddingHorizontal={16} paddingTop={20} gap={12}>
        {STEPS.map(s => (
          <Box key={s.n} style={styles.stepCard}>
            <Box style={styles.stepNum}><Text fontWeight="700" style={styles.stepNumText}>{s.n}</Text></Box>
            <Box flex={1}>
              <Text fontWeight="600" style={styles.stepTitle}>{s.t}</Text>
              <Text style={styles.stepBody}>{s.b}</Text>
              <Box style={styles.iconPreview} alignItems="center" justifyContent="center">
                <Icon name={s.icon} size={30} color={PR.accent} strokeWidth={2.2} />
              </Box>
            </Box>
          </Box>
        ))}
      </Box>

      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30} gap={10}>
        <DeviceBigBtn onClick={() => navigation.navigate(ROUTES.IncludedScreen)}>What's included</DeviceBigBtn>
        <DeviceBigBtn secondary onClick={() => navigation.navigate(ROUTES.PurchaseIntroScreen)}>Back</DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 24, color: PR.ink, letterSpacing: -0.4, lineHeight: 29 },
  stepCard: {
    backgroundColor: PR.card, borderWidth: 1, borderColor: PR.hair, borderRadius: 16,
    padding: 16, flexDirection: 'row', gap: 14, alignItems: 'flex-start',
  },
  stepNum: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: PR.accent,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stepNumText: { fontSize: 14, color: '#fff' },
  stepTitle: { fontSize: 15, color: PR.ink },
  stepBody: { fontSize: 13, color: PR.ink2, marginTop: 4, lineHeight: 20 },
  iconPreview: {
    width: 58,
    height: 58,
    marginTop: 12,
    backgroundColor: '#FFE5E5',
    borderRadius: 22,
  },
});
