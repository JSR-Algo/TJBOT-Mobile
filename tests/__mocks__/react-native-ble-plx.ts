let bleState = 'PoweredOn';
const managers: BleManager[] = [];

export const State = {
  Unknown: 'Unknown',
  Resetting: 'Resetting',
  Unsupported: 'Unsupported',
  Unauthorized: 'Unauthorized',
  PoweredOff: 'PoweredOff',
  PoweredOn: 'PoweredOn',
};

export class BleManager {
  state = jest.fn(() => Promise.resolve(bleState));
  startDeviceScan = jest.fn();
  stopDeviceScan = jest.fn();
  destroy = jest.fn();

  constructor() {
    managers.push(this);
  }
}

export function __setBleState(state: string): void {
  bleState = state;
  managers.forEach(manager => manager.state.mockResolvedValue(state));
}

export function __resetBleState(): void {
  bleState = 'PoweredOn';
  managers.forEach(manager => manager.state.mockResolvedValue(bleState));
}

export type Device = {
  id: string;
  name?: string | null;
  localName?: string | null;
  serviceUUIDs?: string[] | null;
};
