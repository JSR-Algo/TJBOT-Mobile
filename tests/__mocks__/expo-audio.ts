export const RecordingPresets = {
  HIGH_QUALITY: { android: {}, ios: {}, web: {} },
};

export const useAudioRecorder = jest.fn(() => ({
  isRecording: false,
  uri: null,
  prepareToRecordAsync: jest.fn().mockResolvedValue(undefined),
  record: jest.fn(),
  stop: jest.fn().mockResolvedValue(undefined),
}));

export const createAudioPlayer = jest.fn(() => ({
  play: jest.fn(),
  remove: jest.fn(),
  addListener: jest.fn(),
}));

export const setAudioModeAsync = jest.fn().mockResolvedValue(undefined);
export const requestRecordingPermissionsAsync = jest.fn().mockResolvedValue({ granted: false });
