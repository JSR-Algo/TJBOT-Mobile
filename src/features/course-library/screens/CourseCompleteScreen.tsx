import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import Robot from '@/design-system/components/Robot';
import { Icon } from '@/design-system/icons';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import CL from '../components/CL';
import CLChip from '../components/CLChip';
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'CourseCompleteScreen'>;


export default function CourseCompleteScreen({ navigation, route }: Props) {
  const summary = route.params?.summary;
  return (
    <DeviceShell title="Today's lesson">
      <Box
        testID={summary ? undefined : 'course-complete-no-summary'}
        paddingTop={36}
        paddingHorizontal={24}
        alignItems="center"
      >
        <Robot emotion="success" size={170} accessibilityLabel="TeeBot celebrating the completed lesson" />
        <Box style={styles.chipWrap}><CLChip state="completed" /></Box>
        <Text fontWeight="600" style={styles.heading}>
          {summary?.heading ?? 'Lesson complete'}
        </Text>
        <Text style={styles.sub}>
          {summary
            ? 'Results from this lesson. Audio was never saved.'
            : 'A full summary will show when lesson results are available. Audio was never saved.'}
        </Text>
      </Box>
      {summary ? (
        <>
          <Box
            testID="course-complete-stats"
            paddingHorizontal={16}
            paddingTop={24}
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
          >
            {summary.minutesTogether !== undefined ? (
              <Box style={styles.statCard} width="47%">
                <Text fontWeight="700" style={styles.statVal}>{summary.minutesTogether}</Text>
                <Text style={styles.statLabel}>Minutes together</Text>
              </Box>
            ) : null}
            {summary.wordsPlayed !== undefined ? (
              <Box style={styles.statCard} width="47%">
                <Text fontWeight="700" style={styles.statVal}>{summary.wordsPlayed}</Text>
                <Text style={styles.statLabel}>Words played with</Text>
              </Box>
            ) : null}
          </Box>
          {summary.words?.length ? (
            <Box testID="course-complete-words" paddingHorizontal={16} paddingTop={20}>
              <Text fontWeight="700" style={styles.sectionLabel}>What Robot taught</Text>
              <Box style={styles.wordsCard}>
                <Box style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {summary.words.map(item => (
                    <Box
                      key={item.word}
                      style={[
                        styles.wordChip,
                        { backgroundColor: item.confident ? '#E6F4EE' : '#FFF4D9' },
                      ]}
                      flexDirection="row"
                      alignItems="center"
                      gap={5}
                    >
                      <Icon
                        name={item.confident ? 'CircleCheck' : 'RefreshCcw'}
                        size={13}
                        color={item.confident ? '#1F8A5B' : '#8A6A12'}
                        strokeWidth={2.4}
                      />
                      <Text
                        fontWeight="600"
                        style={[
                          styles.wordText,
                          { color: item.confident ? '#1F8A5B' : '#8A6A12' },
                        ]}
                      >
                        {item.word}
                      </Text>
                    </Box>
                  ))}
                </Box>
                <Text style={styles.legend}>
                  Check means practiced confidently · refresh means Robot will revisit.
                </Text>
              </Box>
            </Box>
          ) : null}
        </>
      ) : null}
      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30} gap={10}>
        <DeviceBigBtn onClick={() => navigation.navigate(ROUTES.SendToRobotScreen)}>
          Plan tomorrow's lesson
        </DeviceBigBtn>
        <DeviceBigBtn secondary onClick={() => navigation.navigate(ROUTES.DeviceHomeScreen)}>
          Done
        </DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  chipWrap: { marginTop: 18 },
  heading: { fontSize: 22, color: CL.ink, letterSpacing: -0.3, textAlign: 'center', marginTop: 12 },
  sub: { fontSize: 13, color: CL.ink2, textAlign: 'center', maxWidth: 300, lineHeight: 20, marginTop: 6 },
  statCard: { backgroundColor: CL.card, borderWidth: 1, borderColor: CL.hair, borderRadius: 12, padding: 12 },
  statVal: { fontSize: 22, color: CL.ink, letterSpacing: -0.4 },
  statLabel: { fontSize: 11, color: CL.ink2, marginTop: 2 },
  sectionLabel: { fontSize: 11, color: CL.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  wordsCard: { backgroundColor: CL.card, borderWidth: 1, borderColor: CL.hair, borderRadius: 14, padding: 14 },
  wordChip: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 7 },
  wordText: { fontSize: 12 },
  legend: { fontSize: 11, color: CL.ink3, lineHeight: 18, marginTop: 10 },
});
