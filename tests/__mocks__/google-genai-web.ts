type ConnectConfig = {
  callbacks?: {
    onopen?: () => void;
  };
};

export const mockGeminiSession = {
  close: jest.fn(),
  sendRealtimeInput: jest.fn(),
};

export const mockGeminiConnect = jest.fn(async (config?: ConnectConfig) => {
  config?.callbacks?.onopen?.();
  return mockGeminiSession;
});

export const GoogleGenAI = jest.fn().mockImplementation(() => ({
  live: {
    connect: mockGeminiConnect,
  },
}));

export const Modality = {
  AUDIO: 'AUDIO',
  TEXT: 'TEXT',
};

export const ActivityHandling = {
  START_OF_ACTIVITY_INTERRUPTS: 'START_OF_ACTIVITY_INTERRUPTS',
};
