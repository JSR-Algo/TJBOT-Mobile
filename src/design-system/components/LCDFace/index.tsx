import React, { useMemo } from 'react';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';
import { ClayScreenFace } from '@/character/ClayFacePieces';
import { resolveClayExpression } from '@/character/expressions';
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

type LcdIcon = 'bolt' | 'wifi' | 'wifioff' | 'lowbat';

function lcdIconFor(emotion: string): LcdIcon | undefined {
  if (emotion === 'charging') return 'bolt';
  if (emotion === 'wifi' || emotion === 'reconnect') return 'wifi';
  if (emotion === 'offline') return 'wifioff';
  if (emotion === 'lowbat') return 'lowbat';
  return undefined;
}

function renderStatusIcon(icon: LcdIcon, W: number, accent: string) {
  const ix = W - 26;
  const iy = 22;
  if (icon === 'bolt') {
    return <Path d={`M ${ix - 4} ${iy - 8} L ${ix + 2} ${iy - 1} L ${ix - 1} ${iy - 1} L ${ix + 4} ${iy + 8} L ${ix - 2} ${iy + 1} L ${ix + 1} ${iy + 1} Z`} fill="#FFD66B" />;
  }
  if (icon === 'wifi') {
    return (
      <G stroke={accent} strokeWidth={2} fill="none" strokeLinecap="round">
        <Path d={`M ${ix - 10} ${iy - 2} q 10 -10 20 0`} />
        <Path d={`M ${ix - 6} ${iy + 2} q 6 -6 12 0`} />
        <Circle cx={ix} cy={iy + 7} r={1.5} fill={accent} />
      </G>
    );
  }
  if (icon === 'wifioff') {
    return (
      <G stroke="#888" strokeWidth={2} fill="none" strokeLinecap="round">
        <Path d={`M ${ix - 10} ${iy - 2} q 10 -10 20 0`} opacity={0.5} />
        <Line x1={ix - 10} y1={iy - 9} x2={ix + 10} y2={iy + 9} stroke={tokens.colors.coral} />
      </G>
    );
  }
  return (
    <G>
      <Rect x={ix - 12} y={iy - 5} width={20} height={10} rx={2} fill="none" stroke={tokens.colors.coral} strokeWidth={2} />
      <Rect x={ix + 8} y={iy - 2} width={3} height={4} fill={tokens.colors.coral} />
      <Rect x={ix - 10} y={iy - 3} width={4} height={6} fill={tokens.colors.coral} />
    </G>
  );
}

export default function LCDFace({ emotion = 'idle', size = 300, accent = tokens.colors.coral }: LCDFaceProps) {
  const W = size;
  const H = Math.round(size * 0.75);
  const expression = useMemo(() => resolveClayExpression(emotion), [emotion]);
  const icon = lcdIconFor(emotion);
  const cx = W / 2;
  const cy = H / 2;
  const ringR = Math.min(W, H) * 0.46;

  const renderRing = () => {
    if (!expression.glow && !expression.sparks) return null;
    if (expression.glow) {
      return <Circle cx={cx} cy={cy} r={ringR} fill="none" stroke={accent} strokeWidth={3} opacity={0.55} />;
    }
    if (expression.sparks) {
      return (
        <G>
          {[0, 72, 144, 216, 288].map((a) => {
            const rad = (a * Math.PI) / 180;
            return (
              <Circle
                key={a}
                cx={cx + Math.cos(rad) * ringR}
                cy={cy + Math.sin(rad) * ringR}
                r={3}
                fill={accent}
              />
            );
          })}
        </G>
      );
    }
    return null;
  };

  return (
    <Svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
      <Rect x={0} y={0} width={W} height={H} fill={expression.screenBg ?? '#0E1116'} />
      {renderRing()}
      <ClayScreenFace
        expression={expression}
        width={W}
        height={H}
        accent="#FFE3B0"
        includeBackground={false}
      />
      {icon ? renderStatusIcon(icon, W, accent) : null}
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
          backgroundColor: tokens.colors.bot.body,
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