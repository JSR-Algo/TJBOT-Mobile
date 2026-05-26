import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { ROUTES } from '@/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import CL from './components/CL';
import { unlockCourse } from '@/services/api/course-library.api';

type Props = NativeStackScreenProps<RootStackParamList, 'UnlockConfirmScreen'>;

const TARGET = ['7', '3', '5', '1'];
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

export default function UnlockConfirmModal({ navigation, route }: Props) {
  const courseId = route.params?.courseId ?? 'c_food';
  const [vals, setVals] = React.useState(['', '', '', '']);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const filled = vals.every(Boolean);
  const ok = vals.join('') === TARGET.join('');

  const handleConfirm = () => {
    if (!ok || pending) return;
    setPending(true);
    setError(null);
    void unlockCourse(courseId)
      .then(() => {
        navigation.replace(ROUTES.CourseAddedScreen, { courseId });
      })
      .catch(() => {
        setError('Course unlock is unavailable. Try again later.');
      })
      .finally(() => {
        setPending(false);
      });
  };

  const handleKey = (k: string) => {
    setVals(prev => {
      const next = [...prev];
      if (k === '⌫') {
        for (let j = next.length - 1; j >= 0; j--) {
          if (next[j]) { next[j] = ''; break; }
        }
      } else {
        const idx = next.findIndex(x => !x);
        if (idx >= 0) next[idx] = k;
      }
      return next;
    });
  };

  return (
    <DeviceShell title="Quick parent check" onBack={() => navigation.navigate(ROUTES.CourseDetailScreen, { courseId })}>
      <Box paddingTop={30} paddingHorizontal={24} alignItems="center">
        <Box style={styles.lockIcon}>
          <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={CL.ink2} strokeWidth={1.8} strokeLinecap="round">
            <Rect x={5} y={11} width={14} height={10} rx={2} />
            <Path d="M8 11V7a4 4 0 018 0v4" />
          </Svg>
        </Box>
        <Text fontWeight="600" style={styles.heading}>Type the number below</Text>
        <Text style={styles.sub}>A small step so kids can't add free courses by accident.</Text>
      </Box>

      <Box paddingHorizontal={20} paddingTop={24} alignItems="center">
        <Text fontWeight="700" style={styles.targetNum}>{TARGET.join(' ')}</Text>
      </Box>

      <Box paddingHorizontal={20} paddingTop={18}>
        <Box flexDirection="row" gap={10} justifyContent="center">
          {vals.map((v, i) => (
            <Box key={i} style={[styles.digit, { borderColor: ok ? CL.good : v ? CL.accent : CL.hair }]}>
              <Text fontWeight="700" style={styles.digitText}>{v}</Text>
            </Box>
          ))}
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={24}>
        <Box style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {KEYS.map((k, i) => {
            if (!k) return <Box key={i} flex={1} height={54} />;
            const label = k === '⌫' ? 'Delete last digit' : `Enter digit ${k}`;
            return (
              <TouchableOpacity
                key={i}
                onPress={() => handleKey(k)}
                style={styles.key}
                activeOpacity={0.7}
                accessibilityLabel={label}
                accessibilityRole="button"
              >
                <Text fontWeight="600" style={styles.keyText}>{k}</Text>
              </TouchableOpacity>
            );
          })}
        </Box>
      </Box>

      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <DeviceBigBtn onClick={handleConfirm} disabled={pending || !ok}>
          {pending ? 'Adding...' : ok ? 'Confirm add' : filled ? 'Try again' : 'Enter the number'}
        </DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  lockIcon: { width: 64, height: 64, borderRadius: 18, backgroundColor: '#EEF1F5', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  heading: { fontSize: 20, color: CL.ink, letterSpacing: -0.2, textAlign: 'center' },
  sub: { fontSize: 13, color: CL.ink2, marginTop: 6, textAlign: 'center', maxWidth: 280, lineHeight: 20 },
  targetNum: { fontSize: 42, color: CL.ink, letterSpacing: 6, fontFamily: 'Courier New' },
  digit: {
    width: 54, height: 64, borderRadius: 12, backgroundColor: CL.card,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
  digitText: { fontSize: 28, color: CL.ink, fontFamily: 'Courier New' },
  key: {
    width: '30%', height: 54, borderRadius: 12, borderWidth: 1, borderColor: CL.hair,
    backgroundColor: CL.card, alignItems: 'center', justifyContent: 'center',
  },
  keyText: { fontSize: 20, color: CL.ink },
  errorText: { fontSize: 13, color: '#C0392B', textAlign: 'center', marginBottom: 10 },
});
