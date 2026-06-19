import fs from 'fs';
import path from 'path';
import React from 'react';
import { render } from '@testing-library/react-native';
import WaveBars from '@/design-system/components/WaveBars';
import Robot from '@/design-system/components/Robot';

const PROJECT_ROOT = path.resolve(__dirname, '../..');

/**
 * Animated components and utility modules that must be consolidated on
 * Reanimated as part of T21.
 *
 * If T18/T19 (remove Gemini) is chosen instead of T17 (ship Gemini), the
 * Gemini files below will be deleted and should be removed from this list at
 * that time. This test assumes the SHIP_GEMINI branch where T21 runs.
 */
const SCOPE_FILES = [
  { name: 'WaveVisualizer', path: 'src/components/gemini/WaveVisualizer.tsx' },
  { name: 'SukaAvatar', path: 'src/components/gemini/SukaAvatar.tsx' },
  { name: 'ParticleEffect', path: 'src/components/gemini/ParticleEffect.tsx' },
  { name: 'Robot', path: 'src/design-system/components/Robot/index.tsx' },
  { name: 'WaveBars', path: 'src/design-system/components/WaveBars/index.tsx' },
  { name: 'RobotFace', path: 'src/components/robot/RobotFace.tsx' },
  { name: 'RobotBody', path: 'src/components/robot/RobotBody.tsx' },
  { name: 'RobotAnimations', path: 'src/components/robot/RobotAnimations.ts' },
];

/**
 * Components that render animated UI and must respect reduced motion.
 * The source must either accept a `reduceMotion` prop or call
 * `useReduceMotion()`.
 */
const MOTION_RESPECTING_COMPONENTS = [
  { name: 'WaveVisualizer', path: 'src/components/gemini/WaveVisualizer.tsx' },
  { name: 'SukaAvatar', path: 'src/components/gemini/SukaAvatar.tsx' },
  { name: 'ParticleEffect', path: 'src/components/gemini/ParticleEffect.tsx' },
  { name: 'Robot', path: 'src/design-system/components/Robot/index.tsx' },
  { name: 'WaveBars', path: 'src/design-system/components/WaveBars/index.tsx' },
  { name: 'RobotFace', path: 'src/components/robot/RobotFace.tsx' },
  { name: 'RobotBody', path: 'src/components/robot/RobotBody.tsx' },
];

function readSource(relativePath: string): string {
  const absolutePath = path.join(PROJECT_ROOT, relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(
      `Expected scope file ${relativePath} to exist. If T18/T19 deleted it, update this test.`,
    );
  }

  return fs.readFileSync(absolutePath, 'utf-8');
}

describe(
  'T21: consolidate avatar and waveform primitives on Reanimated',
  () => {
    test.each(SCOPE_FILES)(
      '$name imports Reanimated and does not use RN Animated',
      ({ path: filePath }) => {
        const src = readSource(filePath);

        // Must consume react-native-reanimated.
        expect(src).toMatch(/from\s+['"]react-native-reanimated['"]/);

        // Must not import Animated from react-native.
        expect(src).not.toMatch(
          /import\s+.*?\bAnimated\b.*?from\s+['"]react-native['"]/,
        );

        // Must not use any RN Animated construction or animation API.
        expect(src).not.toMatch(/\bnew\s+Animated\.Value\b/);
        expect(src).not.toMatch(
          /\bAnimated\.(timing|spring|parallel|sequence|loop|delay|Value|CompositeAnimation|Interpolation)\b/,
        );
      },
    );

    test('WaveVisualizer does not recreate per-bar Animated loops', () => {
      const src = readSource('src/components/gemini/WaveVisualizer.tsx');

      // The original implementation built an array of Animated.Values and
      // fired Animated.timing inside a forEach on every audioLevel change.
      expect(src).not.toMatch(/\bnew\s+Animated\.Value\b/);
      expect(src).not.toMatch(/\bAnimated\.timing\b/);
      expect(src).not.toMatch(
        /bars\.forEach\s*\(\s*\(\s*bar\s*\)\s*=>\s*\{\s*Animated\.timing/s,
      );
    });

    test('WaveBars memoizes bar delays and the Bar component', () => {
      const src = readSource('src/design-system/components/WaveBars/index.tsx');

      // Delay calculation should not be inlined in render; Bar should not
      // re-create its animation config on every parent render.
      expect(src).toMatch(/React\.memo\(\s*Bar\s*\)/);
      expect(src).toMatch(/useMemo\s*\(/);
    });

    test.each(MOTION_RESPECTING_COMPONENTS)(
      '$name respects reduced motion',
      ({ path: filePath }) => {
        const src = readSource(filePath);

        // Either accept an explicit reduceMotion prop or query the system.
        const hasProp = /\breduceMotion\b/.test(src);
        const hasHook = /useReduceMotion\s*\(/.test(src);

        expect(hasProp || hasHook).toBe(true);
      },
    );

    test('WaveBars renders without crashing', () => {
      const { getByLabelText } = render(
        <WaveBars count={5} accessibilityLabel="wave bars" />,
      );
      expect(getByLabelText('wave bars')).toBeTruthy();
    });

    test('Robot renders without crashing', () => {
      const { getByLabelText } = render(
        <Robot emotion="happy" size={120} accessibilityLabel="robot avatar" />,
      );
      expect(getByLabelText('robot avatar')).toBeTruthy();
    });
  },
);
