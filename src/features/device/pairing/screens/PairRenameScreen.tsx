import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { DV } from '@/components/Device-tokens';
import { ROUTES } from '@/navigation/routes';
import { useHousehold } from '@/contexts/HouseholdContext';
import { completeDeviceProvisioning } from '@/services/api/device.api';
import { markLocalDevicePaired } from '../localPairedDevice';

type Props = NativeStackScreenProps<RootStackParamList, 'PairRenameScreen'>;

const BUDDIES = [
  { ic: '🐼', n: 'Panda' }, { ic: '🦊', n: 'Fox' }, { ic: '🐰', n: 'Bunny' },
  { ic: '🐻', n: 'Bear' }, { ic: '🐸', n: 'Frog' }, { ic: '🦉', n: 'Owl' },
  { ic: '🐢', n: 'Turtle' }, { ic: '🐱', n: 'Cat' },
] as const;

export default function PairRenameScreen({ navigation, route }: Props) {
  const [buddy, setBuddy] = React.useState(2);
  const [saving, setSaving] = React.useState(false);
  const { children } = useHousehold();

  const save = async (): Promise<void> => {
    if (saving) return;
    const deviceId = route.params?.deviceId;
    const provisioningAttemptId = route.params?.provisioningAttemptId;
    const serialNumber = route.params?.serialNumber;
    const childId = children[0]?.id;
    if (!deviceId || !provisioningAttemptId || !childId) {
      navigation.navigate(ROUTES.PairFailedScreen, {
        deviceId,
        serialNumber,
        provisioningAttemptId,
        errorCode: 'PAIRING_CONTEXT_MISSING',
      });
      return;
    }
    setSaving(true);
    try {
      await completeDeviceProvisioning({
        provisioningAttemptId,
        deviceId,
        assignChildProfileId: childId,
        displayName: 'Living-room Robot',
      });
      await markLocalDevicePairedBestEffort(deviceId);
      navigation.navigate(ROUTES.PairSuccessScreen, {
        deviceId,
        serialNumber,
        provisioningAttemptId,
      });
    } catch (error) {
      navigation.navigate(ROUTES.PairFailedScreen, {
        deviceId,
        serialNumber,
        provisioningAttemptId,
        errorCode: errorCodeFrom(error, 'PROVISIONING_COMPLETE_FAILED'),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DeviceShell title="Choose a Buddy">
      <Box paddingHorizontal={20} paddingTop={18}>
        <Text style={styles.intro}>
          Pick the avatar your child will see on Robot's face. <Text fontWeight="600" style={{ color: DV.ink }}>We don't ask for your child's name or photo.</Text>
        </Text>
      </Box>
      <Box paddingHorizontal={16} paddingTop={20}>
        <Text fontWeight="700" style={styles.sectionLabel}>Buddy</Text>
        <Box style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {BUDDIES.map((b, i) => (
            <TouchableOpacity
              key={b.n}
              style={[styles.buddyBtn, i === buddy && styles.buddyBtnSel]}
              activeOpacity={0.7}
              onPress={() => setBuddy(i)}
            >
              <Text style={{ fontSize: 28 }}>{b.ic}</Text>
              <Text fontWeight="600" style={styles.buddyName}>{b.n}</Text>
            </TouchableOpacity>
          ))}
        </Box>
      </Box>
      <Box paddingHorizontal={16} paddingTop={24}>
        <Text fontWeight="700" style={styles.sectionLabel}>Robot's name (optional)</Text>
        <Box style={styles.nameCard} flexDirection="row" alignItems="center" gap={10}>
          <Text style={{ fontSize: 18 }}>🤖</Text>
          <Text style={styles.nameText}>Living-room Robot</Text>
        </Box>
        <Text style={styles.nameHint}>Helpful if you have more than one Robot in the house.</Text>
      </Box>
      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30}>
        <DeviceBigBtn onClick={save}>{saving ? 'Saving...' : 'Save & continue'}</DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

function errorCodeFrom(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) {
    const record = error as { code?: unknown; response?: { data?: { code?: unknown } } };
    if (typeof record.code === 'string') return record.code;
    if (typeof record.response?.data?.code === 'string') return record.response.data.code;
  }
  return fallback;
}

async function markLocalDevicePairedBestEffort(deviceId: string): Promise<void> {
  try {
    await markLocalDevicePaired(deviceId);
  } catch {
    // Backend completion is authoritative; local cache failure must not undo it.
  }
}

const styles = StyleSheet.create({
  intro: { fontSize: 14, color: DV.ink2, lineHeight: 22 },
  sectionLabel: { fontSize: 11, color: DV.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  buddyBtn: { width: '22%', aspectRatio: 1, borderRadius: 14, backgroundColor: DV.card, borderWidth: 1, borderColor: DV.hair, alignItems: 'center', justifyContent: 'center', gap: 2 },
  buddyBtnSel: { backgroundColor: '#FFF1C2', borderWidth: 2, borderColor: '#FF6F61' },
  buddyName: { fontSize: 10, color: DV.ink },
  nameCard: { backgroundColor: DV.card, borderWidth: 1, borderColor: DV.hair, borderRadius: 12, padding: 14 },
  nameText: { fontSize: 16, color: DV.ink, flex: 1 },
  nameHint: { fontSize: 12, color: DV.ink3, lineHeight: 22, marginTop: 8 },
});
