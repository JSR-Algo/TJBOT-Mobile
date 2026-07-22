import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { DV } from '@/components/Device-tokens';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { useAppLanguage } from '@/services/i18n/i18n';

type Props = {
  visible: boolean;
  onConnect: () => void;
  onDismiss: () => void;
};

export default function RobotConnectionModal({ visible, onConnect, onDismiss }: Props) {
  const { t } = useAppLanguage();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.scrim} onPress={onDismiss} testID="robotConnectionModalScrim">
        <Pressable
          style={styles.card}
          onPress={(event) => event.stopPropagation()}
          accessibilityRole="alert"
          accessibilityLabel={t("Robot isn't ready yet")}
          accessibilityViewIsModal
          testID="robotConnectionModal"
        >
          <View style={styles.hero} importantForAccessibility="no-hide-descendants">
            <RobotDevice emotion="offline" size={104} accent="#FF6F61" />
          </View>

          <Text fontWeight="700" style={styles.title}>
            Robot isn't ready yet
          </Text>
          <Text style={styles.body}>
            Connect Robot to send lessons and start playing with your child.
          </Text>
          <Box style={styles.reassurancePill}>
            <Text fontWeight="600" style={styles.reassurance}>
              It only takes about 3 minutes.
            </Text>
          </Box>

          <Box style={styles.actions}>
            <DeviceBigBtn onClick={onConnect}>Connect Robot</DeviceBigBtn>
            <DeviceBigBtn secondary onClick={onDismiss}>Not now</DeviceBigBtn>
          </Box>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(20, 24, 32, 0.56)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    backgroundColor: DV.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: DV.hair,
    padding: 20,
    shadowColor: '#10141C',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.28,
    shadowRadius: 34,
    elevation: 16,
  },
  hero: {
    minHeight: 138,
    borderRadius: 18,
    backgroundColor: '#FFF2ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  title: {
    color: DV.ink,
    fontSize: 24,
    lineHeight: 30,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  body: {
    color: DV.ink2,
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    marginTop: 10,
  },
  reassurancePill: {
    alignSelf: 'center',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#F2F6FC',
  },
  reassurance: {
    color: DV.accent,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  actions: {
    marginTop: 20,
    gap: 10,
  },
});
