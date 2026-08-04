import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Icon } from '@/design-system/icons';
import { Text } from '@/design-system/primitives';
import type { VoiceState } from '../../state/voiceAssistantStore';

interface ControlBarProps {
  voiceState: VoiceState;
  onMicPress: () => void;
  onSettingsPress: () => void;
  micDisabled: boolean;
}

const STATUS_LABEL: Partial<Record<VoiceState, string>> = {
  IDLE: 'Tap to start',
  PREPARING_AUDIO: 'Requesting microphone access...',
  CONNECTING: 'Connecting...',
  READY: 'Getting ready...',
  LISTENING: 'Listening...',
  USER_SPEAKING: 'Listening...',
  USER_SPEECH_FINALIZING: 'Thinking...',
  WAITING_AI: 'Thinking...',
  ASSISTANT_SPEAKING: 'Suka is speaking...',
  RECONNECTING: 'Reconnecting...',
  INTERRUPTED: 'Disconnected',
  ERROR_RECOVERABLE: 'Connection error',
  ERROR_FATAL: 'Critical error',
  ENDED: 'Ended',
};

export function ControlBar({ voiceState, onMicPress, onSettingsPress, micDisabled }: ControlBarProps) {
  const isError =
    voiceState === 'ERROR_RECOVERABLE' || voiceState === 'ERROR_FATAL';
  const isConnected =
    voiceState !== 'IDLE' && voiceState !== 'ENDED' && !isError;
  const isActive = isConnected;
  const label = STATUS_LABEL[voiceState] ?? '';

  return (
    <View style={styles.bar}>
      {/* Settings button */}
      <TouchableOpacity
        style={styles.sideButton}
        onPress={onSettingsPress}
        activeOpacity={0.7}
        disabled={isConnected}
      >
        <View style={[styles.gearIcon, isConnected && styles.gearDisabled]}>
          <Icon name="Settings" size={18} color="#6B7280" accessibilityLabel="Settings" />
        </View>
      </TouchableOpacity>

      {/* Center: mic + label */}
      <View style={styles.center}>
        <TouchableOpacity
          style={[
            styles.micButton,
            isActive && styles.micButtonActive,
            isError && styles.micButtonError,
          ]}
          onPress={onMicPress}
          disabled={micDisabled}
          activeOpacity={0.8}
        >
          <Icon name="Mic" size={28} color="#FFFFFF" accessibilityLabel="Microphone" />
        </TouchableOpacity>
        <Text style={[styles.label, isError && styles.labelError]}>
          {label}
        </Text>
      </View>

      {/* Placeholder for symmetry */}
      <View style={styles.sideButton} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
    paddingBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(139,92,246,0.08)',
  },
  sideButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gearIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gearDisabled: {
    opacity: 0.4,
  },
  center: {
    alignItems: 'center',
    gap: 6,
  },
  micButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  micButtonActive: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  micButtonError: {
    backgroundColor: '#9CA3AF',
    shadowColor: '#9CA3AF',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
    letterSpacing: 0.3,
  },
  labelError: {
    color: '#EF4444',
  },
});
