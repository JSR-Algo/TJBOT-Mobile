import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ROUTES, type RootStackParamList } from '@/navigation/routes';
import OnbShell, { OB } from '@/components/OnbShell';
import OnbBigBtn from '@/components/OnbBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { referenceColors, referenceShadow } from '@/design-system/referenceTheme';

type Props = NativeStackScreenProps<RootStackParamList, 'TrustScreen'>;

const PROMISES = [
  {
    icon: <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><Path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z"/><Path d="M9 12l2 2 4-4"/></Svg>,
    title: 'Voice stays in the lesson',
    body: "Audio is processed during the lesson and discarded. We don't keep recordings.",
  },
  {
    icon: <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><Circle cx="12" cy="12" r="9"/><Path d="M12 8v4l3 2"/></Svg>,
    title: 'Short, focused sessions',
    body: 'Designed for a few minutes a day. No streaks that pressure your child to keep playing.',
  },
  {
    icon: <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><Circle cx="12" cy="8" r="4"/><Path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></Svg>,
    title: 'No social, no chat, no ads',
    body: 'No other kids, no messages, no advertising. Just your child and Robot.',
  },
  {
    icon: <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><Rect x="4" y="10" width="16" height="11" rx="2"/><Path d="M8 10V7a4 4 0 018 0v3"/></Svg>,
    title: 'You stay in control',
    body: 'Settings, data, and subscription live behind a parent gate the child cannot solve.',
  },
] as const;

export default function TrustScreen({ navigation }: Props) {
  return (
    <OnbShell title="Our promise" onBack={() => navigation.navigate(ROUTES.IntroCelebrateScreen)}>
      <Box paddingHorizontal={20} paddingTop={18} style={{ marginBottom: 8 }}>
        <Text fontWeight="600" style={styles.heading}>Made for kids 6–10. Designed with parents.</Text>
        <Text style={styles.sub}>Before we set things up, here's how we treat your child's privacy and time.</Text>
      </Box>
      <Box paddingHorizontal={16} gap={10}>
        {PROMISES.map((p, i) => (
          <Box key={i} style={styles.promiseCard} flexDirection="row" gap={12} alignItems="flex-start">
            <Box style={styles.iconWrap} alignItems="center" justifyContent="center">
              {p.icon}
            </Box>
            <Box flex={1}>
              <Text fontWeight="600" style={styles.promiseTitle}>{p.title}</Text>
              <Text style={styles.promiseBody}>{p.body}</Text>
            </Box>
          </Box>
        ))}
      </Box>
      <Box paddingHorizontal={20} paddingTop={14}>
        <Text style={styles.privacyNote}>
          Full details any time in <Text fontWeight="500" style={{ color: OB.accent }}>Parent Space → Safety & Privacy</Text>.
        </Text>
      </Box>
      <Box paddingHorizontal={20} paddingTop={14} paddingBottom={30}>
        <OnbBigBtn testID="trustContinueButton" onClick={() => navigation.navigate(ROUTES.LoginScreen)}>Continue</OnbBigBtn>
      </Box>
    </OnbShell>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 22, color: OB.ink, letterSpacing: 0, lineHeight: 28, marginBottom: 6 },
  sub: { fontSize: 14, color: OB.ink2, lineHeight: 22 },
  promiseCard: { backgroundColor: OB.card, borderWidth: 1, borderColor: OB.hair, borderRadius: 22, padding: 14, ...referenceShadow.card },
  iconWrap: { width: 34, height: 34, borderRadius: 12, backgroundColor: referenceColors.secondarySoft, color: OB.ink, flexShrink: 0 },
  promiseTitle: { fontSize: 14, color: OB.ink, marginBottom: 3 },
  promiseBody: { fontSize: 13, color: OB.ink2, lineHeight: 20 },
  privacyNote: { fontSize: 12, color: OB.ink3, lineHeight: 22 },
});
