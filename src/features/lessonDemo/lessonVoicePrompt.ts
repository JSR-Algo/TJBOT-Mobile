import { buildSukaPrompt } from '@/lib/suka-prompt';
import type { LessonSession } from './types';

export function buildLessonVoicePrompt(lesson: LessonSession, stepIndex = 0): string {
  const persona = buildSukaPrompt('3-5', 'dang-yeu', 'bilingual');
  const stepsGuide = lesson.steps
    .map((step, index) => `${index + 1}. ${step.title}: ${step.prompt}`)
    .join('\n');
  const current = lesson.steps[stepIndex] ?? lesson.steps[0];

  return `${persona}

LESSON MODE — You are TeeBot on the physical robot screen teaching "${lesson.theme}".
Focus words: ${lesson.focusItems.join(', ')}.
Vietnamese learner note: ${lesson.vietnameseL1Target.replace(/_/g, ' ')}.

Guide the child through these steps in order:
${stepsGuide}

RIGHT NOW start with step ${stepIndex + 1}: "${current?.title}".
Say the prompt warmly in short child-friendly English (bilingual OK if the child uses Vietnamese).
Listen after each step and encourage clear final sounds on "barn".
Keep responses under 2 short sentences unless the child asks for help.`;
}