import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// TODO(PR7): wire to device pairing service
export default function DevicePairWifiScreen() {
  return (
    <View style={styles.container}>
      <Text>Device WiFi Pairing</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
