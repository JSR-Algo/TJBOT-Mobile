import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// TODO(PR6): wire to lesson-session speak loop
export default function SpeakScreen() {
  return (
    <View style={styles.container}>
      <Text>Speak...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
