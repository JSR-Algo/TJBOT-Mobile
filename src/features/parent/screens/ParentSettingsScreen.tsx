import React from 'react';
import { StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import ParentScroll, { PA } from '../components/ParentScroll';
import PRowGroup from '../components/PRowGroup';
import PRow from '../components/PRow';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { useAuth } from '@/contexts/AuthContext';
import { useHousehold } from '@/contexts/HouseholdContext';
import { ROUTES } from '@/navigation/routes';
import { useParentGateGuard } from '../hooks/useParentGateGuard';
import { captureError } from '@/services/observability/sentry';
import { useAppLanguage, type AppLocale } from '@/services/i18n/i18n';
import { getChildProfile, updateChildProfile, type ChildProfile, type UpdateProfileDto } from '@/services/api/learning';
import { updateChild } from '@/services/api/households';

type Props = NativeStackScreenProps<RootStackParamList, 'ParentSettingsScreen'>;

const LANG_OPTIONS: { v: AppLocale; label: string }[] = [
  { v: 'vi', label: 'Tiếng Việt' },
  { v: 'en', label: 'English' },
];

const CAREER_OPTIONS = [
  { value: 'teacher', label: 'Teacher' },
  { value: 'engineer', label: 'Engineer' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'business', label: 'Business' },
] as const;

const INTEREST_OPTIONS = ['animals', 'space', 'music', 'sports', 'stories', 'numbers'] as const;

function languageLabel(locale: AppLocale): string {
  return LANG_OPTIONS.find(option => option.v === locale)?.label ?? 'Tiếng Việt';
}

export default function ParentSettingsScreen({ navigation }: Props) {
  useParentGateGuard(navigation, ROUTES.ParentSettingsScreen);
  const { logout } = useAuth();
  const { activeChild, refresh } = useHousehold();
  const [mic, setMic] = React.useState(false);
  const [sound, setSound] = React.useState(false);
  const [haptics, setHaptics] = React.useState(false);
  const [analytics, setAnalytics] = React.useState(false);
  const [savingLanguage, setSavingLanguage] = React.useState<AppLocale | null>(null);
  const [languageSaveFailed, setLanguageSaveFailed] = React.useState(false);
  const [profile, setProfile] = React.useState<ChildProfile | null>(null);
  const [profileSaving, setProfileSaving] = React.useState(false);
  const [profileSaveFailed, setProfileSaveFailed] = React.useState(false);
  const [childNameDraft, setChildNameDraft] = React.useState('');
  const [childNameSaving, setChildNameSaving] = React.useState(false);
  const [childNameSaveFailed, setChildNameSaveFailed] = React.useState(false);
  const { language, setLanguage, t } = useAppLanguage();
  const childId = activeChild?.id;
  const householdId = activeChild?.household_id;

  React.useEffect(() => {
    let mounted = true;
    if (!childId) {
      setProfile(null);
      return () => { mounted = false; };
    }
    getChildProfile(childId)
      .then((nextProfile) => {
        if (mounted) setProfile(nextProfile);
      })
      .catch((error) => {
        captureError(error);
        if (mounted) setProfile(null);
      });
    return () => { mounted = false; };
  }, [childId]);

  React.useEffect(() => {
    setChildNameDraft(activeChild?.name ?? profile?.name ?? '');
  }, [activeChild?.name, profile?.name]);

  const updateLanguage = React.useCallback(async (nextLanguage: AppLocale): Promise<void> => {
    setSavingLanguage(nextLanguage);
    setLanguageSaveFailed(false);
    try {
      await setLanguage(nextLanguage);
    } catch (error) {
      captureError(error);
      setLanguageSaveFailed(true);
    } finally {
      setSavingLanguage(null);
    }
  }, [setLanguage]);

  const saveProfile = React.useCallback(async (patch: UpdateProfileDto): Promise<void> => {
    if (!childId || profileSaving) return;
    setProfileSaving(true);
    setProfileSaveFailed(false);
    try {
      const nextProfile = await updateChildProfile(childId, patch);
      setProfile(nextProfile);
    } catch (error) {
      captureError(error);
      setProfileSaveFailed(true);
    } finally {
      setProfileSaving(false);
    }
  }, [childId, profileSaving]);

  const saveChildName = React.useCallback(async (): Promise<void> => {
    const nextName = childNameDraft.trim();
    if (!childId || childNameSaving || nextName.length === 0) return;
    setChildNameSaving(true);
    setChildNameSaveFailed(false);
    try {
      if (householdId) {
        await updateChild(householdId, childId, { display_name: nextName });
        await refresh();
      } else {
        const nextProfile = await updateChildProfile(childId, { name: nextName });
        setProfile(nextProfile);
      }
      setProfile((current) => current ? { ...current, name: nextName } : current);
      setChildNameDraft(nextName);
    } catch (error) {
      captureError(error);
      setChildNameSaveFailed(true);
    } finally {
      setChildNameSaving(false);
    }
  }, [childId, childNameDraft, childNameSaving, householdId, refresh]);

  const toggleInterest = React.useCallback((interest: string) => {
    const current = profile?.interests ?? [];
    const next = current.includes(interest)
      ? current.filter((item) => item !== interest)
      : [...current, interest];
    void saveProfile({ interests: next });
  }, [profile?.interests, saveProfile]);

  const unavailableProfileRows = [
    'Child age',
    'Daily reminder',
    'Plan status',
    'Billing portal',
    'Help center',
    'App version',
  ] as const;

  return (
    <ParentScroll title="Settings" onBack={() => navigation.navigate(ROUTES.ParentSummaryScreen)}>
      <PRowGroup header="Language" footer="Changes apply to the whole app — for both child and parent surfaces.">
        <PRow icon="🌐" label="App language" value={languageLabel(language)} isLast />
        <Box paddingHorizontal={16} paddingBottom={14} paddingTop={0} flexDirection="row" gap={8} style={{ backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: PA.hair }}>
          {LANG_OPTIONS.map(o => (
            <TouchableOpacity
              key={o.v}
              accessibilityRole="radio"
              accessibilityLabel={`${o.label}, ${language === o.v ? t('Selected') : t('Not selected')}`}
              accessibilityState={{ selected: language === o.v, disabled: savingLanguage !== null }}
              disabled={savingLanguage !== null}
              onPress={() => { void updateLanguage(o.v); }}
              style={[
                styles.langBtn,
                { borderColor: language === o.v ? PA.accent : PA.hair, backgroundColor: language === o.v ? PA.accent : '#fff', opacity: savingLanguage !== null && savingLanguage !== o.v ? 0.6 : 1 },
              ]}
              activeOpacity={0.7}
            >
              <Text fontWeight="600" style={{ fontSize: 14, color: language === o.v ? '#fff' : PA.ink }} i18n={false}>
                {o.label}
              </Text>
            </TouchableOpacity>
          ))}
        </Box>
        {languageSaveFailed ? (
          <Box paddingHorizontal={16} paddingBottom={14} style={{ backgroundColor: '#fff' }}>
            <Text style={{ fontSize: 13, color: '#C0392B' }}>Language could not be saved. Try again.</Text>
          </Box>
        ) : null}
      </PRowGroup>

      <PRowGroup header="Profile and plan">
        <Box style={styles.nameEditor}>
          <Text fontWeight="600" style={styles.filterTitle}>Child name</Text>
          <Box flexDirection="row" gap={8} alignItems="center">
            <TextInput
              accessibilityLabel="Child name"
              value={childNameDraft}
              onChangeText={setChildNameDraft}
              editable={!childNameSaving && !!childId}
              maxLength={64}
              placeholder="Child name"
              style={styles.nameInput}
            />
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ disabled: childNameSaving || !childId || childNameDraft.trim().length === 0 }}
              disabled={childNameSaving || !childId || childNameDraft.trim().length === 0}
              onPress={() => { void saveChildName(); }}
              style={[styles.saveNameButton, (childNameSaving || !childId || childNameDraft.trim().length === 0) && styles.disabledButton]}
              activeOpacity={0.7}
            >
              <Text fontWeight="600" style={styles.saveNameButtonText}>Save child name</Text>
            </TouchableOpacity>
          </Box>
          {childNameSaveFailed ? <Text style={styles.profileError}>Child name could not be saved. Try again.</Text> : null}
        </Box>
        <PRow label="Learning level" value={profile?.vocabulary_level ?? 'Unavailable'} />
        <PRow label="Lesson length" value={profile?.attention_span_seconds ? `${Math.round(profile.attention_span_seconds / 60)} min` : 'Unavailable'} />
        {unavailableProfileRows.map((label, index) => (
          <PRow key={label} label={label} value="Unavailable" isLast={index === unavailableProfileRows.length - 1} />
        ))}
        <Box style={styles.nameEditor}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Add another child"
            onPress={() => navigation.navigate(ROUTES.AddChildScreen)}
            style={styles.saveNameButton}
            activeOpacity={0.7}
            testID="addChildButton"
          >
            <Text fontWeight="600" style={styles.saveNameButtonText}>+ Add another child</Text>
          </TouchableOpacity>
        </Box>
      </PRowGroup>

      <PRowGroup header="Personality filters" footer="These signals personalize lesson ordering without exposing the raw child profile in lesson cards.">
        <Box style={styles.personalityBlock}>
          <Text fontWeight="600" style={styles.filterTitle}>Parent career</Text>
          <Box flexDirection="row" gap={8} style={styles.chipWrap}>
            {CAREER_OPTIONS.map((option) => {
              const selected = profile?.parent_career === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled: profileSaving }}
                  disabled={profileSaving || !childId}
                  onPress={() => { void saveProfile({ parent_career: option.value }); }}
                  style={[styles.chip, selected && styles.chipSelected]}
                  activeOpacity={0.7}
                >
                  <Text fontWeight="600" style={[styles.chipText, selected && styles.chipTextSelected]} i18n={false}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </Box>
        </Box>
        <Box style={[styles.personalityBlock, styles.personalityBorder]}>
          <Text fontWeight="600" style={styles.filterTitle}>Child interests</Text>
          <Box flexDirection="row" gap={8} style={styles.chipWrap}>
            {INTEREST_OPTIONS.map((interest) => {
              const selected = profile?.interests.includes(interest) ?? false;
              return (
                <TouchableOpacity
                  key={interest}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled: profileSaving }}
                  disabled={profileSaving || !childId}
                  onPress={() => toggleInterest(interest)}
                  style={[styles.chip, selected && styles.chipSelected]}
                  activeOpacity={0.7}
                >
                  <Text fontWeight="600" style={[styles.chipText, selected && styles.chipTextSelected]} i18n={false}>{interest}</Text>
                </TouchableOpacity>
              );
            })}
          </Box>
          {profileSaveFailed ? <Text style={styles.profileError}>Profile filters could not be saved. Try again.</Text> : null}
        </Box>
      </PRowGroup>

      <PRowGroup header="Audio & feedback" footer="Microphone is required for speaking practice. Turning it off pauses voice lessons.">
        <PRow icon="🎤" label="Microphone" toggle={mic} onToggle={setMic} />
        <PRow icon="🔊" label="Sound effects" toggle={sound} onToggle={setSound} />
        <PRow icon="📳" label="Haptics" toggle={haptics} onToggle={setHaptics} isLast />
      </PRowGroup>

      <PRowGroup header="Privacy">
        <PRow icon="📊" label="Anonymous usage analytics" toggle={analytics} onToggle={setAnalytics} />
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('Open Safety & Privacy details')}
          onPress={() => navigation.navigate(ROUTES.ParentSafetyScreen)}
          activeOpacity={0.7}
        >
          <PRow icon="🛡" label="Safety & Privacy details" chevron />
        </TouchableOpacity>
        <PRow icon="🗑" label="Delete child's data" value="Unavailable" chevron isLast />
      </PRowGroup>

      <PRowGroup header="Support">
        <PRow icon="?" label="Help center" value="Unavailable" chevron />
        <PRow icon="✉" label="Contact support" value="Unavailable" chevron />
        <PRow icon="ⓘ" label="About Robot English" value="Unavailable" chevron />
        <PRow icon="🛡" label="Account privacy" chevron onPress={() => navigation.navigate(ROUTES.ParentAccountPrivacyScreen as never)} isLast />
      </PRowGroup>

      <PRowGroup>
        <PRow label="Sign out" danger onPress={() => { void logout(); }} isLast />
      </PRowGroup>

      <Box height={36} />
    </ParentScroll>
  );
}

const styles = StyleSheet.create({
  langBtn: {
    flex: 1, paddingVertical: 10, paddingHorizontal: 8, marginTop: 12,
    borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  personalityBlock: { paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff' },
  nameEditor: { paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff' },
  nameInput: {
    flex: 1,
    minHeight: 40,
    borderWidth: 1,
    borderColor: PA.hair,
    borderRadius: 10,
    paddingHorizontal: 12,
    color: PA.ink,
    backgroundColor: '#fff',
  },
  saveNameButton: {
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: PA.accent,
  },
  saveNameButtonText: { color: '#fff', fontSize: 13 },
  disabledButton: { opacity: 0.5 },
  personalityBorder: { borderTopWidth: 1, borderTopColor: PA.hair },
  filterTitle: { fontSize: 14, color: PA.ink, marginBottom: 10 },
  chipWrap: { flexWrap: 'wrap' },
  chip: {
    minHeight: 36,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: PA.hair,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  chipSelected: { backgroundColor: PA.accent, borderColor: PA.accent },
  chipText: { fontSize: 13, color: PA.ink },
  chipTextSelected: { color: '#fff' },
  profileError: { fontSize: 13, color: '#C0392B', marginTop: 10 },
});
