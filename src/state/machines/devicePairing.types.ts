// DevicePairing state machine types — plan §2.3 / §3.3 / §4.3

export type DevicePairingState =
  | 'IDLE'
  | 'AWAITING_ROBOT'
  | 'SCANNING'
  | 'SCAN_TIMEOUT'
  | 'DEVICE_FOUND'
  | 'CODE_MISMATCH'
  | 'CODE_CONFIRMED'
  | 'AWAITING_WIFI'
  | 'AWAITING_WIFI_PW'
  | 'PROVISIONING'
  | 'CLAIM_PENDING'
  | 'CLAIMED'
  | 'NAMED'
  | 'FIRST_LESSON_READY'
  | 'PAIRING_FAILED'
  | 'OFFLINE';

// E-PROV-001: BLE timeout during provisioning
// E-PROV-002: WiFi auth failure
// E-PROV-003: Other provisioning error
// E-PROV-004: Server reject — device already claimed by another account
// E-PROV-005: Server reject — other claim rejection
export type ProvisioningErrorCode =
  | 'E-PROV-001'
  | 'E-PROV-002'
  | 'E-PROV-003'
  | 'E-PROV-004'
  | 'E-PROV-005';

export interface DevicePairingContext {
  deviceSerial: string | null;
  deviceId: string | null;
  pairingToken: string | null;
  errorCode: ProvisioningErrorCode | null;
  ssid: string | null;
  // password is wiped on PROVISIONING exit (plan §4.3 security)
  password: string | null;
  displayCode: string | null;
  deviceName: string | null;
}

// Events
export type DevicePairingEvent =
  | { type: 'TAP_ADD' }
  | { type: 'TAP_START_SCAN' }
  | { type: 'NO_NETWORK' }
  | { type: 'NETWORK_RESTORED' }
  | { type: 'BLE_ADVERT_MATCH'; serial: string; displayCode: string }
  | { type: 'USER_MATCHES_CODE' }
  | { type: 'CODE_DECLINE' }
  | { type: 'SSID_PICKED'; ssid: string }
  | { type: 'PW_SUBMITTED'; password: string }
  | { type: 'BACK' }
  | { type: 'ROBOT_ACKS_CREDS' }
  | { type: 'BLE_TIMEOUT' }
  | { type: 'WIFI_AUTH_FAIL' }
  | { type: 'PROV_ERROR'; errorCode: ProvisioningErrorCode }
  | { type: 'PHONE_LOST_NETWORK' }
  | { type: 'SERVER_CLAIM_OK'; deviceId: string }
  | { type: 'SERVER_REJECT'; errorCode: ProvisioningErrorCode }
  | { type: 'RENAME_SUBMITTED'; name: string }
  | { type: 'RETRY_SCAN' }
  | { type: 'RETRY_WIFI_PASSWORD' }
  | { type: 'RETRY_FULL' }
  | { type: 'GIVE_UP' }
  | { type: 'CANCEL' };
