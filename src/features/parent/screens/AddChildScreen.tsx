import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ROUTES, type RootStackParamList } from '@/navigation/routes';
import OnbShell, { OB } from '@/components/OnbShell';
import OnbBigBtn from '@/components/OnbBigBtn';
import { Input } from '@/components/Input';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { useHousehold } from '@/contexts/HouseholdContext';
import type { Child } from '@/types';
import { Config } from '@/config';
import { translateTemplate, useAppLanguage } from '@/services/i18n/i18n';
import * as authApi from '@/services/api/auth';
import {
  allowsDevelopmentCoppaConsentBypass,
  childProfileSaveErrorMessage,
  saveOnboardingChildProfile,
} from '@/features/onboarding/childProfileSave';
import {
  CHILD_DISPLAY_NAME_MAX_LENGTH,
  normalizeChildDisplayName,
} from '@/features/onboarding/childDisplayName';

type Props = NativeStackScreenProps<RootStackParamList, 'AddChildScreen'>;

// Buddy / age-band / level vocabulary mirror the onboarding ChildProfileScreen so
// a parent-added child is configured identically to an onboarding-created one.
// Kept as a local copy rather than refactoring the (working, legal-reviewed)
// onboarding screen — surgical-changes rule from .agent/AGENT_ENTRYPOINT.md.
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

// Age band selector — mirrors backend `AgeBand`. We do NOT collect a full date of
// birth (COPPA minimisation); a representative birth-year midpoint is sent so the
// backend can derive the same band server-side.
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
  const birthYear = now.getFullYear() - years;
  return `${birthYear}-07-01`;
}

export function AddChildContent({ navigation }: Pick<Props, 'navigation'>): React.JSX.Element {
  const { language, t } = useAppLanguage();
  const { activeHousehold, addChild, createHousehold, setActiveChild } = useHousehold();
  const [buddy, setBuddy] = React.useState<(typeof BUDDIES)[number]['id']>('panda');
  const [childDisplayName, setChildDisplayName] = React.useState('');
  const [childDisplayNameEdited, setChildDisplayNameEdited] = React.useState(false);
  const [level, setLevel] = React.useState<(typeof LEVELS)[number]['id']>('starter');
  const [ageBand, setAgeBand] = React.useState<AgeBandId | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const sel = BUDDIES.find(b => b.id === buddy);
  const localizedBuddyLabel = t(sel?.label ?? 'Panda');
  const suggestedChildDisplayName = translateTemplate(
    '{{label}} friend',
    { label: localizedBuddyLabel },
    { locale: language },
  );
  const displayedChildName = childDisplayNameEdited ? childDisplayName : suggestedChildDisplayName;
  const effectiveChildName = normalizeChildDisplayName(displayedChildName, suggestedChildDisplayName);

  const saveChild = async (): Promise<void> => {
    if (saving) return;
    if (!ageBand) {
      setError('Pick an age range before saving.');
      return;
    }
    setSaving(true);
    setError(null);

    let child: Child;
    try {
      child = await saveOnboardingChildProfile({
        name: effectiveChildName,
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

    // Make the freshly-added child the app's active child. NOTE: this is the
    // app-local active-child selection (HouseholdContext / AsyncStorage). It does
    // NOT re-bind an already-paired robot on the backend — the device's
    // `assigned_child_profile_id` is only set during pairing (provision/complete),
    // and there is no mobile/backend API to reassign a paired device to a
    // different child. The robot keeps serving its paired child until re-paired.
    setActiveChild(child.id);

    setSaving(false);
    navigation.navigate(ROUTES.ParentSettingsScreen);
  };

  return (
    <OnbShell title="Add a child" testID="addChildScroll">
      <Box paddingHorizontal={20} paddingTop={18}>
        <Text fontWeight="600" style={styles.heading}>Pick a buddy and a starting level</Text>
        <Text style={styles.sub}>
          Your child's display name is optional. We don't ask for a legal name or photo.
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
        <Input
          label="Child's display name (optional)"
          value={displayedChildName}
          onChangeText={(value) => {
            setChildDisplayName(value);
            setChildDisplayNameEdited(true);
          }}
          autoCapitalize="words"
          maxLength={CHILD_DISPLAY_NAME_MAX_LENGTH}
          testID="addChildDisplayNameInput"
          style={styles.childNameInput}
        />
        <Text style={styles.buddyNote}>Robot will say: <Text fontWeight="700">"Hi, {effectiveChildName}!"</Text></Text>
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
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel}
                accessibilityState={{ selected: active }}
                testID={`addChildAgeBand_${b.id}`}
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
        <OnbBigBtn testID="addChildSaveButton" onClick={saveChild}>{saving ? 'Saving...' : 'Save child'}</OnbBigBtn>
      </Box>
    </OnbShell>
  );
}

export default function AddChildScreen({ navigation }: Props): React.JSX.Element {
  return <AddChildContent navigation={navigation} />;
}

const styles = StyleSheet.create({
  heading: { fontSize: 22, color: OB.ink, marginBottom: 6, letterSpacing: -0.3 },
  sub: { fontSize: 14, color: OB.ink2, lineHeight: 21 },
  sectionLabel: { fontSize: 12, color: OB.ink3, paddingHorizontal: 4, paddingBottom: 8, letterSpacing: 0.6, fontWeight: '600' },
  buddyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  buddyBtn: { width: '23%', aspectRatio: 1, borderWidth: 2, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  childNameInput: { marginTop: 16, marginBottom: 0 },
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
