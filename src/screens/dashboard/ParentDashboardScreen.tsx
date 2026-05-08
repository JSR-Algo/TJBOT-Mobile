import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useHousehold } from '../../contexts/HouseholdContext';
import * as learningApi from '../../api/learning';
import type { PronunciationTrend } from '../../api/learning';
import { FeatureUnavailableError } from '../../api/learning';
import { Card, LoadingSpinner, EmptyState } from '../../components';
import theme from '../../theme';
import type { MainTabScreenProps } from '../../navigation/types';
import type { KPIs } from '../../types';
import { normalizeError } from '../../utils/errors';

const CEFR_LEVEL: Record<string, string> = {
  beginner: 'A1',
  basic: 'A2',
  intermediate: 'B1',
  advanced: 'B2',
};

interface ChildKPIs {
  childId: string;
  childName: string;
  vocabularyLevel?: string;
  kpis: KPIs | null;
  pronunciationTrend: PronunciationTrend | null;
  pronunciationUnavailable: boolean;
  error: string | null;
}

function ConfidenceBar({ value }: { value: number }) {
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${value}%` as `${number}%` }]} />
    </View>
  );
}

const TREND_ICON: Record<string, string> = {
  improving: '↑',
  stable: '→',
  declining: '↓',
};
const TREND_COLOR: Record<string, string> = {
  improving: theme.colors.success,
  stable: theme.colors.warning,
  declining: theme.colors.error,
};

function PronunciationTrendChart({ trend }: { trend: PronunciationTrend }) {
  const BAR_MAX_HEIGHT = 32;
  const maxScore = Math.max(...trend.points.map((p) => p.score), 1);
  const icon = TREND_ICON[trend.trend] ?? '→';
  const color = TREND_COLOR[trend.trend] ?? theme.colors.textSecondary;
  return (
    <View style={styles.trendBox}>
      <View style={styles.trendHeader}>
        <Text style={styles.trendLabel}>Pronunciation (7d)</Text>
        <Text style={[styles.trendBadge, { color }]}>
          {icon} {trend.avg_score}% avg
        </Text>
      </View>
      <View style={styles.trendBars}>
        {trend.points.map((p, i) => (
          <View key={i} style={styles.trendBarCol}>
            <View
              style={[
                styles.trendBar,
                {
                  height: Math.max(4, Math.round((p.score / maxScore) * BAR_MAX_HEIGHT)),
                  backgroundColor: color,
                },
              ]}
            />
            <Text style={styles.trendBarLabel}>{p.date.slice(5)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function KPICard({ data }: { data: ChildKPIs }) {
  if (data.error) {
    return (
      <Card style={styles.kpiCard}>
        <Text style={styles.childName}>{data.childName}</Text>
        <Text style={styles.errorText}>{data.error}</Text>
      </Card>
    );
  }
  if (!data.kpis) {
    return (
      <Card style={styles.kpiCard}>
        <Text style={styles.childName}>{data.childName}</Text>
        <LoadingSpinner />
      </Card>
    );
  }
  const { kpis } = data;
  const cefrLevel = data.vocabularyLevel ? CEFR_LEVEL[data.vocabularyLevel] : null;
  return (
    <Card style={styles.kpiCard}>
      <View style={styles.childNameRow}>
        <Text style={styles.childName}>{data.childName}</Text>
        {cefrLevel && <Text style={styles.cefrBadge}>{cefrLevel}</Text>}
      </View>
      <View style={styles.kpiRow}>
        <View style={styles.kpiStat}>
          <Text style={styles.kpiValue}>{kpis.vocab_words_this_week}</Text>
          <Text style={styles.kpiLabel}>Words this week</Text>
        </View>
        <View style={styles.kpiStat}>
          <Text style={styles.kpiValue}>{kpis.sessions_this_week}</Text>
          <Text style={styles.kpiLabel}>Sessions</Text>
        </View>
        <View style={styles.kpiStat}>
          <Text style={styles.kpiValue}>{kpis.engagement_score}%</Text>
          <Text style={styles.kpiLabel}>Engagement</Text>
        </View>
      </View>
      <Text style={styles.confidenceLabel}>Speaking confidence</Text>
      <View style={styles.confidenceRow}>
        <ConfidenceBar value={kpis.speaking_confidence} />
        <Text style={styles.confidenceValue}>{kpis.speaking_confidence}%</Text>
      </View>
      {kpis.retention_rate > 0 && (
        <Text style={styles.retentionText}>
          Retention rate: {kpis.retention_rate}%
        </Text>
      )}
      {kpis.daily_streak > 0 && (
        <Text style={styles.streakText}>
          🔥 {kpis.daily_streak}-day streak
        </Text>
      )}
      {kpis.weak_words && kpis.weak_words.length > 0 && (
        <View style={styles.weakWordsBox}>
          <Text style={styles.weakWordsLabel}>Needs practice:</Text>
          <Text style={styles.weakWordsText}>{kpis.weak_words.join(', ')}</Text>
        </View>
      )}
      {data.pronunciationTrend && data.pronunciationTrend.points.length > 0 ? (
        <PronunciationTrendChart trend={data.pronunciationTrend} />
      ) : (
        <View style={styles.trendBox}>
          <EmptyState
            title="Coming soon"
            subtitle="Pronunciation trends will appear after your child's first session"
          />
        </View>
      )}
    </Card>
  );
}

export function ParentDashboardScreen(_props: MainTabScreenProps<'Progress'>): React.JSX.Element {
  const { children } = useHousehold();
  const [childKPIs, setChildKPIs] = useState<ChildKPIs[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadKPIs = useCallback(async () => {
    if (children.length === 0) return;

    const initial = children.map((c) => ({
      childId: c.id,
      childName: c.name,
      vocabularyLevel: c.vocabulary_level,
      kpis: null,
      pronunciationTrend: null,
      pronunciationUnavailable: false,
      error: null,
    }));
    setChildKPIs(initial);

    await Promise.all(
      children.map(async (child) => {
        const [kpisResult, trendResult] = await Promise.allSettled([
          learningApi.getKPIs(child.id),
          learningApi.getPronunciationTrend(child.id),
        ]);
        setChildKPIs((prev) =>
          prev.map((d) => {
            if (d.childId !== child.id) return d;
            const kpis = kpisResult.status === 'fulfilled' ? kpisResult.value : null;
            const error = kpisResult.status === 'rejected' ? normalizeError(kpisResult.reason).message : null;
            let pronunciationTrend: PronunciationTrend | null = null;
            let pronunciationUnavailable = false;
            if (trendResult.status === 'fulfilled') {
              pronunciationTrend = trendResult.value;
            } else if (trendResult.reason instanceof FeatureUnavailableError) {
              pronunciationUnavailable = true;
            }
            return { ...d, kpis, pronunciationTrend, pronunciationUnavailable, error };
          }),
        );
      }),
    );
  }, [children]);

  useEffect(() => { loadKPIs(); }, [loadKPIs]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadKPIs();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
      }
    >
      <Text style={styles.title}>Learning Progress</Text>
      <Text style={styles.subtitle}>This week's highlights for your children</Text>

      {children.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No children added yet.</Text>
          <Text style={styles.emptySubtext}>Add a child during setup to see progress here.</Text>
        </View>
      ) : childKPIs.length === 0 ? (
        <View style={styles.emptyBox}>
          <LoadingSpinner />
          <Text style={styles.emptySubtext}>Loading progress…</Text>
        </View>
      ) : (
        childKPIs.map((data) => <KPICard key={data.childId} data={data} />)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  title: { ...theme.typography.h1, color: theme.colors.textPrimary, marginBottom: theme.spacing.xs },
  subtitle: { ...theme.typography.body1, color: theme.colors.textSecondary, marginBottom: theme.spacing.lg },
  kpiCard: { marginBottom: theme.spacing.md },
  childNameRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  childName: { ...theme.typography.h3, color: theme.colors.textPrimary },
  cefrBadge: { ...theme.typography.caption, color: theme.colors.primary, fontWeight: '700', backgroundColor: theme.colors.primary + '20', paddingHorizontal: theme.spacing.xs, paddingVertical: 2, borderRadius: theme.radius.sm },
  kpiRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.md },
  kpiStat: { alignItems: 'center', flex: 1 },
  kpiValue: { ...theme.typography.h2, color: theme.colors.primary },
  kpiLabel: { ...theme.typography.caption, color: theme.colors.textSecondary, textAlign: 'center' },
  confidenceLabel: { ...theme.typography.body2, color: theme.colors.textSecondary, marginBottom: theme.spacing.xs },
  confidenceRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.xs },
  barTrack: { flex: 1, height: 8, backgroundColor: theme.colors.border, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 4 },
  confidenceValue: { ...theme.typography.body2, color: theme.colors.primary, fontWeight: '700', minWidth: 36, textAlign: 'right' },
  retentionText: { ...theme.typography.caption, color: theme.colors.textSecondary },
  streakText: { ...theme.typography.body2, color: theme.colors.primary, fontWeight: '700', marginTop: theme.spacing.xs },
  weakWordsBox: { marginTop: theme.spacing.xs },
  weakWordsLabel: { ...theme.typography.caption, color: theme.colors.textSecondary },
  weakWordsText: { ...theme.typography.caption, color: theme.colors.error },
  emptyBox: { padding: theme.spacing.lg, alignItems: 'center' },
  emptyText: { ...theme.typography.body1, color: theme.colors.textSecondary, fontWeight: '600' },
  emptySubtext: { ...theme.typography.body2, color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.xs },
  errorText: { ...theme.typography.body2, color: theme.colors.error },
  trendBox: { marginTop: theme.spacing.md, paddingTop: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.border },
  trendHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm },
  trendLabel: { ...theme.typography.body2, color: theme.colors.textSecondary },
  trendBadge: { ...theme.typography.caption, fontWeight: '700' },
  trendBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 48 },
  trendBarCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  trendBar: { width: '100%', borderRadius: 2 },
  trendBarLabel: { ...theme.typography.caption, color: theme.colors.textMuted, marginTop: 2, fontSize: 9 },
});
