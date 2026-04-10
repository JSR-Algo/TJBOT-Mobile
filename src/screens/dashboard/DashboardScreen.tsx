import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useHousehold } from '../../contexts/HouseholdContext';
import { useInteractions } from '../../contexts/InteractionContext';
import { Card } from '../../components';
import * as learningApi from '../../api/learning';
import theme from '../../theme';
import type { MainTabScreenProps } from '../../navigation/types';

export function DashboardScreen({ navigation }: MainTabScreenProps<'Home'>): React.JSX.Element {
  const { user } = useAuth();
  const { activeHousehold, children, refresh, isLoading, pendingDeviceSetup, clearPendingDeviceSetup } = useHousehold();
  const { interactions } = useInteractions();
  const [refreshing, setRefreshing] = useState(false);
  const [dailyStreak, setDailyStreak] = useState(0);
  const recentActivities = interactions.slice(0, 3);

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const activeChild = children[0];

  useEffect(() => {
    if (!pendingDeviceSetup) return;
    clearPendingDeviceSetup();
    // Defer navigation to next frame so the stack navigator is fully mounted
    const t = setTimeout(() => navigation.navigate('DeviceSetup'), 0);
    return () => clearTimeout(t);
  }, [pendingDeviceSetup, clearPendingDeviceSetup, navigation]);

  useEffect(() => {
    if (!activeChild) return;
    learningApi.getKPIs(activeChild.id)
      .then((kpis) => setDailyStreak(kpis.daily_streak ?? 0))
      .catch(() => {});
  }, [activeChild]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    if (activeChild) {
      learningApi.getKPIs(activeChild.id)
        .then((kpis) => setDailyStreak(kpis.daily_streak ?? 0))
        .catch(() => {});
    }
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing || isLoading}
          onRefresh={onRefresh}
          tintColor={theme.colors.primary}
        />
      }
    >
      {/* Greeting */}
      <Text style={styles.greeting}>Hi, {firstName} 👋</Text>
      <Text style={styles.greetingSubtitle}>Welcome back to TBOT</Text>

      {/* Streak badge */}
      {dailyStreak > 0 && (
        <View style={styles.streakBadge}>
          <Text style={styles.streakText}>🔥 {dailyStreak}-day streak!</Text>
        </View>
      )}

      {/* Household card */}
      {activeHousehold && (
        <Card style={styles.householdCard}>
          <View style={styles.householdRow}>
            <Text style={styles.householdEmoji}>🏠</Text>
            <View style={styles.householdInfo}>
              <Text style={styles.householdName}>{activeHousehold.name}</Text>
              <Text style={styles.householdChildren}>
                {children.length} {children.length === 1 ? 'child' : 'children'}
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* Start conversation */}
      <TouchableOpacity
        style={styles.startButton}
        onPress={() => navigation.navigate('Interaction')}
        activeOpacity={0.85}
      >
        <Text style={styles.startButtonEmoji}>🎙️</Text>
        <Text style={styles.startButtonText}>Start conversation</Text>
      </TouchableOpacity>

      {/* Gemini Live Voice */}
      <TouchableOpacity
        style={[styles.startButton, { backgroundColor: '#6C5CE7' }]}
        onPress={() => navigation.navigate('GeminiConversation')}
        activeOpacity={0.85}
      >
        <Text style={styles.startButtonEmoji}>uD83EuDD16</Text>
        <Text style={styles.startButtonText}>Gemini Live Voice</Text>
      </TouchableOpacity>

      {/* Recent activity */}
      <Text style={styles.sectionTitle}>Recent activity</Text>

      {recentActivities.length === 0 ? (
        <View style={styles.emptyActivityBox}>
          <Text style={styles.emptyActivityText}>No conversations yet</Text>
          <Text style={styles.emptyActivitySubtext}>
            Tap "Start conversation" above to talk to TBOT.
          </Text>
        </View>
      ) : (
        recentActivities.map((item) => (
          <Card key={item.id} style={styles.activityCard}>
            <Text style={styles.activityMessage} numberOfLines={1}>You: {item.message}</Text>
            <Text style={styles.activityResponse} numberOfLines={2}>TBOT: {item.response}</Text>
            <Text style={styles.activityTime}>
              {new Date(item.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </Text>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  greeting: {
    ...theme.typography.h1,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  greetingSubtitle: {
    ...theme.typography.body1,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  householdCard: {
    marginBottom: theme.spacing.md,
  },
  householdRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  householdEmoji: {
    fontSize: 32,
    marginRight: theme.spacing.md,
  },
  householdInfo: {
    flex: 1,
  },
  householdName: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
  },
  householdChildren: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  startButtonEmoji: {
    fontSize: 22,
  },
  startButtonText: {
    ...theme.typography.button,
    color: '#FFFFFF',
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  streakBadge: {
    alignSelf: 'center',
    backgroundColor: '#FF6B0020',
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#FF6B00' + '40',
  },
  streakText: {
    ...theme.typography.body2,
    color: '#FF6B00',
    fontWeight: '700',
  },
  emptyActivityBox: {
    backgroundColor: theme.colors.border + '30',
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  emptyActivityText: {
    ...theme.typography.body1,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  emptyActivitySubtext: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  activityCard: {
    marginBottom: theme.spacing.sm,
  },
  activityMessage: {
    ...theme.typography.body2,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    marginBottom: 2,
  },
  activityResponse: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  activityTime: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
});
