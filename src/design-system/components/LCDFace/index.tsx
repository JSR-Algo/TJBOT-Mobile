import React from 'react';
import Svg, {
  Circle, Ellipse, G, Line, Path, Rect,
} from 'react-native-svg';

// SMIL animation tags (Animate, AnimateTransform) were removed from
// react-native-svg ^15. The static circles below replace the previously
// animated rings until reanimated parity work is scheduled.
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { tokens } from '@/design-system/tokens';

export const LCD_STATES_LIST = [
  { id: 'boot',      title: 'Booting',           group: 'Lifecycle' },
  { id: 'sleep',     title: 'Sleeping',           group: 'Lifecycle' },
  { id: 'charging',  title: 'Charging',           group: 'Lifecycle' },
  { id: 'paired',    title: 'Just paired',        group: 'Lifecycle' },
  { id: 'looking',   title: 'Looking at child',   group: 'Conversation' },
  { id: 'speaking',  title: 'Speaking',           group: 'Conversation' },
  { id: 'listening', title: 'Listening',          group: 'Conversation' },
  { id: 'thinking',  title: 'Thinking',           group: 'Conversation' },
  { id: 'happy',     title: 'Praise',             group: 'Feedback' },
  { id: 'celebrate', title: 'Celebrate',          group: 'Feedback' },
  { id: 'gentle',    title: 'Gentle correction',  group: 'Feedback' },
  { id: 'curious',   title: 'Curious',            group: 'Feedback' },
  { id: 'wifi',      title: 'Connecting Wi-Fi',   group: 'System' },
  { id: 'reconnect', title: 'Reconnecting',       group: 'System' },
  { id: 'offline',   title: 'Offline',            group: 'System' },
  { id: 'lowbat',    title: 'Low battery',        group: 'System' },
  { id: 'pause',     title: 'Safety pause',       group: 'Safety' },
  { id: 'redirect',  title: 'Gentle redirect',    group: 'Safety' },
  { id: 'parent',    title: 'Parent only',        group: 'Safety' },
  { id: 'idle',      title: 'Idle happy',         group: 'Conversation' },
];

interface LCDFaceProps {
  emotion?: string;
  size?: number;
  accent?: string;
}

type EyeKind = 'open' | 'closed' | 'half' | 'happy' | 'wide' | 'soft' | 'side';
type MouthKind = 'smile' | 'bigsmile' | 'wobble' | 'oh' | 'wave' | 'flat';
type RingKind = 'pulse' | 'glow' | 'spark' | 'sparks' | 'dots' | null;

interface LCDCfg {
  eye: EyeKind;
  mouth: MouthKind;
  ring: RingKind;
  bg: string;
  icon?: 'bolt' | 'wifi' | 'wifioff' | 'lowbat';
}

function getConfig(emotion: string): LCDCfg {
  switch (emotion) {
    case 'boot':      return { eye: 'closed', mouth: 'flat',     ring: 'pulse',  bg: '#0E1116' };
    case 'sleep':     return { eye: 'closed', mouth: 'flat',     ring: null,     bg: '#0A0C10' };
    case 'charging':  return { eye: 'half',   mouth: 'smile',    ring: 'pulse',  bg: '#0E1116', icon: 'bolt' };
    case 'paired':    return { eye: 'open',   mouth: 'smile',    ring: 'spark',  bg: '#0E1116' };
    case 'looking':   return { eye: 'wide',   mouth: 'smile',    ring: null,     bg: '#0E1116' };
    case 'speaking':  return { eye: 'open',   mouth: 'wave',     ring: null,     bg: '#0E1116' };
    case 'listening': return { eye: 'open',   mouth: 'oh',       ring: 'glow',   bg: '#0E1116' };
    case 'thinking':  return { eye: 'side',   mouth: 'flat',     ring: 'dots',   bg: '#0E1116' };
    case 'happy':     return { eye: 'happy',  mouth: 'bigsmile', ring: 'spark',  bg: '#0E1116' };
    case 'celebrate': return { eye: 'happy',  mouth: 'bigsmile', ring: 'sparks', bg: '#0E1116' };
    case 'gentle':    return { eye: 'soft',   mouth: 'wobble',   ring: null,     bg: '#0E1116' };
    case 'curious':   return { eye: 'wide',   mouth: 'oh',       ring: null,     bg: '#0E1116' };
    case 'wifi':      return { eye: 'half',   mouth: 'flat',     ring: 'pulse',  bg: '#0E1116', icon: 'wifi' };
    case 'reconnect': return { eye: 'half',   mouth: 'flat',     ring: 'pulse',  bg: '#0E1116', icon: 'wifi' };
    case 'offline':   return { eye: 'closed', mouth: 'flat',     ring: null,     bg: '#0E1116', icon: 'wifioff' };
    case 'lowbat':    return { eye: 'half',   mouth: 'flat',     ring: null,     bg: '#0E1116', icon: 'lowbat' };
    case 'pause':     return { eye: 'closed', mouth: 'flat',     ring: null,     bg: '#0E1116' };
    case 'redirect':  return { eye: 'soft',   mouth: 'smile',    ring: null,     bg: '#0E1116' };
    case 'parent':    return { eye: 'half',   mouth: 'flat',     ring: null,     bg: '#0E1116' };
    default:          return { eye: 'open',   mouth: 'smile',    ring: null,     bg: '#0E1116' };
  }
}

export default function LCDFace({ emotion = 'idle', size = 300, accent = tokens.colors.coral }: LCDFaceProps) {
  const W = size;
  const H = Math.round(size * 0.75);
  const cx = W / 2;
  const cy = H / 2;
  const skin = '#FFE3B0';
  const cfg = getConfig(emotion);

  const eyeR = 14 * (size / 300);
  const eyeY = cy - 8;
  const eyeOff = 38 * (size / 300);

  const renderEye = (sign: 1 | -1) => {
    const x = cx + sign * eyeOff;
    if (cfg.eye === 'closed') return <Line key={sign} x1={x - eyeR} y1={eyeY} x2={x + eyeR} y2={eyeY} stroke={skin} strokeWidth={5} strokeLinecap="round" />;
    if (cfg.eye === 'half') return <Path key={sign} d={`M ${x - eyeR} ${eyeY} a ${eyeR} ${eyeR} 0 0 1 ${eyeR * 2} 0`} fill={skin} />;
    if (cfg.eye === 'happy') return <Path key={sign} d={`M ${x - eyeR} ${eyeY + 4} q ${eyeR} -${eyeR * 1.4} ${eyeR * 2} 0`} stroke={skin} strokeWidth={5} fill="none" strokeLinecap="round" />;
    if (cfg.eye === 'wide') return <Circle key={sign} cx={x} cy={eyeY} r={eyeR * 1.15} fill={skin} />;
    if (cfg.eye === 'soft') return <Circle key={sign} cx={x} cy={eyeY} r={eyeR * 0.85} fill={skin} />;
    if (cfg.eye === 'side') return <Circle key={sign} cx={x + sign * 4} cy={eyeY} r={eyeR} fill={skin} />;
    return <Circle key={sign} cx={x} cy={eyeY} r={eyeR} fill={skin} />;
  };

  const mY = cy + 32 * (size / 300);
  const mW = 56 * (size / 300);

  const renderMouth = () => {
    if (cfg.mouth === 'smile') return <Path d={`M ${cx - mW / 2} ${mY} q ${mW / 2} ${mW * 0.35} ${mW} 0`} stroke={skin} strokeWidth={6} fill="none" strokeLinecap="round" />;
    if (cfg.mouth === 'bigsmile') return <Path d={`M ${cx - mW / 2} ${mY - 4} q ${mW / 2} ${mW * 0.6} ${mW} 0`} stroke={skin} strokeWidth={7} fill="none" strokeLinecap="round" />;
    if (cfg.mouth === 'wobble') return <Path d={`M ${cx - mW / 2} ${mY} q ${mW / 4} -6 ${mW / 2} 0 t ${mW / 2} 0`} stroke={skin} strokeWidth={5} fill="none" strokeLinecap="round" />;
    if (cfg.mouth === 'oh') return <Ellipse cx={cx} cy={mY + 4} rx={12 * (size / 300)} ry={14 * (size / 300)} fill={skin} />;
    if (cfg.mouth === 'wave') return <Path d={`M ${cx - mW / 2} ${mY + 4} q ${mW / 8} -8 ${mW / 4} 0 t ${mW / 4} 0 t ${mW / 4} 0 t ${mW / 4} 0`} stroke={skin} strokeWidth={6} fill="none" strokeLinecap="round" />;
    return <Line x1={cx - mW / 3} y1={mY} x2={cx + mW / 3} y2={mY} stroke={skin} strokeWidth={5} strokeLinecap="round" />;
  };

  const ringR = Math.min(W, H) * 0.46;

  const renderRing = () => {
    if (cfg.ring === 'pulse') return (
      <Circle cx={cx} cy={cy} r={ringR} fill="none" stroke={accent} strokeWidth={3} opacity={0.7} />
    );
    if (cfg.ring === 'glow') return (
      <Circle cx={cx} cy={cy} r={ringR} fill="none" stroke={accent} strokeWidth={4} opacity={0.5} />
    );
    if (cfg.ring === 'spark') return (
      <Circle cx={cx} cy={cy} r={ringR} fill="none" stroke={accent} strokeWidth={3} strokeDasharray="6 8" opacity={0.7} />
    );
    if (cfg.ring === 'sparks') return (
      <G>
        {[0, 72, 144, 216, 288].map(a => {
          const rad = (a * Math.PI) / 180;
          const sx = cx + Math.cos(rad) * ringR;
          const sy = cy + Math.sin(rad) * ringR;
          return (
            <Circle key={a} cx={sx} cy={sy} r={3} fill={accent} />
          );
        })}
      </G>
    );
    if (cfg.ring === 'dots') return (
      <G>
        {[0, 1, 2].map(i => (
          <Circle key={i} cx={cx + (i - 1) * 14} cy={cy + ringR * 0.85} r={3.5} fill={skin} opacity={0.7} />
        ))}
      </G>
    );
    return null;
  };

  const renderIcon = () => {
    if (!cfg.icon) return null;
    const ix = W - 26;
    const iy = 22;
    if (cfg.icon === 'bolt') return <Path d={`M ${ix - 4} ${iy - 8} L ${ix + 2} ${iy - 1} L ${ix - 1} ${iy - 1} L ${ix + 4} ${iy + 8} L ${ix - 2} ${iy + 1} L ${ix + 1} ${iy + 1} Z`} fill="#FFD66B" />;
    if (cfg.icon === 'wifi') return (
      <G stroke={accent} strokeWidth={2} fill="none" strokeLinecap="round">
        <Path d={`M ${ix - 10} ${iy - 2} q 10 -10 20 0`} />
        <Path d={`M ${ix - 6} ${iy + 2} q 6 -6 12 0`} />
        <Circle cx={ix} cy={iy + 7} r={1.5} fill={accent} />
      </G>
    );
    if (cfg.icon === 'wifioff') return (
      <G stroke="#888" strokeWidth={2} fill="none" strokeLinecap="round">
        <Path d={`M ${ix - 10} ${iy - 2} q 10 -10 20 0`} opacity={0.5} />
        <Line x1={ix - 10} y1={iy - 9} x2={ix + 10} y2={iy + 9} stroke={tokens.colors.coral} />
      </G>
    );
    if (cfg.icon === 'lowbat') return (
      <G>
        <Rect x={ix - 12} y={iy - 5} width={20} height={10} rx={2} fill="none" stroke={tokens.colors.coral} strokeWidth={2} />
        <Rect x={ix + 8} y={iy - 2} width={3} height={4} fill={tokens.colors.coral} />
        <Rect x={ix - 10} y={iy - 3} width={4} height={6} fill={tokens.colors.coral} />
      </G>
    );
    return null;
  };

  return (
    <Svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
      <Rect x={0} y={0} width={W} height={H} fill={cfg.bg} />
      {renderRing()}
      {renderEye(-1)}
      {renderEye(1)}
      {renderMouth()}
      {renderIcon()}
    </Svg>
  );
}

interface RobotDeviceProps {
  emotion?: string;
  size?: number;
  accent?: string;
  name?: string;
}

export function RobotDevice({ emotion = 'idle', size = 200, accent = tokens.colors.coral, name }: RobotDeviceProps) {
  const w = size;
  const h = Math.round(size * 1.05);
  const lcdW = Math.round(w * 0.78);
  const lcdH = Math.round(lcdW * 0.75);
  return (
    <Box alignItems="center" gap={8}>
      <Box
        style={{
          width: w,
          height: h,
          borderRadius: w * 0.22,
          backgroundColor: '#F5EFE6',
          ...tokens.shadows.card,
          position: 'relative',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box
          style={{
            width: lcdW,
            height: lcdH,
            borderRadius: w * 0.1,
            backgroundColor: '#1A1A1F',
            padding: w * 0.018,
            overflow: 'hidden',
          }}
        >
          <LCDFace emotion={emotion} size={lcdW - w * 0.036} accent={accent} />
        </Box>
      </Box>
      {name != null && <Text style={{ fontSize: 13, color: '#5A5A66', fontWeight: '500' }}>{name}</Text>}
    </Box>
  );
}
