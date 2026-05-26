import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';

type State = { error: Error | null; info: React.ErrorInfo | null };
type Props = {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
};

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ info });
    console.error('[ErrorBoundary]', error, info);
  }

  reset = () => this.setState({ error: null, info: null });

  render() {
    if (this.state.error) {
      const Fallback = this.props.fallback;
      if (Fallback) {
        return <Fallback error={this.state.error} reset={this.reset} />;
      }
      return (
        <View style={styles.root}>
          <View style={styles.card}>
            <Text style={styles.emoji}>😬</Text>
            <Text style={styles.heading}>Something went wrong</Text>
            <Text style={styles.body}>
              {this.state.error.message || 'Unknown error'}
            </Text>
            <TouchableOpacity
              style={styles.btn}
              onPress={this.reset}
              accessibilityRole="button"
              accessibilityLabel="Try again"
            >
              <Text style={styles.btnText}>Try again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFFCF6',
  },
  card: {
    maxWidth: 360,
    alignItems: 'center',
  },
  emoji: { fontSize: 48, marginBottom: 12 },
  heading: {
    fontFamily: 'Nunito',
    fontSize: 24,
    fontWeight: '800',
    color: '#2B2140',
    marginBottom: 8,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    color: '#5C4F77',
    marginBottom: 16,
    textAlign: 'center',
  },
  btn: {
    backgroundColor: '#E87C5A',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 999,
    minHeight: 44,
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    fontFamily: 'Nunito',
  },
});
