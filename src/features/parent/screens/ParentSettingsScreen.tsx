import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import ParentScroll, { PA } from '../components/ParentScroll';
import PRowGroup from '../components/PRowGroup';
import PRow from '../components/PRow';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/navigation/routes';
import { useParentGateGuard } from '../hooks/useParentGateGuard';
import { captureError } from '@/services/observability/sentry';
import { useAppLanguage, type AppLocale } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'ParentSettingsScreen'>;

const LANG_OPTIONS: { v: AppLocale; label: string }[] = [
  { v: 'vi', label: 'Tiếng Việt' },
  { v: 'en', label: 'English' },
];

function languageLabel(locale: AppLocale): string {
  return LANG_OPTIONS.find(option => option.v === locale)?.label ?? 'Tiếng Việt';
}

export default function ParentSettingsScreen({ navigation }: Props) {
  useParentGateGuard(navigation, ROUTES.ParentSettingsScreen);
  const { logout } = useAuth();
  const [mic, setMic] = React.useState(false);
  const [sound, setSound] = React.useState(false);
  const [haptics, setHaptics] = React.useState(false);
  const [analytics, setAnalytics] = React.useState(false);
  const [savingLanguage, setSavingLanguage] = React.useState<AppLocale | null>(null);
  const [languageSaveFailed, setLanguageSaveFailed] = React.useState(false);
  const { language, setLanguage, t } = useAppLanguage();

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

  const unavailableRows = [
    'Child name',
    'Child age',
    'Learning level',
    'Lesson length',
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
        {unavailableRows.map((label, index) => (
          <PRow key={label} label={label} value="Unavailable" isLast={index === unavailableRows.length - 1} />
        ))}
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
});
