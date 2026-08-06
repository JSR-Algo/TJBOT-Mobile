import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowRight, BookOpen, ClipboardList, TrendingUp } from 'lucide-react-native';
import { Reveal, Sheen, StatusPulse } from '@/design-system/animations';
import RobotGreetLoop from '@/design-system/components/RobotGreetLoop';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { translateTemplate, useAppLanguage } from '@/services/i18n/i18n';

type Props = {
  childName: string;
  wordsReady: number;
  reportsReady: number;
  homeReady: boolean;
  recoveryLabel?: string;
  onProgress: () => void;
  onReport: () => void;
  onRecovery?: () => void;
};

export function TodayCommandView({
  childName,
  wordsReady,
  reportsReady,
  homeReady,
  recoveryLabel,
  onProgress,
  onReport,
  onRecovery,
}: Props): React.JSX.Element {
  const { language, t } = useAppLanguage();
  const heroTitle = homeReady
    ? translateTemplate('Ready when {{name}} is', { name: childName }, { locale: language })
    : t('Home unavailable');
  const heroSubtitle = homeReady
    ? t('TeeBot is ready for your child.')
    : t('TeeBot needs attention');

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      testID="overviewPage"
    >
      <Reveal index={0} testID="homeHeroReveal">
        <Box style={styles.hero} testID="homeHeroRobot">
          <Box style={styles.heroGlow} />
          <Box style={styles.heroCopy}>
            <Text fontWeight="800" style={styles.heroTitle} i18n={false}>
              {heroTitle}
            </Text>
            {homeReady ? (
              <Box flexDirection="row" alignItems="center" gap={7} style={styles.onlineRow}>
                <StatusPulse
                  active
                  color="#35AE70"
                  size={9}
                  testID="homeOnlinePulse"
                />
                <Text fontWeight="600" style={styles.heroSubtitle} i18n={false}>
                  {heroSubtitle}
                </Text>
              </Box>
            ) : (
              <Box flexDirection="row" alignItems="center" gap={7} style={styles.onlineRow}>
                <StatusPulse
                  active={false}
                  color="#A6A3A0"
                  size={9}
                  testID="homeOfflineDot"
                />
                <Text fontWeight="700" style={[styles.onlineText, styles.offlineText]}>
                  {t('TeeBot needs attention')}
                </Text>
              </Box>
            )}
          </Box>
          <Box style={styles.robot} testID="homeHeroAnimatedRobot">
            <RobotGreetLoop
              accessibilityLabel={t('TeeBot')}
              testID="homeHeroRobotAnimation"
              size={320}
            />
          </Box>
        </Box>
      </Reveal>

      {!homeReady && recoveryLabel && onRecovery ? (
        <Reveal index={1}>
          <TouchableOpacity
            accessibilityLabel={recoveryLabel}
            accessibilityRole="button"
            activeOpacity={0.8}
            onPress={onRecovery}
            style={styles.recoveryButton}
            testID="homeRecoveryCta"
          >
            <Text fontWeight="800" style={styles.recoveryButtonText}>{recoveryLabel}</Text>
          </TouchableOpacity>
        </Reveal>
      ) : null}

      <Reveal index={homeReady ? 1 : 2} testID="homeProgressReveal">
        <Sheen
          active={homeReady}
          style={styles.progressCard}
          testID="homeProgressSheen"
        >
          <TouchableOpacity
            accessibilityLabel={t('View progress')}
            accessibilityRole="button"
            activeOpacity={0.82}
            onPress={onProgress}
            style={styles.progressCardInner}
            testID="homeProgressCard"
          >
            <Box style={styles.progressIcon} alignItems="center" justifyContent="center">
              <TrendingUp color="#FFFFFF" size={25} strokeWidth={2.7} />
            </Box>
            <Box flex={1} gap={5}>
              <Text fontWeight="800" style={styles.progressTitle}>{t('Progress')}</Text>
              <Text style={styles.progressCopy} i18n={false}>
                {translateTemplate('{{count}} words learned this week', { count: wordsReady }, { locale: language })}
              </Text>
              <Text fontWeight="800" style={styles.progressReports} i18n={false}>
                {translateTemplate('{{count}} lesson reports ready', { count: reportsReady }, { locale: language })}
              </Text>
            </Box>
            <Box style={styles.progressArrow} alignItems="center" justifyContent="center">
              <ArrowRight color="#FFFFFF" size={20} strokeWidth={2.8} />
            </Box>
          </TouchableOpacity>
        </Sheen>
      </Reveal>

      <Reveal index={homeReady ? 2 : 3} testID="homeEvidenceReveal">
        <Box style={styles.evidenceCard}>
          <Text fontWeight="700" style={styles.sectionLabel}>{t('Since yesterday')}</Text>
          <Box flexDirection="row" alignItems="stretch" style={styles.metricRow}>
            <EvidenceMetric
              icon={<BookOpen size={21} color="#6A4FE8" />}
              label={t('words ready to review')}
              value={wordsReady}
            />
            <Box style={styles.divider} />
            <TouchableOpacity
              accessibilityLabel={t('Open latest lesson report')}
              accessibilityRole="button"
              activeOpacity={0.75}
              onPress={onReport}
              style={styles.metricButton}
              testID="homeLessonReport"
            >
              <EvidenceMetric
                icon={<ClipboardList size={21} color="#6A4FE8" />}
                label={t('lesson report')}
                value={reportsReady}
              />
            </TouchableOpacity>
          </Box>
        </Box>
      </Reveal>
    </ScrollView>
  );
}

function EvidenceMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Box style={styles.metric} flexDirection="row" alignItems="center" gap={10}>
      <Box style={styles.metricIcon} alignItems="center" justifyContent="center">{icon}</Box>
      <Box gap={2}>
        <Text i18n={false} fontWeight="800" style={styles.metricValue}>{value}</Text>
        <Text i18n={false} style={styles.metricLabel}>{label}</Text>
      </Box>
    </Box>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 0 },
  hero: {
    backgroundColor: '#FCF8F3',
    height: 400,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  heroGlow: {
    backgroundColor: '#FBEAE4',
    borderRadius: 160,
    height: 320,
    position: 'absolute',
    right: -48,
    top: 40,
    width: 320,
  },
  heroCopy: { left: 24, position: 'absolute', top: 96, width: 168, zIndex: 2 },
  heroTitle: { color: '#141617', fontSize: 30, letterSpacing: -0.9, lineHeight: 36, marginBottom: 10 },
  heroSubtitle: { color: '#6F6861', fontSize: 14, lineHeight: 20, marginBottom: 12 },
  onlineRow: { marginTop: 2 },
  onlineText: { color: '#35AE70', flexShrink: 1, fontSize: 11 },
  offlineText: { color: '#77736F' },
  robot: { alignItems: 'center', bottom: 12, height: 320, position: 'absolute', right: -29, width: 324 },
  progressCard: {
    backgroundColor: '#FF6868',
    borderRadius: 28,
    marginHorizontal: 20,
    marginTop: -22,
    minHeight: 116,
    shadowColor: '#A94141',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 5,
    zIndex: 2,
  },
  progressCardInner: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 13,
    minHeight: 116,
    padding: 18,
    zIndex: 2,
  },
  progressIcon: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 18, height: 48, width: 48 },
  progressTitle: { color: '#FFFFFF', fontSize: 19, lineHeight: 24 },
  progressCopy: { color: 'rgba(255,255,255,0.9)', fontSize: 12, lineHeight: 17 },
  progressReports: { color: '#FFFFFF', fontSize: 11, lineHeight: 15 },
  progressArrow: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 19, height: 38, width: 38 },
  evidenceCard: { backgroundColor: '#FBF8F4', borderTopColor: '#F0EAE3', borderTopWidth: 1, minHeight: 138, padding: 24 },
  sectionLabel: { color: '#292B2D', fontSize: 12, marginBottom: 15 },
  metricRow: { minHeight: 64 },
  metricButton: { flex: 1 },
  metric: { flex: 1 },
  metricIcon: { backgroundColor: '#F0EBFF', borderRadius: 16, height: 40, width: 40 },
  metricValue: { color: '#6A4FE8', fontSize: 18 },
  metricLabel: { color: '#807D79', fontSize: 10 },
  divider: { backgroundColor: '#E9E3DC', marginHorizontal: 12, width: 1 },
  recoveryButton: { minHeight: 52, borderRadius: 18, borderWidth: 1, borderColor: '#FFBDB6', backgroundColor: '#FFF5F2', alignItems: 'center', justifyContent: 'center', marginHorizontal: 20, marginTop: 16 },
  recoveryButtonText: { color: '#D84D4D', fontSize: 15 },
});
