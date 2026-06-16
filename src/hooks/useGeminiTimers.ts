/**
 * useGeminiTimers — FSM deadline timers and watchdogs for Gemini Live.
 *
 * The store owns the timer table (deadlines + timeout actions); this hook
 * arms/clears setTimeout effects keyed on FSM state and handles the extra
 * watchdogs that are not simple deadline timers (drain timeout, cancel-unack,
 * barge-in budget, VAD-during-interrupted strict ordering).
 */
import { useEffect, useMemo, useRef } from 'react';
import { VoiceMic } from '../native/VoiceMic';
import { useVoiceAssistantStore } from '../state/voiceAssistantStore';
import { Config } from '../config';
import type { UseVoiceTelemetryReturn } from './useVoiceTelemetry';

interface SessionApi {
  close: () => void;
  reconnect: () => void;
  suppressCloseForCurrentSession: () => void;
  sessionIdRef: React.MutableRefObject<number>;
}

export interface UseGeminiTimersReturn {
  cancelUnackMsRef: React.MutableRefObject<number | null>;
  responseTurnCompleteAtMsRef: React.MutableRefObject<number | null>;
  interruptedAtMsRef: React.MutableRefObject<number | null>;
  interruptDetectedMsRef: React.MutableRefObject<number | null>;
  interruptSourceRef: React.MutableRefObject<'tap' | 'server_interrupted'>;
  pendingUserTurnIdAfterClearRef: React.MutableRefObject<string | null>;
}

export function useGeminiTimers(
  telemetry: UseVoiceTelemetryReturn,
  sessionApi: SessionApi,
): UseGeminiTimersReturn {
  const store = useVoiceAssistantStore;
  const fsmState = useVoiceAssistantStore((s) => s.state);

  const cancelUnackMsRef = useRef<number | null>(null);
  const responseTurnCompleteAtMsRef = useRef<number | null>(null);
  const interruptedAtMsRef = useRef<number | null>(null);
  const interruptDetectedMsRef = useRef<number | null>(null);
  const interruptSourceRef = useRef<'tap' | 'server_interrupted'>('tap');
  const pendingUserTurnIdAfterClearRef = useRef<string | null>(null);

  // ── FSM deadline timers (plan v2 §3.2 + §6.3) ──────────────────────────────
  useEffect(() => {
    const config = store.getState().getFsmTimerConfig(fsmState);
    if (!config) return;

    const handle = setTimeout(() => {
      if (store.getState().state !== fsmState) return;
      telemetry.track('session', config.metricEvent, {
        state: fsmState,
        deadline_ms: config.deadlineMs,
      });
      store.getState().onFsmTimerExpired(fsmState);
      if (fsmState === 'INTERRUPTED') {
        pendingUserTurnIdAfterClearRef.current = null;
      }
    }, config.deadlineMs);

    return () => clearTimeout(handle);
  }, [fsmState, store, telemetry]);

  // ── ASSISTANT_SPEAKING drain timeout (P0-11) ───────────────────────────────
  useEffect(() => {
    if (fsmState !== 'ASSISTANT_SPEAKING') return;
    let handle: ReturnType<typeof setTimeout> | null = null;
    const checkDrainTimeout = () => {
      if (store.getState().state !== 'ASSISTANT_SPEAKING') return;
      const turnCompleteAtMs = responseTurnCompleteAtMsRef.current;
      if (turnCompleteAtMs === null) {
        handle = setTimeout(checkDrainTimeout, 500);
        return;
      }
      const elapsedMs = Date.now() - turnCompleteAtMs;
      if (elapsedMs < 5000) {
        handle = setTimeout(checkDrainTimeout, 5000 - elapsedMs);
        return;
      }
      telemetry.track('session', 'voice.assistant.drain_timeout', { deadline_ms: 5000 });
      responseTurnCompleteAtMsRef.current = null;
    };
    handle = setTimeout(checkDrainTimeout, 5000);
    return () => {
      if (handle) clearTimeout(handle);
    };
  }, [fsmState, store, telemetry]);

  // ── Cancel-unack watchdog (P0-14 / plan v2 §7.7) ───────────────────────────
  useEffect(() => {
    if (fsmState !== 'ASSISTANT_SPEAKING') return;
    let watchdogHandle: ReturnType<typeof setTimeout> | null = null;
    const unsub = VoiceMic.onVadStart(() => {
      const vadStartMs = Date.now();
      cancelUnackMsRef.current = vadStartMs;
      watchdogHandle = setTimeout(() => {
        if (cancelUnackMsRef.current !== vadStartMs) return;
        const responseId = store.getState().currentResponseId ?? null;
        telemetry.track('barge_in', 'voice.barge_in.cancel_unacked', {
          responseId,
          deadline_ms: 600,
          mic_vad_start_at_ms: vadStartMs,
        });
        cancelUnackMsRef.current = null;
        if (!Config.VOICE_CANCEL_UNACK_RECOVERY) return;
        if (store.getState().state !== 'ASSISTANT_SPEAKING') return;
        telemetry.track('barge_in', 'voice.barge_in.cancel_unacked.recovery_close', {
          responseId,
          deadline_ms: 600,
        });
        sessionApi.suppressCloseForCurrentSession();
        sessionApi.close();
        store.getState().transition('RECONNECTING');
        queueMicrotask(() => sessionApi.reconnect());
      }, 600);
    });
    return () => {
      unsub();
      if (watchdogHandle) clearTimeout(watchdogHandle);
      cancelUnackMsRef.current = null;
    };
  }, [fsmState, store, telemetry, sessionApi]);

  // ── Barge-in generation budget watchdog (P0-20 / plan v2 §7.6) ─────────────
  const bargeInWindowOpen = useVoiceAssistantStore((s) => s.bargeInWindowOpen);
  useEffect(() => {
    if (!bargeInWindowOpen) return;
    const openedAtMs = Date.now();
    let resolved = false;
    const handle = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      if (!store.getState().bargeInWindowOpen) return;
      const idleMs = Date.now() - openedAtMs;
      telemetry.track('session', 'voice.barge_in.budget_exhausted', {
        idle_ms_at_close: idleMs,
        budget_ms: Config.VOICE_BARGE_IN_BUDGET_MS,
      });
      try {
        if (sessionApi.sessionIdRef.current) {
          sessionApi.suppressCloseForCurrentSession();
        }
        sessionApi.close();
      } catch (err) {
        telemetry.jsErrorBreadcrumb('gemini.barge_in.budget.close', err);
      }
      const s = store.getState();
      if (
        s.state === 'INTERRUPTED' ||
        s.state === 'ASSISTANT_SPEAKING' ||
        s.state === 'WAITING_AI' ||
        s.state === 'LISTENING'
      ) {
        s.transition('RECONNECTING');
        queueMicrotask(() => sessionApi.reconnect());
      }
    }, Config.VOICE_BARGE_IN_BUDGET_MS);

    const unsubVad = VoiceMic.onVadStart(() => {
      if (resolved) return;
      resolved = true;
      clearTimeout(handle);
      const idleMs = Date.now() - openedAtMs;
      telemetry.track('session', 'voice.barge_in.user_resumed', {
        idle_ms_when_resumed: idleMs,
        budget_ms: Config.VOICE_BARGE_IN_BUDGET_MS,
      });
    });

    return () => {
      resolved = true;
      clearTimeout(handle);
      unsubVad();
    };
  }, [bargeInWindowOpen, store, telemetry, sessionApi]);

  // ── VAD-during-INTERRUPTED strict-ordering stamp (P0-22 / §8.4) ────────────
  useEffect(() => {
    const unsub = VoiceMic.onVadStart(() => {
      const s = store.getState();
      if (s.state !== 'INTERRUPTED') return;
      if (pendingUserTurnIdAfterClearRef.current !== null) return;
      const turnId =
        typeof globalThis.crypto?.randomUUID === 'function'
          ? globalThis.crypto.randomUUID()
          : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      pendingUserTurnIdAfterClearRef.current = turnId;
      telemetry.track('barge_in', 'voice.bargein.ordering.vad_during_interrupted', {
        userTurnId: turnId,
      });
    });
    return () => unsub();
  }, [store, telemetry]);

  return useMemo(
    () => ({
      cancelUnackMsRef,
      responseTurnCompleteAtMsRef,
      interruptedAtMsRef,
      interruptDetectedMsRef,
      interruptSourceRef,
      pendingUserTurnIdAfterClearRef,
    }),
    [],
  );
}

