import { GeminiLiveClient } from '../src/ai/GeminiLiveClient';
import { useVoiceAssistantStore } from '../src/state/voiceAssistantStore';

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static OPEN = 1;

  readyState = MockWebSocket.OPEN;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(public readonly url: string) {
    MockWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close(code = 1000) {
    this.readyState = 3;
    this.onclose?.({ code });
  }
}

describe('GeminiLiveClient', () => {
  const originalWebSocket = global.WebSocket;
  const flushAsync = () => new Promise((resolve) => setTimeout(resolve, 0));

  beforeEach(() => {
    MockWebSocket.instances = [];
    // @ts-expect-error test double
    global.WebSocket = MockWebSocket;
  });

  afterEach(() => {
    global.WebSocket = originalWebSocket;
  });

  it('waits for setupComplete before reporting connected', async () => {
    const onConnected = jest.fn();
    const client = new GeminiLiveClient();

    client.connect({
      token: 'ephemeral-token',
      systemInstruction: 'hi',
      voiceName: 'Puck',
      onAudioChunk: jest.fn(),
      onInputTranscript: jest.fn(),
      onOutputTranscript: jest.fn(),
      onInterrupted: jest.fn(),
      onTurnComplete: jest.fn(),
      onError: jest.fn(),
      onConnected,
      onDisconnected: jest.fn(),
    });

    const ws = MockWebSocket.instances[0];
    ws.onopen?.();
    expect(onConnected).not.toHaveBeenCalled();
    expect(JSON.parse(ws.sent[0])).toMatchObject({
      setup: {
        model: 'models/gemini-2.0-flash-live-001',
      },
    });

    ws.onmessage?.({ data: JSON.stringify({ setupComplete: true }) });
    await flushAsync();
    expect(onConnected).toHaveBeenCalledTimes(1);
  });

  it('accepts setupComplete delivered as a Blob payload', async () => {
    const onConnected = jest.fn();
    const client = new GeminiLiveClient();

    client.connect({
      token: 'api-key-token',
      systemInstruction: 'hi',
      voiceName: 'Puck',
      onAudioChunk: jest.fn(),
      onInputTranscript: jest.fn(),
      onOutputTranscript: jest.fn(),
      onInterrupted: jest.fn(),
      onTurnComplete: jest.fn(),
      onError: jest.fn(),
      onConnected,
      onDisconnected: jest.fn(),
    });

    const ws = MockWebSocket.instances[0];
    ws.onopen?.();
    ws.onmessage?.({ data: new Blob([JSON.stringify({ setupComplete: {} })]) });
    await flushAsync();

    expect(onConnected).toHaveBeenCalledTimes(1);
  });

  it('sends audioStreamEnd when requested', () => {
    const client = new GeminiLiveClient();

    client.connect({
      token: 'ephemeral-token',
      systemInstruction: 'hi',
      onAudioChunk: jest.fn(),
      onInputTranscript: jest.fn(),
      onOutputTranscript: jest.fn(),
      onInterrupted: jest.fn(),
      onTurnComplete: jest.fn(),
      onError: jest.fn(),
      onConnected: jest.fn(),
      onDisconnected: jest.fn(),
    });

    const ws = MockWebSocket.instances[0];
    ws.onopen?.();
    client.sendAudioStreamEnd();

    expect(ws.sent).toContain(JSON.stringify({
      realtimeInput: {
        audioStreamEnd: true,
      },
    }));
  });
});

describe('voiceAssistantStore', () => {
  beforeEach(() => {
    useVoiceAssistantStore.getState().reset();
  });

  it('can stop a waiting session without clearing history', () => {
    const store = useVoiceAssistantStore.getState();

    store.addMessage('user', 'xin chao');
    store.transition('REQUESTING_MIC_PERMISSION');
    store.transition('CONNECTING');
    store.transition('LISTENING');
    store.transition('STREAMING_INPUT');
    store.transition('WAITING_AI');
    store.setUserTranscript('dang cho');
    store.stopSession();

    const next = useVoiceAssistantStore.getState();
    expect(next.state).toBe('IDLE');
    expect(next.userTranscript).toBe('');
    expect(next.messages).toHaveLength(1);
    expect(next.messages[0]?.text).toBe('xin chao');
  });
});
