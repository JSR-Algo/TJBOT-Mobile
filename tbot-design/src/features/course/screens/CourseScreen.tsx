import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import Robot from '@/design-system/components/Robot';
import PageScroll from '@/design-system/components/PageScroll';
import PageHeader from '@/design-system/components/PageHeader';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import MiniProgress from '../components/MiniProgress';

type Props = NativeStackScreenProps<RootStackParamList, 'CourseScreen'>;

const LEVELS = [
  { id: 'L1', title: 'Hello Friends', subtitle: 'Greetings & me', state: 'current', progress: 0.4, color: '#FF6F61', icon: '👋' },
  { id: 'L2', title: 'Animal World',  subtitle: 'Animals & sounds', state: 'locked',  progress: 0,   color: '#6CE2B6', icon: '🐱' },
  { id: 'L3', title: 'My Day',        subtitle: 'Daily routines',   state: 'locked',  progress: 0,   color: '#5BC8F5', icon: '🌤️' },
  { id: 'L4', title: 'Yummy Foods',   subtitle: 'Food & drinks',    state: 'locked',  progress: 0,   color: '#FFC857', icon: '🍎' },
];

export default function CourseScreen({ navigation }: Props) {
  return (
    <PageScroll>
      <PageHeader
        subtitle="My adventure"
        title="English with Robot"
      />

      <Box paddingHorizontal={18} paddingBottom={14} gap={18}>
        <Box style={styles.heroCard}>
          <Box flex={1}>
            <Text fontWeight="600" style={styles.heroEyebrow}>Keep going!</Text>
            <Text fontWeight="800" style={styles.heroTitle}>Level 1{'\n'}Hello Friends</Text>
            <Box style={styles.heroTrack}>
              <Box style={styles.heroFill} />
            </Box>
            <Text fontWeight="700" style={styles.heroSub}>4 of 10 lessons</Text>
          </Box>
          <Robot emotion="happy" size={110} />
        </Box>

        <Box gap={14}>
          {LEVELS.map((lvl, i) => (
            <TouchableOpacity
              key={lvl.id}
              disabled={lvl.state === 'locked'}
              onPress={() => navigation.navigate('LevelScreen')}
              style={[styles.levelRow, { opacity: lvl.state === 'locked' ? 0.55 : 1 }]}
              activeOpacity={0.8}
            >
              <Box style={[styles.levelIcon, { backgroundColor: lvl.state === 'locked' ? '#E5E0D6' : lvl.color }]}>
                {lvl.state === 'locked'
                  ? <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#9A917F" strokeWidth={2.5} strokeLinecap="round"><Rect x={4} y={11} width={16} height={10} rx={2} /><Path d="M8 11V7a4 4 0 018 0v4" /></Svg>
                  : <Text style={styles.levelEmoji}>{lvl.icon}</Text>}
              </Box>
              <Box flex={1}>
                <Text fontWeight="600" style={styles.levelNum}>Level {i + 1}</Text>
                <Text fontWeight="800" style={styles.levelTitle}>{lvl.title}</Text>
                {lvl.state === 'current'
                  ? <Box style={styles.progressWrap}><MiniProgress value={lvl.progress} /></Box>
                  : <Text fontWeight="700" style={styles.levelSub}>{lvl.subtitle}</Text>}
              </Box>
              {lvl.state !== 'locked' && (
                <Svg width={14} height={22} viewBox="0 0 14 22" fill="none" stroke="#8B8B96" strokeWidth={2.5} strokeLinecap="round">
                  <Path d="M3 3l8 8-8 8" />
                </Svg>
              )}
            </TouchableOpacity>
          ))}
        </Box>
      </Box>
    </PageScroll>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: '#FF6F61', borderRadius: 28, padding: 18,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    shadowColor: '#FF6F61', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.35, shadowRadius: 30,
  },
  heroEyebrow: { fontSize: 13, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  heroTitle: { fontSize: 22, color: '#fff', lineHeight: 24 },
  heroTrack: { marginTop: 10, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 10, height: 10, overflow: 'hidden' },
  heroFill: { width: '40%', height: '100%' as any, backgroundColor: '#fff', borderRadius: 10 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.95)', marginTop: 6 },
  levelRow: {
    backgroundColor: '#fff', borderRadius: 24, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 18,
  },
  levelIcon: {
    width: 64, height: 64, borderRadius: 20, flexShrink: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  levelEmoji: { fontSize: 32 },
  levelNum: { fontSize: 13, color: '#5C4F77' },
  levelTitle: { fontSize: 20, color: '#2B2140', lineHeight: 22 },
  levelSub: { fontSize: 13, color: '#5C4F77', marginTop: 2 },
  progressWrap: { marginTop: 8 },
});
