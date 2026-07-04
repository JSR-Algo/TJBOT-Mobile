import React from 'react';
import Svg, {
  Circle, Ellipse, G, Line, Path, Rect,
} from 'react-native-svg';
import type { ClayExpression, EyePiece, MouthPiece } from './types';

const FACE_ACCENT = '#28F4F4';
const FACE_ACCENT_HI = '#A8FBFF';
const FACE_SKIN = '#FFE3B0';

interface ClayScreenFaceProps {
  expression: ClayExpression;
  width: number;
  height: number;
  accent?: string;
  includeBackground?: boolean;
}

function renderEye(kind: EyePiece, x: number, y: number, r: number, accent: string, key: string) {
  if (kind === 'closed') {
    return <Line key={key} x1={x - r} y1={y} x2={x + r} y2={y} stroke={accent} strokeWidth={4} strokeLinecap="round" />;
  }
  if (kind === 'half') {
    return <Path key={key} d={`M ${x - r} ${y} a ${r} ${r} 0 0 1 ${r * 2} 0`} fill={accent} />;
  }
  if (kind === 'happy') {
    return (
      <Path
        key={key}
        d={`M ${x - r} ${y + 3} q ${r} -${r * 1.35} ${r * 2} 0`}
        stroke={accent}
        strokeWidth={4}
        fill="none"
        strokeLinecap="round"
      />
    );
  }
  if (kind === 'wide') {
    return (
      <G key={key}>
        <Circle cx={x} cy={y} r={r * 1.12} fill={accent} />
        <Circle cx={x + r * 0.25} cy={y - r * 0.2} r={r * 0.22} fill="rgba(255,255,255,0.55)" />
      </G>
    );
  }
  if (kind === 'soft') {
    return <Circle key={key} cx={x} cy={y} r={r * 0.82} fill={accent} />;
  }
  if (kind === 'side') {
    return <Circle key={key} cx={x + 3} cy={y} r={r} fill={accent} />;
  }
  if (kind === 'up') {
    return (
      <G key={key}>
        <Circle cx={x} cy={y - r * 0.35} r={r} fill={accent} />
        <Circle cx={x + r * 0.2} cy={y - r * 0.5} r={r * 0.2} fill="rgba(255,255,255,0.5)" />
      </G>
    );
  }
  return (
    <G key={key}>
      <Circle cx={x} cy={y} r={r} fill={accent} />
      <Circle cx={x + r * 0.22} cy={y - r * 0.18} r={r * 0.24} fill="rgba(255,255,255,0.55)" />
    </G>
  );
}

function renderMouth(kind: MouthPiece, cx: number, cy: number, w: number, accent: string) {
  if (kind === 'smile') {
    return <Path d={`M ${cx - w / 2} ${cy} q ${w / 2} ${w * 0.32} ${w} 0`} stroke={accent} strokeWidth={5} fill="none" strokeLinecap="round" />;
  }
  if (kind === 'bigsmile') {
    return <Path d={`M ${cx - w / 2} ${cy - 3} q ${w / 2} ${w * 0.55} ${w} 0`} stroke={accent} strokeWidth={6} fill="none" strokeLinecap="round" />;
  }
  if (kind === 'wobble') {
    return <Path d={`M ${cx - w / 2} ${cy} q ${w / 4} -5 ${w / 2} 0 t ${w / 2} 0`} stroke={accent} strokeWidth={4} fill="none" strokeLinecap="round" />;
  }
  if (kind === 'oh') {
    return <Ellipse cx={cx} cy={cy + 2} rx={w * 0.2} ry={w * 0.24} fill={accent} />;
  }
  if (kind === 'wave') {
    return (
      <Path
        d={`M ${cx - w / 2} ${cy + 2} q ${w / 8} -7 ${w / 4} 0 t ${w / 4} 0 t ${w / 4} 0 t ${w / 4} 0`}
        stroke={accent}
        strokeWidth={5}
        fill="none"
        strokeLinecap="round"
      />
    );
  }
  if (kind === 'talk') {
    return <Ellipse cx={cx} cy={cy + 2} rx={w * 0.22} ry={w * 0.18} fill={accent} />;
  }
  if (kind === 'tiny') {
    return <Ellipse cx={cx} cy={cy + 1} rx={w * 0.1} ry={w * 0.08} fill={accent} />;
  }
  return <Line x1={cx - w / 3} y1={cy} x2={cx + w / 3} y2={cy} stroke={accent} strokeWidth={4} strokeLinecap="round" />;
}

export function ClayScreenFace({
  expression,
  width,
  height,
  accent = FACE_ACCENT,
  includeBackground = true,
}: ClayScreenFaceProps): React.JSX.Element {
  const cx = width / 2;
  const cy = height / 2;
  const eyeR = Math.max(6, width * 0.048);
  const eyeY = cy - height * 0.1;
  const eyeOff = width * 0.19;
  const mouthY = cy + height * 0.22;
  const mouthW = width * 0.42;
  const bg = expression.screenBg ?? '#071116';

  return (
    <Svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
      {includeBackground ? (
        <Rect x={0} y={0} width={width} height={height} rx={height * 0.18} fill={bg} />
      ) : null}
      {expression.glow ? (
        <Rect
          x={2}
          y={2}
          width={width - 4}
          height={height - 4}
          rx={height * 0.16}
          fill="none"
          stroke={accent}
          strokeWidth={2}
          opacity={0.45}
        />
      ) : null}
      {renderEye(expression.eye, cx - eyeOff, eyeY, eyeR, accent, 'eye-l')}
      {renderEye(expression.eye, cx + eyeOff, eyeY, eyeR, accent, 'eye-r')}
      {renderMouth(expression.mouth, cx, mouthY, mouthW, accent)}
      {expression.dots ? (
        <G>
          {[0, 1, 2].map((i) => (
            <Circle
              key={i}
              cx={cx + (i - 1) * eyeR * 1.1}
              cy={mouthY + eyeR * 1.8}
              r={eyeR * 0.28}
              fill={FACE_ACCENT_HI}
              opacity={0.75}
            />
          ))}
        </G>
      ) : null}
      {expression.sparks ? (
        <G stroke={FACE_ACCENT_HI} strokeWidth={2}>
          <Line x1={width * 0.12} y1={height * 0.18} x2={width * 0.2} y2={height * 0.26} />
          <Line x1={width * 0.16} y1={height * 0.14} x2={width * 0.16} y2={height * 0.28} />
          <Line x1={width * 0.88} y1={height * 0.2} x2={width * 0.8} y2={height * 0.28} />
          <Line x1={width * 0.84} y1={height * 0.16} x2={width * 0.84} y2={height * 0.3} />
        </G>
      ) : null}
      {expression.cheek ? (
        <G>
          <Ellipse cx={cx - eyeOff - eyeR} cy={mouthY - eyeR * 0.4} rx={eyeR * 0.9} ry={eyeR * 0.35} fill={FACE_SKIN} opacity={0.35} />
          <Ellipse cx={cx + eyeOff + eyeR} cy={mouthY - eyeR * 0.4} rx={eyeR * 0.9} ry={eyeR * 0.35} fill={FACE_SKIN} opacity={0.35} />
        </G>
      ) : null}
    </Svg>
  );
}

export { FACE_ACCENT, FACE_ACCENT_HI, FACE_SKIN };