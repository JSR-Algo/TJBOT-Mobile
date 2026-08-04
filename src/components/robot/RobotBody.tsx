import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { translateTemplate, useAppLanguage } from '@/services/i18n/i18n';

export type Motion =
  | 'LOOK_FORWARD'
  | 'LOOK_LEFT'
  | 'LOOK_RIGHT'
  | 'NOD_YES'
  | 'SHAKE_NO'
  | 'TILT_CURIOUS'
  | 'BOW_ACK'
  | 'WAVE_ARM'
  | 'IDLE_SWAY'
  | 'EXCITED_BOUNCE'
  | 'WAITING_POSE'
  | 'FAIL_SLUMP';

export const ALL_MOTIONS: ReadonlyArray<Motion> = [
  'LOOK_FORWARD',
  'LOOK_LEFT',
  'LOOK_RIGHT',
  'NOD_YES',
  'SHAKE_NO',
  'TILT_CURIOUS',
  'BOW_ACK',
  'WAVE_ARM',
  'IDLE_SWAY',
  'EXCITED_BOUNCE',
  'WAITING_POSE',
  'FAIL_SLUMP',
];

const MOTION_ACCESSIBILITY_COPY: Record<Motion, string> = {
  LOOK_FORWARD: 'Looking forward',
  LOOK_LEFT: 'Looking left',
  LOOK_RIGHT: 'Looking right',
  NOD_YES: 'Nodding yes',
  SHAKE_NO: 'Shaking no',
  TILT_CURIOUS: 'Tilting curiously',
  BOW_ACK: 'Bowing in acknowledgment',
  WAVE_ARM: 'Waving',
  IDLE_SWAY: 'Swaying gently',
  EXCITED_BOUNCE: 'Bouncing excitedly',
  WAITING_POSE: 'Waiting patiently',
  FAIL_SLUMP: 'Slumping after a miss',
};

type MotionChannel = 'HEAD' | 'ARM' | 'POSE';

const CHANNEL: Record<Motion, MotionChannel> = {
  LOOK_FORWARD: 'HEAD',
  LOOK_LEFT: 'HEAD',
  LOOK_RIGHT: 'HEAD',
  NOD_YES: 'HEAD',
  SHAKE_NO: 'HEAD',
  TILT_CURIOUS: 'HEAD',
  BOW_ACK: 'HEAD',
  WAVE_ARM: 'ARM',
  IDLE_SWAY: 'POSE',
  EXCITED_BOUNCE: 'POSE',
  WAITING_POSE: 'POSE',
  FAIL_SLUMP: 'POSE',
};

export function channelOf(motion: Motion): MotionChannel {
  return CHANNEL[motion];
}

const HEAD_PAN_DEG = 35;
const HEAD_TILT_MIN_DEG = -10;
const HEAD_TILT_MAX_DEG = 20;
const ARM_WAVE_DEG = 45;

interface Pose {
  headPan: number;
  headTilt: number;
  armRotate: number;
  poseTranslate: number;
}

function poseFor(motion: Motion): Pose {
  switch (motion) {
    case 'LOOK_LEFT':
      return { headPan: -HEAD_PAN_DEG, headTilt: 0, armRotate: 0, poseTranslate: 0 };
    case 'LOOK_RIGHT':
      return { headPan: HEAD_PAN_DEG, headTilt: 0, armRotate: 0, poseTranslate: 0 };
    case 'NOD_YES':
    case 'BOW_ACK':
      return { headPan: 0, headTilt: HEAD_TILT_MAX_DEG, armRotate: 0, poseTranslate: 0 };
    case 'SHAKE_NO':
      return { headPan: -HEAD_PAN_DEG / 2, headTilt: 0, armRotate: 0, poseTranslate: 0 };
    case 'TILT_CURIOUS':
      return { headPan: 0, headTilt: 12, armRotate: 0, poseTranslate: 0 };
    case 'WAVE_ARM':
      return { headPan: 0, headTilt: 0, armRotate: ARM_WAVE_DEG, poseTranslate: 0 };
    case 'IDLE_SWAY':
      return { headPan: 0, headTilt: 0, armRotate: 0, poseTranslate: -4 };
    case 'EXCITED_BOUNCE':
      return { headPan: 0, headTilt: 0, armRotate: 0, poseTranslate: -16 };
    case 'FAIL_SLUMP':
      return { headPan: 0, headTilt: HEAD_TILT_MIN_DEG, armRotate: 0, poseTranslate: 12 };
    case 'WAITING_POSE':
    case 'LOOK_FORWARD':
    default:
      return { headPan: 0, headTilt: 0, armRotate: 0, poseTranslate: 0 };
  }
}

export interface RobotBodyProps {
  motion: Motion;
  bodyColor?: string;
  size?: number;
  __disableAnimations?: boolean;
  reduceMotion?: boolean;
}

export function RobotBody({
  motion,
  bodyColor = '#6B7AB8',
  size = 220,
  __disableAnimations = false,
  reduceMotion = false,
}: RobotBodyProps): React.JSX.Element {
  const { language, t } = useAppLanguage();
  const pose = poseFor(motion);
  const headSize = size * 0.55;
  const torsoWidth = size * 0.7;
  const torsoHeight = size * 0.45;
  const armWidth = size * 0.12;
  const armHeight = size * 0.42;
  const motionEnabled = !__disableAnimations && !reduceMotion;

  const containerStyle: ViewStyle = {
    width: size,
    height: size * 1.15,
    alignItems: 'center',
    justifyContent: 'flex-end',
  };

  return (
    <Animated.View
      testID="robot-body-root"
      accessibilityLabel={translateTemplate(
        'Robot body, {{motion}}',
        { motion: t(MOTION_ACCESSIBILITY_COPY[motion]) },
        { locale: language },
      )}
      style={[
        containerStyle,
        { transform: [{ translateY: motionEnabled ? pose.poseTranslate : 0 }] },
      ]}
    >
      <Animated.View
        testID="robot-body-head"
        style={[
          styles.head,
          {
            width: headSize,
            height: headSize,
            backgroundColor: bodyColor,
            transform: [
              { rotateZ: `${motionEnabled ? pose.headPan : 0}deg` },
              { rotateX: `${motionEnabled ? pose.headTilt : 0}deg` },
            ],
          },
        ]}
      />

      <View
        testID="robot-body-torso"
        style={[
          styles.torso,
          {
            width: torsoWidth,
            height: torsoHeight,
            backgroundColor: bodyColor,
          },
        ]}
      >
        <Animated.View
          testID="robot-body-arm"
          style={[
            styles.arm,
            {
              width: armWidth,
              height: armHeight,
              backgroundColor: bodyColor,
              transform: [{ rotateZ: `${motionEnabled ? pose.armRotate : 0}deg` }],
            },
          ]}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  head: {
    borderRadius: 999,
    marginBottom: 6,
  },
  torso: {
    borderRadius: 24,
    alignItems: 'flex-end',
    paddingRight: 6,
  },
  arm: {
    borderRadius: 12,
    position: 'absolute',
    right: -8,
    top: 8,
  },
});
