import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { DV } from '@/components/Device-tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'DeviceOverviewScreen'>;

const COLUMNS = [
  { t: 'Robot does', items: ['Listens to your child', 'Speaks back warmly', 'Shows the face & feedback', 'Plays the lesson out loud'], color: '#FF6F61' },
  { t: 'Phone does', items: ['Sets up & pairs', 'Picks the course', 'Shows progress to parents', 'Manages safety & billing'], color: DV.accent },
] as const;

const WHY_ROWS = [
  { ic: '🎙️', t: 'No phone in tiny hands', b: "Practice doesn't replace screen time — it sits on the desk like a toy." },
  { ic: '👀', t: 'Eyes up, not down', b: 'A face to look at, not a feed to scroll.' },
  { ic: '🔒', t: 'Bounded experience', b: 'No browsers, no apps, no surprises.' },
] as const;

export default function DeviceOverviewScreen({ navigation }: Props) {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Box paddingTop={72} paddingHorizontal={24} style={{ marginBottom: 8 }}>
        <Text fontWeight="800" style={styles.heroTitle}>One product.{'\n'}Two devices.</Text>
        <Text style={styles.heroSub}>Robot is the child's speaking buddy. The phone is for the grown-up.</Text>
      </Box>

      <Box paddingHorizontal={24} alignItems="center" justifyContent="center" style={{ marginBottom: 24 }}>
        <RobotDevice emotion="happy" size={180} accent="#FF6F61" />
      </Box>

      <Box paddingHorizontal={16} style={{ flexDirection: 'row', gap: 10, marginBottom: 0 }}>
        {COLUMNS.map((col, ci) => (
          <Box key={ci} flex={1} style={styles.colCard}>
            <Text fontWeight="700" style={[styles.colTitle, { color: col.color }]}>{col.t}</Text>
            {col.items.map(it => (
              <Box key={it} flexDirection="row" gap={6} alignItems="flex-start" style={{ marginBottom: 6 }}>
                <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={col.color} strokeWidth={3} strokeLinecap="round" style={{ marginTop: 4, flexShrink: 0 }}>
                  <Path d="M5 12l5 5 9-10" />
                </Svg>
                <Text style={styles.colItem}>{it}</Text>
              </Box>
            ))}
          </Box>
        ))}
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Text fontWeight="700" style={styles.sectionLabel}>Why a device, not a screen</Text>
        <Box style={styles.whyCard}>
          {WHY_ROWS.map((row, i) => (
            <Box key={i} flexDirection="row" gap={12} style={[styles.whyRow, i < WHY_ROWS.length - 1 && styles.whyBorder]} alignItems="flex-start">
              <Box style={styles.whyIcon} alignItems="center" justifyContent="center">
                <Text style={{ fontSize: 18 }}>{row.ic}</Text>
              </Box>
              <Box>
                <Text fontWeight="600" style={styles.whyTitle}>{row.t}</Text>
                <Text style={styles.whyBody}>{row.b}</Text>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={60}>
        <DeviceBigBtn onClick={() => navigation.navigate('PairAddScreen')}>Set up your Robot</DeviceBigBtn>
      </Box>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F6F1' },
  content: { paddingBottom: 40 },
  heroTitle: { fontSize: 30, color: DV.ink, letterSpacing: -0.4, lineHeight: 33, marginBottom: 8 },
  heroSub: { fontSize: 14, color: DV.ink2, lineHeight: 22 },
  colCard: { backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  colTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  colItem: { fontSize: 13, color: DV.ink, lineHeight: 18, flex: 1 },
  sectionLabel: { fontSize: 11, color: DV.ink2, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  whyCard: { backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', paddingVertical: 4, paddingHorizontal: 4 },
  whyRow: { padding: 12 },
  whyBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  whyIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#F0EDE8', flexShrink: 0 },
  whyTitle: { fontSize: 13, color: DV.ink, marginBottom: 2 },
  whyBody: { fontSize: 12, color: DV.ink2, lineHeight: 18 },
});
