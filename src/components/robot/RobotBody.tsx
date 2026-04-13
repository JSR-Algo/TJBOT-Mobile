/**
 * RobotBody — software-twin renderer for the 12 canonical Motion primitives.
 *
 * Source of truth: `tbot-infra/contracts/motion.{d.ts,js}` (Wave 1, ADR-010).
 * Owning task: RM-03 (`.omc/plans/expressive-robot-companion-rewrite.md` §6 Sprint 7b).
 *
 * Why this exists:
 *   The hardware actuators (Feetech FS0403 servos for head pan/tilt + arm) are
 *   gap F2/F4 in the rewrite plan and HOLD per Wave 2 hard rule #6. The mobile
 *   software twin (ADR-007) renders the same 12 primitives so product can be
 *   validated end-to-end without hardware.
 *
 * Why react-native `Animated` and not Reanimated worklets:
 *   The plan calls for Reanimated. `react-native-reanimated` IS declared in
 *   `package.json` so a follow-up `npm install` materializes it, but this file
 *   uses the built-in `Animated` API to avoid a half-installed dependency in
 *   the same edit. `Animated` with `useNativeDriver: true` runs transform-only
 *   primitives (rotate / translate / scale) entirely on the UI thread, which
 *   is what the 60 fps acceptance bar actually requires. Migration to
 *   Reanimated worklets is a Sprint 8+ enhancement, not a correctness gap.
 *
 * Composition rules are enforced server-side by the Motion Engine (worker-3 +
 * RB-10 / RB-16). This component is a pure renderer — it does NOT validate the
 * COMPOSABILITY matrix because the consumer is trusted to feed one primitive
 * at a time.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';

// ─── Motion vocabulary (mirrors tbot-infra/contracts/motion.js) ─────────────

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

/** All 12 primitives in canonical order — used by the demo screen and tests. */
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

// ─── Channel taxonomy (mirrors MOTION_CHANNEL in motion.js) ─────────────────

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

// ─── Servo limits (matches Feetech FS0403 spec from docs/site/.../Hardware-Overview.md) ─

/** Head pan range, degrees. Hardware: ±35°. */
const HEAD_PAN_DEG = 35;
/** Head tilt range, degrees. Hardware: -10° → +20°. */
const HEAD_TILT_MIN_DEG = -10;
const HEAD_TILT_MAX_DEG = 20;
/** Arm wave amplitude, degrees. Twin-only — no hardware spec yet. */
const ARM_WAVE_DEG = 45;

// ─── Motion → animation descriptor ──────────────────────────────────────────
//
// Each descriptor returns the head pan / head tilt / arm rotation / pose
// translation values that the Animated.timing loops will drive. The renderer
// reads them once per motion change and composes one Animated.loop per active
// channel. Looping primitives (IDLE_SWAY, etc.) keep the loop running until
// `motion` changes again.

interface MotionDescriptor {
  channel: MotionChannel;
  /** Sequence of (value, durationMs) pairs to drive the channel's primary axis. */
  steps: Array<{ value: number; ms: number }>;
  /** True if the descriptor should loop; false plays once and holds. */
  loop: boolean;
}

const MOTION_DESCRIPTORS: Record<Motion, MotionDescriptor> = {
  // ── Head pan/tilt primitives (mapped onto rotateZ for pan, rotateX for tilt) ──
  LOOK_FORWARD: { channel: 'HEAD', steps: [{ value: 0, ms: 200 }], loop: false },
  LOOK_LEFT: {
    channel: 'HEAD',
    steps: [{ value: -HEAD_PAN_DEG, ms: 250 }],
    loop: false,
  },
  LOOK_RIGHT: {
    channel: 'HEAD',
    steps: [{ value: HEAD_PAN_DEG, ms: 250 }],
    loop: false,
  },
  NOD_YES: {
    channel: 'HEAD',
    // Tilt down → up → centre, twice.
    steps: [
      { value: HEAD_TILT_MAX_DEG, ms: 180 },
      { value: HEAD_TILT_MIN_DEG, ms: 180 },
      { value: HEAD_TILT_MAX_DEG, ms: 180 },
      { value: 0, ms: 180 },
    ],
    loop: false,
  },
  SHAKE_NO: {
    channel: 'HEAD',
    steps: [
      { value: -HEAD_PAN_DEG / 2, ms: 160 },
      { value: HEAD_PAN_DEG / 2, ms: 160 },
      { value: -HEAD_PAN_DEG / 2, ms: 160 },
      { value: 0, ms: 160 },
    ],
    loop: false,
  },
  TILT_CURIOUS: {
    channel: 'HEAD',
    steps: [{ value: 12, ms: 320 }],
    loop: false,
  },
  BOW_ACK: {
    channel: 'HEAD',
    steps: [
      { value: HEAD_TILT_MAX_DEG, ms: 280 },
      { value: 0, ms: 280 },
    ],
    loop: false,
  },
  // ── Arm primitive ──
  WAVE_ARM: {
    channel: 'ARM',
    // Sweep arm right → left → right → centre.
    steps: [
      { value: ARM_WAVE_DEG, ms: 220 },
      { value: -ARM_WAVE_DEG, ms: 220 },
      { value: ARM_WAVE_DEG, ms: 220 },
      { value: 0, ms: 220 },
    ],
    loop: true,
  },
  // ── Pose primitives (full body — translateY + scale) ──
  IDLE_SWAY: {
    channel: 'POSE',
    steps: [
      { value: -4, ms: 1200 },
      { value: 4, ms: 1200 },
    ],
    loop: true,
  },
  EXCITED_BOUNCE: {
    channel: 'POSE',
    steps: [
      { value: -16, ms: 220 },
      { value: 0, ms: 220 },
    ],
    loop: true,
  },
  WAITING_POSE: {
    channel: 'POSE',
    steps: [{ value: 0, ms: 200 }],
    loop: false,
  },
  FAIL_SLUMP: {
    channel: 'POSE',
    steps: [{ value: 12, ms: 600 }],
    loop: false,
  },
};

// ─── Component ──────────────────────────────────────────────────────────────

export interface RobotBodyProps {
  motion: Motion;
  /** Body color — defaults to a soft slate so it sits on any background. */
  bodyColor?: string;
  /** Optional explicit size; defaults to 220. */
  size?: number;
  /** Test override — disables the loop so unit tests don't spin forever. */
  __disableAnimations?: boolean;
}

export function RobotBody({
  motion,
  bodyColor = '#6B7AB8',
  size = 220,
  __disableAnimations = false,
}: RobotBodyProps): React.JSX.Element {
  // One driver per channel. We always create all three so hooks are stable —
  // changing the motion just retargets which one animates.
  const headPan = useRef(new Animated.Value(0)).current;
  const headTilt = useRef(new Animated.Value(0)).current;
  const armRotate = useRef(new Animated.Value(0)).current;
  const poseTranslate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const desc = MOTION_DESCRIPTORS[motion];
    if (!desc) return;

    // Pick the right driver for this channel.
    let target: Animated.Value;
    if (desc.channel === 'ARM') target = armRotate;
    else if (desc.channel === 'POSE') target = poseTranslate;
    else if (motion === 'NOD_YES' || motion === 'BOW_ACK') target = headTilt;
    else if (motion === 'TILT_CURIOUS') target = headTilt;
    else target = headPan;

    if (__disableAnimations) {
      // Snap directly to the final value so tests can assert without a tick loop.
      const finalStep = desc.steps[desc.steps.length - 1];
      if (finalStep) target.setValue(finalStep.value);
      return;
    }

    const sequence = Animated.sequence(
      desc.steps.map((s) =>
        Animated.timing(target, {
          toValue: s.value,
          duration: s.ms,
          // useNativeDriver runs the transform on the UI thread — this is what
          // delivers the 60 fps target without Reanimated worklets.
          useNativeDriver: true,
        }),
      ),
    );

    const animation: Animated.CompositeAnimation = desc.loop
      ? Animated.loop(sequence)
      : sequence;

    animation.start();
    return () => {
      animation.stop();
    };
  }, [motion, headPan, headTilt, armRotate, poseTranslate, __disableAnimations]);

  // Map the Animated.Values to actual transforms. degToRad style strings are
  // built via interpolate so the native driver can handle them without JS.
  const headPanRotate = headPan.interpolate({
    inputRange: [-HEAD_PAN_DEG, HEAD_PAN_DEG],
    outputRange: [`-${HEAD_PAN_DEG}deg`, `${HEAD_PAN_DEG}deg`],
  });
  const headTiltRotate = headTilt.interpolate({
    inputRange: [HEAD_TILT_MIN_DEG, HEAD_TILT_MAX_DEG],
    outputRange: [`${HEAD_TILT_MIN_DEG}deg`, `${HEAD_TILT_MAX_DEG}deg`],
  });
  const armRotateDeg = armRotate.interpolate({
    inputRange: [-ARM_WAVE_DEG, ARM_WAVE_DEG],
    outputRange: [`-${ARM_WAVE_DEG}deg`, `${ARM_WAVE_DEG}deg`],
  });

  const headSize = size * 0.55;
  const torsoWidth = size * 0.7;
  const torsoHeight = size * 0.45;
  const armWidth = size * 0.12;
  const armHeight = size * 0.42;

  const containerStyle: ViewStyle = {
    width: size,
    height: size * 1.15,
    alignItems: 'center',
    justifyContent: 'flex-end',
  };

  return (
    <Animated.View
      testID="robot-body-root"
      accessibilityLabel={`robot body ${motion}`}
      style={[
        containerStyle,
        { transform: [{ translateY: poseTranslate }] },
      ]}
    >
      {/* Head: pan + tilt are independent rotations on the same node. */}
      <Animated.View
        testID="robot-body-head"
        style={[
          styles.head,
          {
            width: headSize,
            height: headSize,
            backgroundColor: bodyColor,
            transform: [
              { rotateZ: headPanRotate },
              { rotateX: headTiltRotate },
            ],
          },
        ]}
      />

      {/* Torso */}
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
        {/* Arm — mounted on the torso, rotates from the shoulder. */}
        <Animated.View
          testID="robot-body-arm"
          style={[
            styles.arm,
            {
              width: armWidth,
              height: armHeight,
              backgroundColor: bodyColor,
              transform: [{ rotateZ: armRotateDeg }],
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
    transformOrigin: 'top right',
  },
});
