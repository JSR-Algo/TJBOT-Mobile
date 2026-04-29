import { useEffect, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Modal,
  FlatList,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useVoiceAssistantStore } from '../../state/voiceAssistantStore';
import { useGeminiConversation } from '../../hooks/useGeminiConversation';
import { useToast } from '../../components/Toast';
import { buildSukaPrompt, AgeGroup, PersonalityStyle } from '../../lib/suka-prompt';
import { SukaAvatar } from '../../components/gemini/SukaAvatar';
import { ControlBar } from '../../components/gemini/ControlBar';
import { TranscriptPanel } from '../../components/gemini/TranscriptPanel';

// u2500u2500 Config u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500

const AGE_OPTIONS: { id: AgeGroup; label: string; emoji: string }[] = [
  { id: '3-5', label: '3-5 tu\u1ed5i', emoji: '\ud83d\udc76' },
  { id: '6-8', label: '6-8 tu\u1ed5i', emoji: '\ud83e\uddd2' },
  { id: '9-12', label: '9-12 tu\u1ed5i', emoji: '\ud83d\udc66' },
];

const STYLE_OPTIONS: { id: PersonalityStyle; label: string; emoji: string }[] = [
  { id: 'vui-ve', label: 'Vui v\u1ebb', emoji: '\ud83d\ude04' },
  { id: 'diu-dang', label: 'D\u1ecbu d\u00e0ng', emoji: '\ud83e\udd70' },
  { id: 'nang-dong', label: 'N\u0103ng \u0111\u1ed9ng', emoji: '\⚡' },
  { id: 'dang-yeu', label: '\u0110\u00e1ng y\u00eau', emoji: '\ud83d\udc96' },
];

const GEMINI_VOICES = [
  { id: 'Puck', label: 'Puck', desc: 'Vui v\u1ebb, n\u0103ng \u0111\u1ed9ng' },
  { id: 'Kore', label: 'Kore', desc: 'D\u1ecbu d\u00e0ng, \u1ea5m \u00e1p' },
  { id: 'Aoede', label: 'Aoede', desc: 'Trong tr\u1ebb' },
  { id: 'Charon', label: 'Charon', desc: 'Tr\u1ea7m \u1ea5m' },
  { id: 'Fenrir', label: 'Fenrir', desc: 'M\u1ea1nh m\u1ebd' },
  { id: 'Leda', label: 'Leda', desc: 'Tr\u1ea7m t\u0129nh' },
];

const C = {
  bg: '#F8F5FF',
  headerBg: 'rgba(255,255,255,0.92)',
  primary: '#8B5CF6',
  text: '#374151',
  muted: '#9CA3AF',
  white: '#FFFFFF',
  onlineGreen: '#22C55E',
  onlineBg: '#DCFCE7',
  onlineText: '#16A34A',
  selectedBorder: '#A78BFA',
  selectedBg: '#F5F3FF',
  cardBg: '#FFFFFF',
  cardBorder: '#E5E7EB',
};

// u2500u2500 Screen u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500

export function GeminiConversationScreen() {
  // Settings state
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [selectedAge, setSelectedAge] = useState<AgeGroup>('3-5');
  const [selectedStyle, setSelectedStyle] = useState<PersonalityStyle>('dang-yeu');
  const [settingsVisible, setSettingsVisible] = useState(false);

  // Voice store
  const voiceState = useVoiceAssistantStore((s) => s.state);
  const audioLevel = useVoiceAssistantStore((s) => s.audioLevel);
  const error = useVoiceAssistantStore((s) => s.error);
  const isPoorNetwork = useVoiceAssistantStore((s) => s.isPoorNetwork);
  const audioMode = useVoiceAssistantStore((s) => s.audioMode);

  // Toast for transient/transport errors; field errors use ErrorMessage
  const { show: showToast } = useToast();

  useEffect(() => {
    if (error) {
      showToast({ severity: 'error', text: error });
      useVoiceAssistantStore.getState().setError(null);
    }
  }, [error, showToast]);

  // u2500u2500 Conversation hook u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500
  const { startConversation, stopConversation, interruptPlayback } = useGeminiConversation({
    voiceName: selectedVoice,
    systemInstruction: buildSukaPrompt(selectedAge, selectedStyle),
  });

  // u2500u2500 Derived u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500
  const isError =
    voiceState === 'ERROR_RECOVERABLE' || voiceState === 'ERROR_FATAL';
  const isConnected =
    voiceState !== 'IDLE' && voiceState !== 'ENDED' && !isError;
  const isConnecting =
    voiceState === 'CONNECTING' ||
    voiceState === 'PREPARING_AUDIO' ||
    voiceState === 'READY';
  const micDisabled = isConnecting || voiceState === 'RECONNECTING';

  // u2500u2500 Handlers u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500
  const handleMicPress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isConnected) {
      stopConversation();
    } else {
      await startConversation();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <SafeAreaView style={styles.safe}>

        {/* u2500u2500 Header (minimal) u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500 */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerDot} />
            <Text style={styles.headerTitle}>Suka</Text>
          </View>
          {isConnected && (
            <View style={styles.onlineBadge}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineLabel}>Online</Text>
            </View>
          )}
        </View>

        {/* Poor-network banner (iter 2 §2.5) — store-driven, non-FSM. */}
        {(audioMode === 'cautious' || audioMode === 'full_buffer' || isPoorNetwork) && (
          <View style={styles.poorNetworkBanner} accessibilityRole="alert">
            {audioMode === 'full_buffer' && <ActivityIndicator size="small" color={C.primary} />}
            <Text style={styles.poorNetworkText}>
              {audioMode === 'full_buffer'
                ? 'Tớ đang gom đủ tiếng rồi mới nói, chờ xíu nhé!'
                : 'Mạng hơi yếu — tớ đang cố nghe mượt cho cậu'}
            </Text>
          </View>
        )}

        {/* u2500u2500 Avatar zone (center, flex-weighted) u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500 */}
        {/* T3.1: Pressable wraps the avatar as a tap-to-interrupt surface. */}
        {/* `disabled` gates the gesture handler so non-PLAYING states pass */}
        {/* taps through to any underlying targets (none today). */}
        <Pressable
          style={styles.avatarZone}
          onPress={interruptPlayback}
          disabled={voiceState !== 'ASSISTANT_SPEAKING'}
          accessibilityRole="button"
          accessibilityState={{ disabled: voiceState !== 'ASSISTANT_SPEAKING' }}
          accessibilityLabel="Ngắt lời Suka"
          accessibilityHint="Chạm để dừng Suka đang nói"
        >
          <SukaAvatar voiceState={voiceState} audioLevel={audioLevel} />

          {/* Errors surface via Toast (transient transport errors) */}
        </Pressable>

        {/* u2500u2500 Transcript (compact, flex-weighted) u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500 */}
        <View style={styles.transcriptZone}>
          <TranscriptPanel />
        </View>

        {/* u2500u2500 Control bar (bottom) u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500 */}
        <ControlBar
          voiceState={voiceState}
          onMicPress={handleMicPress}
          onSettingsPress={() => setSettingsVisible(true)}
          micDisabled={micDisabled}
        />

        {/* u2500u2500 Settings modal u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500 */}
        <Modal
          visible={settingsVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setSettingsVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Cài đặt Suka</Text>

              {/* Age */}
              <Text style={styles.sectionLabel}>Độ tuổi</Text>
              <View style={styles.chipRow}>
                {AGE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.chip, selectedAge === opt.id && styles.chipSelected]}
                    onPress={() => setSelectedAge(opt.id)}
                  >
                    <Text style={styles.chipEmoji}>{opt.emoji}</Text>
                    <Text style={[styles.chipLabel, selectedAge === opt.id && styles.chipLabelSelected]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Style */}
              <Text style={styles.sectionLabel}>Phong cách</Text>
              <View style={styles.chipRow}>
                {STYLE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.chip, selectedStyle === opt.id && styles.chipSelected]}
                    onPress={() => setSelectedStyle(opt.id)}
                  >
                    <Text style={styles.chipEmoji}>{opt.emoji}</Text>
                    <Text style={[styles.chipLabel, selectedStyle === opt.id && styles.chipLabelSelected]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Voice */}
              <Text style={styles.sectionLabel}>Giọng nói</Text>
              <FlatList
                data={GEMINI_VOICES}
                keyExtractor={(v) => v.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.voiceList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.voiceChip, selectedVoice === item.id && styles.voiceChipSelected]}
                    onPress={() => setSelectedVoice(item.id)}
                  >
                    <Text style={[styles.voiceLabel, selectedVoice === item.id && styles.voiceLabelSelected]}>
                      {item.label}
                    </Text>
                    <Text style={styles.voiceDesc}>{item.desc}</Text>
                  </TouchableOpacity>
                )}
              />

              {/* Done button */}
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => setSettingsVisible(false)}
              >
                <Text style={styles.doneText}>Xong</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </View>
  );
}

// u2500u2500 Styles u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  safe: {
    flex: 1,
  },

  // u2500u2500 Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerDot: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: C.primary,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.primary,
    letterSpacing: -0.3,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.onlineBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.onlineGreen,
  },
  onlineLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.onlineText,
  },

  // iter 2 §2.5 — poor-network banner
  poorNetworkBanner: {
    marginHorizontal: 12,
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(251, 191, 36, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
    opacity: 0.92,
  },
  poorNetworkText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
    textAlign: 'center',
  },

  // u2500u2500 Avatar zone
  avatarZone: {
    flex: 3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  // u2500u2500 Transcript zone
  transcriptZone: {
    flex: 2,
    paddingBottom: 4,
  },

  // u2500u2500 Settings modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalSheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.muted,
    marginBottom: 8,
    marginTop: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: C.selectedBg,
    borderColor: C.selectedBorder,
  },
  chipEmoji: {
    fontSize: 16,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: C.text,
  },
  chipLabelSelected: {
    color: C.primary,
    fontWeight: '600',
  },
  voiceList: {
    gap: 8,
    paddingVertical: 4,
  },
  voiceChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
    minWidth: 90,
    alignItems: 'center',
  },
  voiceChipSelected: {
    backgroundColor: C.selectedBg,
    borderColor: C.selectedBorder,
  },
  voiceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
  },
  voiceLabelSelected: {
    color: C.primary,
  },
  voiceDesc: {
    fontSize: 11,
    color: C.muted,
    marginTop: 2,
  },
  doneButton: {
    marginTop: 24,
    backgroundColor: C.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneText: {
    fontSize: 16,
    fontWeight: '700',
    color: C.white,
  },
});
