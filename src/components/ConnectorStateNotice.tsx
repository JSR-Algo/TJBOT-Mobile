/**
 * ConnectorStateNotice — the standard honest-state surface for
 * hardware-dependent screens.
 *
 * Renders the canonical copy for a RobotLinkState (see
 * services/connectors/types.ts) with an optional retry action. Use it
 * instead of fabricating robot status when a connector returns a non-ok
 * state. Pattern reference: MicTestScreen's honest `disabled` phase.
 *
 * Manual impact note (new component, 2026-07-18): no callers yet; P2
 * rewires robot-mgmt/device screens to render this when their connector
 * reports a blocked state. Design-system <Text> auto-translates the copy
 * (en/vi catalogs carry every string).
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { ROBOT_LINK_STATE_COPY, type RobotLinkState } from '@/services/connectors/types';

type Props = {
  state: RobotLinkState;
  onRetry?: () => void;
  testID?: string;
};

export default function ConnectorStateNotice({ state, onRetry, testID }: Props) {
  const copy = ROBOT_LINK_STATE_COPY[state];
  return (
    <Box
      testID={testID ?? `connector-state-${state}`}
      paddingHorizontal={24}
      paddingTop={16}
      alignItems="center"
    >
      <Text fontWeight="600" style={styles.title}>
        {copy.title}
      </Text>
      <Text style={styles.body}>{copy.body}</Text>
      {onRetry ? (
        <Box paddingTop={12}>
          <DeviceBigBtn secondary onClick={onRetry}>
            Try again
          </DeviceBigBtn>
        </Box>
      ) : null}
    </Box>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 17, textAlign: 'center', color: '#1C1C1E' },
  body: { fontSize: 13, textAlign: 'center', marginTop: 4, color: '#4A4A52', maxWidth: 300, lineHeight: 19 },
});
