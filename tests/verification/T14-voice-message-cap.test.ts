/**
 * T14 verification: voiceAssistantStore.addMessage caps the in-memory
 * message history and evicts oldest messages deterministically.
 */

import {
  useVoiceAssistantStore,
  VOICE_MESSAGE_HISTORY_CAP,
} from '@/state/voiceAssistantStore';

beforeEach(() => {
  useVoiceAssistantStore.getState().reset();
});

describe('voiceAssistantStore message history cap (T14)', () => {
  it('exports a positive history cap constant', () => {
    expect(typeof VOICE_MESSAGE_HISTORY_CAP).toBe('number');
    expect(VOICE_MESSAGE_HISTORY_CAP).toBeGreaterThan(0);
  });

  it('does not allow the messages array to exceed the cap', () => {
    const { addMessage } = useVoiceAssistantStore.getState();

    for (let i = 0; i < VOICE_MESSAGE_HISTORY_CAP + 10; i += 1) {
      addMessage(i % 2 === 0 ? 'user' : 'ai', `message ${i}`);
    }

    const { messages } = useVoiceAssistantStore.getState();
    expect(messages.length).toBe(VOICE_MESSAGE_HISTORY_CAP);
  });

  it('evicts the oldest messages first while preserving relative order', () => {
    const { addMessage } = useVoiceAssistantStore.getState();
    const extra = 5;

    for (let i = 0; i < VOICE_MESSAGE_HISTORY_CAP + extra; i += 1) {
      addMessage('user', `turn ${i}`);
    }

    const { messages } = useVoiceAssistantStore.getState();
    expect(messages[0].text).toBe(`turn ${extra}`);
    expect(messages[messages.length - 1].text).toBe(
      `turn ${VOICE_MESSAGE_HISTORY_CAP + extra - 1}`,
    );

    for (let i = 1; i < messages.length; i += 1) {
      const prev = Number(messages[i - 1].text.replace('turn ', ''));
      const curr = Number(messages[i].text.replace('turn ', ''));
      expect(curr).toBe(prev + 1);
    }
  });

  it('still clears userTranscript when adding a user message at the cap boundary', () => {
    const store = useVoiceAssistantStore.getState();

    for (let i = 0; i < VOICE_MESSAGE_HISTORY_CAP; i += 1) {
      store.addMessage('ai', `ai ${i}`);
    }

    useVoiceAssistantStore.setState({ userTranscript: 'latest user input' });
    store.addMessage('user', 'latest user input');

    const { messages, userTranscript } = useVoiceAssistantStore.getState();
    expect(messages.length).toBe(VOICE_MESSAGE_HISTORY_CAP);
    expect(messages[messages.length - 1].text).toBe('latest user input');
    expect(userTranscript).toBe('');
  });

  it('still clears aiTranscript when adding an AI message at the cap boundary', () => {
    const store = useVoiceAssistantStore.getState();

    for (let i = 0; i < VOICE_MESSAGE_HISTORY_CAP; i += 1) {
      store.addMessage('user', `user ${i}`);
    }

    useVoiceAssistantStore.setState({ aiTranscript: 'latest ai response' });
    store.addMessage('ai', 'latest ai response');

    const { messages, aiTranscript } = useVoiceAssistantStore.getState();
    expect(messages.length).toBe(VOICE_MESSAGE_HISTORY_CAP);
    expect(messages[messages.length - 1].text).toBe('latest ai response');
    expect(aiTranscript).toBe('');
  });
});
