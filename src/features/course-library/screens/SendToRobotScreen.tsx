import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { ROUTES } from '@/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import DeviceRow from '@/components/DeviceRow';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useRequestId } from '@/services/http/idempotency';
import { getDeviceStatus } from '@/services/api/device.api';
import { normalizeError } from '@/utils/errors';
import CL from '../components/CL';
import LCDPreview from '../components/LCDPreview';
import { sendCourseToRobot } from '@/services/api/course-library.api';

type Props = NativeStackScreenProps<RootStackParamList, 'SendToRobotScreen'>;

const OPTIONS = [
  { title: 'Lesson 4 · Animals at home', body: 'Continues where your child left off', tag: 'Recommended', tagColor: '#1F8A5B', emo: 'happy' },
  { title: 'Review · 3 tricky words',    body: 'Robot will sneak these in playfully',    tag: 'Quick',       tagColor: '#E8A33C', emo: 'gentle' },
  { title: 'Lesson 1 · Hello, food!',    body: 'Try the new course Yummy Words',         tag: 'New course',  tagColor: '#2A6FDB', emo: 'speak' },
];

export default function SendToRobotScreen({ navigation, route }: Props) {
  const courseId = route.params?.courseId ?? 'c_food';
  const [pick, setPick] = React.useState(0);
  const [syncError, setSyncError] = React.useState<string | null>(null);
  const { children } = useHousehold();
  const activeChild = children[0] ?? null;
  const requestId = useRequestId();

  const handleSend = async () => {
    setSyncError(null);
    try {
      const [device, childId] = await Promise.all([
        getDeviceStatus('primary'),
        Promise.resolve(activeChild?.id),
      ]);
      if (!device?.id || !childId) {
        setSyncError('Please finish child setup and pair Robot before sending a course.');
        return;
      }
      await sendCourseToRobot(courseId, device.id, childId, requestId ?? undefined);
      navigation.navigate(ROUTES.RobotReadyScreen, { courseId });
    } catch (err) {
      setSyncError(normalizeError(err).message);
    }
  };
  return (
    <DeviceShell title="Today's lesson" onBack={() => navigation.navigate(ROUTES.DeviceHomeScreen)}>
      <Text style={styles.intro}>
        Pick what Robot plays today. We'll send it to the device — about 4 minutes when your child is ready.
      </Text>

      <Box paddingHorizontal={16} paddingTop={18} gap={8}>
        {OPTIONS.map((o, i) => {
          const sel = i === pick;
          return (
            <TouchableOpacity
              key={i}
              onPress={() => setPick(i)}
              activeOpacity={0.8}
              style={[styles.optionCard, sel && styles.optionCardSel]}
            >
              <LCDPreview emotion={o.emo} accent="#FF6F61" size={64} />
              <Box flex={1}>
                <Text fontWeight="700" style={[styles.optionTag, { color: o.tagColor }]}>{o.tag}</Text>
                <Text fontWeight="600" style={styles.optionTitle}>{o.title}</Text>
                <Text style={styles.optionBody}>{o.body}</Text>
              </Box>
              <Box style={[styles.radio, sel && { backgroundColor: CL.accent, borderWidth: 0 }]}>
                {sel && (
                  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.2} strokeLinecap="round">
                    <Path d="M5 12l5 5 9-10" />
                  </Svg>
                )}
              </Box>
            </TouchableOpacity>
          );
        })}
      </Box>

      <Box paddingHorizontal={16} paddingTop={20}>
        <Text fontWeight="700" style={styles.sectionLabel}>When</Text>
        <Box style={styles.rowCard}>
          <DeviceRow icon="⚡" title="Send now" body="Robot will be ready as soon as your child taps it" />
          <DeviceRow icon="☀️" title="Tomorrow morning" body="Robot will wake up gently after 8:00 AM" />
        </Box>
      </Box>

      {syncError && (
        <Box paddingHorizontal={20} paddingTop={12}>
          <Text style={styles.errorText}>{syncError}</Text>
        </Box>
      )}

      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30}>
        <DeviceBigBtn onClick={handleSend}>Send to Robot</DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 13, color: CL.ink2, lineHeight: 20, paddingHorizontal: 20, paddingTop: 14 },
  optionCard: {
    backgroundColor: CL.card, borderWidth: 1, borderColor: CL.hair, borderRadius: 14,
    padding: 12, flexDirection: 'row', gap: 12, alignItems: 'center',
  },
  optionCardSel: { backgroundColor: '#E8F0FE', borderWidth: 2, borderColor: CL.accent },
  optionTag: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  optionTitle: { fontSize: 14, color: CL.ink, lineHeight: 19 },
  optionBody: { fontSize: 12, color: CL.ink2, marginTop: 2, lineHeight: 17 },
  radio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: CL.hair,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  sectionLabel: { fontSize: 11, color: CL.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  rowCard: { backgroundColor: CL.card, borderWidth: 1, borderColor: CL.hair, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 4 },
  errorText: { fontSize: 13, color: '#C0392B', lineHeight: 19 },
});
