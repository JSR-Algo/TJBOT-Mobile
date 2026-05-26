import { createActor } from 'xstate';
import { devicePairingMachine } from '../../../src/state/machines/devicePairing.machine';

function makeActor() {
  const actor = createActor(devicePairingMachine, { input: { userId: 'test-user' } });
  actor.start();
  return actor;
}

describe('DevicePairing machine', () => {
  describe('happy path', () => {
    it('IDLE → FIRST_LESSON_READY full flow', () => {
      const actor = makeActor();
      expect(actor.getSnapshot().value).toBe('IDLE');

      actor.send({ type: 'TAP_ADD' });
      expect(actor.getSnapshot().value).toBe('AWAITING_ROBOT');

      actor.send({ type: 'TAP_START_SCAN' });
      expect(actor.getSnapshot().value).toBe('SCANNING');

      actor.send({ type: 'BLE_ADVERT_MATCH', serial: 'TJBot-001', displayCode: '1234' });
      expect(actor.getSnapshot().value).toBe('DEVICE_FOUND');
      expect(actor.getSnapshot().context.deviceSerial).toBe('TJBot-001');
      expect(actor.getSnapshot().context.displayCode).toBe('1234');

      actor.send({ type: 'USER_MATCHES_CODE' });
      // CODE_CONFIRMED auto-transitions to AWAITING_WIFI
      expect(actor.getSnapshot().value).toBe('AWAITING_WIFI');

      actor.send({ type: 'SSID_PICKED', ssid: 'MyNetwork' });
      expect(actor.getSnapshot().value).toBe('AWAITING_WIFI_PW');
      expect(actor.getSnapshot().context.ssid).toBe('MyNetwork');

      actor.send({ type: 'PW_SUBMITTED', password: 'secret123' });
      expect(actor.getSnapshot().value).toBe('PROVISIONING');

      actor.send({ type: 'ROBOT_ACKS_CREDS' });
      expect(actor.getSnapshot().value).toBe('CLAIM_PENDING');
      // password wiped on PROVISIONING → CLAIM_PENDING
      expect(actor.getSnapshot().context.password).toBeNull();

      actor.send({ type: 'SERVER_CLAIM_OK', deviceId: 'device-abc' });
      expect(actor.getSnapshot().value).toBe('CLAIMED');
      expect(actor.getSnapshot().context.deviceId).toBe('device-abc');

      actor.send({ type: 'RENAME_SUBMITTED', name: 'Robo' });
      // NAMED auto-transitions to FIRST_LESSON_READY
      expect(actor.getSnapshot().value).toBe('FIRST_LESSON_READY');
      expect(actor.getSnapshot().context.deviceName).toBe('Robo');
      expect(actor.getSnapshot().status).toBe('done');
    });
  });

  describe('SCAN_TIMEOUT', () => {
    it('fires after 30s with no advert match', () => {
      jest.useFakeTimers();
      const actor = makeActor();
      actor.send({ type: 'TAP_ADD' });
      actor.send({ type: 'TAP_START_SCAN' });
      expect(actor.getSnapshot().value).toBe('SCANNING');

      jest.advanceTimersByTime(30_000);
      expect(actor.getSnapshot().value).toBe('SCAN_TIMEOUT');

      // retry goes back to SCANNING
      actor.send({ type: 'RETRY_SCAN' });
      expect(actor.getSnapshot().value).toBe('SCANNING');

      jest.useRealTimers();
    });
  });

  describe('CODE_MISMATCH', () => {
    it('CODE_DECLINE → CODE_MISMATCH → RETRY_SCAN → SCANNING', () => {
      const actor = makeActor();
      actor.send({ type: 'TAP_ADD' });
      actor.send({ type: 'TAP_START_SCAN' });
      actor.send({ type: 'BLE_ADVERT_MATCH', serial: 'TJBot-002', displayCode: '5678' });
      expect(actor.getSnapshot().value).toBe('DEVICE_FOUND');

      actor.send({ type: 'CODE_DECLINE' });
      expect(actor.getSnapshot().value).toBe('CODE_MISMATCH');

      actor.send({ type: 'RETRY_SCAN' });
      expect(actor.getSnapshot().value).toBe('SCANNING');
    });
  });

  describe('PROVISIONING timeout', () => {
    it('fires E-PROV-001 after 30s', () => {
      jest.useFakeTimers();
      const actor = makeActor();
      actor.send({ type: 'TAP_ADD' });
      actor.send({ type: 'TAP_START_SCAN' });
      actor.send({ type: 'BLE_ADVERT_MATCH', serial: 'TJBot-003', displayCode: '0000' });
      actor.send({ type: 'USER_MATCHES_CODE' });
      actor.send({ type: 'SSID_PICKED', ssid: 'Net' });
      actor.send({ type: 'PW_SUBMITTED', password: 'password1' });
      expect(actor.getSnapshot().value).toBe('PROVISIONING');

      jest.advanceTimersByTime(30_000);
      expect(actor.getSnapshot().value).toBe('PAIRING_FAILED');
      expect(actor.getSnapshot().context.errorCode).toBe('E-PROV-001');
      // password wiped
      expect(actor.getSnapshot().context.password).toBeNull();

      jest.useRealTimers();
    });
  });

  describe('CLAIM_PENDING server-reject', () => {
    it('SERVER_REJECT → PAIRING_FAILED with E-PROV-004', () => {
      const actor = makeActor();
      actor.send({ type: 'TAP_ADD' });
      actor.send({ type: 'TAP_START_SCAN' });
      actor.send({ type: 'BLE_ADVERT_MATCH', serial: 'TJBot-004', displayCode: '9999' });
      actor.send({ type: 'USER_MATCHES_CODE' });
      actor.send({ type: 'SSID_PICKED', ssid: 'Net' });
      actor.send({ type: 'PW_SUBMITTED', password: 'password1' });
      actor.send({ type: 'ROBOT_ACKS_CREDS' });
      expect(actor.getSnapshot().value).toBe('CLAIM_PENDING');

      actor.send({ type: 'SERVER_REJECT', errorCode: 'E-PROV-004' });
      expect(actor.getSnapshot().value).toBe('PAIRING_FAILED');
      expect(actor.getSnapshot().context.errorCode).toBe('E-PROV-004');
    });

    it('times out after 60s → PAIRING_FAILED with E-PROV-004', () => {
      jest.useFakeTimers();
      const actor = makeActor();
      actor.send({ type: 'TAP_ADD' });
      actor.send({ type: 'TAP_START_SCAN' });
      actor.send({ type: 'BLE_ADVERT_MATCH', serial: 'TJBot-005', displayCode: '1111' });
      actor.send({ type: 'USER_MATCHES_CODE' });
      actor.send({ type: 'SSID_PICKED', ssid: 'Net' });
      actor.send({ type: 'PW_SUBMITTED', password: 'password1' });
      actor.send({ type: 'ROBOT_ACKS_CREDS' });
      expect(actor.getSnapshot().value).toBe('CLAIM_PENDING');

      jest.advanceTimersByTime(60_000);
      expect(actor.getSnapshot().value).toBe('PAIRING_FAILED');
      expect(actor.getSnapshot().context.errorCode).toBe('E-PROV-004');

      jest.useRealTimers();
    });
  });

  describe('PAIRING_FAILED recovery', () => {
    function failedActor() {
      const actor = makeActor();
      actor.send({ type: 'TAP_ADD' });
      actor.send({ type: 'TAP_START_SCAN' });
      actor.send({ type: 'BLE_ADVERT_MATCH', serial: 'TJBot-006', displayCode: '2222' });
      actor.send({ type: 'USER_MATCHES_CODE' });
      actor.send({ type: 'SSID_PICKED', ssid: 'Net' });
      actor.send({ type: 'PW_SUBMITTED', password: 'password1' });
      actor.send({ type: 'WIFI_AUTH_FAIL' });
      expect(actor.getSnapshot().value).toBe('PAIRING_FAILED');
      expect(actor.getSnapshot().context.errorCode).toBe('E-PROV-002');
      return actor;
    }

    it('RETRY_SCAN → SCANNING, errorCode cleared', () => {
      const actor = failedActor();
      actor.send({ type: 'RETRY_SCAN' });
      expect(actor.getSnapshot().value).toBe('SCANNING');
      expect(actor.getSnapshot().context.errorCode).toBeNull();
    });

    it('RETRY_FULL → AWAITING_ROBOT, errorCode cleared', () => {
      const actor = failedActor();
      actor.send({ type: 'RETRY_FULL' });
      expect(actor.getSnapshot().value).toBe('AWAITING_ROBOT');
      expect(actor.getSnapshot().context.errorCode).toBeNull();
    });
  });

  describe('invalid transitions (plan §5 forbidden)', () => {
    it('IDLE → CLAIMED is not reachable — cannot skip scan', () => {
      const actor = makeActor();
      // No event from IDLE directly reaches CLAIMED
      actor.send({ type: 'SERVER_CLAIM_OK', deviceId: 'should-be-blocked' });
      expect(actor.getSnapshot().value).toBe('IDLE');
      expect(actor.getSnapshot().context.deviceId).toBeNull();
    });

    it('PROVISIONING → CLAIMED is not reachable — must pass through CLAIM_PENDING', () => {
      const actor = makeActor();
      actor.send({ type: 'TAP_ADD' });
      actor.send({ type: 'TAP_START_SCAN' });
      actor.send({ type: 'BLE_ADVERT_MATCH', serial: 'TJBot-007', displayCode: '3333' });
      actor.send({ type: 'USER_MATCHES_CODE' });
      actor.send({ type: 'SSID_PICKED', ssid: 'Net' });
      actor.send({ type: 'PW_SUBMITTED', password: 'password1' });
      expect(actor.getSnapshot().value).toBe('PROVISIONING');

      // Try to jump to CLAIMED — not a valid event from PROVISIONING
      actor.send({ type: 'SERVER_CLAIM_OK', deviceId: 'skip-attempt' });
      // Still PROVISIONING; no state change
      expect(actor.getSnapshot().value).toBe('PROVISIONING');
      expect(actor.getSnapshot().context.deviceId).toBeNull();
    });
  });

  describe('OFFLINE path', () => {
    it('AWAITING_ROBOT → OFFLINE → AWAITING_ROBOT on network restored', () => {
      const actor = makeActor();
      actor.send({ type: 'TAP_ADD' });
      actor.send({ type: 'NO_NETWORK' });
      expect(actor.getSnapshot().value).toBe('OFFLINE');

      actor.send({ type: 'NETWORK_RESTORED' });
      expect(actor.getSnapshot().value).toBe('AWAITING_ROBOT');
    });
  });
});
