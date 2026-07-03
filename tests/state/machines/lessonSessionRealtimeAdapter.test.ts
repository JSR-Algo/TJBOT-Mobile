import { lessonSessionEventFromRealtimeFrame } from '@/state/machines/lessonSessionRealtimeAdapter';

describe('lessonSessionEventFromRealtimeFrame', () => {
  it('maps backend uppercase TURN_COMPLETE into a mobile machine event', () => {
    expect(
      lessonSessionEventFromRealtimeFrame({
        type: 'TURN_COMPLETE',
        sessionId: 'session-1',
        turnId: 'turn-1',
        responseText: '',
      }),
    ).toEqual({
      type: 'TURN_COMPLETE',
      turnId: 'turn-1',
      responseText: '',
    });
  });

  it('preserves fallback metadata without requiring it', () => {
    expect(
      lessonSessionEventFromRealtimeFrame({
        type: 'TURN_COMPLETE',
        sessionId: 'session-1',
        turnId: 'turn-1',
        responseText: 'Try again.',
        fallback: true,
      }),
    ).toEqual({
      type: 'TURN_COMPLETE',
      turnId: 'turn-1',
      responseText: 'Try again.',
      fallback: true,
    });
  });

  it('rejects invalid or unrelated frames', () => {
    expect(lessonSessionEventFromRealtimeFrame(null)).toBeNull();
    expect(lessonSessionEventFromRealtimeFrame({ type: 'turn_complete', turnId: 'turn-1', responseText: '' })).toBeNull();
    expect(lessonSessionEventFromRealtimeFrame({ type: 'TURN_COMPLETE', sessionId: '', turnId: 'turn-1', responseText: '' })).toBeNull();
    expect(lessonSessionEventFromRealtimeFrame({ type: 'TURN_COMPLETE', sessionId: 'session-1', turnId: '', responseText: '' })).toBeNull();
    expect(lessonSessionEventFromRealtimeFrame({ type: 'TURN_COMPLETE', sessionId: 'session-1', turnId: 'turn-1' })).toBeNull();
  });
});
