import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import ParentScroll, { PA } from '../components/ParentScroll';
import PRowGroup from '../components/PRowGroup';
import PRow from '../components/PRow';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';

type Props = NativeStackScreenProps<RootStackParamList, 'ParentSettingsScreen'>;

type Lang = 'vi' | 'both' | 'en';
const LANG_OPTIONS: { v: Lang; label: string }[] = [
  { v: 'vi', label: 'Tiếng Việt' },
  { v: 'both', label: 'VI + EN' },
  { v: 'en', label: 'English' },
];

export default function ParentSettingsScreen({ navigation }: Props) {
  const [mic, setMic] = React.useState(true);
  const [sound, setSound] = React.useState(true);
  const [haptics, setHaptics] = React.useState(true);
  const [analytics, setAnalytics] = React.useState(false);
  const [lessonLen, setLessonLen] = React.useState<'Short' | 'Standard' | 'Long'>('Standard');
  const [lang, setLang] = React.useState<Lang>('vi');

  const langLabel = lang === 'vi' ? 'Tiếng Việt' : lang === 'en' ? 'English' : 'Tiếng Việt + English';

  const cycleLessonLen = () => {
    setLessonLen(l => l === 'Short' ? 'Standard' : l === 'Standard' ? 'Long' : 'Short');
  };

  return (
    <ParentScroll title="Settings" onBack={() => navigation.navigate('ParentSummaryScreen')}>
      <PRowGroup header="Language" footer="Changes apply to the whole app — for both child and parent surfaces.">
        <PRow icon="🌐" label="App language" value={langLabel} isLast />
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

      <PRowGroup header="Child profile">
        <PRow icon="👤" label="Name" value="Mira" chevron />
        <PRow icon="🎂" label="Age" value="7" chevron />
        <PRow icon="🎯" label="Learning level" value="Beginner" chevron isLast />
      </PRowGroup>

      <PRowGroup header="Lesson">
        <PRow icon="⏱" label="Lesson length" value={lessonLen} chevron onPress={cycleLessonLen} />
        <PRow icon="🔔" label="Daily reminder" value="4:00 PM" chevron isLast />
      </PRowGroup>

      <PRowGroup header="Audio & feedback" footer="Microphone is required for speaking practice. Turning it off pauses voice lessons.">
        <PRow icon="🎤" label="Microphone" toggle={mic} onToggle={setMic} />
        <PRow icon="🔊" label="Sound effects" toggle={sound} onToggle={setSound} />
        <PRow icon="📳" label="Haptics" toggle={haptics} onToggle={setHaptics} isLast />
      </PRowGroup>

      <PRowGroup header="Privacy">
        <PRow icon="📊" label="Anonymous usage analytics" toggle={analytics} onToggle={setAnalytics} />
        <PRow icon="🛡" label="Safety & Privacy details" chevron onPress={() => navigation.navigate('ParentSafetyScreen')} />
        <PRow icon="🗑" label="Delete child's data" chevron isLast />
      </PRowGroup>

      <PRowGroup header="Subscription">
        <PRow icon="✦" label="Robot English Plus" value="Active" chevron />
        <PRow icon="💳" label="Manage billing" chevron isLast />
      </PRowGroup>

      <PRowGroup header="Support">
        <PRow icon="?" label="Help center" chevron />
        <PRow icon="✉" label="Contact support" chevron />
        <PRow icon="ⓘ" label="About Robot English" value="v1.0.2" chevron isLast />
      </PRowGroup>

      <PRowGroup>
        <PRow label="Sign out" danger onPress={() => {}} isLast />
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
