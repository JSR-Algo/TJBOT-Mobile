import type { View } from 'react-native';
import type { RefObject } from 'react';
import { getDiagnosticCaptureRef } from './diagnosticCaptureRef';

export type DiagnosticScreenshot = {
  base64: string;
  mime: string;
};

export async function captureDiagnosticScreenshot(
  ref?: RefObject<View | null> | null,
): Promise<DiagnosticScreenshot | null> {
  const target = ref ?? getDiagnosticCaptureRef();
  if (!target?.current) return null;

  try {
    const viewShot = await import('react-native-view-shot');
    const base64 = await viewShot.captureRef(target, {
      format: 'png',
      quality: 0.82,
      result: 'base64',
    });
    if (!base64 || typeof base64 !== 'string') return null;
    return { base64, mime: 'image/png' };
  } catch {
    return null;
  }
}