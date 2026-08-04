import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import ParentScroll, { PA } from '../components/ParentScroll';
import PRowGroup from '../components/PRowGroup';
import PRow from '../components/PRow';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';
import { useParentGateGuard } from '../hooks/useParentGateGuard';

type Props = NativeStackScreenProps<RootStackParamList, 'ParentSafetyScreen'>;

function Section({ title, body, items }: { title: string; body?: string; items?: readonly string[] }) {
  return (
    <Box paddingHorizontal={20} paddingTop={18} paddingBottom={4}>
      <Text fontWeight="600" style={styles.sectionTitle}>{title}</Text>
      {body ? <Text style={styles.sectionBody}>{body}</Text> : null}
      {items ? (
        <Box gap={4}>
          {items.map((x, i) => (
            <Text key={i} style={styles.bullet}>• {x}</Text>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}

export default function ParentSafetyScreen({ navigation }: Props) {
  useParentGateGuard(navigation, ROUTES.ParentSafetyScreen);
  return (
    <ParentScroll title="Safety & Privacy" onBack={() => navigation.navigate(ROUTES.ParentSummaryScreen)}>
      <Section
        title="Microphone"
        body="The microphone turns on only during a lesson, while your child is speaking with the robot. It turns off automatically when the lesson ends or the app goes to the background."
      />
      <Section
        title="Voice data"
        items={[
          "Your child's voice is processed in real time and is not saved.",
          "We do not store audio recordings.",
          "We do not store word-by-word transcripts.",
          "Lesson summaries (which words were practiced, how long) are saved for 30 days.",
        ]}
      />
      <Section
        title="Child safety"
        items={[
          "No chat, friends, or social features.",
          "No advertising. No third-party trackers.",
          "No links out of the app from the play area.",
          "Purchases and account changes live in Parent Space only.",
        ]}
      />
      <Section
        title="What we collect"
        body="A pseudonymous learner ID, lesson summaries (last 30 days), and app version. We do not collect contact info, location, analytics, or crash diagnostics."
      />

      <PRowGroup>
        <PRow icon="📄" label="Privacy Policy" chevron />
        <PRow icon="📄" label="Terms of Service" chevron />
        <PRow icon="✉" label="Contact privacy team" chevron isLast />
      </PRowGroup>

      <Box paddingHorizontal={20} paddingTop={10} paddingBottom={36}>
        <Text style={styles.legal}>
          Robot English is designed for children ages 5–9 and complies with children's privacy regulations including COPPA and GDPR-K.
        </Text>
      </Box>
    </ParentScroll>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 16, color: PA.ink, marginBottom: 6, letterSpacing: -0.2 },
  sectionBody: { fontSize: 14, color: PA.ink2, lineHeight: 21 },
  bullet: { fontSize: 14, color: PA.ink2, lineHeight: 23, paddingLeft: 4 },
  legal: { fontSize: 12, color: PA.ink3, lineHeight: 18 },
});
