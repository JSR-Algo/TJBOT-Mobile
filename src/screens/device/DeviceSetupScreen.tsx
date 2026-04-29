import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Bot, CheckCircle2 } from 'lucide-react-native';
import * as devicesApi from '../../api/devices';
import { Button, Input, ErrorMessage } from '../../components';
import { initializeBle, scanForTbotDevices } from '../../ble/service';
import type { BleBootstrapResult, BleDeviceCandidate } from '../../ble/types';
import { normalizeError } from '../../utils/errors';
import theme from '../../theme';
import type { MainStackScreenProps } from '../../navigation/types';
import { trackEvent } from '../../observability/analytics';

export function DeviceSetupScreen({ navigation }: MainStackScreenProps<'DeviceSetup'>): React.JSX.Element {
  const [serialNumber, setSerialNumber] = useState('');
  const [hardwareRevision, setHardwareRevision] = useState('');
  const [loading, setLoading] = useState(false);
  const [bleLoading, setBleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bleStatus, setBleStatus] = useState<BleBootstrapResult | null>(null);
  const [bleDevices, setBleDevices] = useState<BleDeviceCandidate[]>([]);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      try {
        const status = await initializeBle();
        if (!mounted) return;
        setBleStatus(status);
        if (!status.available && status.reason) {
          setError(status.reason);
        }
      } catch (err) {
        // Native BLE module may throw an "Invariant Violation" on devices
        // without the native module linked (simulator builds, older devices,
        // or when Expo Go is used). Catch here so the screen renders cleanly
        // with a disabled BLE section instead of surfacing a global toast.
        if (!mounted) return;
        const normalized = normalizeError(err);
        setBleStatus({ available: false, permission: 'unavailable', reason: normalized.message });
        setError(normalized.message);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleScan = async () => {
    setBleLoading(true);
    setError(null);
    try {
      const result = await scanForTbotDevices();
      setBleDevices(result.allowed);
      if (result.allowed[0]?.id) {
        setSerialNumber(result.allowed[0].id);
      }
      if (!result.allowed.length) {
        setError('No allowlisted TBOT devices were found nearby.');
      }
    } catch (err) {
      const normalized = normalizeError(err);
      setError(normalized.message);
    } finally {
      setBleLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!serialNumber.trim()) {
      setError('Serial number is required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await devicesApi.register({
        serial_number: serialNumber.trim(),
        hardware_revision: hardwareRevision.trim() || '1.0',
      });
      trackEvent('mobile.device_setup.success', {
        connection_method: bleDevices.length ? 'bluetooth' : 'manual',
      });
      setSuccess(true);
    } catch (err) {
      const normalized = normalizeError(err);
      setError(normalized.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIconBg}>
          <CheckCircle2 size={56} color={theme.colors.success ?? '#22C55E'} strokeWidth={2} />
        </View>
        <Text style={styles.successTitle}>Your TBOT is registered!</Text>
        <Text style={styles.successSubtitle}>
          Your device is ready to use. Head to the Home tab to start a conversation.
        </Text>
        <Button label="Go to Home" onPress={() => navigation.popToTop()} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCircle}>
          <Bot size={48} color={theme.colors.primary} strokeWidth={2} />
        </View>
        <Text style={styles.title}>Register your TBOT</Text>
        <Text style={styles.subtitle}>
          Scan for a nearby TBOT over Bluetooth or enter the serial number manually.
        </Text>

        <View style={styles.bleCard}>
          <Text style={styles.bleTitle}>Bluetooth pairing</Text>
          <Text style={styles.bleText}>
            {bleStatus?.available
              ? 'Bluetooth is ready. Scan for an allowlisted TBOT device to prefill the serial number.'
              : 'Bluetooth is unavailable or permission was denied. You can still enter the serial number manually.'}
          </Text>
          <Button
            label={bleLoading ? 'Scanning...' : 'Scan for TBOT'}
            onPress={handleScan}
            loading={bleLoading}
            disabled={bleLoading || !bleStatus?.available}
          />
          {bleDevices.length ? (
            <View style={styles.bleResults}>
              {bleDevices.map((device) => (
                <Text key={device.id} style={styles.bleResultText}>
                  • {device.name ?? device.localName ?? 'Unnamed TBOT'} ({device.id})
                </Text>
              ))}
            </View>
          ) : null}
        </View>

        <Input
          label="Serial number"
          value={serialNumber}
          onChangeText={setSerialNumber}
          placeholder="e.g. TBOT-2024-XXXX"
          autoCapitalize="characters"
        />

        <Input
          label="Hardware revision (optional)"
          value={hardwareRevision}
          onChangeText={setHardwareRevision}
          placeholder="e.g. 1.0"
        />

        {error && <ErrorMessage message={error} />}

        <Button
          label="Register Device"
          onPress={handleRegister}
          loading={loading}
          disabled={loading}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    flexGrow: 1,
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.xxl,
  },
  heroCircle: {
    alignSelf: 'center',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    ...theme.typography.body1,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  bleCard: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  bleTitle: {
    ...theme.typography.body1,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  bleText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  bleResults: {
    marginTop: theme.spacing.md,
  },
  bleResultText: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  successContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIconBg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: (theme.colors.success ?? '#22C55E') + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  successTitle: {
    ...theme.typography.h1,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  successSubtitle: {
    ...theme.typography.body1,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
});
