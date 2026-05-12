import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { PR } from '../purchase.local-tokens';
import PRStepTab from '../components/PRStepTab';

type Props = NativeStackScreenProps<RootStackParamList, 'BundleScreen'>;

const OPTS = [
  { id: 'robot',  tag: 'Most parents pick this', tagColor: PR.good,  title: 'Robot + Hello Friends',          body: 'Robot device and your first course. Add more later, only if you want.', price: '$149', sub: 'one-time · ships free', includes: ['Robot','Dock','Hello Friends','App'] },
  { id: 'family', tag: 'Saves more',             tagColor: PR.accent, title: 'Robot + All Courses (1 year)',  body: 'Robot device and every course for a year. Cancel anytime.', price: '$219', sub: '$149 hardware + $70 first year', includes: ['Robot','Dock','5 courses','New courses included','App'] },
] as const;

export default function BundleScreen({ navigation }: Props) {
  const [pick, setPick] = React.useState(0);
  return (
    <DeviceShell title="Pick your bundle" onBack={() => navigation.navigate('IncludedScreen')}>
      <Box paddingHorizontal={24} paddingTop={18}>
        <PRStepTab step={2} total={3} />
      </Box>

      <Box paddingHorizontal={16} paddingTop={18} gap={10}>
        {OPTS.map((o, i) => {
          const sel = i === pick;
          return (
            <TouchableOpacity key={o.id} onPress={() => setPick(i)} activeOpacity={0.8}
              style={[styles.optCard, sel && styles.optCardSel]}>
              <Box flexDirection="row" alignItems="flex-start" justifyContent="space-between" gap={10}>
                <Box flex={1}>
                  <Text fontWeight="700" style={[styles.optTag, { color: o.tagColor }]}>{o.tag}</Text>
                  <Text fontWeight="600" style={styles.optTitle}>{o.title}</Text>
                  <Text style={styles.optBody}>{o.body}</Text>
                </Box>
                <Text fontWeight="700" style={styles.optPrice}>{o.price}</Text>
              </Box>
              <Text style={styles.optSub}>{o.sub}</Text>
              <Box style={[styles.optTags, { flexDirection: 'row', flexWrap: 'wrap', gap: 5 }]}>
                {o.includes.map(t => (
                  <Box key={t} style={styles.optTag2}><Text fontWeight="600" style={styles.optTag2Text}>{t}</Text></Box>
                ))}
              </Box>
            </TouchableOpacity>
          );
        })}
      </Box>

      <Text style={styles.note}>Both bundles include free shipping and a 30-day return.</Text>

      <Box paddingHorizontal={20} paddingTop={18} paddingBottom={30} gap={10}>
        <DeviceBigBtn onClick={() => navigation.navigate('SubscriptionsScreen')}>Continue</DeviceBigBtn>
        <DeviceBigBtn secondary onClick={() => navigation.navigate('IncludedScreen')}>Back</DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  optCard: { backgroundColor: PR.card, borderWidth: 1, borderColor: PR.hair, borderRadius: 16, padding: 14 },
  optCardSel: { backgroundColor: '#E8F0FE', borderWidth: 2, borderColor: PR.accent },
  optTag: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 },
  optTitle: { fontSize: 15, color: PR.ink },
  optBody: { fontSize: 12, color: PR.ink2, lineHeight: 18, marginTop: 3 },
  optPrice: { fontSize: 20, color: PR.ink, letterSpacing: -0.3 },
  optSub: { fontSize: 11, color: PR.ink3, marginTop: 8 },
  optTags: { marginTop: 12 },
  optTag2: { backgroundColor: '#EEF1F5', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6 },
  optTag2Text: { fontSize: 10, color: PR.ink2 },
  note: { fontSize: 12, color: PR.ink2, lineHeight: 20, textAlign: 'center', paddingHorizontal: 20, paddingTop: 18 },
});
