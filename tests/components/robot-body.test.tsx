/**
 * RM-03 — RobotBody renders all 12 canonical Motion primitives.
 *
 * Acceptance (Wave 2 brief, expressive-robot-companion-rewrite §6 RM-03):
 *   "renders all 12 motions on a single test screen"
 *
 * The 60 fps target is a manual-test acceptance (Performance overlay) and is
 * delivered by the `useNativeDriver: true` setting on every transform; this
 * unit suite covers the structural acceptance only.
 *
 * Channel taxonomy is mirrored from `tbot-infra/contracts/motion.{d.ts,js}`.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { RobotBody, ALL_MOTIONS, channelOf, type Motion } from '../../src/components/robot/RobotBody';

describe('RobotBody — RM-03 12-motion renderer', () => {
  it('exports exactly the 12 canonical motion primitives in the canonical order', () => {
    expect(ALL_MOTIONS).toEqual([
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
    ]);
  });

  it('classifies every motion into HEAD / ARM / POSE per the contracts taxonomy', () => {
    const expected: Record<Motion, 'HEAD' | 'ARM' | 'POSE'> = {
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
    for (const motion of ALL_MOTIONS) {
      expect(channelOf(motion)).toBe(expected[motion]);
    }
  });

  it.each(ALL_MOTIONS.map((m) => [m]))('renders %s without crashing', (motion) => {
    const { getByTestId, unmount } = render(
      <RobotBody motion={motion} __disableAnimations />,
    );
    expect(getByTestId('robot-body-root')).toBeTruthy();
    expect(getByTestId('robot-body-head')).toBeTruthy();
    expect(getByTestId('robot-body-torso')).toBeTruthy();
    expect(getByTestId('robot-body-arm')).toBeTruthy();
    unmount();
  });

  it('renders all 12 motions in a single tree (debug-screen acceptance)', () => {
    const { getAllByTestId, unmount } = render(
      <>
        {ALL_MOTIONS.map((m) => (
          <RobotBody key={m} motion={m} __disableAnimations />
        ))}
      </>,
    );
    // 12 root nodes — one per motion.
    expect(getAllByTestId('robot-body-root')).toHaveLength(12);
    expect(getAllByTestId('robot-body-head')).toHaveLength(12);
    expect(getAllByTestId('robot-body-arm')).toHaveLength(12);
    unmount();
  });

  it('updates motion without crashing (lock for transform retargeting)', () => {
    const { rerender, getByTestId, unmount } = render(
      <RobotBody motion="LOOK_FORWARD" __disableAnimations />,
    );
    expect(getByTestId('robot-body-root')).toBeTruthy();

    for (const next of ALL_MOTIONS) {
      rerender(<RobotBody motion={next} __disableAnimations />);
      expect(getByTestId('robot-body-root')).toBeTruthy();
    }

    unmount();
  });
});
