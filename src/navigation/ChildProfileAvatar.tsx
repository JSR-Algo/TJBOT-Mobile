import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

type Props = {
  accessibilityLabel: string;
  name: string;
  size?: number;
  testID?: string;
};

const AVATAR_PALETTES = [
  { background: '#FFE4DA', shirt: '#F47B83' },
  { background: '#E1F1FF', shirt: '#6097D8' },
  { background: '#E9E3FF', shirt: '#8B78C8' },
  { background: '#DCF4E7', shirt: '#58A982' },
] as const;

function paletteFor(name: string): (typeof AVATAR_PALETTES)[number] {
  const hash = Array.from(name).reduce(
    (value, character) => value + (character.codePointAt(0) ?? 0),
    0,
  );
  return AVATAR_PALETTES[hash % AVATAR_PALETTES.length];
}

function initialFor(name: string): string {
  return Array.from(name.trim())[0]?.toLocaleUpperCase() ?? '?';
}

/**
 * COPPA-safe child identity: an illustrated portrait plus the child's initial.
 * It avoids collecting a real child photo while remaining visually distinct
 * from the generic account glyph used elsewhere in the parent app.
 */
export function ChildProfileAvatar({
  accessibilityLabel,
  name,
  size = 30,
  testID = 'appShellChildAvatar',
}: Props): React.JSX.Element {
  const palette = paletteFor(name);

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      style={[styles.frame, { borderRadius: size / 2, height: size, width: size }]}
      testID={testID}
    >
      <Svg height={size} viewBox="0 0 32 32" width={size}>
        <Circle cx="16" cy="16" fill={palette.background} r="15" />
        <Path d="M4.5 32c.9-6 5.2-9.2 11.5-9.2S26.6 26 27.5 32Z" fill={palette.shirt} />
        <Circle cx="16" cy="15.2" fill="#F4C7A2" r="8.3" />
        <Path
          d="M7.9 14.1C8.1 7.7 11.4 4.5 16 4.5c5 0 8.1 3.5 8.2 9.9-2.3-1.2-4.2-3-5.5-5.2-2 2.7-5.8 4.6-10.8 4.9Z"
          fill="#5A382D"
        />
        <Circle cx="12.9" cy="15.7" fill="#3B2B29" r="1" />
        <Circle cx="19.1" cy="15.7" fill="#3B2B29" r="1" />
        <Path
          d="M12.8 19.1c.9 1 2 1.5 3.2 1.5s2.3-.5 3.2-1.5"
          fill="none"
          stroke="#B45D63"
          strokeLinecap="round"
          strokeWidth="1.2"
        />
        <Circle cx="10.9" cy="18" fill="#EB9A98" opacity=".42" r=".9" />
        <Circle cx="21.1" cy="18" fill="#EB9A98" opacity=".42" r=".9" />
      </Svg>
      <View style={styles.initialBadge}>
        <Text allowFontScaling={false} style={styles.initial} testID="appShellChildAvatarInitial">
          {initialFor(name)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: '#FFE4DA',
    borderColor: '#FFFFFF',
    borderWidth: 1.5,
    overflow: 'visible',
    position: 'relative',
  },
  initialBadge: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EBDCC7',
    borderRadius: 6,
    borderWidth: 1,
    bottom: -2,
    height: 12,
    justifyContent: 'center',
    position: 'absolute',
    right: -2,
    width: 12,
  },
  initial: {
    color: '#74433F',
    fontSize: 7,
    fontWeight: '900',
    lineHeight: 9,
  },
});
