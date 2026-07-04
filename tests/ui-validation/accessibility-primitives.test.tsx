import React from 'react';
import { act, create } from 'react-test-renderer';
import { Text } from 'react-native';
import { Pressable } from '@/design-system/primitives/Pressable';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import CircleBtn from '@/design-system/components/CircleBtn';
import PageHeader from '@/design-system/components/PageHeader';
import PulseRing from '@/design-system/components/PulseRing';
import Robot from '@/design-system/components/Robot';
import WaveBars from '@/design-system/components/WaveBars';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import DeviceRow from '@/components/DeviceRow';
import OnbBigBtn from '@/components/OnbBigBtn';
import OnbShell from '@/components/OnbShell';
import DeviceShell from '@/components/DeviceShell';
import { Card } from '@/components/Card';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Input } from '@/components/Input';
import MicButton from '@/components/MicButton';
import CourseCard from '@/features/course-library/components/CourseCard';
import HomeSecondaryButton from '@/features/home/components/HomeSecondaryButton';
import ParentScroll from '@/features/parent/components/ParentScroll';
import { BigMicButton } from '@/components/gemini/BigMicButton';
import { ParticleEffect } from '@/components/gemini/ParticleEffect';
import { WaveVisualizer } from '@/components/gemini/WaveVisualizer';
import { SukaAvatar } from '@/components/gemini/SukaAvatar';

describe('design-system accessibility primitives', () => {
  function renderSnapshot(element: React.ReactElement): string {
    let renderer: ReturnType<typeof create> | undefined;
    act(() => {
      renderer = create(element);
    });
    return JSON.stringify(renderer?.toJSON() ?? null);
  }

  it('defaults pressable actions to button role', () => {
    const tree = renderSnapshot(
      <Pressable onPress={() => undefined}>
        <Text>Open</Text>
      </Pressable>,
    );

    expect(tree).toContain('"accessibilityRole":"button"');
  });

  it('uses visible CTA text as the default accessibility label', () => {
    const tree = renderSnapshot(
      <PrimaryCTA disabled onPress={() => undefined}>Continue</PrimaryCTA>,
    );

    expect(tree).toContain('"accessibilityRole":"button"');
    expect(tree).toContain('"accessibilityLabel":"Continue"');
    expect(tree).toContain('"accessibilityState":{"disabled":true}');
  });

  it('uses AA-safe dark text on light CTA backgrounds', () => {
    const tree = renderSnapshot(
      <PrimaryCTA onPress={() => undefined} color="#FF6F61">
        Continue
      </PrimaryCTA>,
    );

    expect(tree).toContain('"color":"#2B2140"');
  });

  it('gives DeviceBigBtn accessible role, label, state, and minimum height', () => {
    const enabled = renderSnapshot(<DeviceBigBtn onClick={() => undefined}>Connect Robot</DeviceBigBtn>);
    const disabled = renderSnapshot(<DeviceBigBtn disabled>Connecting...</DeviceBigBtn>);

    expect(enabled).toContain('"accessibilityRole":"button"');
    expect(enabled).toContain('"accessibilityLabel":"Connect Robot"');
    expect(enabled).toContain('"minHeight":58');
    expect(disabled).toContain('"accessibilityState":{"disabled":true}');
    expect(disabled).toContain('"accessibilityLabel":"Connecting..."');
  });

  it('gives OnbBigBtn minimum height and disabled state', () => {
    const tree = renderSnapshot(
      <OnbBigBtn onClick={() => undefined} accessibilityLabel="Create child profile">
        Continue
      </OnbBigBtn>,
    );

    expect(tree).toContain('"accessibilityRole":"button"');
    expect(tree).toContain('"accessibilityLabel":"Create child profile"');
    expect(tree).toContain('"minHeight":52');
  });

  it('preserves explicit labels for icon-only circular buttons', () => {
    const tree = renderSnapshot(
      <CircleBtn size={32} onPress={() => undefined} accessibilityLabel="Open settings">
        <Text>⚙</Text>
      </CircleBtn>,
    );

    expect(tree).toContain('"accessibilityRole":"button"');
    expect(tree).toContain('"accessibilityLabel":"Open settings"');
    expect(tree).toContain('"width":44');
    expect(tree).toContain('"height":44');
  });

  it('labels the default page-header back action', () => {
    const tree = renderSnapshot(<PageHeader title="Settings" onBack={() => undefined} />);

    expect(tree).toContain('"accessibilityRole":"button"');
    expect(tree).toContain('"accessibilityLabel":"Back"');
  });

  it('keeps shell back controls at a visible 44pt target', () => {
    const deviceShell = renderSnapshot(
      <DeviceShell title="Robot" onBack={() => undefined}>
        <Text>Body</Text>
      </DeviceShell>,
    );
    const onboardingShell = renderSnapshot(
      <OnbShell title="Profile" onBack={() => undefined}>
        <Text>Body</Text>
      </OnbShell>,
    );
    const parentScroll = renderSnapshot(
      <ParentScroll title="Parent" onBack={() => undefined}>
        <Text>Body</Text>
      </ParentScroll>,
    );

    expect(deviceShell).toContain('"accessibilityRole":"button"');
    expect(deviceShell).toContain('"accessibilityLabel":"Go back"');
    expect(deviceShell).toContain('"width":44');
    expect(deviceShell).toContain('"height":44');
    expect(onboardingShell).toContain('"accessibilityRole":"button"');
    expect(onboardingShell).toContain('"accessibilityLabel":"Go back"');
    expect(onboardingShell).toContain('"width":44');
    expect(onboardingShell).toContain('"height":44');
    expect(parentScroll).toContain('"accessibilityRole":"button"');
    expect(parentScroll).toContain('"accessibilityLabel":"Go back"');
    expect(parentScroll).toContain('"width":44');
    expect(parentScroll).toContain('"height":44');
  });

  it('keeps DeviceShell taps available for text inputs inside the scroll view', () => {
    const tree = renderSnapshot(
      <DeviceShell title="Robot">
        <Text>Body</Text>
      </DeviceShell>,
    );

    expect(tree).toContain('"keyboardShouldPersistTaps":"handled"');
    expect(tree).toContain('"keyboardDismissMode":"on-drag"');
  });

  it('labels shared rows and cards used as navigation controls', () => {
    const row = renderSnapshot(
      <DeviceRow title="Wi-Fi" body="Robot network settings" onClick={() => undefined} />,
    );
    const card = renderSnapshot(
      <Card onPress={() => undefined} accessibilityLabel="Open course details">
        <Text>Course</Text>
      </Card>,
    );

    expect(row).toContain('"accessibilityRole":"button"');
    expect(row).toContain('"accessibilityLabel":"Wi-Fi. Robot network settings"');
    expect(row).toContain('"minHeight":52');
    expect(card).toContain('"accessibilityRole":"button"');
    expect(card).toContain('"accessibilityLabel":"Open course details"');
    expect(card).toContain('"minHeight":44');
  });

  it('keeps static device rows non-actionable and without chevrons', () => {
    const tree = renderSnapshot(
      <DeviceRow title="Battery health" body="100% · like new" />,
    );

    expect(tree).not.toContain('"accessibilityRole":"button"');
    expect(tree).not.toContain('"d":"M9 6l6 6-6 6"');
    expect(tree).toContain('"accessibilityLabel":"Battery health. 100% · like new"');
  });

  it('marks dimmed home secondary actions disabled and non-pressable', () => {
    const tree = renderSnapshot(
      <HomeSecondaryButton label="Pause TJBot" icon="⏸" dim onPress={() => undefined} />,
    );

    expect(tree).toContain('"accessibilityRole":"button"');
    expect(tree).toContain('"accessibilityState":{"disabled":true}');
    expect(tree).toContain('"disabled":true');
  });

  it('labels robot visuals and supports reduced motion primitives', () => {
    const robot = renderSnapshot(
      <Robot emotion="listen" accessibilityLabel="Robot is listening" />,
    );
    const pulse = renderSnapshot(<PulseRing reduceMotion />);
    const wave = renderSnapshot(
      <WaveBars reduceMotion accessibilityLabel="Robot is speaking" />,
    );

    expect(robot).toContain('"accessibilityRole":"image"');
    expect(robot).toContain('"accessibilityLabel":"Robot is listening"');
    expect(pulse).toBe('null');
    expect(wave).toContain('"accessibilityLabel":"Robot is speaking"');
  });

  it('offers an accessible recovery action in the default error boundary', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    function Broken(): React.JSX.Element {
      throw new Error('Boom');
    }

    try {
      const tree = renderSnapshot(
        <ErrorBoundary>
          <Broken />
        </ErrorBoundary>,
      );

      expect(tree).toContain('"accessibilityRole":"button"');
      expect(tree).toContain('"accessibilityLabel":"Try again"');
      expect(tree).toContain('"minHeight":44');
    } finally {
      consoleError.mockRestore();
    }
  });

  it('labels password visibility and mic controls with state', () => {
    const input = renderSnapshot(
      <Input label="Password" value="" onChangeText={() => undefined} secureTextEntry />,
    );
    const mic = renderSnapshot(<MicButton on onClick={() => undefined} />);

    expect(input).toContain('"accessibilityRole":"button"');
    expect(input).toContain('"accessibilityLabel":"Show Password"');
    expect(input).toContain('"accessibilityState":{"selected":false}');
    expect(input).toContain('"minWidth":44');
    expect(mic).toContain('"accessibilityLabel":"Stop microphone"');
    expect(mic).toContain('"accessibilityState":{"selected":true}');
  });

  it('labels Gemini microphone controls and disables motion when requested', () => {
    const inactive = renderSnapshot(
      <BigMicButton isActive={false} disabled={false} onPress={() => undefined} color="#7C3AED" reduceMotion />,
    );
    const active = renderSnapshot(
      <BigMicButton isActive disabled={false} onPress={() => undefined} color="#7C3AED" reduceMotion />,
    );
    const disabled = renderSnapshot(
      <BigMicButton isActive={false} disabled onPress={() => undefined} color="#7C3AED" reduceMotion />,
    );
    const particles = renderSnapshot(<ParticleEffect active reduceMotion />);
    const wave = renderSnapshot(<WaveVisualizer audioLevel={0.8} color="#7C3AED" isAiSpeaking reduceMotion />);
    const avatar = renderSnapshot(<SukaAvatar voiceState="ASSISTANT_SPEAKING" audioLevel={0.8} reduceMotion />);

    expect(inactive).toContain('"accessibilityRole":"button"');
    expect(inactive).toContain('"accessibilityLabel":"Start microphone"');
    expect(inactive).toContain('"accessibilityState":{"disabled":false,"selected":false}');
    expect(active).toContain('"accessibilityLabel":"Stop microphone"');
    expect(active).toContain('"accessibilityState":{"disabled":false,"selected":true}');
    expect(disabled).toContain('"accessibilityState":{"disabled":true,"selected":false}');
    expect(particles).toBe('null');
    expect(wave).toContain('"accessibilityLabel":"Voice activity waveform"');
    expect(avatar).toContain('"accessibilityLabel":"Suka is speaking"');
  });

  it('keeps course cards clear for locked and static states', () => {
    const course = {
      state: 'locked' as const,
      lcd: 'happy',
      ages: '6-8',
      title: 'Starter Words',
      level: 'Beginner',
      lessons: 8,
      teaches: ['hello'],
    };

    const tappable = renderSnapshot(<CourseCard course={course} onClick={() => undefined} />);
    const staticCard = renderSnapshot(<CourseCard course={course} />);

    expect(tappable).toContain('"accessibilityRole":"button"');
    expect(tappable).toContain('"accessibilityLabel":"Open Starter Words locked course"');
    expect(tappable).toContain('"minHeight":44');
    expect(staticCard).toContain('"accessibilityLabel":"Starter Words locked course"');
    expect(staticCard).not.toContain('"accessibilityLabel":"Open Starter Words locked course"');
    expect(staticCard).toContain('"accessibilityState":{"disabled":true}');
  });
});
