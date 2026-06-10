// Zero-code claim — entry points that yield a (serialNumber, bleCode) pair to
// feed useZeroCodeClaimFlow. Each strategy obtains the verification code WITHOUT
// the parent typing it.
//
// All entry points are gated by FEATURE_ZERO_CODE_CLAIM at the call site; the
// functions themselves throw a typed disabled-error if invoked while the flag
// is off so a stray caller can't bypass the gate.

import { generateBleCode } from '@/services/api/claim.api';
import { serialFromCandidate } from './serialFromCandidate';
import type { BleDeviceCandidate } from '@/services/ble/types';
import { isZeroCodeClaimEnabled } from '@/config/feature-flags';

export interface ClaimInputs {
  serialNumber: string;
  bleCode: string;
  /** Which entry point produced these inputs (telemetry / debug). */
  source: ClaimEntrySource;
}

export type ClaimEntrySource = 'ble-advert' | 'device-issued-code' | 'qr' | 'wifi-ap';

export const ZERO_CODE_CLAIM_DISABLED_CODE = 'ZERO_CODE_CLAIM_DISABLED' as const;

export class ZeroCodeClaimDisabledError extends Error {
  readonly code = ZERO_CODE_CLAIM_DISABLED_CODE;
  constructor(entry: string) {
    super(`ZERO_CODE_CLAIM_DISABLED: ${entry} requires FEATURE_ZERO_CODE_CLAIM`);
    this.name = 'ZeroCodeClaimDisabledError';
  }
}

const SIX_CHAR_CODE = /^[A-Z0-9]{6}$/;

function assertEnabled(entry: string): void {
  if (!isZeroCodeClaimEnabled()) throw new ZeroCodeClaimDisabledError(entry);
}

/**
 * Primary entry: derive serial + code from a BLE advert that already carries a
 * 6-char verification code (the truly zero-interaction path).
 */
export function fromBleAdvert(candidate: BleDeviceCandidate, advertCode: string): ClaimInputs {
  assertEnabled('fromBleAdvert');
  const serialNumber = serialFromCandidate(candidate);
  const bleCode = advertCode.trim().toUpperCase();
  if (!serialNumber) throw new Error('CLAIM_SERIAL_NOT_FOUND');
  if (!SIX_CHAR_CODE.test(bleCode)) throw new Error('CLAIM_CODE_INVALID');
  return { serialNumber, bleCode, source: 'ble-advert' };
}

/**
 * Device-issued code entry: serial is known (BLE advert) but the advert did not
 * carry a code, so we ask the backend to mint one. Still zero-typing for the
 * parent.
 */
export async function fromDeviceIssuedCode(candidate: BleDeviceCandidate): Promise<ClaimInputs> {
  assertEnabled('fromDeviceIssuedCode');
  const serialNumber = serialFromCandidate(candidate);
  if (!serialNumber) throw new Error('CLAIM_SERIAL_NOT_FOUND');
  const { code } = await generateBleCode(serialNumber);
  const bleCode = code.trim().toUpperCase();
  if (!SIX_CHAR_CODE.test(bleCode)) throw new Error('CLAIM_CODE_INVALID');
  return { serialNumber, bleCode, source: 'device-issued-code' };
}

/**
 * QR / 6-digit entry: the robot's QR encodes "<SERIAL>:<CODE>" (or the parent
 * types the 6 chars as a manual fallback to scanning). Reuses the existing
 * QR-scan screen plumbing; here we only parse the payload.
 */
export function fromQrPayload(payload: string): ClaimInputs {
  assertEnabled('fromQrPayload');
  const trimmed = payload.trim();
  // Tolerant of both "SERIAL:CODE" and a bare 6-char code when serial is
  // resolved elsewhere. The screen passes the full payload.
  const sep = trimmed.indexOf(':');
  if (sep <= 0) throw new Error('CLAIM_QR_MALFORMED');
  const serialNumber = trimmed.slice(0, sep).trim();
  const bleCode = trimmed.slice(sep + 1).trim().toUpperCase();
  if (!serialNumber) throw new Error('CLAIM_SERIAL_NOT_FOUND');
  if (!SIX_CHAR_CODE.test(bleCode)) throw new Error('CLAIM_CODE_INVALID');
  return { serialNumber, bleCode, source: 'qr' };
}

/**
 * Wi-Fi / SoftAP fallback entry point.
 *
 * SoftAP fallback remains intentionally closed: the robot exposes a temporary
 * AP, but discovery did not confirm a backend/firmware AP-probe route for the
 * phone to read serial+code over local HTTP. Keep the entry-point surface
 * complete and flag-gated until that route is specified.
 */
export async function fromWifiAccessPoint(_apSsid: string): Promise<ClaimInputs> {
  assertEnabled('fromWifiAccessPoint');
  // Fail closed rather than guessing an unconfirmed AP-probe route/URL.
  throw new Error('CLAIM_WIFI_AP_NOT_IMPLEMENTED');
}
