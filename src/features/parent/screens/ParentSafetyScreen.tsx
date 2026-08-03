import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import ParentScroll, { PA } from '../components/ParentScroll';
import PRowGroup from '../components/PRowGroup';
import PRow from '../components/PRow';
import { Icon, type IconName } from '@/design-system/icons';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';
import { useParentGateGuard } from '../hooks/useParentGateGuard';

type Props = NativeStackScreenProps<RootStackParamList, 'ParentSafetyScreen'>;

function Section({
  icon,
  title,
  body,
  items,
}: {
  icon: IconName;
  title: string;
  body?: string;
  items?: readonly string[];
}) {
  return (
    <Box style={styles.section}>
      <Box flexDirection="row" alignItems="center" gap={10}>
        <Box style={styles.sectionIcon} alignItems="center" justifyContent="center">
          <Icon name={icon} size={19} color={PA.accent} strokeWidth={2.3} />
        </Box>
        <Text fontWeight="600" style={styles.sectionTitle}>{title}</Text>
      </Box>
      {body ? <Text style={styles.sectionBody}>{body}</Text> : null}
      {items ? (
        <Box gap={8}>
          {items.map((x) => (
            <Box key={x} flexDirection="row" gap={8}>
              <Icon name="CircleCheck" size={16} color={PA.good} strokeWidth={2.4} />
              <Text style={styles.bullet}>{x}</Text>
            </Box>
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
        icon="Mic"
        title="Microphone"
        body="The microphone turns on only during a lesson, while your child is speaking with the robot. It turns off automatically when the lesson ends or the app goes to the background."
      />
      <Section
        icon="AudioLines"
        title="Voice data"
        items={[
          "Your child's voice is processed in real time and is not saved.",
          "We do not store audio recordings.",
          "We do not store word-by-word transcripts.",
          "Lesson summaries (which words were practiced, how long) are saved for 30 days.",
        ]}
      />
      <Section
        icon="ShieldCheck"
        title="Child safety"
        items={[
          "No chat, friends, or social features.",
          "No advertising. No third-party trackers.",
          "No links out of the app from the play area.",
          "Purchases and account changes live in Parent Space only.",
        ]}
      />
      <Section
        icon="Database"
        title="What we collect"
        body="A pseudonymous learner ID, lesson summaries (last 30 days), app version, and crash diagnostics. We do not collect contact info or location."
      />

      <PRowGroup>
        <PRow icon="📄" label="Privacy Policy" />
        <PRow icon="📄" label="Terms of Service" />
        <PRow icon="✉" label="Contact privacy team" isLast />
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
  section: {
    backgroundColor: PA.card,
    borderColor: PA.hair,
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 18,
  },
  sectionIcon: { backgroundColor: '#FFE5E5', borderRadius: 14, height: 38, width: 38 },
  sectionTitle: { fontSize: 16, color: PA.ink, letterSpacing: -0.2 },
  sectionBody: { fontSize: 14, color: PA.ink2, lineHeight: 21 },
  bullet: { flex: 1, fontSize: 14, color: PA.ink2, lineHeight: 21 },
  legal: { fontSize: 12, color: PA.ink3, lineHeight: 18 },
});
