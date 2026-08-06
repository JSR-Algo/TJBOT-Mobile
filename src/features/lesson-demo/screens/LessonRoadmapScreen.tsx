import React from 'react';
import { Image, ImageBackground, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Check, LockKeyhole, Map, Rocket } from 'lucide-react-native';
import { ROUTES, type RootStackParamList } from '../../../navigation/routes';
import { Text } from '../../../design-system/primitives/Text';
import { referenceColors, referenceImages, referenceShadow } from '../../../design-system/referenceTheme';
import { translateTemplate, useAppLanguage } from '../../../services/i18n/i18n';
import { staticLessonContentProvider, useLessonDemoProgressStore } from '../index';
import type { LessonRoadmapWeek } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'LessonRoadmapScreen'>;
type NodeState = 'complete' | 'current' | 'locked';

const NODE_GAP = 126;
const MAP_TOP = 146;

export function LessonRoadmapScreen({ navigation, route }: Props): React.JSX.Element {
  const { language, t } = useAppLanguage();
  const ageBand = route?.params?.ageBand ?? '7-9';
  const completedLessonIds = useLessonDemoProgressStore((state) => state.progress.completedLessonIds);
  const roadmap = staticLessonContentProvider.getRoadmap(ageBand, completedLessonIds);
  const firstIncompleteIndex = roadmap.findIndex((week) => week.completedCount < week.lessons.length);
  const currentIndex = firstIncompleteIndex === -1 ? roadmap.length - 1 : firstIncompleteIndex;
  const mapHeight = MAP_TOP + roadmap.length * NODE_GAP + 120;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      testID="lessonRoadmapScroll"
    >
      <View style={styles.titleCard}>
        <View style={styles.titleIcon}>
          <Map color={referenceColors.primary} size={22} strokeWidth={2.5} />
        </View>
        <View style={styles.titleCopy}>
          <Text fontWeight="800" style={styles.title}>{t('Six-month roadmap')}</Text>
          <Text fontWeight="700" style={styles.subtitle}>
            {t('24 weeks, 120 sessions, five short lessons per week.')}
          </Text>
        </View>
        <View style={styles.sessionBadge}>
          <Rocket color={referenceColors.primary} size={16} strokeWidth={2.5} />
          <Text fontWeight="800" style={styles.sessionBadgeText}>{t('120 sessions')}</Text>
        </View>
      </View>

      <ImageBackground
        source={referenceImages.adventureMap}
        resizeMode="cover"
        style={[styles.map, { height: mapHeight }]}
        imageStyle={styles.mapImage}
      >
        <View style={[styles.routeLine, { height: mapHeight - 210 }]} />
        {roadmap.map((week, index) => {
          const state = stateForWeek(week, index, currentIndex);
          const alignRight = index % 2 === 1;
          return (
            <RoadmapNode
              key={week.week}
              week={week}
              state={state}
              alignRight={alignRight}
              top={MAP_TOP + index * NODE_GAP}
              language={language}
              onPress={() => navigation.navigate(ROUTES.LessonSessionScreen, { week: week.week, day: 1, ageBand })}
            />
          );
        })}
      </ImageBackground>
    </ScrollView>
  );
}

function RoadmapNode({
  week,
  state,
  alignRight,
  top,
  language,
  onPress,
}: {
  week: LessonRoadmapWeek;
  state: NodeState;
  alignRight: boolean;
  top: number;
  language: 'en' | 'vi';
  onPress: () => void;
}) {
  const complete = state === 'complete';
  const current = state === 'current';
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={translateTemplate('Week {{week}}', { week: week.week }, { locale: language })}
      disabled={state === 'locked'}
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.nodeWrap,
        { top },
        alignRight ? styles.nodeRight : styles.nodeLeft,
        state === 'locked' && styles.nodeLocked,
      ]}
    >
      {current ? (
        <Image source={referenceImages.mapRobot} style={styles.mapRobot} resizeMode="contain" accessibilityIgnoresInvertColors />
      ) : null}
      <View style={[styles.node, complete && styles.nodeComplete, current && styles.nodeCurrent]}>
        {complete ? (
          <Check color="#FFFFFF" size={28} strokeWidth={3} />
        ) : state === 'locked' ? (
          <LockKeyhole color={referenceColors.inkMuted} size={24} strokeWidth={2.5} />
        ) : (
          <Text i18n={false} fontWeight="800" style={styles.nodeNumber}>{week.week}</Text>
        )}
      </View>
      <View style={[styles.nodeLabel, current && styles.nodeLabelCurrent]}>
        <Text i18n={false} fontWeight="800" numberOfLines={1} style={[styles.weekLabel, current && styles.currentLabel]}>
          {translateTemplate('Week {{week}}', { week: week.week }, { locale: language })}
        </Text>
        <Text i18n={false} fontWeight="700" numberOfLines={1} style={[styles.themeLabel, current && styles.currentLabel]}>
          {week.theme}
        </Text>
        <Text i18n={false} fontWeight="700" style={[styles.monthLabel, current && styles.currentLabel]}>
          {translateTemplate('Month {{month}}', { month: week.month }, { locale: language })}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function stateForWeek(week: LessonRoadmapWeek, index: number, currentIndex: number): NodeState {
  if (week.completedCount >= week.lessons.length) return 'complete';
  if (index === currentIndex) return 'current';
  return 'locked';
}

export default LessonRoadmapScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: referenceColors.bg },
  content: { paddingBottom: 112 },
  titleCard: {
    marginHorizontal: 20,
    marginTop: 28,
    marginBottom: 18,
    padding: 18,
    borderRadius: 28,
    backgroundColor: referenceColors.card,
    borderWidth: 1,
    borderColor: referenceColors.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...referenceShadow.card,
  },
  titleIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: referenceColors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCopy: { flex: 1, minWidth: 0 },
  title: { color: referenceColors.ink, fontSize: 20, lineHeight: 25 },
  subtitle: { color: referenceColors.inkMuted, fontSize: 11, lineHeight: 15, marginTop: 2 },
  sessionBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
    paddingHorizontal: 8,
    paddingVertical: 9,
    borderRadius: 16,
    backgroundColor: referenceColors.primarySoft,
    gap: 3,
  },
  sessionBadgeText: { color: referenceColors.primary, fontSize: 9, textAlign: 'center' },
  map: { width: '100%', position: 'relative', overflow: 'hidden' },
  mapImage: { opacity: 0.92 },
  routeLine: {
    position: 'absolute',
    top: MAP_TOP + 34,
    left: '50%',
    width: 5,
    marginLeft: -2.5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.62)',
  },
  nodeWrap: { position: 'absolute', alignItems: 'center', width: 150 },
  nodeLeft: { left: 28 },
  nodeRight: { right: 28 },
  nodeLocked: { opacity: 0.72 },
  mapRobot: {
    position: 'absolute',
    top: -62,
    width: 76,
    height: 76,
    zIndex: 3,
  },
  node: {
    width: 66,
    height: 66,
    borderRadius: 25,
    backgroundColor: referenceColors.cardSoft,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.86)',
    alignItems: 'center',
    justifyContent: 'center',
    ...referenceShadow.card,
  },
  nodeComplete: { backgroundColor: referenceColors.secondary },
  nodeCurrent: { width: 76, height: 76, borderRadius: 30, backgroundColor: referenceColors.primary },
  nodeNumber: { color: '#FFFFFF', fontSize: 24 },
  nodeLabel: {
    maxWidth: 150,
    minWidth: 112,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.90)',
    alignItems: 'center',
    ...referenceShadow.card,
  },
  nodeLabelCurrent: { backgroundColor: referenceColors.primary },
  weekLabel: { color: referenceColors.ink, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 },
  themeLabel: { color: referenceColors.inkSoft, fontSize: 10, marginTop: 1 },
  monthLabel: { color: referenceColors.inkMuted, fontSize: 9, marginTop: 2 },
  currentLabel: { color: '#FFFFFF' },
});
