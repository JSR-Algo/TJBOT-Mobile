export class BleManager {
  startDeviceScan = jest.fn();
  stopDeviceScan = jest.fn();
  destroy = jest.fn();
}

export type Device = {
  id: string;
  name?: string | null;
  localName?: string | null;
  serviceUUIDs?: string[] | null;
};
