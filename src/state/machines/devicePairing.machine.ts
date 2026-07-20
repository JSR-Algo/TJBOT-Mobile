// DevicePairing XState v5 machine — plan §2.3 / §3.3 / §4.3 / §5
// Timeouts per plan §4.3 (PROVISIONING 30s, CLAIM_PENDING 60s) are client-side
// BLE/handshake timeouts, not server-session terminals.
// sys-18 wire integration deferred to firmware sprint.

import { setup, assign, type ActorRef } from 'xstate';
import type {
  DevicePairingContext,
  DevicePairingEvent,
  ProvisioningErrorCode,
} from './devicePairing.types';

export interface DevicePairingInput {
  userId: string;
}

// Backend service stubs — real implementations replace these in firmware sprint.
// API refs: POST /v1/devices/pairing-token, POST /v1/devices/claim, PATCH /v1/devices/{id}
// BLE refs: sys-18 GATT service/characteristic UUIDs owned by firmware
export const DevicePairingServices = {
  // POST /v1/devices/pairing-token
  async issuePairingToken(_args: { userId: string }): Promise<string> {
    // sys-18 wire integration deferred to firmware sprint
    return 'stub-pairing-token';
  },

  // POST /v1/devices/claim — idempotent on pairing_token
  async claimDevice(_args: { pairingToken: string }): Promise<{ deviceId: string }> {
    // sys-18 wire integration deferred to firmware sprint
    return { deviceId: 'stub-device-id' };
  },

  // PATCH /v1/devices/{id}
  async renameDevice(_args: { id: string; name: string }): Promise<void> {
    // sys-18 wire integration deferred to firmware sprint
  },

  // BLE scan — intentionally fake; sys-18 wire integration deferred to firmware sprint
  async bleScan(): Promise<{ serial: string; displayCode: string } | null> {
    // sys-18 wire integration deferred to firmware sprint
    return null;
  },

  // BLE GATT write wifi credentials — intentionally fake; sys-18 wire integration deferred to firmware sprint
  async bleProvision(_args: { ssid: string; password: string }): Promise<void> {
    // sys-18 wire integration deferred to firmware sprint
  },
};

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
  context: ({ input }) => ({
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
        TAP_ADD: 'AWAITING_ROtjtjbot',
      },
    },

    AWAITING_ROtjtjbot: {
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
        CANCEL: 'AWAITING_ROtjtjbot',
      },
    },

    SCAN_TIMEOUT: {
      on: {
        RETRY_SCAN: 'SCANNING',
        CANCEL: 'AWAITING_ROtjtjbot',
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
        CANCEL: 'AWAITING_ROtjtjbot',
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
        ROtjtjbot_ACKS_CREDS: {
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
          target: 'AWAITING_ROtjtjbot',
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
        NETWORK_RESTORED: 'AWAITING_ROtjtjbot',
        CANCEL: 'IDLE',
      },
    },
  },
});
