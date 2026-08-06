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
import { Icon, type IconName } from '@/design-system/icons';
import { referenceColors, referenceShadow } from '@/design-system/referenceTheme';

type Props = {
  state: RobotLinkState;
  onRetry?: () => void;
  testID?: string;
};

const STATE_ICONS: Record<RobotLinkState, IconName> = {
  not_connected: 'Unplug',
  simulated: 'FlaskConical',
  queued_for_robot: 'Clock3',
  robot_offline: 'WifiOff',
  server_unavailable: 'CloudOff',
  unsupported_until_connector: 'Cable',
};

export default function ConnectorStateNotice({ state, onRetry, testID }: Props) {
  const copy = ROBOT_LINK_STATE_COPY[state];
  return (
    <Box
      testID={testID ?? `connector-state-${state}`}
      paddingHorizontal={20}
      paddingTop={20}
    >
      <Box style={styles.card} alignItems="center">
        <Box style={styles.iconBadge} alignItems="center" justifyContent="center">
          <Icon
            name={STATE_ICONS[state]}
            size={26}
            color={referenceColors.primary}
            strokeWidth={2.3}
          />
        </Box>
        <Text fontWeight="800" style={styles.title}>
          {copy.title}
        </Text>
        <Text style={styles.body}>{copy.body}</Text>
        {onRetry ? (
          <Box paddingTop={16} style={styles.action}>
            <DeviceBigBtn secondary onClick={onRetry}>
              Try again
            </DeviceBigBtn>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: referenceColors.card,
    borderColor: referenceColors.line,
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    ...referenceShadow.card,
  },
  iconBadge: {
    width: 54,
    height: 54,
    borderRadius: 20,
    backgroundColor: referenceColors.primarySoft,
  },
  title: {
    fontSize: 18,
    textAlign: 'center',
    color: referenceColors.ink,
    marginTop: 14,
  },
  body: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    color: referenceColors.inkSoft,
    maxWidth: 300,
    lineHeight: 20,
  },
  action: { width: '100%' },
});
