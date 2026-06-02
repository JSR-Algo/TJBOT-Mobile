// DevicePairing XState v5 machine — plan §2.3 / §3.3 / §4.3 / §5
// Timeouts per plan §4.3 (PROVISIONING 30s, CLAIM_PENDING 60s) are client-side
// BLE/handshake timeouts, not server-session terminals.
// sys-18 wire integration deferred to firmware sprint.

import { setup, assign } from 'xstate';
import type {
  DevicePairingContext,
  DevicePairingEvent,
  ProvisioningErrorCode,
} from './devicePairing.types';

export interface DevicePairingInput {
  userId: string;
}

// Default services are dev/test-only placeholders for the executable state
// machine tests. Runtime pairing screens use BLE scan plus
// POST /v1/devices/provision/start and /provision/connect.
export const DevicePairingServices = {
  // Deprecated placeholder; not a production API path.
  async issuePairingToken(_args: { userId: string }): Promise<string> {
    assertDevTestStubAllowed();
    return 'stub-pairing-token';
  },

  // Deprecated placeholder; not a production API path.
  async claimDevice(_args: { pairingToken: string }): Promise<{ deviceId: string }> {
    assertDevTestStubAllowed();
    return { deviceId: 'stub-device-id' };
  },

  // PATCH /v1/devices/{id}
  async renameDevice(_args: { id: string; name: string }): Promise<void> {
    assertDevTestStubAllowed();
  },

  // Test stub only; runtime screens call services/ble/service.
  async bleScan(): Promise<{ serial: string; displayCode: string } | null> {
    assertDevTestStubAllowed();
    return null;
  },

  // Test stub only; runtime screens submit Wi-Fi transiently through backend.
  async bleProvision(_args: { ssid: string; password: string }): Promise<void> {
    assertDevTestStubAllowed();
  },
};

function assertDevTestStubAllowed(): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) return;
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') return;
  throw new Error('DevicePairingServices stubs are dev/test only; use backend provisioning APIs in runtime.');
}

const PROVISIONING_TIMEOUT_MS = 30_000;
const CLAIM_PENDING_TIMEOUT_MS = 60_000;
const SCANNING_TIMEOUT_MS = 30_000;

export const devicePairingMachine = setup({
  types: {
    context: {} as DevicePairingContext,
    events: {} as DevicePairingEvent,
    input: {} as DevicePairingInput,
  },
  actions: {
    assignDeviceFound: assign({
      deviceSerial: (_, params: { serial: string; displayCode: string }) => params.serial,
      displayCode: (_, params: { serial: string; displayCode: string }) => params.displayCode,
    }),
    assignSsid: assign({
      ssid: (_, params: { ssid: string }) => params.ssid,
    }),
    assignPassword: assign({
      password: (_, params: { password: string }) => params.password,
    }),
    wipePassword: assign({ password: null }),
    assignPairingToken: assign({
      pairingToken: (_, params: { token: string }) => params.token,
    }),
    assignServerClaimOk: assign({
      deviceId: (_, params: { deviceId: string }) => params.deviceId,
    }),
    assignDeviceName: assign({
      deviceName: (_, params: { name: string }) => params.name,
    }),
    assignErrorCode: assign({
      errorCode: (_, params: { errorCode: ProvisioningErrorCode }) => params.errorCode,
    }),
    clearErrorCode: assign({ errorCode: null }),
    clearCredentials: assign({ ssid: null, password: null }),
  },
  guards: {
    blePermGranted: () => true, // replaced by real perm check at integration time
  },
}).createMachine({
  id: 'devicePairing',
  initial: 'IDLE',
  context: ({ input: _input }) => ({
    deviceSerial: null,
    deviceId: null,
    pairingToken: null,
    errorCode: null,
    ssid: null,
    password: null,
    displayCode: null,
    deviceName: null,
  }),
  states: {
    IDLE: {
      on: {
        TAP_ADD: 'AWAITING_ROBOT',
      },
    },

    AWAITING_ROBOT: {
      on: {
        TAP_START_SCAN: {
          target: 'SCANNING',
          guard: 'blePermGranted',
        },
        NO_NETWORK: 'OFFLINE',
        CANCEL: 'IDLE',
      },
    },

    SCANNING: {
      after: {
        [SCANNING_TIMEOUT_MS]: 'SCAN_TIMEOUT',
      },
      on: {
        BLE_ADVERT_MATCH: {
          target: 'DEVICE_FOUND',
          actions: {
            type: 'assignDeviceFound',
            params: ({ event }) => ({ serial: event.serial, displayCode: event.displayCode }),
          },
        },
        CANCEL: 'AWAITING_ROBOT',
      },
    },

    SCAN_TIMEOUT: {
      on: {
        RETRY_SCAN: 'SCANNING',
        CANCEL: 'AWAITING_ROBOT',
      },
    },

    DEVICE_FOUND: {
      on: {
        USER_MATCHES_CODE: 'CODE_CONFIRMED',
        CODE_DECLINE: 'CODE_MISMATCH',
      },
    },

    CODE_MISMATCH: {
      on: {
        RETRY_SCAN: 'SCANNING',
      },
    },

    CODE_CONFIRMED: {
      on: {
        // auto-advance to AWAITING_WIFI on entry (no user input needed)
        // Using always/entry approach: transition fires immediately
      },
      always: 'AWAITING_WIFI',
    },

    AWAITING_WIFI: {
      on: {
        SSID_PICKED: {
          target: 'AWAITING_WIFI_PW',
          actions: {
            type: 'assignSsid',
            params: ({ event }) => ({ ssid: event.ssid }),
          },
        },
        CANCEL: 'AWAITING_ROBOT',
      },
    },

    AWAITING_WIFI_PW: {
      on: {
        PW_SUBMITTED: {
          target: 'PROVISIONING',
          actions: {
            type: 'assignPassword',
            params: ({ event }) => ({ password: event.password }),
          },
        },
        BACK: 'AWAITING_WIFI',
      },
    },

    PROVISIONING: {
      // plan §4.3: PROVISIONING → PAIRING_FAILED after 30s (BLE/handshake timeout)
      after: {
        [PROVISIONING_TIMEOUT_MS]: {
          target: 'PAIRING_FAILED',
          actions: {
            type: 'assignErrorCode',
            params: { errorCode: 'E-PROV-001' as ProvisioningErrorCode },
          },
        },
      },
      on: {
        ROBOT_ACKS_CREDS: {
          target: 'CLAIM_PENDING',
          actions: 'wipePassword',
        },
        BLE_TIMEOUT: {
          target: 'PAIRING_FAILED',
          actions: [
            'wipePassword',
            {
              type: 'assignErrorCode',
              params: { errorCode: 'E-PROV-001' as ProvisioningErrorCode },
            },
          ],
        },
        WIFI_AUTH_FAIL: {
          target: 'PAIRING_FAILED',
          actions: [
            'wipePassword',
            {
              type: 'assignErrorCode',
              params: { errorCode: 'E-PROV-002' as ProvisioningErrorCode },
            },
          ],
        },
        PROV_ERROR: {
          target: 'PAIRING_FAILED',
          actions: [
            'wipePassword',
            {
              type: 'assignErrorCode',
              params: ({ event }) => ({ errorCode: event.errorCode }),
            },
          ],
        },
        PHONE_LOST_NETWORK: {
          target: 'OFFLINE',
          actions: 'wipePassword',
        },
      },
      exit: 'wipePassword',
    },

    CLAIM_PENDING: {
      // plan §4.3: CLAIM_PENDING → PAIRING_FAILED after 60s
      after: {
        [CLAIM_PENDING_TIMEOUT_MS]: {
          target: 'PAIRING_FAILED',
          actions: {
            type: 'assignErrorCode',
            params: { errorCode: 'E-PROV-004' as ProvisioningErrorCode },
          },
        },
      },
      on: {
        SERVER_CLAIM_OK: {
          target: 'CLAIMED',
          actions: {
            type: 'assignServerClaimOk',
            params: ({ event }) => ({ deviceId: event.deviceId }),
          },
        },
        SERVER_REJECT: {
          target: 'PAIRING_FAILED',
          actions: {
            type: 'assignErrorCode',
            params: ({ event }) => ({ errorCode: event.errorCode }),
          },
        },
      },
    },

    CLAIMED: {
      on: {
        RENAME_SUBMITTED: {
          target: 'NAMED',
          actions: {
            type: 'assignDeviceName',
            params: ({ event }) => ({ name: event.name }),
          },
        },
      },
    },

    NAMED: {
      // auto-advance to terminal
      always: 'FIRST_LESSON_READY',
    },

    FIRST_LESSON_READY: {
      // terminal — emits DEVICE_PAIRED → LessonSession.IDLE (plan §2.3)
      type: 'final',
    },

    PAIRING_FAILED: {
      on: {
        RETRY_FULL: {
          target: 'AWAITING_ROBOT',
          actions: 'clearErrorCode',
        },
        RETRY_SCAN: {
          target: 'SCANNING',
          actions: 'clearErrorCode',
        },
        GIVE_UP: {
          target: 'IDLE',
          actions: ['clearErrorCode', 'clearCredentials'],
        },
      },
    },

    OFFLINE: {
      on: {
        NETWORK_RESTORED: 'AWAITING_ROBOT',
        CANCEL: 'IDLE',
      },
    },
  },
});
