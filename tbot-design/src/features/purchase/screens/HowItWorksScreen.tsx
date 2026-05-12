import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import LCDFace from '@/design-system/components/LCDFace';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { PR } from '../purchase.local-tokens';
import PRStepTab from '../components/PRStepTab';

type Props = NativeStackScreenProps<RootStackParamList, 'HowItWorksScreen'>;

const STEPS = [
  { n: 1, t: 'Robot talks and listens',       b: 'A short greeting, a question, a game. Robot speaks with warmth and waits patiently.', emo: 'speak' },
  { n: 2, t: 'Your child practices speaking', b: 'They answer out loud. Robot celebrates effort, gently revisits tricky words.', emo: 'listen' },
  { n: 3, t: 'You see a calm summary',        b: 'Words your child played with today. No transcripts, no recordings.', emo: 'happy' },
];

export default function HowItWorksScreen({ navigation }: Props) {
  return (
    <DeviceShell title="How it works" onBack={() => navigation.navigate('PurchaseIntroScreen')}>
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
              <Box style={styles.lcdWrap}>
                <LCDFace emotion={s.emo} size={88} accent="#FF6F61" />
              </Box>
            </Box>
          </Box>
        ))}
      </Box>

      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30} gap={10}>
        <DeviceBigBtn onClick={() => navigation.navigate('IncludedScreen')}>What's included</DeviceBigBtn>
        <DeviceBigBtn secondary onClick={() => navigation.navigate('PurchaseIntroScreen')}>Back</DeviceBigBtn>
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
  lcdWrap: { marginTop: 10, backgroundColor: '#0E1116', borderRadius: 10, padding: 6, alignSelf: 'flex-start' },
});
