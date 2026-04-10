import React, { useRef, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useVoiceAssistantStore } from '../../state/voiceAssistantStore';

const COLORS = {
  userBubble: '#3B82F6',
  aiBubbleBg: '#FAF0FF',
  aiBubbleBorder: '#E9D5FF',
  text: '#374151',
  userLabel: '#3B82F6',
  aiLabel: '#8B5CF6',
  white: '#FFFFFF',
  cursor: '#8B5CF6',
};

/** Typewriter hook: reveals text character by character */
function useTypewriter(text: string, speed = 30): string {
  const [displayed, setDisplayed] = useState('');
  const prevTextRef = useRef('');

  useEffect(() => {
    // If text grew (streaming), only type the new characters
    if (text.startsWith(prevTextRef.current)) {
      const alreadyShown = prevTextRef.current.length;
      const newChars = text.slice(alreadyShown);
      let i = 0;
      const timer = setInterval(() => {
        if (i < newChars.length) {
          setDisplayed(text.slice(0, alreadyShown + i + 1));
          i++;
        } else {
          clearInterval(timer);
        }
      }, speed);
      prevTextRef.current = text;
      return () => clearInterval(timer);
    } else {
      // Text changed completely (new message)
      setDisplayed(text);
      prevTextRef.current = text;
    }
  }, [text, speed]);

  // Reset when text clears
  useEffect(() => {
    if (!text) {
      setDisplayed('');
      prevTextRef.current = '';
    }
  }, [text]);

  return displayed;
}

export function TranscriptPanel() {
  const messages = useVoiceAssistantStore((s) => s.messages);
  const userTranscript = useVoiceAssistantStore((s) => s.userTranscript);
  const aiTranscript = useVoiceAssistantStore((s) => s.aiTranscript);
  const scrollRef = useRef<ScrollView>(null);

  // Typewriter effect for live AI transcript
  const typedAiText = useTypewriter(aiTranscript, 25);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages.length, userTranscript, typedAiText]);

  const hasContent = messages.length > 0 || !!userTranscript || !!typedAiText;
  if (!hasContent) return null;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.sectionTitle}>\uD83D\uDCD6  Cu\u1ED9c tr\u00F2 chuy\u1EC7n</Text>
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {messages.map((msg, i) => (
          <View
            key={i}
            style={[
              styles.bubbleRow,
              msg.role === 'user' ? styles.bubbleRowRight : styles.bubbleRowLeft,
            ]}
          >
            <View>
              <Text style={[
                styles.roleLabel,
                msg.role === 'user' ? styles.roleLabelUser : styles.roleLabelAi,
              ]}>
                {msg.role === 'user' ? 'B\u1EA1n' : 'Suka'}
              </Text>
              <View
                style={[
                  styles.bubble,
                  msg.role === 'user' ? styles.userBubble : styles.aiBubble,
                ]}
              >
                <Text style={[
                  styles.bubbleText,
                  msg.role === 'user' ? styles.userText : styles.aiText,
                ]}>
                  {msg.text}
                </Text>
              </View>
            </View>
          </View>
        ))}

        {/* Live user transcript */}
        {userTranscript ? (
          <View style={[styles.bubbleRow, styles.bubbleRowRight]}>
            <View>
              <Text style={[styles.roleLabel, styles.roleLabelUser]}>B\u1EA1n</Text>
              <View style={[styles.bubble, styles.userBubble, styles.liveBubble]}>
                <Text style={[styles.bubbleText, styles.userText, styles.liveText]}>
                  {userTranscript}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Live AI transcript with typewriter */}
        {typedAiText ? (
          <View style={[styles.bubbleRow, styles.bubbleRowLeft]}>
            <View>
              <Text style={[styles.roleLabel, styles.roleLabelAi]}>Suka</Text>
              <View style={[styles.bubble, styles.aiBubble, styles.liveBubble]}>
                <Text style={[styles.bubbleText, styles.aiText, styles.liveText]}>
                  {typedAiText}
                  <Text style={styles.cursor}>|</Text>
                </Text>
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(139,92,246,0.1)',
    padding: 16,
    flex: 1,
    maxHeight: 400,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A78BFA',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 8,
    gap: 10,
  },

  // Bubble rows
  bubbleRow: {
    marginBottom: 4,
  },
  bubbleRowRight: {
    alignItems: 'flex-end',
  },
  bubbleRowLeft: {
    alignItems: 'flex-start',
  },

  // Role labels
  roleLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 3,
    paddingHorizontal: 2,
    textTransform: 'uppercase',
  },
  roleLabelUser: {
    color: COLORS.userLabel,
    textAlign: 'right',
  },
  roleLabelAi: {
    color: COLORS.aiLabel,
    textAlign: 'left',
  },

  // Bubbles
  bubble: {
    maxWidth: 260,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: COLORS.userBubble,
    borderTopRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: COLORS.aiBubbleBg,
    borderWidth: 1,
    borderColor: COLORS.aiBubbleBorder,
    borderTopLeftRadius: 4,
  },
  liveBubble: {
    opacity: 0.9,
  },

  // Text
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: COLORS.white,
  },
  aiText: {
    color: COLORS.text,
  },
  liveText: {
    fontStyle: 'italic',
  },
  cursor: {
    color: COLORS.cursor,
    fontWeight: '300',
  },
});
