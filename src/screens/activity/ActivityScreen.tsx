import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useHousehold } from '../../contexts/HouseholdContext';
import * as dashboardApi from '../../api/dashboard';
import * as devicesApi from '../../api/devices';
import { Card, LoadingSpinner, ErrorMessage, EmptyState } from '../../components';
import theme from '../../theme';
import type { MainTabScreenProps } from '../../navigation/types';
import { normalizeError } from '../../utils/errors';
import type { SessionHistoryItem, SafetyEvent, SessionCost } from '../../api/dashboard';

type Tab = 'Sessions' | 'Safety' | 'Cost';
type DateRange = '7' | '30' | '90';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function TabBar({ active, onSelect }: { active: Tab; onSelect: (t: Tab) => void }) {
  const tabs: Tab[] = ['Sessions', 'Safety', 'Cost'];
  return (
    <View style={styles.tabBar}>
      {tabs.map((t) => (
        <TouchableOpacity
          key={t}
          style={[styles.tabItem, active === t && styles.tabItemActive]}
          onPress={() => onSelect(t)}
        >
          <Text style={[styles.tabLabel, active === t && styles.tabLabelActive]}>{t}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function ActivityScreen(_props: MainTabScreenProps<'Activity'>): React.JSX.Element {
  const { activeHousehold } = useHousehold();
  const [activeTab, setActiveTab] = useState<Tab>('Sessions');
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [loadingDevice, setLoadingDevice] = useState(true);

  // Sessions tab state
  const [sessions, setSessions] = useState<SessionHistoryItem[]>([]);
  const [sessionsPage, setSessionsPage] = useState(1);
  const [sessionsTotal, setSessionsTotal] = useState(0);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [sessionsRefreshing, setSessionsRefreshing] = useState(false);

  // Safety tab state
  const [safetyEvents, setSafetyEvents] = useState<SafetyEvent[]>([]);
  const [safetyLoading, setSafetyLoading] = useState(false);
  const [safetyError, setSafetyError] = useState<string | null>(null);
  const [safetyRefreshing, setSafetyRefreshing] = useState(false);

  // Cost tab state
  const [cost, setCost] = useState<SessionCost | null>(null);
  const [costLoading, setCostLoading] = useState(false);
  const [costError, setCostError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('30');

  // Load device on mount
  useEffect(() => {
    if (!activeHousehold) return;
    setLoadingDevice(true);
    devicesApi.listByHousehold(activeHousehold.id)
      .then((devices) => { setDeviceId(devices[0]?.id ?? null); })
      .catch(() => { setDeviceId(null); })
      .finally(() => setLoadingDevice(false));
  }, [activeHousehold]);

  const loadSessions = useCallback(async (page = 1, replace = true) => {
    if (!deviceId) return;
    if (page === 1) setSessionsLoading(true);
    setSessionsError(null);
    try {
      const res = await dashboardApi.getSessionHistory(deviceId, page, 20);
      if (replace) {
        setSessions(res.data);
      } else {
        setSessions((prev) => [...prev, ...res.data]);
      }
      setSessionsTotal(res.total);
      setSessionsPage(page);
    } catch (err: unknown) {
      setSessionsError(normalizeError(err).message);
    } finally {
      setSessionsLoading(false);
    }
  }, [deviceId]);

  const loadSafety = useCallback(async () => {
    if (!deviceId) return;
    setSafetyLoading(true);
    setSafetyError(null);
    try {
      const data = await dashboardApi.getSafetyEvents(deviceId, 50);
      setSafetyEvents(data);
    } catch (err: unknown) {
      setSafetyError(normalizeError(err).message);
    } finally {
      setSafetyLoading(false);
    }
  }, [deviceId]);

  const loadCost = useCallback(async (range: DateRange) => {
    if (!deviceId) return;
    setCostLoading(true);
    setCostError(null);
    try {
      const to = new Date().toISOString().split('T')[0];
      const fromDate = new Date(Date.now() - parseInt(range, 10) * 24 * 60 * 60 * 1000);
      const from = fromDate.toISOString().split('T')[0];
      const data = await dashboardApi.getSessionCost(deviceId, from, to);
      setCost(data);
    } catch (err: unknown) {
      setCostError(normalizeError(err).message);
    } finally {
      setCostLoading(false);
    }
  }, [deviceId]);

  // Load data when deviceId becomes available or tab changes
  useEffect(() => {
    if (!deviceId) return;
    if (activeTab === 'Sessions') loadSessions(1, true);
    else if (activeTab === 'Safety') loadSafety();
    else if (activeTab === 'Cost') loadCost(dateRange);
  // dateRange excluded: handleDateRangeChange handles range changes directly
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId, activeTab, loadSessions, loadSafety, loadCost]);

  const onSessionsRefresh = async () => {
    setSessionsRefreshing(true);
    setSessionsPage(1);
    await loadSessions(1, true);
    setSessionsRefreshing(false);
  };

  const onSafetyRefresh = async () => {
    setSafetyRefreshing(true);
    await loadSafety();
    setSafetyRefreshing(false);
  };

  const handleLoadMore = () => {
    if (sessions.length < sessionsTotal) {
      void loadSessions(sessionsPage + 1, false);
    }
  };

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    void loadCost(range);
  };

  if (loadingDevice) {
    return (
      <View style={styles.centered}>
        <LoadingSpinner />
      </View>
    );
  }

  if (!deviceId) {
    return (
      <View style={styles.centered}>
        <EmptyState title="No device found" subtitle="Set up a TBOT device to see activity" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TabBar active={activeTab} onSelect={setActiveTab} />

      {activeTab === 'Sessions' && (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={sessions}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={sessionsRefreshing} onRefresh={onSessionsRefresh} tintColor={theme.colors.primary} />
          }
          ListEmptyComponent={
            sessionsLoading ? <LoadingSpinner /> : sessionsError ? (
              <ErrorMessage message={sessionsError} />
            ) : (
              <EmptyState title="No sessions yet" subtitle="Sessions will appear here after your child starts using TBOT" />
            )
          }
          ListFooterComponent={
            sessions.length > 0 && sessions.length < sessionsTotal ? (
              <TouchableOpacity style={styles.loadMoreButton} onPress={handleLoadMore}>
                <Text style={styles.loadMoreText}>Load more</Text>
              </TouchableOpacity>
            ) : null
          }
          renderItem={({ item }) => (
            <Card style={styles.sessionCard}>
              <View style={styles.sessionRow}>
                <Text style={styles.childName}>{item.child_name}</Text>
                <Text style={styles.sessionDate}>{formatDate(item.started_at)}</Text>
              </View>
              <View style={styles.sessionStats}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{item.turn_count}</Text>
                  <Text style={styles.statLabel}>Turns</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={[styles.statValue, item.safety_flags > 0 && styles.statValueWarning]}>
                    {item.safety_flags}
                  </Text>
                  <Text style={styles.statLabel}>Safety flags</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{item.state}</Text>
                  <Text style={styles.statLabel}>State</Text>
                </View>
              </View>
            </Card>
          )}
        />
      )}

      {activeTab === 'Safety' && (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={safetyEvents}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={safetyRefreshing} onRefresh={onSafetyRefresh} tintColor={theme.colors.primary} />
          }
          ListEmptyComponent={
            safetyLoading ? <LoadingSpinner /> : safetyError ? (
              <ErrorMessage message={safetyError} />
            ) : (
              <EmptyState title="No safety events — great!" subtitle="Safety filter events will appear here if triggered" />
            )
          }
          renderItem={({ item }) => (
            <Card style={styles.sessionCard}>
              <View style={styles.sessionRow}>
                <Text style={styles.childName}>{item.child_name}</Text>
                <Text style={styles.sessionDate}>{formatDate(item.created_at)}</Text>
              </View>
              <View style={styles.safetyBadgeRow}>
                <View style={styles.safetyBadge}>
                  <Text style={styles.safetyBadgeText}>{item.filter_type}</Text>
                </View>
              </View>
              <Text style={styles.safetyReason}>{item.reason}</Text>
            </Card>
          )}
        />
      )}

      {activeTab === 'Cost' && (
        <View style={styles.costContainer}>
          <View style={styles.dateRangeRow}>
            {(['7', '30', '90'] as DateRange[]).map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.rangeButton, dateRange === r && styles.rangeButtonActive]}
                onPress={() => handleDateRangeChange(r)}
              >
                <Text style={[styles.rangeButtonText, dateRange === r && styles.rangeButtonTextActive]}>
                  {r}d
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {costLoading ? (
            <LoadingSpinner />
          ) : costError ? (
            <ErrorMessage message={costError} />
          ) : cost ? (
            <Card style={styles.costCard}>
              <View style={styles.costStatRow}>
                <Text style={styles.costLabel}>Total cost</Text>
                <Text style={styles.costValue}>${(cost.total_cost_usd ?? 0).toFixed(2)}</Text>
              </View>
              <View style={styles.costStatRow}>
                <Text style={styles.costLabel}>Sessions</Text>
                <Text style={styles.costValue}>{cost.session_count}</Text>
              </View>
              <View style={styles.costStatRow}>
                <Text style={styles.costLabel}>Avg cost / session</Text>
                <Text style={styles.costValue}>${(cost.avg_cost_per_session_usd ?? 0).toFixed(4)}</Text>
              </View>
              <Text style={styles.costDateRange}>
                {cost.from ?? '—'} → {cost.to ?? '—'}
              </Text>
            </Card>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  tabBar: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
  tabItem: { flex: 1, paddingVertical: theme.spacing.md, alignItems: 'center' },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: theme.colors.primary },
  tabLabel: { ...theme.typography.body2, color: theme.colors.textSecondary },
  tabLabelActive: { color: theme.colors.primary, fontWeight: '600' },
  list: { flex: 1 },
  listContent: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  sessionCard: { marginBottom: theme.spacing.md },
  sessionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: theme.spacing.sm },
  childName: { ...theme.typography.body1, color: theme.colors.textPrimary, fontWeight: '600', flex: 1 },
  sessionDate: { ...theme.typography.caption, color: theme.colors.textSecondary },
  sessionStats: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statValue: { ...theme.typography.h3, color: theme.colors.primary },
  statValueWarning: { color: theme.colors.error },
  statLabel: { ...theme.typography.caption, color: theme.colors.textSecondary },
  safetyBadgeRow: { flexDirection: 'row', marginBottom: theme.spacing.xs },
  safetyBadge: { backgroundColor: theme.colors.error + '20', borderRadius: theme.radius.sm, paddingHorizontal: theme.spacing.sm, paddingVertical: 2 },
  safetyBadgeText: { ...theme.typography.caption, color: theme.colors.error, fontWeight: '600' },
  safetyReason: { ...theme.typography.body2, color: theme.colors.textSecondary },
  loadMoreButton: { alignItems: 'center', paddingVertical: theme.spacing.md },
  loadMoreText: { ...theme.typography.body2, color: theme.colors.primary, fontWeight: '600' },
  costContainer: { flex: 1, padding: theme.spacing.md },
  dateRangeRow: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  rangeButton: { flex: 1, paddingVertical: theme.spacing.sm, alignItems: 'center', borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border },
  rangeButtonActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  rangeButtonText: { ...theme.typography.body2, color: theme.colors.textSecondary },
  rangeButtonTextActive: { color: '#FFFFFF', fontWeight: '600' },
  costCard: { gap: theme.spacing.sm },
  costStatRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: theme.spacing.xs },
  costLabel: { ...theme.typography.body2, color: theme.colors.textSecondary },
  costValue: { ...theme.typography.h3, color: theme.colors.textPrimary },
  costDateRange: { ...theme.typography.caption, color: theme.colors.textMuted, marginTop: theme.spacing.xs },
});
