import {
  completeSession,
  getTodaySession,
  saveInteraction,
  type LearningSession,
} from '@/services/api/learning';

export type NestPhoneLessonContext = {
  childId: string;
  sessionId: string;
  session: LearningSession;
};

let activeNestLesson: NestPhoneLessonContext | null = null;

export function getActiveNestLesson(): NestPhoneLessonContext | null {
  return activeNestLesson;
}

export function clearActiveNestLesson(): void {
  activeNestLesson = null;
}

/**
 * Nest-only phone lesson bootstrap: load today's session and remember it so
 * LessonDone can complete against Nest without a robot bridge.
 */
export async function bootstrapNestPhoneLesson(childId: string): Promise<NestPhoneLessonContext> {
  const session = await getTodaySession(childId);
  const context: NestPhoneLessonContext = {
    childId,
    sessionId: session.id,
    session,
  };
  activeNestLesson = context;
  return context;
}

/**
 * Record a minimal phone interaction + complete the Nest session.
 * Safe to call once; subsequent calls re-complete with the same counts.
 */
export async function finishNestPhoneLesson(
  context: NestPhoneLessonContext = activeNestLesson as NestPhoneLessonContext,
): Promise<void> {
  if (!context?.childId || !context?.sessionId) {
    throw new Error('No active Nest phone lesson to complete');
  }

  const words = context.session.session_payload?.core_learning?.map((item) => item.word) ?? [];
  const firstWord = words[0] ?? 'hello';
  const expected = context.session.session_payload?.interaction?.expected_vocab ?? words;
  const promptCount = Math.max(1, words.length || expected.length || 1);

  await saveInteraction(context.childId, {
    session_id: context.sessionId,
    user_message: firstWord,
    ai_response: context.session.session_payload?.reward?.message
      ?? `Great job saying ${firstWord}!`,
    confidence_signal: 85,
  });

  await completeSession(context.childId, {
    session_id: context.sessionId,
    prompts_shown: promptCount,
    responses_given: promptCount,
    correct_responses: promptCount,
  });
}

export function nestLessonTitle(session: LearningSession | null | undefined): string {
  const words = session?.session_payload?.core_learning?.map((item) => item.word).filter(Boolean) ?? [];
  if (words.length === 0) return "Today's lesson";
  if (words.length === 1) return words[0]!;
  if (words.length === 2) return `${words[0]} & ${words[1]}`;
  return `${words[0]}, ${words[1]} & friends`;
}
