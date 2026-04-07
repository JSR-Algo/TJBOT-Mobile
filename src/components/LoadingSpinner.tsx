import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../theme';

interface LoadingSpinnerProps {
  fullscreen?: boolean;
}

export function LoadingSpinner({ fullscreen = false }: LoadingSpinnerProps): React.JSX.Element {
  if (fullscreen) {
    return (
      <View style={styles.fullscreen}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  return <ActivityIndicator size="small" color={colors.primary} />;
}

const styles = StyleSheet.create({
  fullscreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
