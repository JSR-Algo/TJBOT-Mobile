import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DeviceShell from '@/components/DeviceShell';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { RM } from '../components/RM';
import { ROUTES } from '@/navigation/routes';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useActiveChildRobotQuery } from '@/features/rewards/hooks/useRewards';
import { useAppLanguage } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'RobotStatusScreen'>;

export default function RobotStatusScreen({ navigation }: Props): React.JSX.Element {
  const { activeChild } = useHousehold();
  const { t } = useAppLanguage();
  const query = useActiveChildRobotQuery(activeChild?.id);
  const robot = query.data?.id ? query.data : undefined;
  const operationalLabel = robot?.online === true ? t('Online') : robot?.online === false ? t('Offline') : t('Status unavailable');

  return (
    <DeviceShell title={t('Robot status')} onBack={() => navigation.navigate(ROUTES.MyRobotScreen)}>
      <Box padding={16} gap={14}>
        <Text style={styles.intro}>This screen shows only identity and operational state returned by the device API.</Text>
        {query.isLoading ? <Text accessibilityLiveRegion="polite">Loading robot status</Text> : null}
        {query.isError ? <Box gap={8} accessibilityLiveRegion="polite"><Text fontWeight="700">Robot status unavailable</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel={t('Retry robot status')} accessibilityHint={t('Fetches device identity and operational state again')} onPress={() => { void query.refetch(); }} style={styles.retry}><Text fontWeight="700">Try again</Text></TouchableOpacity></Box> : null}
        {!query.isLoading && !query.isError && !robot ? <Text accessibilityLiveRegion="polite">Robot status unavailable</Text> : null}
        {robot ? <Box style={styles.heroCard} flexDirection="row" gap={12} alignItems="center" accessible accessibilityLabel={`${robot.name}. ${operationalLabel}${robot.serialNumber ? `. ${robot.serialNumber}` : ''}`}><RobotDevice emotion={robot.online === true ? 'happy' : 'neutral'} size={72} accent="#FF6F61" /><Box flex={1}><Text fontWeight="800" style={styles.name} i18n={false}>{robot.name}</Text>{robot.serialNumber ? <Text style={styles.meta} i18n={false}>{robot.serialNumber}</Text> : null}<Text fontWeight="700" style={robot.online === true ? styles.online : robot.online === false ? styles.offline : styles.unavailable}>{operationalLabel}</Text></Box></Box> : null}
        <Box style={styles.noteCard}><Text style={styles.noteText}>Battery, Wi-Fi, courses, microphone, temperature, uptime, and software are unavailable on this contract.</Text></Box>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({ intro: { color: RM.ink2, lineHeight: 20 }, heroCard: { backgroundColor: RM.card, borderWidth: 1, borderColor: RM.hair, borderRadius: 14, padding: 14 }, name: { color: RM.ink, fontSize: 19 }, meta: { color: RM.ink2, marginTop: 4 }, online: { color: '#116149', marginTop: 8 }, offline: { color: '#8A3D22', marginTop: 8 }, unavailable: { color: RM.ink2, marginTop: 8 }, noteCard: { backgroundColor: '#EEF1F5', borderRadius: 12, padding: 14 }, noteText: { fontSize: 13, color: RM.ink2, lineHeight: 20 }, retry: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: RM.hair, alignItems: 'center', justifyContent: 'center' } });
