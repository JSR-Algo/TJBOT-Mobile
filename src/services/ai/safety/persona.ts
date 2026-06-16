import type { SafetyContext } from './schemas';

const EXPRESSION_SET = [
  'happy', 'curious', 'thoughtful', 'excited', 'encouraging', 'gentle', 'surprised', 'proud',
  'focused', 'playful', 'calm', 'cheerful', 'friendly', 'warm',
] as const;

const MOTION_SET = [
  'nod', 'tilt', 'lean forward', 'wave', 'bounce', 'spin', 'wiggle', 'stretch',
  'clap', 'point', 'shake', 'look around',
] as const;

const AGE_BRACKET = '{AGE_BRACKET}';
const ALLOWED_TOPICS_FOR_AGE = '{ALLOWED_TOPICS_FOR_AGE}';
const LESSON_VOCAB = '{LESSON_VOCAB}';
const LESSON_OPENER = '{LESSON_OPENER}';
const EXPRESSION_SET_TOKEN = '{EXPRESSION_SET}';
const MOTION_SET_TOKEN = '{MOTION_SET}';

const BASE_PERSONA = `You are a friendly English tutor for children aged ${AGE_BRACKET}.
Topics you may discuss: ${ALLOWED_TOPICS_FOR_AGE}.
Today's vocabulary: ${LESSON_VOCAB}.
Start each session with: "${LESSON_OPENER}".
Use expressions from: ${EXPRESSION_SET_TOKEN}.
Use motions from: ${MOTION_SET_TOKEN}.
Never answer questions outside the allowed topics. Keep responses short, kind, and educational.`;

export function assemblePersona(ctx: SafetyContext): string {
  const allowedTopics = ctx.theme.allowedTopics.join(', ');
  const vocab = ctx.theme.vocab.join(', ');
  const openerIndex = ctx.sessionId.length
    ? ctx.sessionId.charCodeAt(ctx.sessionId.length - 1) % ctx.theme.openers.length
    : 0;
  const opener = ctx.theme.openers[openerIndex] ?? ctx.theme.openers[0] ?? 'Hello!';

  let persona = BASE_PERSONA;
  persona = persona.replace(AGE_BRACKET, ctx.childAgeBracket);
  persona = persona.replace(ALLOWED_TOPICS_FOR_AGE, allowedTopics);
  persona = persona.replace(LESSON_VOCAB, vocab);
  persona = persona.replace(LESSON_OPENER, opener);
  persona = persona.replace(EXPRESSION_SET_TOKEN, EXPRESSION_SET.join(', '));
  persona = persona.replace(MOTION_SET_TOKEN, MOTION_SET.join(', '));

  return persona;
}

export { AGE_BRACKET, ALLOWED_TOPICS_FOR_AGE, LESSON_VOCAB, LESSON_OPENER, EXPRESSION_SET, MOTION_SET };
