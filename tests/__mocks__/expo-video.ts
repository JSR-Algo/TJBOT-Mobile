import React from 'react';
import { View } from 'react-native';

export function useVideoPlayer(_source: unknown, setup?: (player: {
  loop: boolean;
  muted: boolean;
  play: () => void;
}) => void) {
  const player = {
    loop: false,
    muted: true,
    play: jest.fn(),
  };
  setup?.(player);
  return player;
}

export function VideoView(props: Record<string, unknown>) {
  return React.createElement(View, { testID: 'mock-video-view', ...props });
}