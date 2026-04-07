export const Audio = {
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
  Recording: {
    createAsync: jest.fn().mockResolvedValue({
      recording: {
        stopAndUnloadAsync: jest.fn().mockResolvedValue(undefined),
        getURI: jest.fn().mockReturnValue(null),
      },
    }),
  },
  RecordingOptionsPresets: { HIGH_QUALITY: {} },
  Sound: {
    createAsync: jest.fn().mockResolvedValue({
      sound: {
        playAsync: jest.fn().mockResolvedValue(undefined),
        unloadAsync: jest.fn().mockResolvedValue(undefined),
        setOnPlaybackStatusUpdate: jest.fn(),
      },
    }),
  },
};
