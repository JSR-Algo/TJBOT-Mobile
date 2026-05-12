import React from 'react';
import { StyleSheet, TextInput } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import Svg, { Path, Rect } from 'react-native-svg';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import ParentScroll, { PA } from '../components/ParentScroll';

type Props = NativeStackScreenProps<RootStackParamList, 'ParentGateScreen'>;

export default function ParentGateScreen({ navigation }: Props) {
  const [target] = React.useState(() => 100 + Math.floor(Math.random() * 900));
  const [val, setVal] = React.useState('');
  const ok = val === String(target);

  React.useEffect(() => {
    if (ok) {
      const t = setTimeout(() => navigation.navigate('ParentSummaryScreen'), 280);
      return () => clearTimeout(t);
    }
  }, [ok, navigation]);

  return (
    <ParentScroll>
      <Box paddingHorizontal={28} paddingTop={68} paddingBottom={0}>
        <Text
          onPress={() => navigation.navigate('HomeHubScreen')}
          style={styles.backLink}
        >
          ← Back to play
        </Text>
      </Box>
      <Box flex={1} paddingHorizontal={28} paddingTop={40} paddingBottom={28} justifyContent="center">
        <Box style={styles.lockIcon} alignItems="center" justifyContent="center" marginBottom={20}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={PA.ink} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <Rect x={4} y={10} width={16} height={11} rx={2} />
            <Path d="M8 10V7a4 4 0 018 0v3" />
          </Svg>
        </Box>
        <Text fontWeight="600" style={styles.title}>Parent Space</Text>
        <Text style={styles.sub}>
          To continue, please type the number below. This keeps the parent area separate from the play area.
        </Text>

        <Box style={styles.card} marginBottom={18}>
          <Text style={styles.cardLabel}>TYPE THIS NUMBER</Text>
          <Text fontWeight="600" style={styles.target}>{target}</Text>
          <TextInput
            inputMode="numeric"
            value={val}
            onChangeText={t => setVal(t.replace(/\D/g, '').slice(0, 3))}
            placeholder="—"
            placeholderTextColor={PA.ink3}
            style={[styles.input, { borderBottomColor: ok ? PA.good : PA.hair }]}
          />
        </Box>
        <Text style={styles.disclaimer}>
          This is a speed bump, not a password. Children using the device on their own will see the play area only.
        </Text>
      </Box>
    </ParentScroll>
  );
}

const styles = StyleSheet.create({
  backLink: { fontSize: 14, color: PA.ink2, paddingVertical: 4 },
  lockIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#EEF1F5' },
  title: { fontSize: 24, color: PA.ink, letterSpacing: -0.4, marginBottom: 8 },
  sub: { fontSize: 15, color: PA.ink2, lineHeight: 22, marginBottom: 32 },
  card: { backgroundColor: PA.card, borderWidth: 1, borderColor: PA.hair, borderRadius: 14, padding: 22 },
  cardLabel: { fontSize: 12, color: PA.ink3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  target: { fontSize: 38, letterSpacing: 8, color: PA.ink, marginBottom: 18 },
  input: { borderBottomWidth: 2, fontSize: 24, letterSpacing: 6, color: PA.ink, paddingVertical: 8 },
  disclaimer: { fontSize: 13, color: PA.ink3, lineHeight: 20 },
});
