import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import type { VoiceState } from '../../state/voiceAssistantStore';

interface ControlBarProps {
  voiceState: VoiceState;
  onMicPress: () => void;
  onSettingsPress: () => void;
  micDisabled: boolean;
}

const STATUS_LABEL: Partial<Record<VoiceState, string>> = {
  IDLE: 'Bấm để bắt đầu',
  PREPARING_AUDIO: 'Xin quyền micro...',
  CONNECTING: 'Đang kết nối...',
  READY: 'Đang chuẩn bị...',
  LISTENING: 'Đang nghe...',
  USER_SPEAKING: 'Đang nghe...',
  USER_SPEECH_FINALIZING: 'Đang nghĩ...',
  WAITING_AI: 'Đang nghĩ...',
  ASSISTANT_SPEAKING: 'Suka đang nói...',
  RECONNECTING: 'Đang kết nối lại...',
  INTERRUPTED: 'Đã ngắt',
  ERROR_RECOVERABLE: 'Lỗi kết nối',
  ERROR_FATAL: 'Lỗi nghiêm trọng',
  ENDED: 'Đã kết thúc',
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
          <Text style={styles.gearText}>{"⚙"}</Text>
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
          {/* Mic icon as pure View shapes */}
          <View style={[styles.micHead, isActive && styles.micHeadActive]} />
          <View style={[styles.micStand, isActive && styles.micStandActive]} />
          <View style={[styles.micBase, isActive && styles.micBaseActive]} />
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
  gearText: {
    fontSize: 18,
    color: '#6B7280',
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
  // Mic icon built from 3 Views
  micHead: {
    width: 14,
    height: 20,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
  },
  micHeadActive: {
    backgroundColor: '#FEE2E2',
  },
  micStand: {
    width: 2,
    height: 6,
    backgroundColor: '#FFFFFF',
    marginTop: 1,
  },
  micStandActive: {
    backgroundColor: '#FEE2E2',
  },
  micBase: {
    width: 14,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
  },
  micBaseActive: {
    backgroundColor: '#FEE2E2',
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
