export type EyePiece =
  | 'open'
  | 'closed'
  | 'half'
  | 'happy'
  | 'wide'
  | 'soft'
  | 'side'
  | 'up';

export type MouthPiece =
  | 'smile'
  | 'bigsmile'
  | 'wobble'
  | 'oh'
  | 'wave'
  | 'flat'
  | 'talk'
  | 'tiny';

export interface ClayExpression {
  eye: EyePiece;
  mouth: MouthPiece;
  cheek?: boolean;
  glow?: boolean;
  sparks?: boolean;
  dots?: boolean;
  screenBg?: string;
}