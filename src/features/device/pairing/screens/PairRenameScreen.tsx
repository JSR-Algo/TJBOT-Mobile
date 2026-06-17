import React from 'react';
import { Pressable, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { DV } from '@/components/Device-tokens';
import { ROUTES } from '@/navigation/routes';
import { useHousehold } from '@/contexts/HouseholdContext';
import { getDeviceStatus } from '@/services/api/device.api';
import { translateCopy, useAppLanguage } from '@/services/i18n/i18n';
import { finalizeDevicePairing, finishDevicePairingSuccess } from '../finalizeDevicePairing';
import { getPendingPairingContext } from '../pendingPairingContext';

type Props = NativeStackScreenProps<RootStackParamList, 'PairRenameScreen'>;

const BUDDIES = [
  { ic: '🐼', n: 'Panda' }, { ic: '🦊', n: 'Fox' }, { ic: '🐰', n: 'Bunny' },
  { ic: '🐻', n: 'Bear' }, { ic: '🐸', n: 'Frog' }, { ic: '🦉', n: 'Owl' },
  { ic: '🐢', n: 'Turtle' }, { ic: '🐱', n: 'Cat' },
] as const;

export default function PairRenameScreen({ navigation, route }: Props) {
  useAppLanguage();
  const defaultDisplayName = React.useMemo(() => translateCopy('Living-room Robot'), []);
  const [buddy, setBuddy] = React.useState(2);
  const [saving, setSaving] = React.useState(false);
  const [displayName, setDisplayName] = React.useState(defaultDisplayName);
  const nameInputRef = React.useRef<TextInput>(null);
  const { activeChild } = useHousehold();

  const save = async (): Promise<void> => {
    if (saving) return;
    setSaving(true);
    const pendingContext = await getPendingPairingContext().catch(() => null);
    const deviceId = route.params?.deviceId ?? pendingContext?.deviceId;
    const provisioningAttemptId = route.params?.provisioningAttemptId ?? pendingContext?.provisioningAttemptId;
    const serialNumber = route.params?.serialNumber ?? pendingContext?.serialNumber;
    const childId = activeChild?.id; // active-child (defaults to children[0]); was hardcoded children[0]
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.info('[TBOT PairRename] save pressed', {
        hasRouteDeviceId: Boolean(route.params?.deviceId),
        hasPendingDeviceId: Boolean(pendingContext?.deviceId),
        deviceId,
        provisioningAttemptId,
        serialNumber,
        childId,
      });
    }
    // Genuine loss of pairing context — this IS a setup failure.
    if (!deviceId || !provisioningAttemptId) {
      if (childId) {
        try {
          const householdDevice = await getDeviceStatus('primary', childId);
          if (householdDevice.id) {
            await finishDevicePairingSuccess(navigation, {
              deviceId: householdDevice.id,
              serialNumber,
            });
            return;
          }
        } catch {
          // Fall through to the typed setup failure below. This recovery only
          // applies when the backend already lists a paired household robot.
        }
      }
      setSaving(false);
      navigation.navigate(ROUTES.PairFailedScreen, {
        deviceId,
        serialNumber,
        provisioningAttemptId,
        errorCode: 'PAIRING_CONTEXT_MISSING',
      });
      return;
    }
    // The robot has ALREADY connected by this point (claim/confirm set the device
    // active + owned). The only thing missing is a child profile to assign it to,
    // so a missing/mismatched child is NOT a connection failure — sending the
    // parent to the scary "connect failed" screen is wrong. Route them into the
    // COPPA-safe child-creation UI, carrying the pairing context so that screen
    // can FINISH this pairing once a child exists (instead of dropping them into
    // onboarding and abandoning the already-claimed robot).
    if (!childId) {
      setSaving(false);
      navigation.navigate(ROUTES.PairChildProfileScreen, {
        pairing: { deviceId, provisioningAttemptId, serialNumber },
      });
      return;
    }
    try {
      // Pairing finalize (complete + mark paired + reset to DeviceHome/Success) is
      // shared with the zero-child path so both terminate identically. Reset is
      // required here because this flow is entered from DeviceOverview, not
      // DeviceHome: a plain navigate would push Success on top of the whole pairing
      // stack and Back would walk back THROUGH finished pairing screens.
      await finalizeDevicePairing(navigation, { deviceId, provisioningAttemptId, serialNumber }, childId, displayName);
    } catch (error) {
      const code = errorCodeFrom(error, 'PROVISIONING_COMPLETE_FAILED');
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[TBOT PairRename] save failed', { code, deviceId, provisioningAttemptId, childId });
      }
      // A missing/mismatched child profile is a finalize-only problem — the robot
      // is already connected — so guide to creating a child (with pairing context
      // so the new child finishes this pairing) rather than reporting a
      // connection failure.
      if (code === 'CHILD_PROFILE_NOT_FOUND' || code === 'CHILD_PROFILE_HOUSEHOLD_MISMATCH') {
        navigation.navigate(ROUTES.PairChildProfileScreen, {
          pairing: { deviceId, provisioningAttemptId, serialNumber },
        });
        return;
      }
      navigation.navigate(ROUTES.PairFailedScreen, {
        deviceId,
        serialNumber,
        provisioningAttemptId,
        errorCode: code,
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
        <Pressable
          testID="robot-name-focus-target"
          style={styles.nameCard}
          onPress={() => nameInputRef.current?.focus()}
        >
          <Text style={{ fontSize: 18 }}>🤖</Text>
          <TextInput
            ref={nameInputRef}
            accessibilityLabel="Robot's name"
            autoCorrect={false}
            blurOnSubmit
            editable={!saving}
            maxLength={40}
            onChangeText={setDisplayName}
            placeholder="Living-room Robot"
            returnKeyType="done"
            selectTextOnFocus
            style={styles.nameInput}
            value={displayName}
          />
        </Pressable>
        <Text style={styles.nameHint}>Helpful if you have more than one Robot in the house.</Text>
      </Box>
      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30}>
        <DeviceBigBtn onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save & continue'}</DeviceBigBtn>
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

const styles = StyleSheet.create({
  intro: { fontSize: 14, color: DV.ink2, lineHeight: 22 },
  sectionLabel: { fontSize: 11, color: DV.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  buddyBtn: { width: '22%', aspectRatio: 1, borderRadius: 14, backgroundColor: DV.card, borderWidth: 1, borderColor: DV.hair, alignItems: 'center', justifyContent: 'center', gap: 2 },
  buddyBtnSel: { backgroundColor: '#FFF1C2', borderWidth: 2, borderColor: '#FF6F61' },
  buddyName: { fontSize: 10, color: DV.ink },
  nameCard: { backgroundColor: DV.card, borderWidth: 1, borderColor: DV.hair, borderRadius: 12, padding: 14, minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 10 },
  nameInput: { fontSize: 18, color: DV.ink, flex: 1, paddingVertical: 8, minHeight: 48 },
  nameHint: { fontSize: 12, color: DV.ink3, lineHeight: 22, marginTop: 8 },
});
