import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import OnbShell, { OB } from '@/components/OnbShell';
import OnbBigBtn from '@/components/OnbBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';

type Props = NativeStackScreenProps<RootStackParamList, 'ChildProfileScreen'>;

const BUDDIES = [
  { id: 'panda',   emoji: '🐼', label: 'Panda'   },
  { id: 'cat',     emoji: '🐱', label: 'Cat'     },
  { id: 'fox',     emoji: '🦊', label: 'Fox'     },
  { id: 'rabbit',  emoji: '🐰', label: 'Rabbit'  },
  { id: 'frog',    emoji: '🐸', label: 'Frog'    },
  { id: 'lion',    emoji: '🦁', label: 'Lion'    },
  { id: 'unicorn', emoji: '🦄', label: 'Unicorn' },
  { id: 'dog',     emoji: '🐶', label: 'Dog'     },
] as const;

const LEVELS = [
  { id: 'starter',  label: 'Just starting',   body: 'New to English. Lots of Robot voice and pictures.' },
  { id: 'building', label: 'Knows some words', body: 'Can say a few English words. Ready for short phrases.' },
  { id: 'flowing',  label: 'Speaks a bit',    body: 'Can answer simple questions. Ready to talk in sentences.' },
] as const;

export default function ChildProfileScreen({ navigation }: Props) {
  const [buddy, setBuddy] = React.useState<string>('panda');
  const [level, setLevel] = React.useState<string>('starter');
  const sel = BUDDIES.find(b => b.id === buddy);

  return (
    <OnbShell title="Your child's buddy" onBack={() => navigation.navigate('LoginScreen')}>
      <Box paddingHorizontal={20} paddingTop={18}>
        <Text fontWeight="600" style={styles.heading}>Pick a buddy and a starting level</Text>
        <Text style={styles.sub}>
          We don't ask for your child's name or photo. The buddy is how Robot greets them.
        </Text>
      </Box>

      <Box paddingHorizontal={16} paddingTop={20}>
        <Text style={styles.sectionLabel}>BUDDY</Text>
        <Box style={styles.buddyGrid}>
          {BUDDIES.map(b => (
            <TouchableOpacity
              key={b.id}
              onPress={() => setBuddy(b.id)}
              style={[
                styles.buddyBtn,
                { borderColor: buddy === b.id ? OB.accent : OB.hair, backgroundColor: buddy === b.id ? '#E8F0FE' : OB.card },
              ]}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 30 }}>{b.emoji}</Text>
            </TouchableOpacity>
          ))}
        </Box>
        <Text style={styles.buddyNote}>Robot will say: <Text fontWeight="700">"Hi, {sel?.label} friend!"</Text></Text>
      </Box>

      <Box paddingHorizontal={16} paddingTop={20}>
        <Text style={styles.sectionLabel}>STARTING LEVEL</Text>
        <Box style={styles.levelList} borderRadius={14} borderWidth={1} borderColor={OB.hair} overflow="hidden">
          {LEVELS.map((l, i) => {
            const active = level === l.id;
            return (
              <TouchableOpacity
                key={l.id}
                onPress={() => setLevel(l.id)}
                style={[
                  styles.levelRow,
                  { backgroundColor: active ? '#E8F0FE' : 'transparent' },
                  i < LEVELS.length - 1 && { borderBottomWidth: 1, borderBottomColor: OB.hair },
                ]}
                activeOpacity={0.7}
              >
                <Box
                  style={[
                    styles.radio,
                    { borderColor: active ? OB.accent : 'rgba(0,0,0,0.2)', backgroundColor: active ? OB.accent : 'transparent' },
                  ]}
                  alignItems="center"
                  justifyContent="center"
                >
                  {active && (
                    <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.5} strokeLinecap="round">
                      <Path d="M5 12l5 5 9-10" />
                    </Svg>
                  )}
                </Box>
                <Box flex={1}>
                  <Text fontWeight="600" style={{ fontSize: 15, color: OB.ink, marginBottom: 2 }}>{l.label}</Text>
                  <Text style={{ fontSize: 13, color: OB.ink2, lineHeight: 19 }}>{l.body}</Text>
                </Box>
              </TouchableOpacity>
            );
          })}
        </Box>
        <Text style={styles.note}>Robot adapts as you go — you can change this any time.</Text>
      </Box>

      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30}>
        <OnbBigBtn onClick={() => navigation.navigate('IntroListenScreen')}>Save and meet Robot</OnbBigBtn>
      </Box>
    </OnbShell>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 22, color: OB.ink, marginBottom: 6, letterSpacing: -0.3 },
  sub: { fontSize: 14, color: OB.ink2, lineHeight: 21 },
  sectionLabel: { fontSize: 12, color: OB.ink3, paddingHorizontal: 4, paddingBottom: 8, letterSpacing: 0.6, fontWeight: '600' },
  buddyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  buddyBtn: { width: '23%', aspectRatio: 1, borderWidth: 2, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  buddyNote: { fontSize: 13, color: OB.ink2, paddingTop: 10, paddingHorizontal: 4 },
  levelList: { backgroundColor: OB.card },
  levelRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, flexShrink: 0, marginTop: 2 },
  note: { fontSize: 12, color: OB.ink3, paddingTop: 8, paddingHorizontal: 4, lineHeight: 18 },
});
