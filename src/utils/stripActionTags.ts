/**
 * Strip action tags like [blink], [smile], [thinking] etc. from AI response
 * text so they never appear in the transcript UI or get read aloud by TTS.
 */
const ACTION_TAG_RE = /\[(?:blink|wave|turn_left|turn_right|nod|smile|listen|thinking|laugh|shy|celebrate|sleepy|curious|sad|surprised)\]/gi;

export function stripActionTags(text: string): string {
  return text.replace(ACTION_TAG_RE, '').replace(/\s{2,}/g, ' ').trim();
}
