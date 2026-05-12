import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import ScreenShell from '@/components/ScreenShell';
import Robot from '@/design-system/components/Robot';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';

type Props = NativeStackScreenProps<RootStackParamList, 'ReconnectingOverlay'>;

export default function ReconnectingOverlay({ navigation }: Props) {
  React.useEffect(() => {
    const t = setTimeout(() => navigation.navigate('ListenScreen'), 2400);
    return () => clearTimeout(t);
  }, [navigation]);

  return (
    <ScreenShell>
      <Box style={[StyleSheet.absoluteFillObject, styles.bgHint]} opacity={0.35}>
        <Robot emotion="idle" size={180} />
      </Box>

      <Box style={[StyleSheet.absoluteFillObject, styles.dimmer]} />

      <Box style={styles.card} alignItems="center" gap={14}>
        <Robot emotion="worry" size={140} accent="#6B4A9B" />
        <Text fontWeight="800" style={styles.cardTitle}>I'm trying to connect again…</Text>
        <Box flexDirection="row" gap={6} marginTop={2}>
          {[0, 1, 2].map(i => (
            <Box key={i} style={styles.dot} />
          ))}
        </Box>
        <TouchableOpacity
          onPress={() => navigation.navigate('HomeHubScreen')}
          style={styles.homeBtn}
          activeOpacity={0.7}
        >
          <Text fontWeight="700" style={{ fontSize: 14, color: '#5C4F77' }}>Stop and go home</Text>
        </TouchableOpacity>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  bgHint: { alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' },
  dimmer: { backgroundColor: 'rgba(43,33,64,0.45)' },
  card: {
    position: 'absolute', left: 24, right: 24,
    top: '50%', transform: [{ translateY: -160 }],
    backgroundColor: '#fff', borderRadius: 28, padding: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.25, shadowRadius: 60,
    elevation: 10,
  },
  cardTitle: { fontSize: 22, color: '#2B2140', textAlign: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#6B4A9B' },
  homeBtn: { marginTop: 6, backgroundColor: 'transparent' },
});
