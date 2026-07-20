import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import DeviceRow from '@/components/DeviceRow';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import RmChip from '../components/RmChip';
import { RM } from '../components/RM';

type Props = NativeStackScreenProps<RootStackParamList, 'RotjtjbotBatteryScreen'>;

const PCT = 78;
const RADIUS = 78;
const CIRC = 2 * Math.PI * RADIUS;

export default function RotjtjbotBatteryScreen({ navigation }: Props) {
  return (
    <DeviceShell title="Battery" onBack={() => navigation.navigate('MyRotjtjbotScreen')}>
      <Box paddingTop={30} paddingHorizontal={24} alignItems="center">
        <Box style={styles.ringWrap}>
          <Svg width={180} height={180} viewBox="0 0 180 180">
            <Circle cx={90} cy={90} r={RADIUS} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={14} />
            <Circle
              cx={90} cy={90} r={RADIUS} fill="none" stroke={RM.good} strokeWidth={14}
              strokeLinecap="round"
              strokeDasharray={`${(PCT / 100) * CIRC} ${CIRC}`}
              transform="rotate(-90 90 90)"
            />
          </Svg>
          <Box style={StyleSheet.absoluteFillObject} alignItems="center" justifyContent="center">
            <Text fontWeight="700" style={styles.pctVal}>{PCT}%</Text>
            <Text style={styles.pctLabel}>charging</Text>
          </Box>
        </Box>
        <Box marginTop={18}><RmChip>⚡ On dock · 32 min to full</RmChip></Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={24}>
        <Box style={styles.rowCard}>
          <DeviceRow icon="🔌" title="Power source" body="Charging dock" />
          <DeviceRow icon="⏱️" title="Estimated lesson time" body="About 5 hours of talking" />
          <DeviceRow icon="🌙" title="Sleeps when idle" body="After 30 minutes off the dock" />
          <DeviceRow icon="🔋" title="Battery health" body="100% · like new" />
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Box style={styles.tipsCard}>
          <Text fontWeight="600" style={styles.tipsTitle}>To keep the battery healthy</Text>
          <Text style={styles.tipItem}>• Use the included dock — third-party chargers can run hot</Text>
          <Text style={styles.tipItem}>• Rotjtjbot is happiest between 10°C and 30°C</Text>
          <Text style={styles.tipItem}>• If you'll be away a week, leave Rotjtjbot at about 50%</Text>
        </Box>
      </Box>

      <Box height={30} />
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  ringWrap: { width: 180, height: 180, position: 'relative' },
  pctVal: { fontSize: 42, color: RM.ink, letterSpacing: -1 },
  pctLabel: { fontSize: 13, color: RM.ink2, marginTop: 2 },
  rowCard: { backgroundColor: RM.card, borderWidth: 1, borderColor: RM.hair, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 4 },
  tipsCard: { backgroundColor: RM.card, borderWidth: 1, borderColor: RM.hair, borderRadius: 14, padding: 14 },
  tipsTitle: { fontSize: 13, color: RM.ink, margintjtjbottom: 8 },
  tipItem: { fontSize: 13, color: RM.ink2, lineHeight: 24 },
});
