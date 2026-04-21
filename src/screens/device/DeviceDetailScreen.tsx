import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Bot } from 'lucide-react-native';
import * as devicesApi from '../../api/devices';
import { LoadingSpinner, Card, ErrorMessage } from '../../components';
import { Device } from '../../types';
import { normalizeError } from '../../utils/errors';
import theme from '../../theme';
import type { MainStackScreenProps } from '../../navigation/types';

function formatTimestamp(ts?: string): string {
  if (!ts) return 'Never';
  return new Date(ts).toLocaleString();
}

function StatusBadge({ status }: { status: Device['status'] }) {
  const colors: Record<Device['status'], string> = {
    online: theme.colors.success,
    offline: theme.colors.textSecondary,
    pairing: theme.colors.secondary,
  };
  const color = colors[status];
  return (
    <View style={[styles.badge, { backgroundColor: color + '20' }]}>
      <Text style={[styles.badgeText, { color }]}>{status}</Text>
    </View>
  );
}

export function DeviceDetailScreen({ route }: MainStackScreenProps<'DeviceDetail'>): React.JSX.Element {
  const { deviceId } = route.params;
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await devicesApi.getDevice(deviceId);
        setDevice(data);
      } catch (err) {
        const normalized = normalizeError(err);
        setError(normalized.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [deviceId]);

  if (loading) return <LoadingSpinner fullscreen />;
  if (error) return (
    <View style={styles.errorContainer}>
      <ErrorMessage message={error} />
    </View>
  );
  if (!device) return (
    <View style={styles.errorContainer}>
      <ErrorMessage message="Device not found." />
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.heroCircle}>
          <Bot size={40} color={theme.colors.primary} strokeWidth={2} />
        </View>
        <Text style={styles.serialNumber}>{device.serial_number}</Text>
        <StatusBadge status={device.status} />
      </View>

      <Card style={styles.detailsCard}>
        <Row label="Serial number" value={device.serial_number} />
        <Row label="Hardware revision" value={device.hardware_revision} />
        <Row label="Firmware version" value={device.firmware_version} />
        <Row label="Last seen" value={formatTimestamp(device.last_seen)} />
        {device.battery_level !== undefined && (
          <Row label="Battery" value={`${device.battery_level}%`} />
        )}
        <Row label="Connection" value={device.status} />
      </Card>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
  },
  errorContainer: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  heroCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  serialNumber: {
    ...theme.typography.h2,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  badge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
  },
  badgeText: {
    ...theme.typography.caption,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  detailsCard: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  rowLabel: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
  },
  rowValue: {
    ...theme.typography.body2,
    color: theme.colors.textPrimary,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
});
