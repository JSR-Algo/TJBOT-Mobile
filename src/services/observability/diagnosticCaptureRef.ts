import type { View } from 'react-native';
import type { RefObject } from 'react';

let captureRef: RefObject<View | null> | null = null;

export function setDiagnosticCaptureRef(ref: RefObject<View | null> | null): void {
  captureRef = ref;
}

export function getDiagnosticCaptureRef(): RefObject<View | null> | null {
  return captureRef;
}

/** Test helper */
export function __resetDiagnosticCaptureRefForTests(): void {
  captureRef = null;
}