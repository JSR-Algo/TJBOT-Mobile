import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import Robot from '@/design-system/components/Robot';
import PageScroll from '@/design-system/components/PageScroll';
import PageHeader from '@/design-system/components/PageHeader';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { useAppLanguage } from '@/services/i18n/i18n';
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'KidSettingsScreen'>;

// The Sounds/Microphone toggles were removed: they were dead local state (reset
// every mount, no persistence, no consumer — mic/audio is controlled robot-side,
// not on the phone). Two functional-looking placeholders on the child surface
// are false feedback; the screen now only exposes real navigation.

export default function KidSettingsScreen({ navigation }: Props) {
  const { t } = useAppLanguage();

  return (
    <PageScroll>
      <PageHeader onBack={() => navigation.navigate(ROUTES.HomeHubScreen)} title="Settings" />
      <Box paddingHorizontal={24} paddingTop={4} paddingBottom={16} alignItems="center">
        <Robot emotion="happy" size={140} />
      </Box>
      <Box paddingHorizontal={18} paddingBottom={18} paddingTop={8}>
        <TouchableOpacity
          onPress={() => navigation.navigate(ROUTES.ParentSummaryScreen)}
          style={styles.parentBtn}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('Grown-up area')}
        >
          <Box style={styles.lockIcon} alignItems="center" justifyContent="center" importantForAccessibility="no-hide-descendants">
            <Text style={{ fontSize: 22 }} i18n={false}>🔒</Text>
          </Box>
          <Box flex={1}>
            <Text fontWeight="700" style={{ fontSize: 16, color: '#2B2140' }}>Grown-up area</Text>
            <Text fontWeight="600" style={{ fontSize: 13, color: '#5C4F77' }}>For parents</Text>
          </Box>
          <Text style={{ fontSize: 18, color: '#5C4F77' }} importantForAccessibility="no" i18n={false}>›</Text>
        </TouchableOpacity>
      </Box>
      <Box paddingHorizontal={18} paddingBottom={24}>
        <TouchableOpacity
          onPress={() => navigation.navigate(ROUTES.HelpFaqScreen)}
          style={styles.helpBtn}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('Need help?')}
        >
          <Text fontWeight="700" style={{ fontSize: 16, color: '#5C4F77' }}>Need help?</Text>
        </TouchableOpacity>
      </Box>
    </PageScroll>
  );
}

const styles = StyleSheet.create({
  parentBtn: { backgroundColor: '#fff', borderWidth: 2, borderColor: 'rgba(0,0,0,0.15)', borderStyle: 'dashed', borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  lockIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#EEF1F5', flexShrink: 0 },
  helpBtn: { alignItems: 'center', padding: 12 },
});
