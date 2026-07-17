import {
  bootstrapNestPhoneLesson,
  clearActiveNestLesson,
  finishNestPhoneLesson,
  getActiveNestLesson,
  nestLessonTitle,
} from '@/features/lesson-session/nestPhoneLesson';
import * as learningApi from '@/services/api/learning';

jest.mock('@/services/api/learning', () => ({
  getTodaySession: jest.fn(),
  saveInteraction: jest.fn(),
  completeSession: jest.fn(),
}));

const mocked = learningApi as jest.Mocked<typeof learningApi>;

const sampleSession = {
  id: 'sess-1',
  session_date: '2026-07-17',
  session_payload: {
    warmup: { greeting: 'Hi', question: 'What do you see?' },
    core_learning: [
      { word: 'cat', sentence: 'I see a cat.' },
      { word: 'dog', sentence: 'I see a dog.' },
    ],
    interaction: { prompt: 'Say cat', expected_vocab: ['cat', 'dog'] },
    reinforcement: { type: 'repeat' as const, items: ['cat'] },
    reward: { message: 'Great job!', stars: 2 },
  },
  difficulty_level: 1,
  prompts_shown: 0,
  responses_given: 0,
  correct_responses: 0,
  completed_at: null,
};

describe('nestPhoneLesson', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearActiveNestLesson();
  });

  it('bootstraps today session into active Nest phone lesson context', async () => {
    mocked.getTodaySession.mockResolvedValueOnce(sampleSession);

    const context = await bootstrapNestPhoneLesson('child-1');

    expect(mocked.getTodaySession).toHaveBeenCalledWith('child-1');
    expect(context.sessionId).toBe('sess-1');
    expect(getActiveNestLesson()?.childId).toBe('child-1');
    expect(nestLessonTitle(context.session)).toBe('cat & dog');
  });

  it('finishes Nest phone lesson via interaction + complete', async () => {
    mocked.getTodaySession.mockResolvedValueOnce(sampleSession);
    mocked.saveInteraction.mockResolvedValueOnce(undefined);
    mocked.completeSession.mockResolvedValueOnce(undefined);

    const context = await bootstrapNestPhoneLesson('child-1');
    await finishNestPhoneLesson(context);

    expect(mocked.saveInteraction).toHaveBeenCalledWith(
      'child-1',
      expect.objectContaining({
        session_id: 'sess-1',
        user_message: 'cat',
        confidence_signal: 85,
      }),
    );
    expect(mocked.completeSession).toHaveBeenCalledWith('child-1', {
      session_id: 'sess-1',
      prompts_shown: 2,
      responses_given: 2,
      correct_responses: 2,
    });
  });

  it('rejects finish without an active Nest lesson', async () => {
    await expect(finishNestPhoneLesson(null as never)).rejects.toThrow(
      'No active Nest phone lesson to complete',
    );
  });
});
