import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import OnbShell, { OB } from '@/components/OnbShell';
import OnbBigBtn from '@/components/OnbBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import {
  writeAgeAnswer,
  type AgeAnswer,
  type AgeBandId,
} from '@/features/onboarding/ageGate';
import { setAnalyticsUserRole, initAnalytics, isAnalyticsEnabled } from '@/services/observability/analytics';
import { captureError, setSentryUserRole } from '@/services/observability/sentry';

const BANDS: Array<{ id: AgeBandId; label: string; helper?: string }> = [
  { id: 'U13', label: 'Under 13' },
  { id: '13_17', label: '13 – 17' },
  { id: '18_PLUS', label: '18 or older' },
  { id: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say', helper: 'We treat this as Under 13.' },
];

type Props = {
  onComplete?: (answer: AgeAnswer) => void;
};

export default function AgeScreen({ onComplete }: Props): React.JSX.Element {
  const [band, setBand] = React.useState<AgeBandId | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleContinue = async (): Promise<void> => {
    if (saving || !band) {
      if (!band) setError('Please pick an age range to continue.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const answer = await writeAgeAnswer(band);
      applyAgeAnswerObservability(answer);
      onComplete?.(answer);
    } catch {
      setError('We could not save your answer. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnbShell title="Welcome to TJBot">
      <Box paddingHorizontal={20} paddingTop={18}>
        <Text fontWeight="600" style={styles.heading}>How old are you?</Text>
        <Text style={styles.sub}>
          We ask this once so TJBot can set the right privacy defaults. We never
          share this answer.
        </Text>
      </Box>

      <Box paddingHorizontal={16} paddingTop={20}>
        <Text style={styles.sectionLabel}>AGE RANGE</Text>
        <Box style={styles.list} borderRadius={14} borderWidth={1} borderColor={OB.hair} overflow="hidden">
          {BANDS.map((b, i) => {
            const active = band === b.id;
            return (
              <TouchableOpacity
                key={b.id}
                testID={`ageBandOption_${b.id}`}
                onPress={() => setBand(b.id)}
                style={[
                  styles.row,
                  { backgroundColor: active ? '#E8F0FE' : 'transparent' },
                  i < BANDS.length - 1 && { borderBottomWidth: 1, borderBottomColor: OB.hair },
                ]}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Age range ${b.label}${active ? ' selected' : ''}`}
                accessibilityState={{ selected: active }}
              >
                <Box
                  style={[
                    styles.radio,
                    {
                      borderColor: active ? OB.accent : 'rgba(0,0,0,0.2)',
                      backgroundColor: active ? OB.accent : 'transparent',
                    },
                  ]}
                />
                <Box flex={1}>
                  <Text fontWeight="600" style={styles.rowLabel}>{b.label}</Text>
                  {b.helper ? <Text style={styles.rowHelper}>{b.helper}</Text> : null}
                </Box>
              </TouchableOpacity>
            );
          })}
        </Box>
      </Box>

      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <OnbBigBtn testID="ageScreenContinueButton" onClick={handleContinue}>
          {saving ? 'Saving...' : 'Continue'}
        </OnbBigBtn>
      </Box>
    </OnbShell>
  );
}

function applyAgeAnswerObservability(answer: AgeAnswer): void {
  try {
    setSentryUserRole(answer.role);
    if (answer.role === 'child') {
      setAnalyticsUserRole('child');
    } else if (!isAnalyticsEnabled()) {
      initAnalytics(answer.role);
    } else {
      setAnalyticsUserRole(answer.role);
    }
  } catch (error) {
    captureError(error);
  }
}

const styles = StyleSheet.create({
  heading: { fontSize: 22, color: OB.ink, marginBottom: 6, letterSpacing: -0.3 },
  sub: { fontSize: 14, color: OB.ink2, lineHeight: 21 },
  sectionLabel: {
    fontSize: 12,
    color: OB.ink3,
    paddingHorizontal: 4,
    paddingBottom: 8,
    letterSpacing: 0.6,
    fontWeight: '600',
  },
  list: { backgroundColor: OB.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, flexShrink: 0 },
  rowLabel: { fontSize: 16, color: OB.ink, marginBottom: 2 },
  rowHelper: { fontSize: 13, color: OB.ink3, lineHeight: 18 },
  error: { color: OB.danger, fontSize: 13, lineHeight: 19, marginBottom: 12 },
});
