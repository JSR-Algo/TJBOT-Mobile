import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Bot } from 'lucide-react-native';
import { EmptyState, Card } from '../../components';
import { Device } from '../../types';
import { MainStackParamList } from '../../navigation/types';
import { useHousehold } from '../../contexts/HouseholdContext';
import * as devicesApi from '../../api/devices';
import theme from '../../theme';

type DeviceListNavProp = NativeStackNavigationProp<MainStackParamList>;

export function DeviceListScreen(): React.JSX.Element {
  const navigation = useNavigation<DeviceListNavProp>();
  const { activeHousehold } = useHousehold();
  const [devices, setDevices] = useState<Device[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadDevices = useCallback(async () => {
    if (!activeHousehold) return;
    try {
      const data = await devicesApi.listByHousehold(activeHousehold.id);
      setDevices(data);
      setLoadError(null);
    } catch {
      setLoadError('Could not load devices. Pull to refresh.');
    }
  }, [activeHousehold]);

  useFocusEffect(useCallback(() => { loadDevices(); }, [loadDevices]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDevices();
    setRefreshing(false);
  }, [loadDevices]);

  const statusColor = (status: Device['status']) => {
    if (status === 'online') return theme.colors.success;
    if (status === 'pairing') return theme.colors.secondary;
    return theme.colors.textSecondary;
  };

  return (
    <View style={styles.container}>
      {loadError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{loadError}</Text>
        </View>
      )}
      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            title="Set up your TBOT"
            subtitle="Tap + below to register your device."
          />
        }
        renderItem={({ item }) => (
          <Card onPress={() => navigation.navigate('DeviceDetail', { deviceId: item.id })}>
            <View style={styles.deviceRow}>
              <View style={styles.deviceIconBg}>
                <Bot size={26} color={theme.colors.primary} strokeWidth={2} />
              </View>
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceSerial}>{item.serial_number}</Text>
                <Text style={styles.deviceRevision}>Rev {item.hardware_revision}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + '20' }]}>
                <Text style={[styles.statusText, { color: statusColor(item.status) }]}>
                  {item.status}
                </Text>
              </View>
            </View>
          </Card>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('DeviceSetup')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: theme.spacing.md,
    paddingBottom: 100,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceSerial: {
    ...theme.typography.body1,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  deviceRevision: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
  },
  statusText: {
    ...theme.typography.caption,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  errorBanner: {
    backgroundColor: theme.colors.error + '20',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  errorBannerText: {
    ...theme.typography.caption,
    color: theme.colors.error,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: theme.spacing.lg,
    bottom: theme.spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabText: {
    fontSize: 28,
    color: '#FFFFFF',
    lineHeight: 32,
  },
});
