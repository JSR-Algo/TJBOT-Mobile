import React from 'react';
import { Alert, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
// Read the shipped version straight from app config (static JSON) instead of
// expo-constants — the latter is an ESM native module that Jest can't parse and
// that adds no value for a build-time-constant string.
import appConfig from '../../../../app.json';
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
import { isAnalyticsEnabled } from '@/services/observability/analytics';
import { getAnalyticsPreference, setAnalyticsPreference } from '@/services/observability/analyticsPreference';
import { translateTemplate, useAppLanguage, type AppLocale } from '@/services/i18n/i18n';
import { getChildProfile, updateChildProfile, type ChildProfile, type UpdateProfileDto } from '@/services/api/learning';
import { deleteChild, setActiveChild as confirmActiveChild, updateChildDisplayName } from '@/services/api/households';
import {
  AI_VOICE_CONSENT_VERSION,
  GOOGLE_SUBPROCESSORS_VERSION,
  recordAiVoiceConsent,
  withdrawAiVoiceConsent,
} from '@/services/api/auth';
import { rewardKeys } from '@/features/rewards/hooks/useRewards';
import { appQueryClient } from '@/services/query/queryClient';

type Props = NativeStackScreenProps<RootStackParamList, 'ParentSettingsScreen'>;

const LANG_OPTIONS: { v: AppLocale; label: string }[] = [
  { v: 'vi', label: 'Tiếng Việt' },
  { v: 'en', label: 'English' },
];

// `value` is the wire/enum stored on the backend; `label` is an i18n key routed
// through the DS Text (both en + vi keys exist), so the visible chip localizes
// while the persisted value stays stable.
const CAREER_OPTIONS = [
  { value: 'teacher', label: 'Teacher' },
  { value: 'engineer', label: 'Engineer' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'business', label: 'Business' },
] as const;

const INTEREST_OPTIONS = [
  { value: 'animals', label: 'Animals' },
  { value: 'space', label: 'Space' },
  { value: 'music', label: 'Music' },
  { value: 'sports', label: 'Sports' },
  { value: 'stories', label: 'Stories' },
  { value: 'numbers', label: 'Numbers' },
] as const;

const VOICE_CONSENT_WITHDRAW_REASON = 'Parent paused AI voice lessons from mobile settings.';

function languageLabel(locale: AppLocale): string {
  return LANG_OPTIONS.find(option => option.v === locale)?.label ?? 'Tiếng Việt';
}

export default function ParentSettingsScreen({ navigation }: Props) {
  useParentGateGuard(navigation, ROUTES.ParentSettingsScreen);
  const { logout } = useAuth();
  const { activeChild, children, refresh, setActiveChild } = useHousehold();
  const [analytics, setAnalytics] = React.useState(isAnalyticsEnabled());
  const [savingLanguage, setSavingLanguage] = React.useState<AppLocale | null>(null);
  const [languageSaveFailed, setLanguageSaveFailed] = React.useState(false);
  const [profile, setProfile] = React.useState<ChildProfile | null>(null);
  const [profileLoading, setProfileLoading] = React.useState(false);
  const [profileLoadFailed, setProfileLoadFailed] = React.useState(false);
  const [profileSaving, setProfileSaving] = React.useState(false);
  const [profileSaveFailed, setProfileSaveFailed] = React.useState(false);
  const [childNameDraft, setChildNameDraft] = React.useState('');
  const [childNameSaving, setChildNameSaving] = React.useState(false);
  const [childNameSaveFailed, setChildNameSaveFailed] = React.useState(false);
  const [activeChildSaving, setActiveChildSaving] = React.useState<string | null>(null);
  const [activeChildSaveFailed, setActiveChildSaveFailed] = React.useState(false);
  const [voiceConsentSaving, setVoiceConsentSaving] = React.useState<'grant' | 'withdraw' | null>(null);
  const [voiceConsentMessage, setVoiceConsentMessage] = React.useState<string | null>(null);
  const [voiceConsentSaveFailed, setVoiceConsentSaveFailed] = React.useState(false);
  const { language, setLanguage, t } = useAppLanguage();
  const childId = activeChild?.id;
  // Guards against a fetch resolving after childId changed / unmount.
  const profileReqRef = React.useRef(0);

  const loadProfile = React.useCallback(() => {
    if (!childId) {
      setProfile(null);
      setProfileLoading(false);
      setProfileLoadFailed(false);
      return;
    }
    const myId = ++profileReqRef.current;
    setProfileLoading(true);
    setProfileLoadFailed(false);
    getChildProfile(childId)
      .then((nextProfile) => {
        if (profileReqRef.current !== myId) return;
        setProfile(nextProfile);
        setProfileLoading(false);
      })
      .catch((error) => {
        captureError(error);
        if (profileReqRef.current !== myId) return;
        // Keep it explicit: a fetch failure must NOT look like an empty profile,
        // or the parent could tap chips and overwrite real saved data unseen.
        setProfile(null);
        setProfileLoading(false);
        setProfileLoadFailed(true);
      });
  }, [childId]);

  React.useEffect(() => {
    loadProfile();
    return () => { profileReqRef.current += 1; };
  }, [loadProfile]);

  // Personalization chips are only safe to edit once we actually know the saved
  // profile. Block editing while loading or after a load failure.
  const profileEditingDisabled = !childId || profileLoading || profileLoadFailed || profileSaving;

  const hydratedChildName = activeChild?.name ?? profile?.name ?? '';
  React.useEffect(() => {
    setChildNameDraft(hydratedChildName);
  }, [hydratedChildName]);

  // Hydrate the analytics switch from the parent's persisted choice (falls back
  // to the current role-based enable state when nothing is stored).
  React.useEffect(() => {
    let mounted = true;
    getAnalyticsPreference()
      .then((pref) => {
        if (mounted) setAnalytics(pref ?? isAnalyticsEnabled());
      })
      .catch(() => {
        if (mounted) setAnalytics(isAnalyticsEnabled());
      });
    return () => { mounted = false; };
  }, []);

  const onToggleAnalytics = React.useCallback((next: boolean) => {
    // Optimistic: reflect immediately, then persist + flip the live client. A
    // storage failure is captured inside setAnalyticsPreference; the live gate
    // still changes so collection stops/starts right away.
    setAnalytics(next);
    void setAnalyticsPreference(next);
  }, []);

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
      const updated = await updateChildDisplayName(childId, nextName, activeChild?.household_id);
      await refresh();
      setProfile((current) => current ? { ...current, name: updated.displayName } : current);
      setChildNameDraft(updated.displayName);
      await Promise.all([
        appQueryClient.invalidateQueries({ queryKey: rewardKeys.all }),
        appQueryClient.invalidateQueries({ queryKey: rewardKeys.device(childId) }),
        appQueryClient.invalidateQueries({ queryKey: ['lesson-progress', 'child', childId] }),
        appQueryClient.invalidateQueries({ queryKey: ['child-progress-dashboard', 'child', childId] }),
      ]);
    } catch (error) {
      captureError(error);
      setChildNameSaveFailed(true);
    } finally {
      setChildNameSaving(false);
    }
  }, [activeChild?.household_id, childId, childNameDraft, childNameSaving, refresh]);

  const selectActiveChild = React.useCallback(async (nextChildId: string): Promise<void> => {
    if (activeChildSaving || nextChildId === childId) return;
    setActiveChildSaving(nextChildId);
    setActiveChildSaveFailed(false);
    try {
      const confirmed = await confirmActiveChild(nextChildId);
      setActiveChild(confirmed.active_child_id);
    } catch (error) {
      captureError(error);
      setActiveChildSaveFailed(true);
    } finally {
      setActiveChildSaving(null);
    }
  }, [activeChildSaving, childId, setActiveChild]);

  const toggleInterest = React.useCallback((interest: string) => {
    const current = profile?.interests ?? [];
    const next = current.includes(interest)
      ? current.filter((item) => item !== interest)
      : [...current, interest];
    void saveProfile({ interests: next });
  }, [profile?.interests, saveProfile]);

  const allowVoiceLessons = React.useCallback(async (): Promise<void> => {
    if (voiceConsentSaving) return;
    setVoiceConsentSaving('grant');
    setVoiceConsentMessage(null);
    setVoiceConsentSaveFailed(false);
    try {
      await recordAiVoiceConsent({
        consent_version: AI_VOICE_CONSENT_VERSION,
        google_subprocessors_version: GOOGLE_SUBPROCESSORS_VERSION,
      });
      setVoiceConsentMessage('Voice setup saved. Robot can listen during lessons.');
    } catch (error) {
      captureError(error);
      setVoiceConsentSaveFailed(true);
    } finally {
      setVoiceConsentSaving(null);
    }
  }, [voiceConsentSaving]);

  const pauseVoiceLessons = React.useCallback(async (): Promise<void> => {
    if (voiceConsentSaving) return;
    setVoiceConsentSaving('withdraw');
    setVoiceConsentMessage(null);
    setVoiceConsentSaveFailed(false);
    try {
      await withdrawAiVoiceConsent({ reason: VOICE_CONSENT_WITHDRAW_REASON });
      setVoiceConsentMessage('Voice lessons paused. Robot will ask a parent before listening.');
    } catch (error) {
      captureError(error);
      setVoiceConsentSaveFailed(true);
    } finally {
      setVoiceConsentSaving(null);
    }
  }, [voiceConsentSaving]);

  const confirmSignOut = React.useCallback(() => {
    Alert.alert(
      t('Sign out?'),
      t('You will need to sign in again to manage your child.'),
      [
        { text: t('Cancel'), style: 'cancel' },
        { text: t('Sign out'), style: 'destructive', onPress: () => { void logout(); } },
      ],
    );
  }, [logout, t]);

  const confirmDeleteData = React.useCallback(() => {
    if (!childId) return;
    Alert.alert(
      t("Delete child's data?"),
      t('This schedules deletion of your child’s learning data. This cannot be undone.'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Delete'),
          style: 'destructive',
          onPress: () => {
            deleteChild(childId)
              .then(() => { void refresh(); })
              .catch((error) => {
                captureError(error);
                Alert.alert(t('Delete failed'), t('Could not delete right now. Please try again.'));
              });
          },
        },
      ],
    );
  }, [childId, refresh, t]);

  const appVersion = (appConfig as { expo?: { version?: string } }).expo?.version ?? '';

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
          <Text fontWeight="600" style={styles.filterTitle}>Active child</Text>
          <Text style={styles.helperText}>The server confirms this child before lessons and robot rewards switch.</Text>
          <Box flexDirection="row" gap={8} style={styles.chipWrap}>
            {children.map(child => {
              const selected = child.id === childId;
              return <TouchableOpacity key={child.id} accessibilityRole="radio" accessibilityLabel={translateTemplate('Select {{name}} as active child', { name: child.name }, { locale: language })} accessibilityHint={t('Switches lessons, robot, and rewards after server confirmation')} accessibilityState={{ selected, disabled: activeChildSaving !== null }} disabled={activeChildSaving !== null} onPress={() => { void selectActiveChild(child.id); }} style={[styles.chip, selected && styles.chipSelected]}><Text fontWeight="600" style={[styles.chipText, selected && styles.chipTextSelected]} i18n={false}>{child.name}</Text></TouchableOpacity>;
            })}
          </Box>
          {activeChildSaveFailed ? <Text accessibilityRole="alert" style={styles.profileError}>Active child could not be changed. Try again.</Text> : null}
        </Box>
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
              accessibilityLabel="Save child name"
              accessibilityHint="Saves this name to the household server"
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
        <PRow label="Learning level" value={profile?.vocabulary_level ?? '—'} />
        <PRow
          label="Lesson length"
          value={profile?.attention_span_seconds ? `${Math.round(profile.attention_span_seconds / 60)} ${t('min')}` : '—'}
          isLast
        />
        {/* Removed dead placeholder rows (Child age / Daily reminder / Plan /
            Billing / Help / App version) that only rendered "Unavailable" with
            no backing data or route. Real ones are wired below (delete data,
            app version). */}
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
        {profileLoadFailed ? (
          <Box style={styles.personalityBlock} gap={8}>
            <Text style={styles.profileError}>Couldn't load profile. Try again.</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('Try again')}
              onPress={loadProfile}
              style={styles.saveNameButton}
              activeOpacity={0.7}
            >
              <Text fontWeight="600" style={styles.saveNameButtonText}>Try again</Text>
            </TouchableOpacity>
          </Box>
        ) : null}
        <Box style={styles.personalityBlock} accessibilityRole="radiogroup" accessible>
          <Text fontWeight="600" style={styles.filterTitle}>Parent career</Text>
          <Box flexDirection="row" gap={8} style={styles.chipWrap}>
            {CAREER_OPTIONS.map((option) => {
              const selected = profile?.parent_career === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected, disabled: profileEditingDisabled }}
                  disabled={profileEditingDisabled}
                  onPress={() => { void saveProfile({ parent_career: option.value }); }}
                  style={[styles.chip, selected && styles.chipSelected, profileEditingDisabled && !selected && styles.chipDisabled]}
                  activeOpacity={0.7}
                >
                  <Text fontWeight="600" style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </Box>
        </Box>
        <Box style={[styles.personalityBlock, styles.personalityBorder]}>
          <Text fontWeight="600" style={styles.filterTitle}>Child interests</Text>
          <Box flexDirection="row" gap={8} style={styles.chipWrap}>
            {INTEREST_OPTIONS.map((option) => {
              const selected = profile?.interests.includes(option.value) ?? false;
              return (
                <TouchableOpacity
                  key={option.value}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected, disabled: profileEditingDisabled }}
                  disabled={profileEditingDisabled}
                  onPress={() => toggleInterest(option.value)}
                  style={[styles.chip, selected && styles.chipSelected, profileEditingDisabled && !selected && styles.chipDisabled]}
                  activeOpacity={0.7}
                >
                  <Text fontWeight="600" style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </Box>
          {profileSaveFailed ? <Text style={styles.profileError}>Profile filters could not be saved. Try again.</Text> : null}
        </Box>
      </PRowGroup>

      <PRowGroup header="Privacy" footer="Anonymous analytics help us improve lessons. No child names, audio, or personal data are ever collected.">
        <PRow icon="📊" label="Anonymous usage analytics" toggle={analytics} onToggle={onToggleAnalytics} />
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('Robot leaderboard privacy')}
          onPress={() => navigation.navigate(ROUTES.MyRobotScreen)}
          activeOpacity={0.7}
        >
          <PRow icon="🏆" label="Robot leaderboard privacy" chevron />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('Open Safety & Privacy details')}
          onPress={() => navigation.navigate(ROUTES.ParentSafetyScreen)}
          activeOpacity={0.7}
        >
          <PRow icon="🛡" label="Safety & Privacy details" chevron />
        </TouchableOpacity>
        <PRow
          icon="🗑"
          label="Delete child's data"
          danger
          chevron
          onPress={childId ? confirmDeleteData : undefined}
          value={childId ? undefined : '—'}
          isLast
        />
      </PRowGroup>

      <PRowGroup header="Voice setup" footer="Required before Robot listens during lessons.">
        <Box style={styles.voiceConsentBlock}>
          <Text fontWeight="600" style={styles.filterTitle}>AI voice lessons</Text>
          <Box flexDirection="row" gap={8} style={styles.voiceConsentActions}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Allow voice lessons"
              accessibilityState={{ disabled: voiceConsentSaving !== null }}
              disabled={voiceConsentSaving !== null}
              onPress={() => { void allowVoiceLessons(); }}
              style={[styles.voiceConsentButton, voiceConsentSaving !== null && styles.disabledButton]}
              activeOpacity={0.7}
            >
              <Text fontWeight="600" style={styles.voiceConsentButtonText}>{voiceConsentSaving === 'grant' ? 'Saving...' : 'Allow voice lessons'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Pause voice lessons"
              accessibilityState={{ disabled: voiceConsentSaving !== null }}
              disabled={voiceConsentSaving !== null}
              onPress={() => { void pauseVoiceLessons(); }}
              style={[styles.voiceConsentButton, styles.voiceConsentSecondaryButton, voiceConsentSaving !== null && styles.disabledButton]}
              activeOpacity={0.7}
            >
              <Text fontWeight="600" style={styles.voiceConsentSecondaryText}>{voiceConsentSaving === 'withdraw' ? 'Saving...' : 'Pause voice lessons'}</Text>
            </TouchableOpacity>
          </Box>
          {voiceConsentMessage ? <Text style={styles.voiceConsentSuccess}>{voiceConsentMessage}</Text> : null}
          {voiceConsentSaveFailed ? <Text accessibilityRole="alert" style={styles.profileError}>Voice setup could not be saved. Try again.</Text> : null}
        </Box>
      </PRowGroup>

      <PRowGroup header="Support">
        {/* Dead Help/Contact/About rows removed until backed by a route; only
            the real Account-privacy destination + app version remain. */}
        <PRow icon="🛡" label="Account privacy" chevron onPress={() => navigation.navigate(ROUTES.ParentAccountPrivacyScreen as never)} />
        <PRow icon="ⓘ" label="App version" value={appVersion || '—'} isLast />
      </PRowGroup>

      <PRowGroup>
        <PRow label="Sign out" danger onPress={confirmSignOut} isLast />
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
  voiceConsentBlock: { paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff' },
  voiceConsentActions: { flexWrap: 'wrap' },
  voiceConsentButton: {
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: PA.accent,
  },
  voiceConsentSecondaryButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: PA.hair },
  voiceConsentButtonText: { color: '#fff', fontSize: 13 },
  voiceConsentSecondaryText: { color: PA.ink, fontSize: 13 },
  voiceConsentSuccess: { fontSize: 13, color: PA.good, marginTop: 10 },
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
  helperText: { color: PA.ink2, fontSize: 12, lineHeight: 18, marginTop: 4, marginBottom: 10 },
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
  chipDisabled: { opacity: 0.5 },
  chipText: { fontSize: 13, color: PA.ink },
  chipTextSelected: { color: '#fff' },
  profileError: { fontSize: 13, color: '#C0392B', marginTop: 10 },
});
