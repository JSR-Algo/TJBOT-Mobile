import type { ClayExpression, EyePiece, MouthPiece } from './types';
import type { RobotReadyState } from '@/features/lesson-demo/types';

const DEFAULT: ClayExpression = {
  eye: 'open',
  mouth: 'smile',
  cheek: true,
  screenBg: '#071116',
};

const LCD_EMOTIONS: Record<string, ClayExpression> = {
  boot:      { eye: 'closed', mouth: 'flat', glow: true, screenBg: '#0E1116' },
  sleep:     { eye: 'closed', mouth: 'flat', screenBg: '#0A0C10' },
  charging:  { eye: 'half', mouth: 'smile', glow: true, screenBg: '#0E1116' },
  paired:    { eye: 'open', mouth: 'smile', sparks: true, screenBg: '#0E1116' },
  looking:   { eye: 'wide', mouth: 'smile', screenBg: '#0E1116' },
  speaking:  { eye: 'open', mouth: 'wave', screenBg: '#0E1116' },
  listening: { eye: 'open', mouth: 'oh', glow: true, screenBg: '#0E1116' },
  thinking:  { eye: 'side', mouth: 'flat', dots: true, screenBg: '#0E1116' },
  happy:     { eye: 'happy', mouth: 'bigsmile', sparks: true, cheek: true, screenBg: '#0E1116' },
  celebrate: { eye: 'happy', mouth: 'bigsmile', sparks: true, cheek: true, screenBg: '#0E1116' },
  gentle:    { eye: 'soft', mouth: 'wobble', cheek: true, screenBg: '#0E1116' },
  curious:   { eye: 'wide', mouth: 'oh', cheek: true, screenBg: '#0E1116' },
  wifi:      { eye: 'half', mouth: 'flat', glow: true, screenBg: '#0E1116' },
  reconnect: { eye: 'half', mouth: 'flat', glow: true, screenBg: '#0E1116' },
  offline:   { eye: 'closed', mouth: 'flat', screenBg: '#0E1116' },
  lowbat:    { eye: 'half', mouth: 'flat', screenBg: '#0E1116' },
  pause:     { eye: 'closed', mouth: 'flat', screenBg: '#0E1116' },
  redirect:  { eye: 'soft', mouth: 'smile', cheek: true, screenBg: '#0E1116' },
  parent:    { eye: 'half', mouth: 'flat', screenBg: '#0E1116' },
  idle:      { eye: 'open', mouth: 'smile', cheek: true, screenBg: '#0E1116' },
};

const ROBOT_READY: Record<RobotReadyState, ClayExpression> = {
  idle:        { eye: 'open', mouth: 'smile', cheek: true },
  listening:   { eye: 'wide', mouth: 'oh', glow: true },
  modeling:    { eye: 'open', mouth: 'talk', cheek: true },
  thinking:    { eye: 'up', mouth: 'flat', dots: true },
  celebrating: { eye: 'happy', mouth: 'bigsmile', sparks: true, cheek: true },
};

const SPRITE_POSE: Record<string, ClayExpression> = {
  idle:       { eye: 'open', mouth: 'smile', cheek: true },
  wave:       { eye: 'open', mouth: 'bigsmile', cheek: true, sparks: true },
  point:      { eye: 'open', mouth: 'talk', cheek: true },
  listen:     { eye: 'wide', mouth: 'oh', glow: true },
  think:      { eye: 'up', mouth: 'flat', dots: true },
  celebrate:  { eye: 'happy', mouth: 'bigsmile', sparks: true, cheek: true },
  'hold-card': { eye: 'open', mouth: 'smile', cheek: true },
  speak:      { eye: 'open', mouth: 'talk', cheek: true },
  child_speak: { eye: 'wide', mouth: 'oh', glow: true },
  success:    { eye: 'happy', mouth: 'bigsmile', sparks: true, cheek: true },
};

export function resolveClayExpression(mood: string, isSpeaking = false): ClayExpression {
  const base =
    ROBOT_READY[mood as RobotReadyState]
    ?? SPRITE_POSE[mood]
    ?? LCD_EMOTIONS[mood]
    ?? DEFAULT;

  if (isSpeaking && base.mouth !== 'wave') {
    return { ...base, mouth: 'talk' as MouthPiece, eye: base.eye === 'closed' ? 'half' : base.eye };
  }
  return { ...base };
}

export function speakingMouthFor(eye: EyePiece): MouthPiece {
  return eye === 'happy' ? 'bigsmile' : 'talk';
}