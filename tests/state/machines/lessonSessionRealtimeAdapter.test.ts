import { lessonSessionEventFromRealtimeFrame } from '@/state/machines/lessonSessionRealtimeAdapter';

const LIVE = { sessionId: 'session-1' };

describe('lessonSessionEventFromRealtimeFrame', () => {
  it('maps backend uppercase TURN_COMPLETE into a mobile machine event', () => {
    expect(
      lessonSessionEventFromRealtimeFrame(
        {
          type: 'TURN_COMPLETE',
          sessionId: 'session-1',
          turnId: 'turn-1',
          responseText: '',
        },
        LIVE,
      ),
    ).toEqual({
      type: 'TURN_COMPLETE',
      turnId: 'turn-1',
      responseText: '',
    });
  });

  it('preserves fallback metadata without requiring it', () => {
    expect(
      lessonSessionEventFromRealtimeFrame(
        {
          type: 'TURN_COMPLETE',
          sessionId: 'session-1',
          turnId: 'turn-1',
          responseText: 'Try again.',
          fallback: true,
        },
        LIVE,
      ),
    ).toEqual({
      type: 'TURN_COMPLETE',
      turnId: 'turn-1',
      responseText: 'Try again.',
      fallback: true,
    });
  });

  it('rejects invalid or unrelated frames', () => {
    expect(lessonSessionEventFromRealtimeFrame(null, LIVE)).toBeNull();
    expect(lessonSessionEventFromRealtimeFrame({ type: 'turn_complete', turnId: 'turn-1', responseText: '' }, LIVE)).toBeNull();
    expect(lessonSessionEventFromRealtimeFrame({ type: 'TURN_COMPLETE', sessionId: '', turnId: 'turn-1', responseText: '' }, LIVE)).toBeNull();
    expect(lessonSessionEventFromRealtimeFrame({ type: 'TURN_COMPLETE', sessionId: 'session-1', turnId: '', responseText: '' }, LIVE)).toBeNull();
    expect(lessonSessionEventFromRealtimeFrame({ type: 'TURN_COMPLETE', sessionId: 'session-1', turnId: 'turn-1' }, LIVE)).toBeNull();
  });

  // ── T3.2 session-epoch guard (MOB-T32-3) ──────────────────────────────────
  // The frame always carried a `sessionId`; the adapter validated it as a
  // string and then threw it away. A frame flushed by the WS after the child
  // left — or belonging to the first of two sessions started by a double
  // retry tap — was translated verbatim and drove the CURRENT machine.
  describe('session epoch', () => {
    const frame = (sessionId: string) => ({
      type: 'TURN_COMPLETE',
      sessionId,
      turnId: 'turn-9',
      responseText: 'late reply',
    });

    it('drops a frame belonging to a previous session', () => {
      expect(lessonSessionEventFromRealtimeFrame(frame('session-0'), { sessionId: 'session-1' })).toBeNull();
    });

    it('drops a frame belonging to a session started after this one', () => {
      expect(lessonSessionEventFromRealtimeFrame(frame('session-2'), { sessionId: 'session-1' })).toBeNull();
    });

    it('drops every frame once no session is live (post-exit resurrection guard)', () => {
      expect(lessonSessionEventFromRealtimeFrame(frame('session-1'), { sessionId: null })).toBeNull();
    });

    it('still accepts the frame that matches the live session', () => {
      expect(lessonSessionEventFromRealtimeFrame(frame('session-1'), { sessionId: 'session-1' })).toEqual({
        type: 'TURN_COMPLETE',
        turnId: 'turn-9',
        responseText: 'late reply',
      });
    });

    it('is exact, not prefix-tolerant', () => {
      expect(lessonSessionEventFromRealtimeFrame(frame('session-11'), { sessionId: 'session-1' })).toBeNull();
      expect(lessonSessionEventFromRealtimeFrame(frame('session-1 '), { sessionId: 'session-1' })).toBeNull();
    });
  });
});
