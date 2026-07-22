import { openSession } from '../../../src/services/connectors/robot-voice.connector';

describe('robot-voice connector', () => {
  it('opens the real phone (Gemini Live) channel', () => {
    expect(openSession({ channel: 'phone' })).toEqual({
      state: 'ok',
      value: { channel: 'phone' },
    });
  });

  it('blocks the robot channel until its connector ships', () => {
    const result = openSession({ channel: 'robot' });

    expect(result.state).toBe('unsupported_until_connector');
    expect(result).not.toHaveProperty('value');
  });
});
