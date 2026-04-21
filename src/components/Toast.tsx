/**
 * Toast primitive — transient, auto-dismissing notifications.
 *
 * 2-mode error pattern (DELIBERATE — not inconsistency):
 *   - Use <ErrorMessage /> for field-scoped inline errors (form validation,
 *     field-level feedback that must persist until the user corrects it).
 *   - Use useToast().show() for transient/transport/async errors that have no
 *     fixed render-location (network failures, 5xx, session expiry, offline).
 *
 * Adoption: Interaction, GeminiConversation, Login, Signup, ForgotPassword.
 * Remaining 19 screens use ErrorMessage only.
 * Full adoption tracked in task-s5-mobile-full-toast-adoption.
 */
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type ToastSeverity = 'info' | 'warning' | 'error';

export interface ToastOptions {
  text: string;
  severity?: ToastSeverity;
  /** ms before auto-dismiss; default 3500 */
  duration?: number;
}

interface ToastItem extends Required<ToastOptions> {
  id: number;
}

interface ToastContextValue {
  show: (opts: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider />');
  return ctx;
}

const SEVERITY_COLORS: Record<ToastSeverity, { bg: string; text: string; border: string }> = {
  info:    { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  warning: { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' },
  error:   { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' },
};

export function ToastProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [queue, setQueue] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);

  const show = useCallback((opts: ToastOptions) => {
    const item: ToastItem = {
      id: ++counterRef.current,
      text: opts.text,
      severity: opts.severity ?? 'error',
      duration: opts.duration ?? 3500,
    };
    setQueue((q) => [...q, item]);
    setTimeout(() => {
      setQueue((q) => q.filter((t) => t.id !== item.id));
    }, item.duration);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <View style={styles.container} pointerEvents="box-none">
        {queue.map((item) => (
          <ToastBubble
            key={item.id}
            item={item}
            onDismiss={() => setQueue((q) => q.filter((t) => t.id !== item.id))}
          />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

function ToastBubble({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [opacity]);

  const c = SEVERITY_COLORS[item.severity];
  return (
    <Animated.View style={[styles.bubble, { opacity, backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[styles.text, { color: c.text }]} numberOfLines={3}>{item.text}</Text>
      <TouchableOpacity onPress={onDismiss} accessibilityLabel="Dismiss notification">
        <Text style={[styles.dismiss, { color: c.text }]}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    zIndex: 9999,
    gap: 8,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    gap: 12,
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  dismiss: {
    fontSize: 16,
    fontWeight: '600',
    padding: 4,
  },
});
