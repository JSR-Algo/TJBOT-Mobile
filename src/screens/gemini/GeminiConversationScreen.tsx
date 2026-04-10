import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StatusBar,
  Animated,
  Dimensions,
  Modal,
  FlatList,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useVoiceAssistantStore } from '../../state/voiceAssistantStore';
import { useGeminiConversation } from '../../hooks/useGeminiConversation';
import { buildSukaPrompt, AgeGroup, PersonalityStyle } from '../../lib/suka-prompt';
import { TranscriptPanel } from '../../components/gemini/TranscriptPanel';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Constants from web app ──────────────────────────────────────────

const AGE_OPTIONS: { id: AgeGroup; label: string; emoji: string; desc: string }[] = [
  { id: '3-5', label: '3-5 tuổi', emoji: '\uD83D\uDC76', desc: 'Bé mẫu giáo' },
  { id: '6-8', label: '6-8 tuổi', emoji: '\uD83E\uDDD2', desc: 'Lớp 1-3' },
  { id: '9-12', label: '9-12 tuổi', emoji: '\uD83D\uDC66', desc: 'Lớp 4-6' },
];

const STYLE_OPTIONS: { id: PersonalityStyle; label: string; emoji: string }[] = [
  { id: 'vui-ve', label: 'Vui vẻ', emoji: '\uD83D\uDE04' },
  { id: 'diu-dang', label: 'Dịu dàng', emoji: '\uD83E\uDD70' },
  { id: 'nang-dong', label: 'Năng động', emoji: '\u26A1' },
  { id: 'dang-yeu', label: 'Đáng yêu', emoji: '\uD83D\uDC96' },
];

const GEMINI_VOICES = [
  { id: 'Puck', label: 'Puck', desc: 'Vui vẻ, năng động' },
  { id: 'Kore', label: 'Kore', desc: 'Dịu dàng, ấm áp' },
  { id: 'Aoede', label: 'Aoede', desc: 'Trong trẻo' },
  { id: 'Charon', label: 'Charon', desc: 'Trầm ấm' },
  { id: 'Fenrir', label: 'Fenrir', desc: 'Mạnh mẽ' },
  { id: 'Leda', label: 'Leda', desc: 'Trầm tĩnh' },
];

// ── Colors ──────────────────────────────────────────────────────────

const COLORS = {
  background: '#FAF5FF',
  headerBg: 'rgba(255,255,255,0.85)',
  primary: '#8B5CF6',
  secondary: '#EC4899',
  userBubble: '#3B82F6',
  aiBubbleBg: '#FAF0FF',
  aiBubbleBorder: '#E9D5FF',
  text: '#374151',
  muted: '#9CA3AF',
  selectedAgeBorder: '#A78BFA',
  selectedAgeBg: '#F5F3FF',
  selectedStyleBorder: '#F472B6',
  selectedStyleBg: '#FDF2F8',
  white: '#FFFFFF',
  cardBorder: '#E5E7EB',
  cardBg: '#FFFFFF',
  micActive: '#EF4444',
  onlineGreen: '#22C55E',
  onlineBg: '#DCFCE7',
  onlineText: '#16A34A',
  purpleLight: '#E9D5FF',
};

export function GeminiConversationScreen() {
  // ── State ────────────────────────────────────────────────────────
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [selectedAge, setSelectedAge] = useState<AgeGroup>('3-5');
  const [selectedStyle, setSelectedStyle] = useState<PersonalityStyle>('dang-yeu');
  const [inputText, setInputText] = useState('');
  const [voicePickerVisible, setVoicePickerVisible] = useState(false);

  // ── Store ────────────────────────────────────────────────────────
  const voiceState = useVoiceAssistantStore((s) => s.state);
  const audioLevel = useVoiceAssistantStore((s) => s.audioLevel);
  const error = useVoiceAssistantStore((s) => s.error);

  // ── Hook ─────────────────────────────────────────────────────────
  const { startConversation, stopConversation } = useGeminiConversation({
    voiceName: selectedVoice,
    systemInstruction: buildSukaPrompt(selectedAge, selectedStyle),
  });

  // ── Derived state ───────────────────────────────────────────────
  const isConnected = voiceState !== 'IDLE' && voiceState !== 'ERROR';
  const isConnecting = voiceState === 'CONNECTING' || voiceState === 'REQUESTING_MIC_PERMISSION';
  const isListening = voiceState === 'LISTENING' || voiceState === 'STREAMING_INPUT';
  const isAISpeaking = voiceState === 'PLAYING_AI_AUDIO';
  const micDisabled = isConnecting || voiceState === 'RECONNECTING';

  // ── Animation ───────────────────────────────────────────────────
  const volumeAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isConnected) {
      const scale = 1 + Math.min(audioLevel * 3, 0.4);
      Animated.spring(volumeAnim, {
        toValue: scale,
        useNativeDriver: true,
        friction: 5,
        tension: 100,
      }).start();
    } else {
      volumeAnim.setValue(1);
    }
  }, [audioLevel, isConnected, volumeAnim]);

  useEffect(() => {
    if (isConnecting) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isConnecting, pulseAnim]);

  // ── Scroll ref ──────────────────────────────────────────────────
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [voiceState]);

  // ── Handlers ────────────────────────────────────────────────────
  const handleMicPress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isConnected) {
      stopConversation();
    } else {
      await startConversation();
    }
  };

  const handleSendText = () => {
    if (!inputText.trim()) return;
    // Text sending is handled by the store/hook in the future
    // For now we just clear
    setInputText('');
  };

  // ── Status text (Vietnamese) ────────────────────────────────────
  const getStatusTitle = (): string => {
    if (isConnecting) return 'Đang kết nối Suka...';
    if (isAISpeaking) return 'Suka đang nói...';
    if (isListening) return 'Suka đang nghe...';
    if (isConnected) return 'Suka sẵn sàng!';
    return 'Bắt đầu học cùng Suka!';
  };

  const getStatusSubtitle = (): string => {
    if (isConnected) return 'Hãy nói chuyện với Suka nhé!';
    return 'Bấm nút để bắt đầu';
  };

  // ── Render helpers ──────────────────────────────────────────────
  const selectedVoiceData = GEMINI_VOICES.find((v) => v.id === selectedVoice) || GEMINI_VOICES[1];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <SafeAreaView style={styles.safe}>
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Header ───────────────────────────────────────── */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Text style={styles.headerIconText}>\u2728</Text>
              </View>
              <View>
                <Text style={styles.headerTitle}>Suka</Text>
                <Text style={styles.headerSubtitle}>English buddy for kids</Text>
              </View>
            </View>

            <View style={styles.headerRight}>
              {/* Voice selector button */}
              <TouchableOpacity
                style={[styles.voiceSelector, isConnected && styles.voiceSelectorDisabled]}
                onPress={() => !isConnected && setVoicePickerVisible(true)}
                disabled={isConnected}
              >
                <Text style={styles.voiceSelectorText}>
                  {selectedVoiceData.label}
                </Text>
                <Text style={styles.voiceSelectorArrow}>\u25BE</Text>
              </TouchableOpacity>

              {/* Online badge */}
              {isConnected && (
                <View style={styles.onlineBadge}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.onlineText}>Online</Text>
                </View>
              )}
            </View>
          </View>

          {/* ── Setup Panel (hidden when connected) ──────────── */}
          {!isConnected && !isConnecting && (
            <View style={styles.setupPanel}>
              {/* Age Selection */}
              <View style={styles.setupSection}>
                <Text style={styles.setupSectionTitle}>\uD83D\uDCD6  Chọn độ tuổi</Text>
                <View style={styles.ageGrid}>
                  {AGE_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.id}
                      style={[
                        styles.ageCard,
                        selectedAge === opt.id && styles.ageCardSelected,
                      ]}
                      onPress={() => setSelectedAge(opt.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.ageEmoji}>{opt.emoji}</Text>
                      <Text style={[
                        styles.ageLabel,
                        selectedAge === opt.id && styles.ageLabelSelected,
                      ]}>{opt.label}</Text>
                      <Text style={styles.ageDesc}>{opt.desc}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Style Selection */}
              <View style={styles.setupSection}>
                <Text style={styles.setupSectionTitle}>\u2B50  Phong cách Suka</Text>
                <View style={styles.styleGrid}>
                  {STYLE_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.id}
                      style={[
                        styles.styleCard,
                        selectedStyle === opt.id && styles.styleCardSelected,
                      ]}
                      onPress={() => setSelectedStyle(opt.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.styleEmoji}>{opt.emoji}</Text>
                      <Text style={[
                        styles.styleLabel,
                        selectedStyle === opt.id && styles.styleLabelSelected,
                      ]}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* ── Visualizer Area ───────────────────────────────── */}
          <View style={styles.visualizerArea}>
            {/* Glow when AI speaking */}
            {isAISpeaking && <View style={styles.speakingGlow} />}

            <View style={styles.micContainer}>
              {/* Volume ring */}
              {isConnected && (
                <Animated.View
                  style={[
                    styles.volumeRing,
                    {
                      transform: [{ scale: volumeAnim }],
                      opacity: Math.min(audioLevel * 8, 0.7),
                    },
                  ]}
                />
              )}

              {/* Pulse ring when connecting */}
              {isConnecting && (
                <Animated.View
                  style={[
                    styles.pulseRing,
                    { transform: [{ scale: pulseAnim }] },
                  ]}
                />
              )}

              {/* Mic button */}
              <TouchableOpacity
                style={[
                  styles.micButton,
                  isConnecting && styles.micButtonConnecting,
                  isConnected && styles.micButtonActive,
                  isConnected && audioLevel < 0.05 && styles.micButtonStop,
                ]}
                onPress={handleMicPress}
                disabled={micDisabled}
                activeOpacity={0.8}
              >
                <Text style={styles.micIcon}>
                  {isConnecting
                    ? '\u23F3'
                    : isConnected
                      ? audioLevel > 0.05
                        ? '\uD83C\uDFA4'
                        : '\uD83C\uDFA4'
                      : '\uD83C\uDFA4'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Status text */}
            <View style={styles.statusContainer}>
              <Text style={styles.statusTitle}>{getStatusTitle()}</Text>
              <Text style={styles.statusSubtitle}>{getStatusSubtitle()}</Text>
            </View>
          </View>

          {/* ── Error Banner ──────────────────────────────────── */}
          {error && (
            <TouchableOpacity
              style={styles.errorBanner}
              onPress={() => useVoiceAssistantStore.getState().setError(null)}
            >
              <Text style={styles.errorText}>\u26A0 {error}</Text>
            </TouchableOpacity>
          )}

        </ScrollView>

        {/* ── Transcripts (outside ScrollView to avoid nesting) ── */}
        <TranscriptPanel />

        {/* ── Text Input (shown when connected) ──────────────── */}
        {isConnected && (
          <View style={styles.textInputContainer}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Nhập tin nhắn cho Suka..."
              placeholderTextColor={COLORS.muted}
              returnKeyType="send"
              onSubmitEditing={handleSendText}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                !inputText.trim() && styles.sendButtonDisabled,
              ]}
              onPress={handleSendText}
              disabled={!inputText.trim()}
            >
              <Text style={styles.sendButtonText}>\u27A4</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Voice Picker Modal ──────────────────────────────── */}
        <Modal
          visible={voicePickerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setVoicePickerVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setVoicePickerVisible(false)}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Chọn giọng nói</Text>
              <FlatList
                data={GEMINI_VOICES}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.voiceOption,
                      selectedVoice === item.id && styles.voiceOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedVoice(item.id);
                      setVoicePickerVisible(false);
                    }}
                  >
                    <Text style={[
                      styles.voiceOptionLabel,
                      selectedVoice === item.id && styles.voiceOptionLabelSelected,
                    ]}>{item.label}</Text>
                    <Text style={styles.voiceOptionDesc}>{item.desc}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safe: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // ── Header ──────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.headerBg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139,92,246,0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconText: {
    fontSize: 22,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '500',
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // ── Voice selector ──────────────────────────────────────────────
  voiceSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  voiceSelectorDisabled: {
    opacity: 0.5,
  },
  voiceSelectorText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  voiceSelectorArrow: {
    fontSize: 10,
    color: COLORS.muted,
  },

  // ── Online badge ────────────────────────────────────────────────
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.onlineBg,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.onlineGreen,
  },
  onlineText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.onlineText,
  },

  // ── Setup panel ─────────────────────────────────────────────────
  setupPanel: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 24,
  },
  setupSection: {
    gap: 10,
  },
  setupSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // ── Age cards ───────────────────────────────────────────────────
  ageGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  ageCard: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.cardBg,
  },
  ageCardSelected: {
    borderColor: COLORS.selectedAgeBorder,
    backgroundColor: COLORS.selectedAgeBg,
  },
  ageEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  ageLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  ageLabelSelected: {
    color: COLORS.primary,
  },
  ageDesc: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 2,
  },

  // ── Style cards ─────────────────────────────────────────────────
  styleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  styleCard: {
    width: (SCREEN_WIDTH - 70) / 4,
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.cardBg,
  },
  styleCardSelected: {
    borderColor: COLORS.selectedStyleBorder,
    backgroundColor: COLORS.selectedStyleBg,
  },
  styleEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  styleLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
  },
  styleLabelSelected: {
    color: COLORS.secondary,
  },

  // ── Visualizer area ─────────────────────────────────────────────
  visualizerArea: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 260,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(139,92,246,0.15)',
    backgroundColor: 'rgba(255,255,255,0.6)',
    overflow: 'hidden',
    paddingVertical: 30,
  },
  speakingGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(139,92,246,0.08)',
  },

  // ── Mic button ──────────────────────────────────────────────────
  micContainer: {
    width: 112,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  volumeRing: {
    position: 'absolute',
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  pulseRing: {
    position: 'absolute',
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 2,
    borderColor: COLORS.muted,
    opacity: 0.4,
  },
  micButton: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  micButtonConnecting: {
    backgroundColor: '#D1D5DB',
  },
  micButtonActive: {
    backgroundColor: COLORS.primary,
  },
  micButtonStop: {
    backgroundColor: '#FEF2F2',
    borderWidth: 2,
    borderColor: '#FECACA',
  },
  micIcon: {
    fontSize: 36,
  },

  // ── Status text ─────────────────────────────────────────────────
  statusContainer: {
    alignItems: 'center',
    gap: 4,
  },
  statusTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  statusSubtitle: {
    fontSize: 13,
    color: COLORS.muted,
  },

  // ── Error banner ────────────────────────────────────────────────
  errorBanner: {
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    textAlign: 'center',
  },

  // ── Text input ──────────────────────────────────────────────────
  textInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139,92,246,0.1)',
    backgroundColor: COLORS.white,
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.purpleLight,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    fontSize: 18,
    color: COLORS.white,
  },

  // ── Voice picker modal ──────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: SCREEN_WIDTH - 60,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    maxHeight: 400,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  voiceOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: '#F9FAFB',
  },
  voiceOptionSelected: {
    backgroundColor: COLORS.selectedAgeBg,
    borderWidth: 1,
    borderColor: COLORS.selectedAgeBorder,
  },
  voiceOptionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  voiceOptionLabelSelected: {
    color: COLORS.primary,
  },
  voiceOptionDesc: {
    fontSize: 12,
    color: COLORS.muted,
  },
});
