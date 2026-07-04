import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import OnbShell, { OB } from '@/components/OnbShell';
import OnbBigBtn from '@/components/OnbBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';
import { recordAiVoiceConsent } from '@/services/api/auth';
import { ensureMicPermission } from '@/features/lessonDemo/voiceReadiness';

type Props = NativeStackScreenProps<RootStackParamList, 'MicAskScreen'>;

const POINTS = [
  'Used only during a lesson',
  'AI voice uses Google processing',
  'No recording is saved',
  'You can revoke it anytime in Settings',
] as const;

const AI_VOICE_CONSENT_VERSION = 'ai-voice-google-v1';
const GOOGLE_SUBPROCESSORS_VERSION = 'google-subprocessors-v1';

export default function MicAskScreen({ navigation }: Props) {
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const continueWithConsent = async (): Promise<void> => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await recordAiVoiceConsent({
        consent_version: AI_VOICE_CONSENT_VERSION,
        google_subprocessors_version: GOOGLE_SUBPROCESSORS_VERSION,
      });
      const micGranted = await ensureMicPermission();
      if (!micGranted) {
        setError('Microphone permission is required. Tap Continue again and choose Allow.');
        return;
      }
      navigation.navigate(ROUTES.FirstLessonEntryScreen);
    } catch {
      setError('Consent must be saved before voice setup can continue.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnbShell title="Microphone" onBack={() => navigation.navigate(ROUTES.ChildProfileScreen)}>
      <Box paddingTop={30} paddingHorizontal={24} alignItems="center">
        <Box style={styles.micIcon} alignItems="center" justifyContent="center">
          <Svg width={40} height={48} viewBox="0 0 24 28" fill="none">
            <Rect x="8" y="2" width="8" height="14" rx="4" fill={OB.ink} />
            <Path d="M5 12 a7 7 0 0 0 14 0 M12 19 v5 M8 24 h8" stroke={OB.ink} strokeWidth="2.2" strokeLinecap="round" fill="none" />
          </Svg>
        </Box>
        <Text fontWeight="600" style={styles.heading}>Robot needs the mic to listen</Text>
        <Text style={styles.sub}>
          The next screen is your phone's permission prompt. Tap <Text fontWeight="700" style={{ color: OB.ink }}>Allow</Text> so your child can speak to Robot.
        </Text>
      </Box>
      <Box paddingHorizontal={16} paddingTop={24} gap={8}>
        {POINTS.map((t, i) => (
          <Box key={i} style={styles.pointRow} flexDirection="row" alignItems="center" gap={10}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#1F8A5B" strokeWidth="2.4" strokeLinecap="round">
              <Path d="M5 12l5 5 9-10" />
            </Svg>
            <Text style={styles.pointText}>{t}</Text>
          </Box>
        ))}
      </Box>
      {error ? (
        <Box paddingHorizontal={20} paddingTop={16}>
          <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
        </Box>
      ) : null}
      <Box paddingHorizontal={20} paddingTop={22} paddingBottom={30} gap={10}>
        <OnbBigBtn onClick={continueWithConsent}>{saving ? 'Saving...' : 'Continue'}</OnbBigBtn>
      </Box>
    </OnbShell>
  );
}

const styles = StyleSheet.create({
  micIcon: { width: 96, height: 96, borderRadius: 24, backgroundColor: OB.card, borderWidth: 1, borderColor: OB.hair, marginBottom: 18 },
  heading: { fontSize: 22, color: OB.ink, letterSpacing: -0.3, textAlign: 'center', marginBottom: 8 },
  sub: { fontSize: 14, color: OB.ink2, lineHeight: 22, textAlign: 'center', maxWidth: 320 },
  pointRow: { backgroundColor: OB.card, borderWidth: 1, borderColor: OB.hair, borderRadius: 12, padding: 14 },
  pointText: { fontSize: 14, color: OB.ink, flex: 1 },
  error: { fontSize: 13, color: '#B42318', lineHeight: 19 },
});
