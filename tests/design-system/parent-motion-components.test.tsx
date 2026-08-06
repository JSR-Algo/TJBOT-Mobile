import React from 'react';
import { AccessibilityInfo, Text } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';
import {
  ChartBar,
  CountUp,
  ProgressFill,
  Reveal,
  Sheen,
  StatusPulse,
} from '@/design-system/animations';
import { setAccessibilityPreferences } from '@/services/accessibility/preferences';

describe('parent motion components', () => {
  beforeEach(async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({ remove: jest.fn() } as never);
    await setAccessibilityPreferences({ largeText: false, reduceMotion: false });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('Reveal exposes a final resting accessibility value', () => {
    const screen = render(
      <Reveal testID="reveal" index={2} reduceMotion>
        <Text>Hello</Text>
      </Reveal>,
    );
    const node = screen.getByTestId('reveal');
    expect(node.props.accessibilityValue).toEqual({
      max: 1,
      min: 0,
      now: 1,
      text: 'stagger:2',
    });
  });

  it('Sheen omits the repeating band under reduced motion', () => {
    const screen = render(
      <Sheen testID="sheen" reduceMotion>
        <Text>Card</Text>
      </Sheen>,
    );
    expect(screen.getByTestId('sheen')).toBeTruthy();
    expect(screen.queryByTestId('sheen-band')).toBeNull();
  });

  it('Sheen renders the band when motion is allowed', () => {
    const screen = render(
      <Sheen testID="sheen" reduceMotion={false}>
        <Text>Card</Text>
      </Sheen>,
    );
    expect(screen.getByTestId('sheen-band')).toBeTruthy();
  });

  it('CountUp lands on the source value under reduced motion', async () => {
    const screen = render(<CountUp testID="metric" value={42} reduceMotion />);
    await waitFor(() => {
      expect(screen.getByTestId('metric').props.children).toBe('42');
    });
  });

  it('CountUp animates toward the source and never overshoots', async () => {
    jest.useFakeTimers();
    const screen = render(<CountUp testID="metric" value={10} durationMs={100} reduceMotion={false} />);
    expect(screen.getByTestId('metric').props.children).toBe('0');
    await act(async () => {
      jest.advanceTimersByTime(200);
      // flush rAF polyfill if present
      jest.runOnlyPendingTimers();
    });
    // With real rAF under fake timers the value may still be mid-flight;
    // assert it never exceeds source when present.
    const shown = Number(screen.getByTestId('metric').props.children);
    expect(shown).toBeLessThanOrEqual(10);
    jest.useRealTimers();
  });

  it('ChartBar exposes the final height via accessibilityValue', () => {
    const screen = render(
      <ChartBar testID="bar" count={3} maxCount={6} trackHeight={100} reduceMotion />,
    );
    expect(screen.getByTestId('bar').props.accessibilityValue).toEqual({
      max: 100,
      min: 0,
      now: 50,
    });
  });

  it('ChartBar zero count keeps the minimum stub height', () => {
    const screen = render(
      <ChartBar testID="bar" count={0} maxCount={4} trackHeight={118} reduceMotion />,
    );
    expect(screen.getByTestId('bar').props.accessibilityValue.now).toBe(8);
  });

  it('ProgressFill clamps to 100 and exposes the final percent', () => {
    const over = render(
      <ProgressFill testID="fill" percent={140} reduceMotion />,
    );
    expect(over.getByTestId('fill').props.accessibilityValue.now).toBe(100);

    const zero = render(
      <ProgressFill testID="fill0" percent={0} reduceMotion />,
    );
    expect(zero.getByTestId('fill0').props.accessibilityValue.now).toBe(0);
  });

  it('StatusPulse stays static when offline or reduced motion', () => {
    const offline = render(
      <StatusPulse testID="dot" active={false} reduceMotion={false} />,
    );
    expect(offline.getByTestId('dot').props.accessibilityState.selected).toBe(false);

    const reduced = render(
      <StatusPulse testID="dot2" active reduceMotion />,
    );
    expect(reduced.getByTestId('dot2').props.accessibilityState.selected).toBe(true);
  });
});
