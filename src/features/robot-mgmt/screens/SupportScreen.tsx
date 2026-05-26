import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import DeviceRow from '@/components/DeviceRow';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { RM } from '../components/RM';
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'SupportScreen'>;

const TOPICS = [
  { id: 'hardware', t: 'Robot device' },
  { id: 'sound', t: 'Sound or microphone' },
  { id: 'wifi', t: 'Wi-Fi or pairing' },
  { id: 'lessons', t: 'Lessons & courses' },
  { id: 'account', t: 'Account & billing' },
  { id: 'other', t: 'Something else' },
] as const;

type TopicId = typeof TOPICS[number]['id'];

const ATTACHED = ['Robot ROB-2A8F', 'Software v1.4.2', 'Wi-Fi: strong', 'Battery: 78%', 'iOS app v3.1'];

export default function SupportScreen({ navigation }: Props) {
  const [topic, setTopic] = React.useState<TopicId>('hardware');
  return (
    <DeviceShell title="Contact support" onBack={() => navigation.navigate(ROUTES.MyRobotScreen)}>
      <Box paddingHorizontal={24} paddingTop={18}>
        <Text style={styles.intro}>We're a small team and we read every message. Most replies arrive within a day.</Text>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Box style={styles.rowCard}>
          <DeviceRow icon="💬" title="Chat with us" body="Mon–Fri · 9 AM – 6 PM ET" />
          <DeviceRow icon="✉️" title="Email support" body="hello@robotbuddy.app · reply in ~1 day" />
          <DeviceRow icon="📚" title="Help articles" body="Setup, sounds, accounts, more" />
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Text fontWeight="700" style={styles.sectionLabel}>Or send us a note</Text>
        <Box style={styles.formCard}>
          <Text fontWeight="600" style={styles.formLabel}>What's it about?</Text>
          <Box style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {TOPICS.map(t => {
              const sel = topic === t.id;
              return (
                <TouchableOpacity key={t.id} onPress={() => setTopic(t.id)} activeOpacity={0.8}
                  style={[styles.topicBtn, sel && styles.topicBtnSel]}>
                  <Text fontWeight="600" style={[styles.topicText, { color: sel ? RM.accent : RM.ink2 }]}>{t.t}</Text>
                </TouchableOpacity>
              );
            })}
          </Box>
          <Text fontWeight="600" style={[styles.formLabel, { marginTop: 14 }]}>Tell us what's happening</Text>
          <Box style={styles.textArea}>
            <Text style={styles.textAreaPlaceholder}>Robot's voice cuts out halfway through lessons. We've tried…</Text>
          </Box>
          <Text style={styles.attachNote}>
            We'll attach a small device report (battery, Wi-Fi strength, software version). No audio, no transcripts.
          </Text>
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Text fontWeight="700" style={styles.sectionLabel}>Will be attached</Text>
        <Box style={[styles.formCard, { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }]}>
          {ATTACHED.map(t => (
            <Box key={t} style={styles.tag}><Text fontWeight="600" style={styles.tagText}>{t}</Text></Box>
          ))}
        </Box>
      </Box>

      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30} gap={10}>
        <DeviceBigBtn onClick={() => navigation.navigate(ROUTES.MyRobotScreen)}>Send to support</DeviceBigBtn>
        <DeviceBigBtn secondary onClick={() => navigation.navigate(ROUTES.MyRobotScreen)}>Cancel</DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 13, color: RM.ink2, lineHeight: 20 },
  rowCard: { backgroundColor: RM.card, borderWidth: 1, borderColor: RM.hair, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 4 },
  sectionLabel: { fontSize: 11, color: RM.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  formCard: { backgroundColor: RM.card, borderWidth: 1, borderColor: RM.hair, borderRadius: 14, padding: 14 },
  formLabel: { fontSize: 12, color: RM.ink3, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
  topicBtn: { borderWidth: 1, borderColor: RM.hair, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 12, backgroundColor: RM.card },
  topicBtnSel: { borderWidth: 1.5, borderColor: RM.accent, backgroundColor: '#E8F0FE' },
  topicText: { fontSize: 13 },
  textArea: { backgroundColor: '#F8F8F5', borderWidth: 1, borderColor: RM.hair, borderRadius: 10, padding: 12, minHeight: 90 },
  textAreaPlaceholder: { fontSize: 14, color: RM.ink3, lineHeight: 22 },
  attachNote: { fontSize: 11, color: RM.ink2, lineHeight: 18, marginTop: 10 },
  tag: { backgroundColor: '#EEF1F5', paddingVertical: 4, paddingHorizontal: 9, borderRadius: 6 },
  tagText: { fontSize: 11, color: RM.ink2 },
});
