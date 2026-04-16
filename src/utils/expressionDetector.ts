/**
 * Detects expression cues from Gemini action tags in AI response text.
 * Presentation-only: reads tags, returns display hint. Does NOT modify text.
 */

const TAG_TO_EXPRESSION: Record<string, string> = {
  smile: 'happy',
  blink: 'blink',
  wave: 'celebrating',
  nod: 'happy',
  thinking: 'curious',
  listen: 'listening',
  turn_left: 'curious',
  turn_right: 'curious',
  laugh: 'laugh',
  shy: 'shy',
  celebrate: 'celebrating',
  sleepy: 'sleepy',
  curious: 'curious',
  sad: 'sad',
  surprised: 'interrupted',
};

/**
 * Extract the first action tag from text and return the corresponding expression key.
 * Returns null if no recognized tag is found.
 */
export function detectExpression(text: string): string | null {
  const match = text.match(/\[([a-z_]+)\]/i);
  if (!match) return null;
  return TAG_TO_EXPRESSION[match[1].toLowerCase()] ?? null;
}
