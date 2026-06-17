// Zero-code claim connection flow — orchestration hook.
//
// Drives the screen-guided physical-confirm path:
//   discovered → (Connect) → claim request → waitingPhysicalConfirm → connected
//                                            ↘ failed (retryable per claimStatus)
//
// Reliability UX baked in here so screens stay declarative:
//   - Connect is disabled while a claim/poll is in flight (`canConnect`).
//   - Double-submit is impossible: claim() no-ops unless phase allows it and a
//     ref-guard prevents concurrent calls even within the same tick.
//   - Failures carry a typed recovery descriptor (retryable + recovery action).
//
// Entry points (claim/QR/6-digit/Wi-Fi-AP) live behind FEATURE_ZERO_CODE_CLAIM.
// QR and Wi-Fi-AP fallbacks fail closed where backend routes are not confirmed.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getClaimStatus,
  requestClaim,
  type ClaimRequestResult,
  type ClaimStatusResult,
} from '@/services/api/claim.api';
import { mintBootstrapToken } from '@/services/api/device.api';
import { sendClaimBootstrapTokenViaBle } from '@/services/ble/service';
import type { BleDeviceCandidate } from '@/services/ble/types';
import { describeClaimFailure, type ClaimStatusDescriptor } from './claimStatus';
import { isZeroCodeClaimEnabled } from '@/config/feature-flags';

export type ZeroCodeClaimPhase =
  | 'idle'
  | 'claiming'
  | 'waitingPhysicalConfirm'
  | 'connected'
  | 'failed';

export interface ZeroCodeClaimState {
  phase: ZeroCodeClaimPhase;
  /** Whether the Connect button should be enabled. */
  canConnect: boolean;
  /** Populated only in the `failed` phase. */
  error: ClaimStatusDescriptor | null;
  /** Populated once the robot physically confirms the claim. */
  result: { deviceId: string } | null;
}

export interface ZeroCodeClaimActions {
  /** Begin claiming the discovered robot. No-ops if already in flight. */
  connect: () => void;
  /** Retry after a failure (re-runs the claim with the same inputs). */
  retry: () => void;
  /** Abort and reset to idle. */
  cancel: () => void;
}

export interface UseZeroCodeClaimFlowParams {
  deviceId: string;
  /** Nearby BLE identity used to deliver the claim-bound token to the robot. */
  bleDevice?: BleDeviceCandidate;
  /** Poll interval while waiting for physical confirmation. */
  pollIntervalMs?: number;
  /** Max attempts before declaring a confirm timeout. */
  maxPollAttempts?: number;
  /** Injectable for tests; defaults to the real device-status route. */
  pollClaimStatus?: (claimId: string) => Promise<ClaimStatusResult>;
  /** Fired once the robot is confirmed online. */
  onConnected?: (result: { deviceId: string }) => void;
}

const DEFAULT_POLL_INTERVAL_MS = 3000;
const DEFAULT_CONFIRM_TIMEOUT_MS = 5 * 60 * 1000;

async function defaultPollClaimStatus(claimId: string): Promise<ClaimStatusResult> {
  return getClaimStatus(claimId);
}

/**
 * Hook returning [state, actions]. Safe to call when the feature flag is off —
 * `connect`/`retry` become inert no-ops so callers don't need to branch, but
 * `state.canConnect` is forced false so the UI can't invoke the flow.
 */
export function useZeroCodeClaimFlow(
  params: UseZeroCodeClaimFlowParams,
): [ZeroCodeClaimState, ZeroCodeClaimActions] {
  const enabled = isZeroCodeClaimEnabled();
  const [phase, setPhase] = useState<ZeroCodeClaimPhase>('idle');
  const [error, setError] = useState<ClaimStatusDescriptor | null>(null);
  const [result, setResult] = useState<{ deviceId: string } | null>(null);

  // Guards concurrent claim() invocations within the same render tick (state
  // updates are async, so `phase` alone cannot prevent a double-submit).
  const inFlightRef = useRef(false);
  // Generation counter: each run captures the gen at start and bails if cancel()
  // or unmount bumps it. A boolean cancelled-flag is unsafe here because cancel
  // re-arms synchronously between awaits, so an in-flight loop could miss it.
  const generationRef = useRef(0);
  const mountedRef = useRef(true);

  const {
    deviceId,
    bleDevice,
    pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
    maxPollAttempts,
    pollClaimStatus = defaultPollClaimStatus,
    onConnected,
  } = params;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      generationRef.current += 1; // invalidate in-flight runs on unmount
    };
  }, []);

  const isStale = useCallback(
    (gen: number) => !mountedRef.current || gen !== generationRef.current,
    [],
  );

  const waitForPhysicalConfirm = useCallback(
    async (claim: ClaimRequestResult, gen: number) => {
      setPhase('waitingPhysicalConfirm');
      const explicitPollLimit = maxPollAttempts === undefined ? undefined : Math.max(1, maxPollAttempts);
      let deadlineMs = resolveDeadlineMs(claim.expiresAt);
      for (let attempt = 0; ; attempt += 1) {
        if (explicitPollLimit !== undefined && attempt >= explicitPollLimit) break;
        if (isStale(gen)) return;
        const status = await pollClaimStatus(claim.claimId);
        if (isStale(gen)) return;
        if (status?.expiresAt && maxPollAttempts === undefined) {
          deadlineMs = readFutureDeadlineMs(status.expiresAt) ?? deadlineMs;
        }
        // `online` is only robot heartbeat/connectivity metadata. An unclaimed
        // robot can be online while still waiting for backend claim confirmation.
        if (status?.status === 'CLAIM_CONFIRMED' || status?.status === 'CLAIMED') {
          const confirmed = { deviceId: status.deviceId || claim.deviceId };
          setResult(confirmed);
          setPhase('connected');
          onConnected?.(confirmed);
          return;
        }
        if (status?.status === 'CLAIM_CONFIRM_TIMEOUT') {
          setError(describeClaimFailure({ code: 'CLAIM_CONFIRM_TIMEOUT', message: 'Robot did not confirm in time.', status: 410 }));
          setPhase('failed');
          return;
        }
        if (status?.status === 'FAILED') {
          setError(describeClaimFailure({ code: status.failureCode ?? 'CLAIM_UNKNOWN', message: 'Robot claim failed.' }));
          setPhase('failed');
          return;
        }
        if (explicitPollLimit !== undefined && attempt === explicitPollLimit - 1) break;
        if (explicitPollLimit === undefined && Date.now() >= deadlineMs) break;
        await sleep(pollIntervalMs);
      }
      if (isStale(gen)) return;
      setError({
        code: 'CLAIM_CONFIRM_TIMEOUT',
        title: 'Waiting on your Robot',
        body: 'Your Robot has not confirmed yet. Make sure it is powered on and try again.',
        retryable: true,
        recovery: 'connect',
      });
      setPhase('failed');
    },
    [isStale, maxPollAttempts, onConnected, pollClaimStatus, pollIntervalMs],
  );

  const runClaim = useCallback(async () => {
    if (!enabled) return;
    if (inFlightRef.current) return; // hard double-submit guard
    inFlightRef.current = true;
    const gen = generationRef.current;
    setError(null);
    setResult(null);
    setPhase('claiming');
    try {
      if (!bleDevice) {
        throw { code: 'NO_DEVICE_AVAILABLE', message: 'Nearby BLE identity is required for zero-code claim.' };
      }
      const claimed = await requestClaim({ deviceId });
      if (isStale(gen)) return;
      if (!claimed.claimId) {
        throw Object.assign(new Error('Claim request did not return a claim id'), { code: 'CLAIM_REQUEST_MALFORMED' });
      }
      if (claimed.status === 'CLAIM_CONFIRMED' || claimed.status === 'CLAIMED') {
        const confirmed = { deviceId: claimed.deviceId || deviceId };
        setResult(confirmed);
        setPhase('connected');
        onConnected?.(confirmed);
        return;
      }
      const bootstrap = await mintBootstrapToken({ provisioningAttemptId: claimed.claimId });
      if (isStale(gen)) return;
      await sendClaimBootstrapTokenViaBle({
        device: bleDevice,
        token: bootstrap.token,
        // Push the backend device_id the attempt was created under so the robot
        // claims/confirms under the same id (not its random Board UUID).
        deviceId: claimed.deviceId || deviceId,
      });
      if (isStale(gen)) return;
      await waitForPhysicalConfirm(claimed, gen);
    } catch (err) {
      if (isStale(gen)) return;
      setError(describeClaimFailure(err));
      setPhase('failed');
    } finally {
      inFlightRef.current = false;
    }
  }, [bleDevice, enabled, deviceId, isStale, waitForPhysicalConfirm]);

  const connect = useCallback(() => {
    if (phase === 'claiming' || phase === 'waitingPhysicalConfirm' || phase === 'connected') return;
    void runClaim();
  }, [phase, runClaim]);

  const retry = useCallback(() => {
    if (phase !== 'failed') return;
    void runClaim();
  }, [phase, runClaim]);

  const cancel = useCallback(() => {
    // Bump the generation so in-flight claim/poll work bails on its next check.
    generationRef.current += 1;
    inFlightRef.current = false;
    setPhase('idle');
    setError(null);
    setResult(null);
  }, []);

  const canConnect = enabled && (phase === 'idle' || phase === 'failed');

  return [{ phase, canConnect, error, result }, { connect, retry, cancel }];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const id = setTimeout(resolve, ms);
    (id as { unref?: () => void }).unref?.();
  });
}

function resolveDeadlineMs(expiresAt?: string | null): number {
  return readFutureDeadlineMs(expiresAt) ?? Date.now() + DEFAULT_CONFIRM_TIMEOUT_MS;
}

function readFutureDeadlineMs(expiresAt?: string | null): number | null {
  if (!expiresAt) return null;
  const deadlineMs = Date.parse(expiresAt);
  if (!Number.isFinite(deadlineMs)) return null;
  return deadlineMs > Date.now() ? deadlineMs : null;
}
