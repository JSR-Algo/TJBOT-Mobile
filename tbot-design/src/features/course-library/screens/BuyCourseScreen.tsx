import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import LCDFace from '@/design-system/components/LCDFace';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import CL from '../components/CL';
import COURSES from '../components/courses';

type Props = NativeStackScreenProps<RootStackParamList, 'BuyCourseScreen'>;

const COURSE = COURSES[2]!;
const PLANS = [
  { id: 'library', tag: 'Best for families', title: 'All Courses', body: 'Every course, now and future, on your Robot.', price: '$8.99', period: '/ month', cancel: 'Cancel anytime · 7-day free trial' },
  { id: 'single',  tag: 'One-time',          title: 'Just this course', body: 'Yummy Words only, yours forever.', price: '$24', period: 'one-time', cancel: 'No subscription' },
] as const;

export default function BuyCourseScreen({ navigation }: Props) {
  const [plan, setPlan] = React.useState<'library' | 'single'>('library');
  const c = COURSE;
  return (
    <DeviceShell title="Add Yummy Words" onBack={() => navigation.navigate('CourseDetailScreen')}>
      <Box paddingHorizontal={20} paddingTop={14}>
        <Box style={styles.parentBadge}>
          <Svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="#8A6A12" strokeWidth={2.5} strokeLinecap="round">
            <Rect x={5} y={11} width={14} height={10} rx={2} />
            <Path d="M8 11V7a4 4 0 018 0v4" />
          </Svg>
          <Text fontWeight="700" style={styles.parentBadgeText}>For parents only</Text>
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={14}>
        <Box style={styles.courseTile}>
          <Box style={styles.lcdWrap}>
            <LCDFace emotion={c.lcd} size={64} accent="#FF6F61" />
          </Box>
          <Box>
            <Text fontWeight="600" style={styles.courseName}>{c.title}</Text>
            <Text style={styles.courseMeta}>{c.lessons} lessons · {c.weeks} weeks</Text>
          </Box>
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={20}>
        <Text fontWeight="700" style={styles.sectionLabel}>Choose a plan</Text>
        <Box gap={8}>
          {PLANS.map(p => {
            const sel = plan === p.id;
            return (
              <TouchableOpacity key={p.id} onPress={() => setPlan(p.id)} activeOpacity={0.8}
                style={[styles.planCard, sel && styles.planCardSel]}>
                <Box flexDirection="row" alignItems="flex-start" justifyContent="space-between" gap={10}>
                  <Box flex={1}>
                    <Text fontWeight="700" style={[styles.planTag, { color: CL.accent }]}>{p.tag}</Text>
                    <Text fontWeight="600" style={styles.planTitle}>{p.title}</Text>
                    <Text style={styles.planBody}>{p.body}</Text>
                  </Box>
                  <Box alignItems="flex-end">
                    <Text fontWeight="700" style={styles.planPrice}>{p.price}</Text>
                    <Text style={styles.planPeriod}>{p.period}</Text>
                  </Box>
                </Box>
                <Text style={styles.planCancel}>{p.cancel}</Text>
              </TouchableOpacity>
            );
          })}
        </Box>
      </Box>

      <Text style={styles.promise}>
        Your child{' '}<Text fontWeight="600" style={{ color: CL.ink }}>never sees prices or buy buttons</Text> — only courses you've added to Robot.
      </Text>

      <Box paddingHorizontal={20} paddingTop={20} paddingBottom={30} gap={10}>
        <DeviceBigBtn onClick={() => navigation.navigate('UnlockConfirmScreen')}>Confirm & continue</DeviceBigBtn>
        <TouchableOpacity onPress={() => navigation.navigate('CourseDetailScreen')} style={styles.notNow} activeOpacity={0.7}>
          <Text fontWeight="500" style={styles.notNowText}>Not now</Text>
        </TouchableOpacity>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  parentBadge: { backgroundColor: '#FFF4D9', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 999, alignSelf: 'flex-start' },
  parentBadgeText: { fontSize: 11, color: '#8A6A12' },
  courseTile: { backgroundColor: CL.card, borderWidth: 1, borderColor: CL.hair, borderRadius: 14, padding: 12, flexDirection: 'row', gap: 12, alignItems: 'center' },
  lcdWrap: { backgroundColor: '#0E1116', borderRadius: 10, padding: 6, flexShrink: 0 },
  courseName: { fontSize: 14, color: CL.ink },
  courseMeta: { fontSize: 12, color: CL.ink2, marginTop: 2 },
  sectionLabel: { fontSize: 11, color: CL.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  planCard: { backgroundColor: CL.card, borderWidth: 1, borderColor: CL.hair, borderRadius: 14, padding: 14 },
  planCardSel: { backgroundColor: '#E8F0FE', borderWidth: 2, borderColor: CL.accent },
  planTag: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  planTitle: { fontSize: 15, color: CL.ink },
  planBody: { fontSize: 12, color: CL.ink2, lineHeight: 18, marginTop: 2 },
  planPrice: { fontSize: 18, color: CL.ink },
  planPeriod: { fontSize: 11, color: CL.ink2 },
  planCancel: { fontSize: 11, color: CL.ink3, marginTop: 8 },
  promise: { fontSize: 12, color: CL.ink2, lineHeight: 20, paddingHorizontal: 20, paddingTop: 18 },
  notNow: { alignItems: 'center', padding: 8 },
  notNowText: { fontSize: 14, color: CL.accent },
});
