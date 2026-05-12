export const motion = {
  bob:         { duration: 3600, easing: 'easeInOut' as const, translateY: [-6, 0] },
  bobStrong:   { duration: 1600, easing: 'easeInOut' as const, translateY: [-12, 0] },
  tilt:        { duration: 600,  easing: 'easeInOut' as const, rotate: [-2, 2] },
  think:       { duration: 2000, easing: 'easeInOut' as const, rotate: [-3, 3] },
  blink:       { duration: 4000, easing: 'linear' as const,    scaleY: [1, 0.1, 1] },
  mouthTalk:   { duration: 450,  easing: 'easeInOut' as const, scaleY: [1, 0.5, 1.2, 0.7] },
  antenna:     { duration: 2000, easing: 'easeInOut' as const, rotate: [-4, 4] },
  glow:        { duration: 2400, easing: 'easeInOut' as const, scale: [1, 1.08] },
  glowSoft:    { duration: 4000, easing: 'easeInOut' as const, scale: [0.98, 1.04] },
  pulseRing:   { duration: 1200, easing: 'easeOut' as const,   scale: [0.85, 1.6] },
  thinkDot:    { duration: 1400, easing: 'easeInOut' as const, translateY: [0, -3, 0] },
  spark:       { duration: 1600, easing: 'easeOut' as const,   scale: [0, 1.1, 0.6] },
  waveBar:     { duration: 1000, easing: 'easeInOut' as const, scaleY: [0.3, 1, 0.3] },
  zzzFloat:    { duration: 2400, easing: 'easeOut' as const,   translateY: [0, -30] },
  ringPulse:   { duration: 1000, easing: 'easeOut' as const,   scale: [0.9, 1.5] },
} as const;

export type MotionKey = keyof typeof motion;

export default motion;
