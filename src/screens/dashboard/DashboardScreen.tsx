import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Home, Mic, Flame, Plus } from 'lucide-react-native';
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

  const firstName = user?.name?.split(' ')[0];
  const greeting = firstName ? `Hi, ${firstName}` : 'Welcome to TBOT';
  const greetingSubtitle = firstName ? 'Welcome back to TBOT' : "Let's get started";
  const activeChild = children[0];

  useEffect(() => {
    if (!pendingDeviceSetup) return;
    if (isLoading) return;
    clearPendingDeviceSetup();
    navigation.navigate('DeviceSetup');
  }, [pendingDeviceSetup, isLoading, clearPendingDeviceSetup, navigation]);

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
      <Text style={styles.greeting}>{greeting}</Text>
      <Text style={styles.greetingSubtitle}>{greetingSubtitle}</Text>

      {/* Streak badge */}
      {dailyStreak > 0 && (
        <View style={styles.streakBadge}>
          <Flame size={16} color={'#FF6B00'} strokeWidth={2.5} />
          <Text style={styles.streakText}>{dailyStreak}-day streak!</Text>
        </View>
      )}

      {/* Household card */}
      {activeHousehold && (
        <Card style={styles.householdCard}>
          <View style={styles.householdRow}>
            <View style={styles.householdIconBg}>
              <Home size={26} color={theme.colors.primary} strokeWidth={2} />
            </View>
            <View style={styles.householdInfo}>
              <Text style={styles.householdName}>{activeHousehold.name}</Text>
              <Text style={styles.householdChildren}>
                {children.length} {children.length === 1 ? 'child' : 'children'}
              </Text>
            </View>
            {children.length === 0 && (
              <TouchableOpacity
                style={styles.addChildBtn}
                onPress={() => navigation.navigate('AddChild', { householdId: activeHousehold.id })}
                activeOpacity={0.85}
              >
                <Plus size={16} color={theme.colors.primary} strokeWidth={2.5} />
                <Text style={styles.addChildText}>Add child</Text>
              </TouchableOpacity>
            )}
          </View>
        </Card>
      )}

      {/* Primary CTA: Start conversation (Gemini Live) */}
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate('GeminiConversation')}
        activeOpacity={0.85}
      >
        <Mic size={22} color={'#FFFFFF'} strokeWidth={2.5} />
        <Text style={styles.primaryButtonText}>Start conversation</Text>
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
    gap: theme.spacing.md,
  },
  householdIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
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
  addChildBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primary + '15',
  },
  addChildText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  primaryButtonText: {
    ...theme.typography.button,
    color: '#FFFFFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary + '12',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
  },
  secondaryButtonText: {
    ...theme.typography.button,
    color: theme.colors.primary,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
