import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import * as devicesApi from '../../api/devices';
import { Button, Input, ErrorMessage } from '../../components';
import { normalizeError } from '../../utils/errors';
import theme from '../../theme';
import type { MainStackScreenProps } from '../../navigation/types';

export function DeviceSetupScreen({ navigation }: MainStackScreenProps<'DeviceSetup'>): React.JSX.Element {
  // navigation is typed to MainStackParamList, pop back to MainTabs after success
  const [serialNumber, setSerialNumber] = useState('');
  const [hardwareRevision, setHardwareRevision] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
        <Text style={styles.successEmoji}>✅</Text>
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
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.emoji}>🤖</Text>
        <Text style={styles.title}>Register your TBOT</Text>
        <Text style={styles.subtitle}>
          Enter the serial number found on the bottom of your device.
        </Text>

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
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 56,
    textAlign: 'center',
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
  successContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successEmoji: {
    fontSize: 72,
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
