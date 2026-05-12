import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import ParentScroll from '../components/ParentScroll';
import PRowGroup from '../components/PRowGroup';
import PRow from '../components/PRow';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { PA } from '../components/ParentScroll';

type Props = NativeStackScreenProps<RootStackParamList, 'ParentTodayScreen'>;

const WORD_ROWS = [
  { w: 'Hello',  s: 'getting stronger' },
  { w: 'Cat',    s: 'getting stronger' },
  { w: 'Happy',  s: 'new this week' },
  { w: 'Friend', s: 'visit again soon' },
  { w: 'Dog',    s: 'visit again soon' },
] as const;

export default function ParentTodayScreen({ navigation }: Props) {
  return (
    <ParentScroll title="Today" onBack={() => navigation.navigate('ParentSummaryScreen')}>
      <Box paddingHorizontal={16} paddingTop={18} paddingBottom={8}>
        <Text style={{ fontSize: 13, color: PA.ink3, marginBottom: 6 }}>Tuesday, Mar 12 · 4:12 PM</Text>
        <Text fontWeight="600" style={{ fontSize: 20, color: PA.ink, letterSpacing: -0.3, lineHeight: 28, marginBottom: 18 }}>
          Mira practiced greetings, feelings, and three new words.
        </Text>
      </Box>

      <PRowGroup header="Lesson">
        <PRow icon="📖" label="How are you?" value="Unit 3 · Lesson 3" />
        <PRow icon="⏱" label="Time on task" value="8 min" />
        <PRow icon="🎤" label="Speaking turns" value="8" isLast />
      </PRowGroup>

      <PRowGroup
        header="Words practiced"
        footer="We don't store voice recordings or transcripts. These summaries are generated from lesson activity."
      >
        {WORD_ROWS.map((r, i) => (
          <PRow key={r.w} label={r.w} value={r.s} isLast={i === WORD_ROWS.length - 1} />
        ))}
      </PRowGroup>

      <PRowGroup header="What's next">
        <PRow icon="→" label="Continue Unit 3" value="Lesson 4" chevron />
        <PRow icon="↻" label="Review 2 words" chevron isLast />
      </PRowGroup>

      <Box height={24} />
    </ParentScroll>
  );
}
