import React from 'react';
import { View } from 'react-native';

export const CameraView = jest.fn(({ children }: { children?: React.ReactNode }) =>
  React.createElement(View, { testID: 'CameraView' }, children),
);

export const useCameraPermissions = jest.fn(() => [
  { granted: false, canAskAgain: true, status: 'undetermined' },
  jest.fn().mockResolvedValue({ granted: false, canAskAgain: true, status: 'undetermined' }),
]);
