import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import LCDFace, { LCD_STATES_LIST } from '@/design-system/components/LCDFace';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { DV } from '@/components/Device-tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'LCDLibraryScreen'>;

const GROUPS = ['Conversation', 'Feedback', 'System', 'Safety', 'Lifecycle'] as const;
type Group = typeof GROUPS[number];

const GROUP_COLORS: Record<Group, string> = {
  Conversation: '#6FC1FF', Feedback: '#7BD389', System: '#E8A33C', Safety: '#9B8FB8', Lifecycle: '#FF6F61',
};

const DESIGN_RULES = [
  { t: 'Eyes carry feeling', b: 'Shape changes do most of the work — happy arcs, soft circles, droopy curves.' },
  { t: 'Cheeks = warmth', b: 'Soft coral cheeks appear in friendly states, hide in serious ones.' },
  { t: 'Color cues, not text', b: 'Coral = listen, green = heard, yellow = wait, lavender = pause.' },
  { t: 'Animation tells state', b: 'Bob, blink, tilt, ring-pulse — each motion has one meaning.' },
] as const;

const ANTI_PATTERNS = [
  { t: 'No red Xs', b: 'Use a soft "almost!" face with a kind smile. Wrong is part of learning.' },
  { t: 'No furrowed-brow anger', b: 'Robot is patient. Even off-topic redirects use a friendly tilt.' },
  { t: 'No alarming warnings', b: 'Safety pause uses lavender glow + shield-check, not red flashes.' },
  { t: 'No tiny text on the LCD', b: 'Anything text-shaped must be 24px+ at 1× and a known glyph (z, !, %).' },
] as const;

export default function LCDLibraryScreen({ navigation }: Props) {
  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 40 }}>
      <Box style={styles.header}>
        <Text fontWeight="700" style={styles.kicker}>Robot · LCD face system</Text>
        <Text fontWeight="600" style={styles.title}>20 faces, one warm character.</Text>
        <Text style={styles.subtitle}>
          Designed for a 3.2" / 320×240 LCD. Bold features, no small text, readable at 1–2 m. No anger, no red Xs, no scary warnings.
        </Text>
      </Box>

      <Box paddingHorizontal={16} paddingTop={14} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {DESIGN_RULES.map(r => (
          <Box key={r.t} style={styles.ruleCard}>
            <Text fontWeight="600" style={styles.ruleTitle}>{r.t}</Text>
            <Text style={styles.ruleBody}>{r.b}</Text>
          </Box>
        ))}
      </Box>

      {GROUPS.map(g => {
        const items = LCD_STATES_LIST.filter((s: any) => s.group === g);
        if (!items.length) return null;
        const color = GROUP_COLORS[g];
        return (
          <Box key={g} paddingHorizontal={16} paddingTop={22}>
            <Box flexDirection="row" alignItems="center" gap={8} style={{ marginBottom: 10 }}>
              <Box style={[styles.groupDot, { backgroundColor: color }]} />
              <Text fontWeight="700" style={[styles.groupLabel, { color: DV.ink2 }]}>{g}</Text>
              <Box flex={1} style={styles.groupLine} />
              <Text style={styles.groupCount}>{items.length}</Text>
            </Box>
            <Box gap={10}>
              {items.map((s: any) => (
                <Box key={s.id} style={styles.faceCard}>
                  <Box style={styles.lcdBg}>
                    <LCDFace emotion={s.id} size={300} accent="#FF6F61" />
                  </Box>
                  <Box padding={14}>
                    <Box flexDirection="row" alignItems="flex-end" justifyContent="space-between" gap={8} style={{ marginBottom: 4 }}>
                      <Text fontWeight="600" style={styles.faceLabel}>{s.label}</Text>
                      <Text style={styles.faceId}>{s.id}</Text>
                    </Box>
                    <Box style={styles.groupChip}>
                      <Text fontWeight="700" style={[styles.groupChipText, { color }]}>{g}</Text>
                    </Box>
                    <Text style={styles.faceAnim}><Text fontWeight="600" style={{ color: DV.ink }}>Animation. </Text>{s.anim}</Text>
                    <Text style={styles.faceUse}><Text fontWeight="600" style={{ color: DV.ink }}>Use. </Text>{s.use}</Text>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        );
      })}

      <Box paddingHorizontal={16} paddingTop={24}>
        <Text fontWeight="700" style={styles.neverTitle}>Never do this</Text>
        <Box style={styles.antiCard}>
          {ANTI_PATTERNS.map((r, i) => (
            <Box key={r.t} flexDirection="row" gap={10} style={[styles.antiRow, i < ANTI_PATTERNS.length - 1 && styles.antiBorder]} alignItems="flex-start">
              <Box style={styles.antiX} alignItems="center" justifyContent="center">
                <Text fontWeight="700" style={{ fontSize: 14, color: '#C0392B' }}>×</Text>
              </Box>
              <Box>
                <Text fontWeight="600" style={styles.antiTitle}>{r.t}</Text>
                <Text style={styles.antiBody}>{r.b}</Text>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DV.bg },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: DV.hair },
  kicker: { fontSize: 11, color: '#FF6F61', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  title: { fontSize: 22, color: DV.ink, letterSpacing: -0.4, lineHeight: 26 },
  subtitle: { fontSize: 13, color: DV.ink2, lineHeight: 20, marginTop: 6 },
  ruleCard: { width: '47%', backgroundColor: DV.card, borderWidth: 1, borderColor: DV.hair, borderRadius: 10, padding: 12 },
  ruleTitle: { fontSize: 12, color: DV.ink },
  ruleBody: { fontSize: 11, color: DV.ink2, lineHeight: 18, marginTop: 2 },
  groupDot: { width: 10, height: 10, borderRadius: 5 },
  groupLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  groupLine: { height: 1, backgroundColor: DV.hair },
  groupCount: { fontSize: 11, color: DV.ink3 },
  faceCard: { backgroundColor: DV.card, borderRadius: 14, borderWidth: 1, borderColor: DV.hair, overflow: 'hidden' },
  lcdBg: { backgroundColor: '#0E1116' },
  faceLabel: { fontSize: 15, color: DV.ink },
  faceId: { fontSize: 10, color: DV.ink3 },
  groupChip: { alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 7, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.05)', marginBottom: 8 },
  groupChipText: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4 },
  faceAnim: { fontSize: 12, color: DV.ink2, lineHeight: 20, marginBottom: 4 },
  faceUse: { fontSize: 12, color: DV.ink2, lineHeight: 20 },
  neverTitle: { fontSize: 11, color: DV.ink2, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  antiCard: { backgroundColor: DV.card, borderWidth: 1, borderColor: DV.hair, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 4 },
  antiRow: { padding: 12 },
  antiBorder: { borderBottomWidth: 1, borderBottomColor: DV.hair },
  antiX: { width: 22, height: 22, borderRadius: 6, backgroundColor: '#F4E5DF', flexShrink: 0 },
  antiTitle: { fontSize: 13, color: DV.ink },
  antiBody: { fontSize: 12, color: DV.ink2, lineHeight: 20, marginTop: 2 },
});
