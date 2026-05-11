import React from 'react';

// Global error boundary — addresses ISSUE 4 from user-flow-review.md (no global error path).
// Wrap <App/> in main.jsx. Any uncaught render error in any feature page bubbles here
// instead of producing a white screen of death.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    if (typeof window !== 'undefined') {
      console.error('[ErrorBoundary]', error, info);
    }
  }

  reset = () => this.setState({ error: null, info: null });

  render() {
    if (this.state.error) {
      const Fallback = this.props.fallback;
      if (Fallback) {
        return <Fallback error={this.state.error} reset={this.reset} />;
      }
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24, fontFamily: 'var(--body, system-ui)', color: 'var(--ink, #2B2140)',
          background: 'var(--paper, #FFFCF6)',
        }}>
          <div style={{ maxWidth: 360, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>😬</div>
            <h2 style={{ fontFamily: 'var(--display, serif)', fontSize: 24, margin: '0 0 8px' }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: 15, color: 'var(--ink-soft, #5C4F77)', margin: '0 0 16px' }}>
              {this.state.error.message || 'Unknown error'}
            </p>
            <button
              onClick={this.reset}
              style={{
                background: 'var(--coral, #FF6F61)', color: '#fff', border: 'none',
                padding: '12px 22px', borderRadius: 999, fontFamily: 'inherit', fontWeight: 700,
                fontSize: 15, cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
