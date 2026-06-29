// MiniProgress is a tiny progress-bar primitive used in the course feature.
// The single computed line (the fill View's width = `${value * 100}%`) was
// only ever hit at the default value=0; these tests drive it with explicit
// non-default values and a custom color so the width/backgroundColor
// computation on line 11 is exercised across arms.

import React from 'react';
import { render } from '@testing-library/react-native';
import MiniProgress from '@/features/course/components/MiniProgress';

function fillStyle(tree: ReturnType<typeof render>) {
  // The component renders a track View whose only child is the fill View.
  // Flatten its style array and read the computed width/backgroundColor.
  const views = tree.UNSAFE_root.findAllByType(
    require('react-native').View,
  );
  // views[0] = track, views[1] = fill
  const fill = views[1];
  const flat = require('react-native').StyleSheet.flatten(fill.props.style);
  return flat as { width: string; backgroundColor: string };
}

describe('MiniProgress', () => {
  it('computes the fill width from a non-default progress value', () => {
    const tree = render(<MiniProgress value={0.42} />);
    const style = fillStyle(tree);
    expect(style.width).toBe('42%');
    // default color
    expect(style.backgroundColor).toBe('#6CE2B6');
  });

  it('honours a full (1.0) value and a custom color', () => {
    const tree = render(<MiniProgress value={1} color="#FF6F61" />);
    const style = fillStyle(tree);
    expect(style.width).toBe('100%');
    expect(style.backgroundColor).toBe('#FF6F61');
  });

  it('falls back to 0% when no value is supplied (default branch)', () => {
    const tree = render(<MiniProgress />);
    const style = fillStyle(tree);
    expect(style.width).toBe('0%');
  });
});
