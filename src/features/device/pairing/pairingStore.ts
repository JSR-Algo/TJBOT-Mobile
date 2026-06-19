import { create } from 'zustand';
import type { ESPDevice } from '@orbital-systems/react-native-esp-idf-provisioning';
import type { PairingCandidate } from './pairingSession';

interface PairingState {
  activeCandidate: PairingCandidate | null;
  connectedDevice: ESPDevice | null;
}

export const usePairingStore = create<PairingState>(() => ({
  activeCandidate: null,
  connectedDevice: null,
}));
