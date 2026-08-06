import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import RobotImage from '@/components/RobotImage';
import DeviceShell from '@/components/DeviceShell';
import { Icon } from '@/design-system/icons';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { DV } from '@/components/Device-tokens';
import { ROUTES } from '@/navigation/routes';
import { useAppLanguage } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'PairAddScreen'>;

export default function PairAddScreen({ navigation }: Props) {
  const { t } = useAppLanguage();
  return (
    <DeviceShell title="Add a Robot" onBack={() => navigation.navigate(ROUTES.DeviceOverviewScreen)}>
      <Box paddingHorizontal={20} paddingTop={24}>
        <Text style={styles.intro}>
          Lessons happen <Text fontWeight="600" style={{ color: DV.ink }}>on the Robot itself</Text>, not your phone. The phone is just for setup and progress.
        </Text>
      </Box>
      <Box paddingHorizontal={16} paddingTop={18} gap={10}>
        <TouchableOpacity
          style={styles.optCard}
          activeOpacity={0.7}
          onPress={() => navigation.navigate(ROUTES.PairIntroScreen)}
          accessibilityRole="button"
          accessibilityLabel={t('Pair a new Robot')}
        >
          <Box style={styles.robotIcon} alignItems="center" justifyContent="center">
            <RobotImage variant="body" size={66} />
          </Box>
          <Box flex={1}>
            <Text fontWeight="600" style={styles.optTitle}>I have a new Robot</Text>
            <Text style={styles.optSub}>About 3 minutes — needs Wi-Fi</Text>
          </Box>
          <Icon name="ChevronRight" size={18} color={DV.ink3} strokeWidth={2.4} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.optCard}
          activeOpacity={0.7}
          onPress={() => navigation.navigate(ROUTES.PairOfflineScreen)}
          accessibilityRole="button"
          accessibilityLabel={t('Reconnect offline Robot')}
        >
          <Box style={styles.offlineIcon} alignItems="center" justifyContent="center">
            <Icon name="WifiOff" size={28} color={DV.ink2} strokeWidth={2} />
          </Box>
          <Box flex={1}>
            <Text fontWeight="600" style={styles.optTitle}>My Robot is offline</Text>
            <Text style={styles.optSub}>Reconnect or move to new Wi-Fi</Text>
          </Box>
          <Icon name="ChevronRight" size={18} color={DV.ink3} strokeWidth={2.4} />
        </TouchableOpacity>
      </Box>
      <Box paddingHorizontal={20} paddingTop={20}>
        <Text style={styles.note}>You'll need: Robot, your home Wi-Fi password, and about 3 minutes.</Text>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 13, color: DV.ink2, lineHeight: 22 },
  optCard: { backgroundColor: DV.card, borderWidth: 1, borderColor: DV.hair, borderRadius: 14, padding: 16, flexDirection: 'row', gap: 14, alignItems: 'center' },
  robotIcon: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#FFF9F0', flexShrink: 0 },
  offlineIcon: { width: 64, height: 64, borderRadius: 14, backgroundColor: '#EEF1F5', flexShrink: 0 },
  optTitle: { fontSize: 15, color: DV.ink },
  optSub: { fontSize: 12, color: DV.ink2, marginTop: 2 },
  note: { fontSize: 12, color: DV.ink3, lineHeight: 22 },
});
