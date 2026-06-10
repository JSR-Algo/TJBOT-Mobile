import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import LCDFace from '@/design-system/components/LCDFace';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { DV } from '@/components/Device-tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'LCDLessonTurnScreen'>;

const TURNS = [
  { id: 'speak', label: '1 · Robot speaks', caption: 'Mouth opens, gentle bob.', words: '"Say… apple."', ms: '~1.4 s' },
  { id: 'listen', label: '2 · Robot listens', caption: 'Coral ring breathes, mic open.', words: '(silence — ear up)', ms: '~3.0 s' },
  { id: 'child_speak', label: '3 · Child speaks', caption: 'Green ring + ear bars bounce.', words: '"Apple!"', ms: '~1.2 s' },
  { id: 'think', label: '4 · Robot thinks', caption: 'Eyes look up, three dots pop.', words: '(processing)', ms: '~0.4 s' },
  { id: 'success', label: '5 · Robot celebrates', caption: 'Sparkles + green glow + big smile.', words: '"Yes! Apple!"', ms: '~1.6 s' },
] as const;

const TRANSITIONS = [
  { t: 'speak → listen', b: 'Mouth shrinks O → o; ring fades from yellow to coral over 200 ms.' },
  { t: 'listen → child_speak', b: 'Eyes pop wider; ring color + ear bars come in together within 100 ms of voice activity.' },
  { t: 'child_speak → think', b: 'Ear bars stop, eyes flick up, three dots pop in over 250 ms.' },
  { t: 'think → success', b: 'Eyes blend think→happy arcs; sparkles & green ring rise; mouth opens to big.' },
  { t: "didn't_hear / try_again", b: 'Branch from listen if no audio after ~3 s — never punitive.' },
] as const;

export default function LCDLessonTurnScreen({ navigation: _navigation }: Props) {
  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 40 }}>
      <Box style={styles.header}>
        <Text fontWeight="700" style={styles.kicker}>One lesson turn</Text>
        <Text fontWeight="600" style={styles.title}>
          Robot speaks → listens → child speaks → thinks → celebrates.
        </Text>
        <Text style={styles.subtitle}>
          The whole loop is about 8 seconds. Each face is unmistakable from across a room.
        </Text>
      </Box>

      <Box paddingHorizontal={16} paddingTop={4} gap={14}>
        {TURNS.map((t, i) => (
          <Box key={t.id} style={styles.card}>
            <Box style={styles.lcdBg}>
              <LCDFace emotion={t.id} size={300} accent="#FF6F61" />
              <Box style={styles.frameBadge}>
                <Text style={styles.frameBadgeText}>frame · {i + 1}/{TURNS.length}</Text>
              </Box>
              <Box style={styles.msBadge}>
                <Text style={styles.msBadgeText}>{t.ms}</Text>
              </Box>
            </Box>
            <Box padding={14}>
              <Text fontWeight="600" style={styles.turnLabel}>{t.label}</Text>
              <Text style={styles.turnCaption}>{t.caption}</Text>
              <Box style={styles.wordBox}>
                <Text style={styles.wordText}>{t.words}</Text>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>

      <Box paddingHorizontal={16} paddingTop={22}>
        <Text fontWeight="700" style={styles.sectionLabel}>Transitions</Text>
        <Box style={styles.transCard}>
          {TRANSITIONS.map((r, i) => (
            <Box key={r.t} style={[styles.transRow, i < TRANSITIONS.length - 1 && styles.transBorder]}>
              <Text fontWeight="600" style={styles.transTitle}>{r.t}</Text>
              <Text style={styles.transBody}>{r.b}</Text>
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
  card: { backgroundColor: DV.card, borderRadius: 14, borderWidth: 1, borderColor: DV.hair, overflow: 'hidden' },
  lcdBg: { backgroundColor: '#0E1116', position: 'relative' },
  frameBadge: { position: 'absolute', top: 8, left: 10 },
  frameBadgeText: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  msBadge: { position: 'absolute', top: 8, right: 10 },
  msBadgeText: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '700' },
  turnLabel: { fontSize: 14, color: DV.ink },
  turnCaption: { fontSize: 13, color: DV.ink2, lineHeight: 20, marginTop: 3 },
  wordBox: { marginTop: 8, padding: 10, backgroundColor: '#F5F5F2', borderRadius: 8 },
  wordText: { fontSize: 13, color: DV.ink, fontStyle: 'italic', lineHeight: 18 },
  sectionLabel: { fontSize: 11, color: DV.ink2, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  transCard: { backgroundColor: DV.card, borderWidth: 1, borderColor: DV.hair, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 4 },
  transRow: { padding: 12 },
  transBorder: { borderBottomWidth: 1, borderBottomColor: DV.hair },
  transTitle: { fontSize: 13, color: DV.ink },
  transBody: { fontSize: 12, color: DV.ink2, lineHeight: 20, marginTop: 2 },
});
