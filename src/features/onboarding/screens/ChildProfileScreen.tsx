import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ROUTES, type RootStackParamList } from '@/navigation/routes';
import OnbShell, { OB } from '@/components/OnbShell';
import OnbBigBtn from '@/components/OnbBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { useHousehold } from '@/contexts/HouseholdContext';
import type { Child } from '@/types';
import { Config } from '@/config';
import { translateTemplate, useAppLanguage } from '@/services/i18n/i18n';
import * as authApi from '@/services/api/auth';
import { finalizeDevicePairing } from '@/features/device/pairing/finalizeDevicePairing';
import {
  allowsDevelopmentCoppaConsentBypass,
  childProfileSaveErrorMessage,
  pairingFinalizeErrorMessage,
  saveOnboardingChildProfile,
} from '../childProfileSave';

type Props = NativeStackScreenProps<RootStackParamList, 'ChildProfileScreen' | 'PairChildProfileScreen'>;

const BUDDIES = [
  { id: 'panda', emoji: '🐼', label: 'Panda' },
  { id: 'cat', emoji: '🐱', label: 'Cat' },
  { id: 'fox', emoji: '🦊', label: 'Fox' },
  { id: 'rabbit', emoji: '🐰', label: 'Rabbit' },
  { id: 'frog', emoji: '🐸', label: 'Frog' },
  { id: 'lion', emoji: '🦁', label: 'Lion' },
  { id: 'unicorn', emoji: '🦄', label: 'Unicorn' },
  { id: 'dog', emoji: '🐶', label: 'Dog' },
] as const;

const LEVELS = [
  { id: 'starter', label: 'Just starting', body: 'New to English. Lots of Robot voice and pictures.' },
  { id: 'building', label: 'Knows some words', body: 'Can say a few English words. Ready for short phrases.' },
  { id: 'flowing', label: 'Speaks a bit', body: 'Can answer simple questions. Ready to talk in sentences.' },
] as const;

const LEVEL_TO_VOCABULARY: Record<(typeof LEVELS)[number]['id'], NonNullable<Child['vocabulary_level']>> = {
  starter: 'beginner',
  building: 'basic',
  flowing: 'intermediate',
};

// Age band selector — mirrors backend `AgeBand` (U4 / PRE_K / K_3 / OVER_10).
// We deliberately do NOT collect a full date of birth: COPPA minimisation +
// this screen's own promise ("We don't ask for your child's name or photo").
// The picked band drives content age-gating; a representative birth-year
// midpoint is sent to the backend so it can derive the same band server-side.
const AGE_BANDS = [
  { id: 'U4',      label: 'Under 4',  midpointYears: 3 },
  { id: 'PRE_K',   label: '4 – 6',    midpointYears: 5 },
  { id: 'K_3',     label: '7 – 10',   midpointYears: 8 },
  { id: 'OVER_10', label: 'Over 10',  midpointYears: 11 },
] as const;

type AgeBandId = (typeof AGE_BANDS)[number]['id'];

function dobFromAgeBand(bandId: AgeBandId): string {
  const band = AGE_BANDS.find(b => b.id === bandId);
  const years = band?.midpointYears ?? 5;
  const now = new Date();
  // Use July 1 of (this year - years) to avoid month-of-year bias and to
  // keep the value deterministic across same-day re-saves.
  const birthYear = now.getFullYear() - years;
  return `${birthYear}-07-01`;
}

export default function ChildProfileScreen({ navigation, route }: Props) {
  const { language, t } = useAppLanguage();
  const { activeHousehold, addChild, createHousehold } = useHousehold();
  const [buddy, setBuddy] = React.useState<(typeof BUDDIES)[number]['id']>('panda');
  const [level, setLevel] = React.useState<(typeof LEVELS)[number]['id']>('starter');
  const [ageBand, setAgeBand] = React.useState<AgeBandId | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  // In the from-pairing path, the child can be created successfully but the
  // finalize step still fail. Remember the created child so a retry FINISHES the
  // pairing for that same child instead of creating a duplicate profile.
  const createdChildRef = React.useRef<Child | null>(null);
  const sel = BUDDIES.find(b => b.id === buddy);

  const saveChildProfile = async (): Promise<void> => {
    if (saving) return;
    if (!ageBand) {
      setError('Pick an age range before saving.');
      return;
    }
    setSaving(true);
    setError(null);

    let child: Child;
    if (createdChildRef.current) {
      // Retry of a from-pairing save whose child already exists — reuse it so we
      // finish the pairing rather than creating a duplicate profile.
      child = createdChildRef.current;
    } else {
      try {
        child = await saveOnboardingChildProfile({
          name: `${sel?.label ?? 'Panda'} friend`,
          date_of_birth: dobFromAgeBand(ageBand),
          vocabulary_level: LEVEL_TO_VOCABULARY[level],
          learning_style: 'visual',
        }, {
          activeHousehold,
          createHousehold,
          addChild,
          recordDevelopmentCoppaConsent: () => authApi.sendConsent('tok_test_bypass'),
          allowDevelopmentCoppaConsentBypass: allowsDevelopmentCoppaConsentBypass(__DEV__, Config.API_BASE_URL),
        });
      } catch (saveError: unknown) {
        setError(childProfileSaveErrorMessage(saveError));
        setSaving(false);
        return;
      }
      createdChildRef.current = child;
    }

    // Entered mid-pairing (PairRenameScreen routed here because the household had
    // no child): FINISH the pairing the parent started with the child they just
    // created, landing on the same DeviceHome/PairSuccess terminus as the happy
    // path. Do NOT fall through to MicAskScreen — that would abandon the
    // already-claimed robot in onboarding.
    const pairing = route.params?.pairing;
    if (pairing) {
      try {
        await finalizeDevicePairing(navigation, pairing, child.id);
      } catch (finalizeError: unknown) {
        // The child was created successfully; only the finalize step failed.
        // Surface a sensible error in-place (the parent can retry the save, which
        // now finds the existing child) rather than silently dead-ending.
        setError(pairingFinalizeErrorMessage(finalizeError));
      } finally {
        setSaving(false);
      }
      return;
    }

    // Plain onboarding (no pairing context): advance to the next onboarding step.
    navigation.navigate(ROUTES.MicAskScreen);
    setSaving(false);
  };

  return (
    <OnbShell title="Your child's buddy">
      <Box paddingHorizontal={20} paddingTop={18}>
        <Text fontWeight="600" style={styles.heading}>Pick a buddy and a starting level</Text>
        <Text style={styles.sub}>
          We don't ask for your child's name or photo. The buddy is how Robot greets them.
        </Text>
      </Box>

      <Box paddingHorizontal={16} paddingTop={20}>
        <Text style={styles.sectionLabel}>BUDDY</Text>
        <Box style={styles.buddyGrid}>
          {BUDDIES.map(b => {
            const active = buddy === b.id;
            const accessibilityLabel = translateTemplate(
              active ? 'Buddy {{label}} selected' : 'Buddy {{label}}',
              { label: b.label },
              { locale: language },
            );
            return (
              <TouchableOpacity
                key={b.id}
                onPress={() => setBuddy(b.id)}
                style={[
                  styles.buddyBtn,
                  { borderColor: active ? OB.accent : OB.hair, backgroundColor: active ? '#E8F0FE' : OB.card },
                ]}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel}
                accessibilityState={{ selected: active }}
              >
                <Text style={{ fontSize: 30 }}>{b.emoji}</Text>
              </TouchableOpacity>
            );
          })}
        </Box>
        <Text style={styles.buddyNote}>Robot will say: <Text fontWeight="700">"Hi, {sel?.label} friend!"</Text></Text>
      </Box>

      <Box paddingHorizontal={16} paddingTop={20}>
        <Text style={styles.sectionLabel}>AGE RANGE</Text>
        <Box style={styles.ageBandRow}>
          {AGE_BANDS.map(b => {
            const active = ageBand === b.id;
            const localizedLabel = t(b.label);
            const accessibilityLabel = translateTemplate(
              active ? 'Age range {{label}} selected' : 'Age range {{label}}',
              { label: localizedLabel },
              { locale: language },
            );
            return (
              <TouchableOpacity
                key={b.id}
                onPress={() => setAgeBand(b.id)}
                style={[
                  styles.ageBandBtn,
                  { borderColor: active ? OB.accent : OB.hair, backgroundColor: active ? '#E8F0FE' : OB.card },
                ]}
                activeOpacity={0.7}
                testID={`childAgeBand_${b.id}`}
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel}
                accessibilityState={{ selected: active }}
              >
                <Text fontWeight="700" style={[styles.ageBandText, active && { color: OB.accent }]}>{b.label}</Text>
              </TouchableOpacity>
            );
          })}
        </Box>
        <Text style={styles.note}>We only need an age range, not a birthday.</Text>
      </Box>

      <Box paddingHorizontal={16} paddingTop={20}>
        <Text style={styles.sectionLabel}>STARTING LEVEL</Text>
        <Box style={styles.levelList} borderRadius={14} borderWidth={1} borderColor={OB.hair} overflow="hidden">
          {LEVELS.map((l, i) => {
            const active = level === l.id;
            const localizedLabel = t(l.label);
            const accessibilityLabel = translateTemplate(
              active ? 'Starting level {{label}} selected' : 'Starting level {{label}}',
              { label: localizedLabel },
              { locale: language },
            );
            return (
              <TouchableOpacity
                key={l.id}
                onPress={() => setLevel(l.id)}
                style={[
                  styles.levelRow,
                  { backgroundColor: active ? '#E8F0FE' : 'transparent' },
                  i < LEVELS.length - 1 && { borderBottomWidth: 1, borderBottomColor: OB.hair },
                ]}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel}
                accessibilityState={{ selected: active }}
              >
                <Box
                  style={[
                    styles.radio,
                    { borderColor: active ? OB.accent : 'rgba(0,0,0,0.2)', backgroundColor: active ? OB.accent : 'transparent' },
                  ]}
                  alignItems="center"
                  justifyContent="center"
                >
                  {active && (
                    <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.5} strokeLinecap="round">
                      <Path d="M5 12l5 5 9-10" />
                    </Svg>
                  )}
                </Box>
                <Box flex={1}>
                  <Text fontWeight="600" style={{ fontSize: 15, color: OB.ink, marginBottom: 2 }}>{l.label}</Text>
                  <Text style={{ fontSize: 13, color: OB.ink2, lineHeight: 19 }}>{l.body}</Text>
                </Box>
              </TouchableOpacity>
            );
          })}
        </Box>
        <Text style={styles.note}>Robot adapts as you go — you can change this any time.</Text>
      </Box>

      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30}>
        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : null}
        <OnbBigBtn testID="childProfileSaveButton" onClick={saveChildProfile}>{saving ? 'Saving...' : 'Save and meet Tee'}</OnbBigBtn>
      </Box>
    </OnbShell>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 22, color: OB.ink, marginBottom: 6, letterSpacing: -0.3 },
  sub: { fontSize: 14, color: OB.ink2, lineHeight: 21 },
  sectionLabel: { fontSize: 12, color: OB.ink3, paddingHorizontal: 4, paddingBottom: 8, letterSpacing: 0.6, fontWeight: '600' },
  buddyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  buddyBtn: { width: '23%', aspectRatio: 1, borderWidth: 2, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  buddyNote: { fontSize: 13, color: OB.ink2, paddingTop: 10, paddingHorizontal: 4 },
  ageBandRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ageBandBtn: { minHeight: 44, paddingHorizontal: 18, paddingVertical: 10, borderWidth: 2, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  ageBandText: { fontSize: 15, color: OB.ink },
  levelList: { backgroundColor: OB.card },
  levelRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, flexShrink: 0, marginTop: 2 },
  note: { fontSize: 12, color: OB.ink3, paddingTop: 8, paddingHorizontal: 4, lineHeight: 18 },
  error: { color: OB.danger, fontSize: 13, lineHeight: 19, marginBottom: 12 },
});
