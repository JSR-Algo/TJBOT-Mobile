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

type Props = NativeStackScreenProps<RootStackParamList, 'ParentSettingsScreen'>;

type Lang = 'vi' | 'both' | 'en';
const LANG_OPTIONS: { v: Lang; label: string }[] = [
  { v: 'vi', label: 'Tiếng Việt' },
  { v: 'both', label: 'VI + EN' },
  { v: 'en', label: 'English' },
];

export default function ParentSettingsScreen({ navigation }: Props) {
  useParentGateGuard(navigation, ROUTES.ParentSettingsScreen);
  const { logout } = useAuth();
  const [mic, setMic] = React.useState(false);
  const [sound, setSound] = React.useState(false);
  const [haptics, setHaptics] = React.useState(false);
  const [analytics, setAnalytics] = React.useState(false);
  const [lang, setLang] = React.useState<Lang>('vi');

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
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Open App language, Unavailable"
          activeOpacity={0.7}
          disabled
          accessibilityState={{ disabled: true }}
        >
          <PRow icon="🌐" label="App language" value="Unavailable" isLast />
        </TouchableOpacity>
        <Box paddingHorizontal={16} paddingBottom={14} paddingTop={0} flexDirection="row" gap={8} style={{ backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: PA.hair }}>
          {LANG_OPTIONS.map(o => (
            <TouchableOpacity
              key={o.v}
              onPress={() => setLang(o.v)}
              style={[
                styles.langBtn,
                { borderColor: lang === o.v ? PA.accent : PA.hair, backgroundColor: lang === o.v ? PA.accent : '#fff' },
              ]}
              activeOpacity={0.7}
            >
              <Text fontWeight="600" style={{ fontSize: 14, color: lang === o.v ? '#fff' : PA.ink }}>
                {o.label}
              </Text>
            </TouchableOpacity>
          ))}
        </Box>
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
          accessibilityLabel="Open Safety & Privacy details"
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
