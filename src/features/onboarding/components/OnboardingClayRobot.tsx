import React from 'react';
import { StyleSheet } from 'react-native';
import { RobotImage } from '@/components/RobotImage';
import { Box } from '@/design-system/primitives/Box';

type Props = {
  /** Rendered robot diameter (px) — the body fits inside this square. */
  size?: number;
  /** Soft halo glow behind the mascot, matching the welcome hero. */
  showRing?: boolean;
  testID?: string;
};

/**
 * Clay TeeBot hero used across onboarding/auth. Shows the full-body mascot
 * (`<RobotImage variant="body" />`) over a soft halo, matching the kit's
 * onboarding/home hero. Swap src/assets/mascot/tee-body.png to restyle.
 */
export default function OnboardingClayRobot({
  size = 170,
  showRing = false,
  testID = 'onboarding-clay-robot',
}: Props): React.JSX.Element {
  const stage = size + (showRing ? 36 : 0);
  return (
    <Box
      testID={testID}
      style={[styles.stage, { width: stage, height: stage }]}
      alignItems="center"
      justifyContent="center"
    >
      {showRing ? (
        <Box
          style={[
            styles.ring,
            {
              width: stage,
              height: stage,
              borderRadius: stage / 2,
            },
          ]}
        />
      ) : null}
      <RobotImage variant="body" size={size} accessibilityLabel="TeeBot robot" />
    </Box>
  );
}

const styles = StyleSheet.create({
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
});
