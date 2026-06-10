import React from 'react';
import { StyleSheet, TouchableOpacity, Switch } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import Robot from '@/design-system/components/Robot';
import PageScroll from '@/design-system/components/PageScroll';
import PageHeader from '@/design-system/components/PageHeader';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'KidSettingsScreen'>;

export default function KidSettingsScreen({ navigation }: Props) {
  const [sound, setSound] = React.useState(true);
  const [mic, setMic] = React.useState(true);

  return (
    <PageScroll>
      <PageHeader onBack={() => navigation.navigate(ROUTES.HomeHubScreen)} title="Settings" />
      <Box paddingHorizontal={24} paddingTop={4} paddingBottom={16} alignItems="center">
        <Robot emotion="happy" size={140} />
      </Box>
      <Box paddingHorizontal={18} paddingBottom={16} gap={10}>
        <SettingRow
          icon="🔊"
          label="Sounds"
          value={sound}
          onChange={setSound}
        />
        <SettingRow
          icon="🎤"
          label="Microphone"
          value={mic}
          onChange={setMic}
        />
      </Box>
      <Box paddingHorizontal={18} paddingBottom={18}>
        <TouchableOpacity
          onPress={() => navigation.navigate(ROUTES.ParentSummaryScreen)}
          style={styles.parentBtn}
          activeOpacity={0.8}
        >
          <Box style={styles.lockIcon} alignItems="center" justifyContent="center">
            <Text style={{ fontSize: 22 }}>🔒</Text>
          </Box>
          <Box flex={1}>
            <Text fontWeight="700" style={{ fontSize: 16, color: '#2B2140' }}>Grown-up area</Text>
            <Text fontWeight="600" style={{ fontSize: 13, color: '#5C4F77' }}>For parents</Text>
          </Box>
          <Text style={{ fontSize: 18, color: '#5C4F77' }}>›</Text>
        </TouchableOpacity>
      </Box>
      <Box paddingHorizontal={18} paddingBottom={24}>
        <TouchableOpacity
          onPress={() => navigation.navigate(ROUTES.HelpFaqScreen)}
          style={styles.helpBtn}
          activeOpacity={0.7}
        >
          <Text fontWeight="700" style={{ fontSize: 16, color: '#5C4F77' }}>Need help?</Text>
        </TouchableOpacity>
      </Box>
    </PageScroll>
  );
}

function SettingRow({ icon, label, value, onChange }: { icon: string; label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Box style={styles.rowCard} flexDirection="row" alignItems="center" gap={14}>
      <Box style={styles.rowIcon} alignItems="center" justifyContent="center">
        <Text style={{ fontSize: 24 }}>{icon}</Text>
      </Box>
      <Text fontWeight="700" style={{ fontSize: 18, color: '#2B2140', flex: 1 }}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: '#6CE2B6' }} />
    </Box>
  );
}

const styles = StyleSheet.create({
  rowCard: { backgroundColor: '#fff', borderRadius: 20, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  rowIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#FFEAC9', flexShrink: 0 },
  parentBtn: { backgroundColor: '#fff', borderWidth: 2, borderColor: 'rgba(0,0,0,0.15)', borderStyle: 'dashed', borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  lockIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#EEF1F5', flexShrink: 0 },
  helpBtn: { alignItems: 'center', padding: 12 },
});
