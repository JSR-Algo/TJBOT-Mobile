/**
 * Robot-voice connector — session-channel honesty for voice conversations.
 *
 * The phone channel (on-device Gemini Live, useGeminiConversation) is the only
 * real voice channel in this build. The robot-bridged channel stays blocked
 * with `unsupported_until_connector` until the robot voice bridge ships — it
 * must never pretend a robot session opened.
 *
 * Manual impact note (new module, 2026-07-18): no upstream callers before this
 * lane; planned consumers are the voice-session surfaces that today assume the
 * phone path implicitly.
 */
import { linkBlocked, ok, type ConnectorResult } from '@/services/connectors/types';

export type RobotVoiceChannel = 'phone' | 'robot';

export type RobotVoiceSession = { channel: RobotVoiceChannel };

export function openSession(options: {
  channel: RobotVoiceChannel;
}): ConnectorResult<RobotVoiceSession> {
  if (options.channel === 'robot') {
    return linkBlocked(
      'unsupported_until_connector',
      'Robot voice is not available in this build yet.',
    );
  }
  return ok({ channel: 'phone' });
}
