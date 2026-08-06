import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import ParentScroll, { PA } from '../components/ParentScroll';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';
import { useParentGateGuard } from '../hooks/useParentGateGuard';
import { captureError } from '@/services/observability/sentry';
import { useAppLanguage, type AppLocale } from '@/services/i18n/i18n';
import {
  setAccessibilityPreferences,
  useAccessibilityPreferences,
} from '@/services/accessibility/preferences';

type Props = NativeStackScreenProps<RootStackParamList, 'ParentSettingsScreen'>;

const LANG_OPTIONS: { value: AppLocale; label: string; subtitle: string }[] = [
  { value: 'vi', label: 'Tiếng Việt', subtitle: 'Vietnamese' },
  { value: 'en', label: 'English', subtitle: 'Tiếng Anh' },
];

interface ToggleRowProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (nextValue: boolean) => void;
}

function ToggleRow({ label, description, value, onChange }: ToggleRowProps) {
  return (
    <Box style={styles.toggleRow} flexDirection="row" alignItems="center" justifyContent="space-between" gap={16}>
      <Box flex={1}>
        <Text fontWeight="800" style={styles.toggleLabel}>{label}</Text>
        <Text fontWeight="800" style={styles.toggleDescription}>{description}</Text>
      </Box>
      <TouchableOpacity
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityState={{ checked: value }}
        activeOpacity={0.8}
        onPress={() => onChange(!value)}
        style={[styles.toggleTrack, value && styles.toggleTrackEnabled]}
      >
        <Box style={[styles.toggleThumb, value && styles.toggleThumbEnabled]} />
      </TouchableOpacity>
    </Box>
  );
}

export default function ParentSettingsScreen({ navigation }: Props) {
  useParentGateGuard(navigation, ROUTES.ParentSettingsScreen);
  const { language, setLanguage, t } = useAppLanguage();
  const preferences = useAccessibilityPreferences();
  const [draftLanguage, setDraftLanguage] = React.useState(language);
  const [reduceMotion, setReduceMotion] = React.useState(preferences.reduceMotion);
  const [largeText, setLargeText] = React.useState(preferences.largeText);
  const [saving, setSaving] = React.useState(false);
  const [saveStatus, setSaveStatus] = React.useState<'idle' | 'saved' | 'error'>('idle');

  React.useEffect(() => {
    setDraftLanguage(language);
  }, [language]);

  React.useEffect(() => {
    setReduceMotion(preferences.reduceMotion);
    setLargeText(preferences.largeText);
  }, [preferences.largeText, preferences.reduceMotion]);

  const save = React.useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setSaveStatus('idle');
    try {
      await setAccessibilityPreferences({ reduceMotion, largeText });
      await setLanguage(draftLanguage);
      setSaveStatus('saved');
    } catch (error) {
      captureError(error);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  }, [draftLanguage, largeText, reduceMotion, saving, setLanguage]);

  return (
    <ParentScroll>
      <Box style={styles.header} flexDirection="row" alignItems="center" gap={16}>
        <TouchableOpacity
          testID="languageAccessBackButton"
          accessibilityRole="button"
          accessibilityLabel={t('Go back')}
          activeOpacity={0.75}
          onPress={() => navigation.navigate(ROUTES.ParentSummaryScreen)}
          style={styles.backButton}
        >
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M15 5L8 12L15 19" stroke={PA.ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text fontWeight="800" style={styles.title}>Language & access</Text>
      </Box>

      <Box style={styles.content} gap={24}>
        <Box style={styles.card}>
          <Text fontWeight="800" style={styles.eyebrow}>LANGUAGE</Text>
          <Text fontWeight="700" style={styles.cardDescription}>Choose your child's main learning language</Text>
          <Box gap={16}>
            {LANG_OPTIONS.map(option => {
              const selected = draftLanguage === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityLabel={`${option.label}, ${selected ? t('Selected') : t('Not selected')}`}
                  accessibilityState={{ selected, disabled: saving }}
                  activeOpacity={0.8}
                  disabled={saving}
                  onPress={() => {
                    setDraftLanguage(option.value);
                    setSaveStatus('idle');
                  }}
                  style={[styles.languageOption, selected && styles.languageOptionSelected]}
                >
                  <Box flexDirection="row" alignItems="center" justifyContent="space-between" gap={12}>
                    <Box flexDirection="row" alignItems="center" gap={16} flex={1}>
                      <Box style={[styles.checkBox, selected && styles.checkBoxSelected]} alignItems="center" justifyContent="center">
                        {selected ? (
                          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                            <Path d="M5 12.5L9.5 17L19 7.5" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                          </Svg>
                        ) : null}
                      </Box>
                      <Box>
                        <Text i18n={false} fontWeight="800" style={[styles.languageLabel, selected && styles.selectedText]}>{option.label}</Text>
                        <Text i18n={false} fontWeight="800" style={[styles.languageSubtitle, selected && styles.selectedSubtitle]}>{option.subtitle}</Text>
                      </Box>
                    </Box>
                    <Box style={[styles.statusPill, selected && styles.statusPillSelected]}>
                      <Text fontWeight="800" style={[styles.statusText, selected && styles.selectedText]}>
                        {selected ? 'CURRENT' : 'AVAILABLE'}
                      </Text>
                    </Box>
                  </Box>
                </TouchableOpacity>
              );
            })}
          </Box>
        </Box>

        <Box style={styles.card}>
          <Text fontWeight="800" style={styles.eyebrow}>ACCESSIBILITY</Text>
          <Text fontWeight="700" style={styles.cardDescription}>Adjust the app to make learning easier</Text>
          <Box gap={28}>
            <ToggleRow
              label="Reduce motion"
              description="Reduce animated effects"
              value={reduceMotion}
              onChange={nextValue => {
                setReduceMotion(nextValue);
                setSaveStatus('idle');
              }}
            />
            <ToggleRow
              label="Enable larger text"
              description="Increase the font size"
              value={largeText}
              onChange={nextValue => {
                setLargeText(nextValue);
                setSaveStatus('idle');
              }}
            />
          </Box>

          <TouchableOpacity
            testID="saveLanguageAccessButton"
            accessibilityRole="button"
            accessibilityState={{ disabled: saving }}
            activeOpacity={0.82}
            disabled={saving}
            onPress={() => { void save(); }}
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          >
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text fontWeight="800" style={styles.saveButtonText}>Save settings</Text>}
          </TouchableOpacity>
          {saveStatus === 'saved' ? <Text testID="languageAccessSaveStatus" fontWeight="700" style={styles.successText}>Settings saved</Text> : null}
          {saveStatus === 'error' ? <Text testID="languageAccessSaveError" fontWeight="700" style={styles.errorText}>Settings could not be saved. Try again.</Text> : null}
        </Box>
      </Box>
    </ParentScroll>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 24,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PA.card,
    borderWidth: 1,
    borderColor: 'rgba(235,220,199,0.45)',
    shadowColor: '#1D2B53',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  title: {
    flex: 1,
    color: PA.ink,
    fontSize: 20,
    lineHeight: 24,
  },
  content: {
    paddingHorizontal: 24,
  },
  card: {
    padding: 32,
    borderRadius: 40,
    backgroundColor: PA.card,
    borderWidth: 1,
    borderColor: 'rgba(235,220,199,0.4)',
    shadowColor: '#1D2B53',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  eyebrow: {
    color: PA.ink2,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 2.2,
    marginBottom: 24,
  },
  cardDescription: {
    color: PA.ink2,
    opacity: 0.82,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 24,
  },
  languageOption: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(235,220,199,0.35)',
    backgroundColor: PA.card,
  },
  languageOptionSelected: {
    borderColor: 'rgba(255,107,107,0.22)',
    backgroundColor: 'rgba(255,107,107,0.06)',
  },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(235,220,199,0.7)',
  },
  checkBoxSelected: {
    backgroundColor: PA.accent,
    borderColor: PA.accent,
  },
  languageLabel: {
    color: PA.ink,
    fontSize: 16,
    lineHeight: 20,
  },
  languageSubtitle: {
    color: PA.ink2,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  selectedText: {
    color: PA.accent,
  },
  selectedSubtitle: {
    color: 'rgba(255,107,107,0.65)',
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: PA.hair,
  },
  statusPillSelected: {
    backgroundColor: 'rgba(255,107,107,0.11)',
  },
  statusText: {
    color: PA.ink2,
    fontSize: 9,
    lineHeight: 11,
    letterSpacing: 0.5,
  },
  toggleRow: {
    minHeight: 48,
  },
  toggleLabel: {
    color: PA.ink,
    fontSize: 16,
    lineHeight: 20,
    textTransform: 'uppercase',
  },
  toggleDescription: {
    color: PA.ink2,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  toggleTrack: {
    width: 56,
    height: 32,
    borderRadius: 16,
    padding: 4,
    backgroundColor: PA.hair,
  },
  toggleTrackEnabled: {
    backgroundColor: PA.accent,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  toggleThumbEnabled: {
    transform: [{ translateX: 24 }],
  },
  saveButton: {
    minHeight: 60,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PA.accent,
    marginTop: 40,
    shadowColor: PA.accent,
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  saveButtonDisabled: {
    opacity: 0.65,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 24,
  },
  successText: {
    color: PA.good,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 14,
  },
  errorText: {
    color: '#C0392B',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 14,
  },
});
