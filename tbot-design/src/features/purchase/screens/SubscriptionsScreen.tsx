import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { PR } from '../purchase.local-tokens';
import PRStepTab from '../components/PRStepTab';

type Props = NativeStackScreenProps<RootStackParamList, 'SubscriptionsScreen'>;

const OPTS = [
  { id: 'none', tag: 'No subscription', body: "Stick with Hello Friends. You can add courses one at a time later.", price: 'Free', sub: 'Always an option' },
  { id: 'all',  tag: 'All Courses',     body: 'Every course on your Robot, including new ones we add.',             price: '$8.99', sub: '/ month · 7-day free trial' },
  { id: 'pack', tag: 'Starter pack',    body: 'Hello Friends, Animals, Yummy Words — once, yours forever.',         price: '$48',   sub: 'one-time · save $24' },
] as const;

export default function SubscriptionsScreen({ navigation }: Props) {
  const [pick, setPick] = React.useState<'none' | 'all' | 'pack'>('none');
  return (
    <DeviceShell title="Add courses?" onBack={() => navigation.navigate('BundleScreen')}>
      <Box paddingHorizontal={24} paddingTop={18}>
        <PRStepTab step={2} total={3} />
        <Text fontWeight="600" style={styles.heading}>Optional · skip if you'd rather wait</Text>
        <Text style={styles.sub}>
          Robot already comes with the Hello Friends course. Add more only if you want — you can change this anytime.
        </Text>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18} gap={8}>
        {OPTS.map(o => {
          const sel = pick === o.id;
          return (
            <TouchableOpacity key={o.id} onPress={() => setPick(o.id)} activeOpacity={0.8}
              style={[styles.optCard, sel && styles.optCardSel]}>
              <Box style={[styles.radio, sel && styles.radioSel]}>
                {sel && (
                  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.2} strokeLinecap="round">
                    <Path d="M5 12l5 5 9-10" />
                  </Svg>
                )}
              </Box>
              <Box flex={1}>
                <Box flexDirection="row" alignItems="baseline" justifyContent="space-between" gap={10}>
                  <Text fontWeight="600" style={styles.optTag}>{o.tag}</Text>
                  <Text fontWeight="700" style={styles.optPrice}>{o.price}</Text>
                </Box>
                <Text style={styles.optBody}>{o.body}</Text>
                <Text style={styles.optSub}>{o.sub}</Text>
              </Box>
            </TouchableOpacity>
          );
        })}
      </Box>

      <Text style={styles.note}>Your child never sees prices. Subscriptions are managed only here.</Text>

      <Box paddingHorizontal={20} paddingTop={18} paddingBottom={30} gap={10}>
        <DeviceBigBtn onClick={() => navigation.navigate('PrivacyScreen')}>Continue</DeviceBigBtn>
        <DeviceBigBtn secondary onClick={() => navigation.navigate('BundleScreen')}>Back</DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 22, color: PR.ink, letterSpacing: -0.3, lineHeight: 26, marginTop: 18 },
  sub: { fontSize: 13, color: PR.ink2, lineHeight: 20, marginTop: 6 },
  optCard: {
    backgroundColor: PR.card, borderWidth: 1, borderColor: PR.hair, borderRadius: 14,
    padding: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start',
  },
  optCardSel: { backgroundColor: '#E8F0FE', borderWidth: 2, borderColor: PR.accent },
  radio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: PR.hair,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
  },
  radioSel: { backgroundColor: PR.accent, borderWidth: 0 },
  optTag: { fontSize: 14, color: PR.ink },
  optPrice: { fontSize: 14, color: PR.ink, letterSpacing: -0.2 },
  optBody: { fontSize: 12, color: PR.ink2, lineHeight: 20, marginTop: 3 },
  optSub: { fontSize: 11, color: PR.ink3, marginTop: 5 },
  note: { fontSize: 12, color: PR.ink2, lineHeight: 20, textAlign: 'center', paddingHorizontal: 20, paddingTop: 18 },
});
