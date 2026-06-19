import { useCallback, useEffect, useRef } from 'react';
import client from '../services/http/client';

export interface RobotLessonStatus {
  sessionId: string;
  deviceId: string;
  childId: string;
  lessonId: string;
  state: string;
  startedAt: string;
}

interface RobotLessonStatusPollOptions {
  onStatus: (status: RobotLessonStatus) => void;
  onError: (error: unknown) => void;
  intervalMs?: number;
}

export function useRobotLessonStatusPoll({
  onStatus,
  onError,
  intervalMs = 3000,
}: RobotLessonStatusPollOptions): {
  startPoll: (sessionId: string) => void;
  stopPoll: () => void;
} {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const onStatusRef = useRef(onStatus);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onStatusRef.current = onStatus;
  }, [onStatus]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const stopPoll = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    sessionIdRef.current = null;
  }, []);

  const refreshStatus = useCallback(async (sessionId: string) => {
    try {
      const statusRes = await client.get(`/robot-lessons/${sessionId}/status`);
      onStatusRef.current(statusRes.data as RobotLessonStatus);
    } catch (error) {
      onErrorRef.current(error);
      stopPoll();
    }
  }, [stopPoll]);

  const startPoll = useCallback((sessionId: string) => {
    stopPoll();
    sessionIdRef.current = sessionId;
    timerRef.current = setInterval(() => {
      const activeSessionId = sessionIdRef.current;
      if (activeSessionId) {
        void refreshStatus(activeSessionId);
      }
    }, intervalMs);
  }, [intervalMs, refreshStatus, stopPoll]);

  useEffect(() => stopPoll, [stopPoll]);

  return { startPoll, stopPoll };
}
