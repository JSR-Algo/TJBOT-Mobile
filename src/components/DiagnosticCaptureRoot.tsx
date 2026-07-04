import React from 'react';
import { StyleSheet, View } from 'react-native';
import { setDiagnosticCaptureRef } from '@/services/observability/diagnosticCaptureRef';

type Props = {
  children: React.ReactNode;
};

export function DiagnosticCaptureRoot({ children }: Props): React.JSX.Element {
  const rootRef = React.useRef<View>(null);

  React.useEffect(() => {
    setDiagnosticCaptureRef(rootRef);
    return () => setDiagnosticCaptureRef(null);
  }, []);

  return (
    <View ref={rootRef} style={styles.root} collapsable={false}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});