import React from 'react';
import { Pressable, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import ScreenShell from '@/components/ScreenShell';
import { RobotImage } from '@/components/RobotImage';
import { Icon, type IconName } from '@/design-system/icons';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { gardenColors, gardenRadii, gardenShadows } from '@/design-system/tokens';
import { ROUTES } from '@/navigation/routes';
import { useHousehold } from '@/contexts/HouseholdContext';
import { getDeviceStatus } from '@/services/api/device.api';
import { translateCopy, useAppLanguage } from '@/services/i18n/i18n';
import { finalizeDevicePairing, finishDevicePairingSuccess } from '../finalizeDevicePairing';
import { getPendingPairingContext } from '../pendingPairingContext';

type Props = NativeStackScreenProps<RootStackParamList, 'PairRenameScreen'>;

const BUDDIES = [
  { ic: 'Panda', n: 'Panda' }, { ic: 'Dog', n: 'Fox' }, { ic: 'Rabbit', n: 'Bunny' },
  { ic: 'PawPrint', n: 'Bear' }, { ic: 'Bug', n: 'Frog' }, { ic: 'Bird', n: 'Owl' },
  { ic: 'Turtle', n: 'Turtle' }, { ic: 'Cat', n: 'Cat' },
] as const satisfies ReadonlyArray<{ ic: IconName; n: string }>;

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
    <ScreenShell>
      <Box paddingHorizontal={20} paddingTop={10} paddingBottom={0} flexDirection="row" alignItems="center" gap={14}>
        <RobotImage variant="body" size={78} />
        <Box flex={1}>
          <Text fontWeight="600" style={styles.title}>Choose a Buddy</Text>
          <Text style={styles.subtitle}>We don't ask for your child's name or photo.</Text>
        </Box>
      </Box>
      <Box paddingHorizontal={16} paddingTop={20}>
        <Text fontWeight="600" style={styles.sectionLabel}>Buddy</Text>
        <View style={styles.buddyGrid}>
          {BUDDIES.map((b, i) => (
            <TouchableOpacity
              key={b.n}
              style={[styles.buddyBtn, i === buddy && styles.buddyBtnSel]}
              activeOpacity={0.7}
              onPress={() => setBuddy(i)}
              accessibilityRole="radio"
              accessibilityLabel={b.n}
              accessibilityState={{ selected: i === buddy }}
              testID={`buddy-${i}`}
            >
              <Icon
                name={b.ic}
                size={23}
                color={i === buddy ? gardenColors.coral : gardenColors.inkSoft}
                strokeWidth={2.2}
              />
              <Text style={styles.buddyName}>{b.n}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Box>
      <Box paddingHorizontal={16} paddingTop={20}>
        <Text fontWeight="600" style={styles.sectionLabel}>Robot's name (optional)</Text>
        <Pressable
          testID="robot-name-focus-target"
          style={styles.nameCard}
          onPress={() => nameInputRef.current?.focus()}
        >
          <Icon name="Bot" size={20} color={gardenColors.inkSoft} strokeWidth={2.3} />
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
        <Text style={styles.nameHint}>Helpful if you have more than one robot.</Text>
      </Box>
      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30} alignItems="center">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Save Robot buddy and name"
          accessibilityState={{ disabled: saving }}
          style={[styles.ctaButton, saving && styles.ctaButtonDisabled]}
          onPress={save}
          disabled={saving}
          activeOpacity={0.9}
          testID="save-buddy-btn"
        >
          <Text style={styles.ctaText} fontWeight="600">
            {saving ? 'Saving...' : 'Save & continue'}
          </Text>
        </TouchableOpacity>
      </Box>
    </ScreenShell>
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
  title: { fontSize: 24, fontWeight: '600', color: gardenColors.ink, marginBottom: 8 },
  subtitle: { fontSize: 14, color: gardenColors.inkSoft, lineHeight: 22 },
  sectionLabel: { fontSize: 11, color: gardenColors.inkMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  buddyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  buddyBtn: { width: '22%', borderRadius: gardenRadii.chip, backgroundColor: gardenColors.paper, borderWidth: 1, borderColor: gardenColors.line, alignItems: 'center', justifyContent: 'center', padding: 8, gap: 4 },
  buddyBtnSel: { backgroundColor: gardenColors.sun, borderWidth: 2, borderColor: gardenColors.coral },
  buddyName: { fontSize: 11, color: gardenColors.ink, fontWeight: '500', marginTop: 4 },
  nameCard: { backgroundColor: gardenColors.paper, borderWidth: 1, borderColor: gardenColors.line, borderRadius: gardenRadii.card, padding: 14, minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 10 },
  nameInput: { fontSize: 16, color: gardenColors.ink, flex: 1, paddingVertical: 8, minHeight: 48 },
  nameHint: { fontSize: 12, color: gardenColors.inkMuted, lineHeight: 20, marginTop: 8 },
  ctaButton: { backgroundColor: gardenColors.coral, borderRadius: gardenRadii.cta, paddingHorizontal: 20, paddingVertical: 14, minWidth: 200, alignItems: 'center', ...gardenShadows.cta },
  ctaButtonDisabled: { opacity: 0.6 },
  ctaText: { fontSize: 16, color: gardenColors.paper },
});
