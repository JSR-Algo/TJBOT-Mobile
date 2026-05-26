import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import Robot from '@/design-system/components/Robot';
import PageScroll from '@/design-system/components/PageScroll';
import PageHeader from '@/design-system/components/PageHeader';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'LevelScreen'>;

const UNITS = [
  { id: 'U1', title: 'Say hi',       icon: '👋', state: 'done',    color: '#FF6F61' },
  { id: 'U2', title: 'My name',      icon: '🪪', state: 'done',    color: '#5BC8F5' },
  { id: 'U3', title: 'How are you?', icon: '🙂', state: 'current', color: '#FF6F61' },
  { id: 'U4', title: 'Numbers 1-5',  icon: '🔢', state: 'locked',  color: '#6CE2B6' },
  { id: 'U5', title: 'Colors',       icon: '🎨', state: 'locked',  color: '#FFC857' },
];

function LessonNode({ state, icon, color, big, label, onPress }: {
  state: string; icon: string; color: string; big?: boolean;
  label?: string; onPress?: () => void;
}) {
  const size = big ? 112 : 88;
  const isLocked = state === 'locked';
  const isDone = state === 'done';
  const isCurrent = state === 'current';
  const isReview = state === 'review';
  const bg = isLocked ? '#E5E0D6' : isDone ? '#6CE2B6' : isReview ? '#FFC857' : color;

  return (
    <Box alignItems="center">
      <TouchableOpacity
        onPress={onPress}
        disabled={isLocked}
        activeOpacity={0.8}
        style={[
          styles.node,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
          isCurrent && { shadowColor: color, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.4, shadowRadius: 28 },
        ]}
      >
        {isLocked
          ? <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#9A917F" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><Rect x={4} y={11} width={16} height={10} rx={2} /><Path d="M8 11V7a4 4 0 018 0v4" /></Svg>
          : isDone
          ? <Svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round"><Path d="M5 12l5 5L20 7" /></Svg>
          : <Text style={{ fontSize: big ? 44 : 36 }}>{icon}</Text>}
        {isReview && <Box style={styles.reviewBadge}><Text fontWeight="800" style={styles.reviewBadgeText}>!</Text></Box>}
      </TouchableOpacity>
      {label && (
        <Text fontWeight="700" style={[styles.nodeLabel, { color: isLocked ? '#8B8B96' : '#2B2140' }]}>
          {label}
        </Text>
      )}
    </Box>
  );
}

export default function LevelScreen({ navigation }: Props) {
  return (
    <PageScroll>
      <PageHeader
        onBack={() => navigation.navigate(ROUTES.CourseScreen)}
        subtitle="Level 1"
        title="Hello Friends"
      />

      <Box paddingHorizontal={24} paddingBottom={14} flexDirection="row" alignItems="center" gap={12}>
        <Robot emotion="happy" size={80} />
        <Box style={styles.bubble} flex={1}>
          <Text fontWeight="700" style={styles.bubbleText}>You're on Unit 3 — let's go!</Text>
        </Box>
      </Box>

      <Box paddingHorizontal={24} paddingBottom={60} gap={60}>
        {UNITS.map((u, i) => (
          <Box key={u.id} alignItems={i % 2 ? 'flex-end' : 'flex-start'}>
            <LessonNode
              state={u.state}
              icon={u.icon}
              color={u.color}
              big={u.state === 'current'}
              onPress={() => u.state !== 'locked' && navigation.navigate(ROUTES.UnitScreen)}
            />
            <Text fontWeight="700" style={[styles.unitLabel, { color: u.state === 'locked' ? '#8B8B96' : '#2B2140' }]}>
              <Text style={{ opacity: 0.6 }}>Unit {i + 1}</Text>{'\n'}{u.title}
            </Text>
          </Box>
        ))}
      </Box>
    </PageScroll>
  );
}

const styles = StyleSheet.create({
  node: { alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8 },
  reviewBadge: {
    position: 'absolute', top: -4, right: -4, width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#FF6F61', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FAF8F3',
  },
  reviewBadgeText: { fontSize: 14, color: '#fff' },
  nodeLabel: { marginTop: 8, fontSize: 13, textAlign: 'center' },
  bubble: { backgroundColor: '#fff', borderRadius: 18, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
  bubbleText: { fontSize: 15, color: '#2B2140', lineHeight: 20 },
  unitLabel: { marginTop: 6, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
