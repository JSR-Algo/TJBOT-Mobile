import React from 'react';
import { Image, StyleSheet, ScrollView } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { DV } from '@/components/Device-tokens';
import { ROUTES } from '@/navigation/routes';
import { referenceColors, referenceImages, referenceRadii, referenceShadow } from '@/design-system/referenceTheme';

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
      <Box paddingTop={70} paddingHorizontal={24} style={styles.header}>
        <Text fontWeight="800" style={styles.screenTitle}>Robot</Text>
        <Text style={styles.heroSub}>The speaking buddy handles lessons. This phone manages setup, courses, and safety.</Text>
      </Box>

      <Box paddingHorizontal={20} style={styles.heroWrap}>
        <Box style={styles.robotCard} alignItems="center">
          <Image
            source={referenceImages.robotHead}
            style={styles.robotImage}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
          <Text fontWeight="800" style={styles.robotName}>Robot</Text>
          <Text fontWeight="700" style={styles.robotState}>Online · idle</Text>
          <Box flexDirection="row" gap={10} style={styles.statRow}>
            <StatusTile label="Battery" value="78%" tone="gold" />
            <StatusTile label="Wi-Fi" value="Home" tone="teal" />
          </Box>
        </Box>
      </Box>

      <Box paddingHorizontal={16} style={styles.columns}>
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
        <Text fontWeight="800" style={styles.sectionLabel}>Why a device, not a screen</Text>
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

      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={110}>
        <DeviceBigBtn onClick={() => navigation.navigate(ROUTES.PairAddScreen)}>Set up your Robot</DeviceBigBtn>
      </Box>
    </ScrollView>
  );
}

function StatusTile({ label, value, tone }: { label: string; value: string; tone: 'gold' | 'teal' }): React.JSX.Element {
  const backgroundColor = tone === 'gold' ? referenceColors.goldSoft : referenceColors.secondarySoft;
  const color = tone === 'gold' ? '#A26D11' : '#2C7E87';
  return (
    <Box style={[styles.statusTile, { backgroundColor }]} alignItems="center">
      <Text fontWeight="800" style={[styles.statusValue, { color }]}>{value}</Text>
      <Text fontWeight="800" style={styles.statusLabel}>{label}</Text>
    </Box>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: referenceColors.bg },
  content: { paddingBottom: 40 },
  header: { marginBottom: 12 },
  screenTitle: { fontSize: 30, color: referenceColors.ink, lineHeight: 34, marginBottom: 8 },
  heroSub: { fontSize: 14, color: referenceColors.inkSoft, lineHeight: 22 },
  heroWrap: { marginBottom: 18 },
  robotCard: {
    backgroundColor: referenceColors.cardSoft,
    borderRadius: referenceRadii.cardLarge,
    borderWidth: 1,
    borderColor: referenceColors.line,
    padding: 20,
    ...referenceShadow.card,
  },
  robotImage: { width: 154, height: 154, borderRadius: 77, marginBottom: 10 },
  robotName: { fontSize: 26, color: referenceColors.ink },
  robotState: { fontSize: 13, color: referenceColors.success, marginTop: 2 },
  statRow: { width: '100%', marginTop: 16 },
  statusTile: { flex: 1, borderRadius: 20, paddingVertical: 12 },
  statusValue: { fontSize: 17 },
  statusLabel: { fontSize: 10, color: referenceColors.inkMuted, textTransform: 'uppercase', marginTop: 2 },
  columns: { flexDirection: 'row', gap: 10, marginBottom: 0 },
  colCard: {
    backgroundColor: referenceColors.card,
    borderRadius: referenceRadii.card,
    padding: 14,
    borderWidth: 1,
    borderColor: referenceColors.line,
    ...referenceShadow.card,
  },
  colTitle: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0, marginBottom: 8 },
  colItem: { fontSize: 13, color: referenceColors.ink, lineHeight: 18, flex: 1 },
  sectionLabel: { fontSize: 12, color: referenceColors.inkSoft, marginBottom: 8 },
  whyCard: {
    backgroundColor: referenceColors.card,
    borderRadius: referenceRadii.card,
    borderWidth: 1,
    borderColor: referenceColors.line,
    paddingVertical: 4,
    paddingHorizontal: 4,
    ...referenceShadow.card,
  },
  whyRow: { padding: 12 },
  whyBorder: { borderBottomWidth: 1, borderBottomColor: referenceColors.line },
  whyIcon: { width: 36, height: 36, borderRadius: 14, backgroundColor: referenceColors.primarySoft, flexShrink: 0 },
  whyTitle: { fontSize: 14, color: DV.ink, marginBottom: 2 },
  whyBody: { fontSize: 12, color: DV.ink2, lineHeight: 18, paddingRight: 8 },
});
