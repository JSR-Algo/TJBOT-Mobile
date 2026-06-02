import { createMachine, createActor } from 'xstate';

describe('xstate sanity', () => {
  it('transitions a 2-state machine correctly', () => {
    const machine = createMachine({
      initial: 'idle',
      states: {
        idle: { on: { START: 'active' } },
        active: { type: 'final' },
      },
    });

    const actor = createActor(machine);
    actor.start();
    expect(actor.getSnapshot().value).toBe('idle');

    actor.send({ type: 'START' });
    expect(actor.getSnapshot().value).toBe('active');
  });
});
