import React from 'react';
import { Image, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { BookOpen, ClipboardList, Play } from 'lucide-react-native';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { translateTemplate, useAppLanguage } from '@/services/i18n/i18n';

type Props = {
  childName: string;
  lessonTitle: string;
  durationMinutes: number;
  wordCount: number;
  wordsReady: number;
  reportsReady: number;
  online: boolean;
  lessonReady: boolean;
  lessonStatusLabel: string;
  primaryLabel: string;
  primaryEnabled: boolean;
  onPrimary: () => void;
  onLiveStatus: () => void;
  onReport: () => void;
};

export function TodayCommandView({
  childName,
  lessonTitle,
  durationMinutes,
  wordCount,
  wordsReady,
  reportsReady,
  online: _online,
  lessonReady,
  lessonStatusLabel,
  primaryLabel,
  primaryEnabled,
  onPrimary,
  onLiveStatus,
  onReport,
}: Props): React.JSX.Element {
  const { language, t } = useAppLanguage();
  const heroTitle = lessonReady
    ? translateTemplate('Ready when {{name}} is', { name: childName }, { locale: language })
    : t('Home unavailable');
  const heroSubtitle = lessonReady
    ? t('TeeBot is polished and waiting for the next lesson.')
    : t('TeeBot needs attention');

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      testID="overviewPage"
    >
      <TouchableOpacity
        accessibilityLabel={t('Open live lesson status')}
        accessibilityRole="button"
        accessibilityState={{ disabled: !lessonReady }}
        activeOpacity={0.9}
        disabled={!lessonReady}
        onPress={onLiveStatus}
        style={styles.hero}
        testID="homeHeroRobot"
      >
        <Box style={styles.heroGlow} />
        <Box style={styles.heroCopy}>
          <Text fontWeight="800" style={styles.heroTitle} i18n={false}>
            {heroTitle}
          </Text>
          {lessonReady ? (
            <Text fontWeight="600" style={styles.heroSubtitle} i18n={false}>
              {heroSubtitle}
            </Text>
          ) : (
            <Box flexDirection="row" alignItems="center" gap={7} style={styles.onlineRow}>
              <Box style={[styles.onlineDot, styles.offlineDot]} />
              <Text fontWeight="700" style={[styles.onlineText, styles.offlineText]}>
                {t('TeeBot needs attention')}
              </Text>
            </Box>
          )}
        </Box>
        <Image
          accessibilityIgnoresInvertColors
          accessibilityLabel={t('TeeBot')}
          resizeMode="contain"
          source={require('@/assets/mascot/alive-wave.png')}
          style={styles.robot}
        />
      </TouchableOpacity>

      <Box style={styles.lessonCard} flexDirection="row" alignItems="center" gap={13}>
        <Image
          accessibilityIgnoresInvertColors
          resizeMode="cover"
          source={require('@/assets/lessons/barn-round-field-poster.jpg')}
          style={styles.courseArt}
        />
        <Box flex={1} gap={5}>
          <Text fontWeight="800" style={styles.lessonTitle} numberOfLines={2}>{lessonTitle}</Text>
          <Text style={styles.lessonMeta} i18n={false}>
            {lessonReady
              ? t('Animals · Lesson 3 of 12')
              : translateTemplate('{{minutes}} min · {{words}} words', { minutes: durationMinutes, words: wordCount }, { locale: language })}
          </Text>
          <Box flexDirection="row" alignItems="center" gap={8}>
            <Text fontWeight="700" style={[styles.readyText, !lessonReady && styles.notReadyText]}>{t(lessonStatusLabel)}</Text>
            <Box style={styles.progressTrack}><Box style={styles.progressFill} /></Box>
          </Box>
        </Box>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: !primaryEnabled }}
          activeOpacity={0.78}
          disabled={!primaryEnabled}
          onPress={onPrimary}
          style={[
            styles.startButton,
            lessonReady && styles.startButtonReady,
            !primaryEnabled && styles.startButtonDisabled,
          ]}
          testID="homePrimaryCta"
        >
          {lessonReady && primaryLabel === 'Start' ? (
            <Play size={22} color="#FFFFFF" fill="#FFFFFF" />
          ) : (
            <Text fontWeight="800" style={styles.startText}>{t(primaryLabel)}</Text>
          )}
          {lessonReady && primaryLabel === 'Start' ? (
            <Text style={styles.hiddenCtaLabel}>{t(primaryLabel)}</Text>
          ) : null}
        </TouchableOpacity>
      </Box>

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
  onlineDot: { backgroundColor: '#35AE70', borderRadius: 5, height: 9, width: 9 },
  offlineDot: { backgroundColor: '#A6A3A0' },
  onlineText: { color: '#35AE70', flexShrink: 1, fontSize: 11 },
  offlineText: { color: '#77736F' },
  robot: { bottom: 12, height: 340, position: 'absolute', right: -8, width: 250 },
  lessonCard: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#F0EAE3',
    borderTopWidth: StyleSheet.hairlineWidth,
    minHeight: 132,
    paddingHorizontal: 22,
    paddingVertical: 18,
  },
  courseArt: { backgroundColor: '#FFF3D8', borderRadius: 18, height: 78, overflow: 'hidden', width: 78 },
  lessonTitle: { color: '#1C1E20', fontSize: 18, lineHeight: 23 },
  lessonMeta: { color: '#787774', fontSize: 13 },
  readyText: { color: '#35AE70', fontSize: 11 },
  notReadyText: { color: '#77736F' },
  progressTrack: { backgroundColor: '#E9ECEB', borderRadius: 4, flex: 1, height: 3, overflow: 'hidden' },
  progressFill: { backgroundColor: '#35AE70', height: '100%', width: '84%' },
  startButton: {
    alignItems: 'center',
    backgroundColor: '#1D1F20',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 68,
    paddingHorizontal: 12,
  },
  startButtonReady: {
    backgroundColor: '#35AE70',
    borderRadius: 28,
    height: 56,
    minHeight: 56,
    minWidth: 56,
    width: 56,
  },
  startButtonDisabled: { opacity: 0.45 },
  startText: { color: '#FFFFFF', fontSize: 13 },
  hiddenCtaLabel: { height: 0, opacity: 0, overflow: 'hidden', position: 'absolute', width: 0 },
  evidenceCard: { backgroundColor: '#FBF8F4', borderTopColor: '#F0EAE3', borderTopWidth: 1, minHeight: 138, padding: 24 },
  sectionLabel: { color: '#292B2D', fontSize: 12, marginBottom: 15 },
  metricRow: { minHeight: 64 },
  metricButton: { flex: 1 },
  metric: { flex: 1 },
  metricIcon: { backgroundColor: '#F0EBFF', borderRadius: 16, height: 40, width: 40 },
  metricValue: { color: '#6A4FE8', fontSize: 18 },
  metricLabel: { color: '#807D79', fontSize: 10 },
  divider: { backgroundColor: '#E9E3DC', marginHorizontal: 12, width: 1 },
});
