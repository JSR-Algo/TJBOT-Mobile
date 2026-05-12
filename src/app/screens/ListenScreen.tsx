import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// TODO(PR6): wire into lesson-session realtime flow
export default function ListenScreen() {
  return (
    <View style={styles.container}>
      <Text>Listening...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
