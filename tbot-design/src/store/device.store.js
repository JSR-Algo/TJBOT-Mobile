import { create } from 'zustand';

export const useDeviceStore = create((set) => ({
  deviceId: null,
  paired: false,
  status: 'unknown',
  firmwareVersion: null,
  pair: (id) => set({ deviceId: id, paired: true, status: 'online' }),
  unpair: () => set({ deviceId: null, paired: false, status: 'unknown' }),
  setStatus: (status) => set({ status }),
  setFirmware: (v) => set({ firmwareVersion: v }),
}));
