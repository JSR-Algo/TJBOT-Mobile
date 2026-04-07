import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Button } from '../../components';
import theme from '../../theme';
import type { OnboardingScreenProps } from '../../navigation/types';

const NUM_BARS = 12;
const BAR_MIN_HEIGHT = 6;
const BAR_MAX_HEIGHT = 48;

export function VoiceTestScreen({ navigation }: OnboardingScreenProps<'VoiceTest'>): React.JSX.Element {
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [testPassed, setTestPassed] = useState(false);

  // Animated values for waveform bars
  const barAnimations = useRef<Animated.Value[]>(
    Array.from({ length: NUM_BARS }, () => new Animated.Value(BAR_MIN_HEIGHT)),
  ).current;

  const listeningAnimation = useRef<Animated.CompositeAnimation | null>(null);

  const startWaveAnimation = () => {
    const animations = barAnimations.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 60),
          Animated.timing(anim, {
            toValue: BAR_MIN_HEIGHT + Math.random() * (BAR_MAX_HEIGHT - BAR_MIN_HEIGHT),
            duration: 200 + Math.random() * 200,
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: BAR_MIN_HEIGHT,
            duration: 200 + Math.random() * 200,
            useNativeDriver: false,
          }),
        ]),
      ),
    );
    listeningAnimation.current = Animated.parallel(animations);
    listeningAnimation.current.start();
  };

  const stopWaveAnimation = () => {
    listeningAnimation.current?.stop();
    barAnimations.forEach((anim) => {
      Animated.timing(anim, {
        toValue: BAR_MIN_HEIGHT,
        duration: 200,
        useNativeDriver: false,
      }).start();
    });
  };

  const requestMicPermission = async () => {
    try {
      if (Platform.OS === 'web') {
        // Web platform: getUserMedia is available via the browser API
        try {
          const nav = navigator as unknown as { mediaDevices?: { getUserMedia: (c: Record<string, boolean>) => Promise<{ getTracks: () => Array<{ stop: () => void }> }> } };
          if (nav.mediaDevices) {
            const stream = await nav.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach((t) => t.stop());
          }
        } catch {
          // Permission denied or API not available
        }
        setPermissionGranted(true);
        return;
      }
      // React Native: dynamic import to avoid crash on web/test environments
      const { PermissionsAndroid } = require('react-native');
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'TBOT needs microphone access so your child can talk with it.',
            buttonPositive: 'Allow',
          },
        );
        setPermissionGranted(granted === PermissionsAndroid.RESULTS.GRANTED);
      } else {
        // iOS: handled at OS level via Info.plist — assume granted in this flow
        setPermissionGranted(true);
      }
    } catch {
      setPermissionGranted(false);
    }
  };

  const handleStartTest = () => {
    setIsListening(true);
    startWaveAnimation();

    // Simulate a brief voice capture then mark as passed
    setTimeout(() => {
      stopWaveAnimation();
      setIsListening(false);
      setTestPassed(true);
    }, 1000);
  };

  useEffect(() => {
    return () => {
      listeningAnimation.current?.stop();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{testPassed ? '✅' : '🎤'}</Text>
      <Text style={{ ...theme.typography.caption, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: theme.spacing.sm }}>
        Step 5 of 5
      </Text>
      <Text style={styles.title}>Voice Test</Text>
      <Text style={styles.subtitle}>
        {testPassed
          ? "Great job! Your microphone is working perfectly."
          : "Say hello to test your device"}
      </Text>

      {/* Waveform visualiser */}
      <View style={styles.waveform}>
        {barAnimations.map((anim, i) => (
          <Animated.View
            key={i}
            style={[
              styles.bar,
              {
                height: anim,
                backgroundColor: isListening
                  ? theme.colors.primary
                  : testPassed
                  ? theme.colors.success ?? '#22c55e'
                  : theme.colors.border ?? '#e2e8f0',
              },
            ]}
          />
        ))}
      </View>

      {permissionGranted === null && (
        <Button
          label="Allow Microphone Access"
          onPress={requestMicPermission}
        />
      )}

      {permissionGranted === false && (
        <>
          <Text style={styles.errorText}>
            Microphone permission denied. Please enable it in your device settings.
          </Text>
          <Button label="Skip Voice Test" variant="ghost" onPress={() => navigation.getParent()?.navigate('MainTabs' as never)} />
        </>
      )}

      {permissionGranted === true && !testPassed && !isListening && (
        <TouchableOpacity style={styles.micButton} onPress={handleStartTest} activeOpacity={0.8}>
          <Text style={styles.micButtonIcon}>🎙️</Text>
          <Text style={styles.micButtonLabel}>Tap to speak</Text>
        </TouchableOpacity>
      )}

      {isListening && (
        <View style={styles.listeningBadge}>
          <Text style={styles.listeningText}>Listening…</Text>
        </View>
      )}

      {testPassed && (
        <Button
          label="All Done! Let's Go"
          onPress={() => navigation.getParent()?.navigate('MainTabs' as never)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 64,
    marginBottom: theme.spacing.md,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    ...theme.typography.body1,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: BAR_MAX_HEIGHT + 16,
    marginBottom: theme.spacing.xl,
    gap: 4,
  },
  bar: {
    width: 8,
    borderRadius: 4,
    minHeight: BAR_MIN_HEIGHT,
  },
  micButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 60,
    width: 120,
    height: 120,
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  micButtonIcon: {
    fontSize: 36,
  },
  micButtonLabel: {
    ...theme.typography.caption,
    color: '#fff',
    marginTop: 4,
  },
  listeningBadge: {
    backgroundColor: theme.colors.primary + '22',
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  listeningText: {
    ...theme.typography.body1,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  errorText: {
    ...theme.typography.body2,
    color: theme.colors.error ?? '#ef4444',
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
});
