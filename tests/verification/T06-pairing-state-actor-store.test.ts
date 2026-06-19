import type { ESPDevice } from '@orbital-systems/react-native-esp-idf-provisioning';

import {
  clearPairingSession,
  getConnectedEspDevice,
  getPairingCandidate,
  setConnectedEspDevice,
  setPairingCandidate,
} from '@/features/device/pairing/pairingSession';
import { usePairingStore } from '@/features/device/pairing/pairingStore';

const mockDisconnect = jest.fn();

jest.mock('@orbital-systems/react-native-esp-idf-provisioning', () => ({
  ESPProvisionManager: jest.fn(),
}));

describe('T06: pairing mutable state lives in a Zustand store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePairingStore.setState({
      activeCandidate: null,
      connectedDevice: null,
    });
  });

  it('exports a Zustand store from pairingStore.ts', () => {
    expect(usePairingStore).toBeDefined();
    expect(typeof usePairingStore.getState).toBe('function');
    expect(typeof usePairingStore.setState).toBe('function');
  });

  it('stores activeCandidate in the store instead of a module-level let', () => {
    const candidate = {
      bleId: 'aa:bb:cc:dd',
      name: 'TJBot-A1B2',
      serial: 'TJBot-A1B2',
      displayCode: 'A1B2',
      espDeviceName: 'PROV_A1B2',
    };

    setPairingCandidate(candidate);

    expect(usePairingStore.getState().activeCandidate).toEqual(candidate);
    expect(getPairingCandidate()).toEqual(candidate);
  });

  it('stores connectedDevice in the store and disconnects on clearPairingSession', () => {
    const device = { disconnect: mockDisconnect } as unknown as ESPDevice;

    setConnectedEspDevice(device);

    expect(usePairingStore.getState().connectedDevice).toBe(device);
    expect(getConnectedEspDevice()).toBe(device);

    clearPairingSession();

    expect(mockDisconnect).toHaveBeenCalledTimes(1);
    expect(usePairingStore.getState().connectedDevice).toBeNull();
    expect(usePairingStore.getState().activeCandidate).toBeNull();
  });

  it('clears connectedDevice when candidate is set to null', () => {
    const candidate = {
      bleId: 'aa:bb:cc:dd',
      name: 'TJBot-A1B2',
      serial: 'TJBot-A1B2',
      displayCode: 'A1B2',
      espDeviceName: 'PROV_A1B2',
    };
    const device = { disconnect: mockDisconnect } as unknown as ESPDevice;

    setPairingCandidate(candidate);
    setConnectedEspDevice(device);
    expect(usePairingStore.getState().connectedDevice).toBe(device);

    setPairingCandidate(null);

    expect(usePairingStore.getState().activeCandidate).toBeNull();
    expect(usePairingStore.getState().connectedDevice).toBeNull();
  });

  it('resiliently ignores disconnect errors during clearPairingSession', () => {
    const device = {
      disconnect: jest.fn(() => {
        throw new Error('already disconnected');
      }),
    } as unknown as ESPDevice;

    setConnectedEspDevice(device);

    expect(() => clearPairingSession()).not.toThrow();
    expect(usePairingStore.getState().connectedDevice).toBeNull();
    expect(usePairingStore.getState().activeCandidate).toBeNull();
  });
});
