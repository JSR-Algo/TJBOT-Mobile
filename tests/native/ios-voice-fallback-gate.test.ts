import fs from 'fs';
import path from 'path';

describe('iOS VoiceMic fallback echo gate', () => {
  const micSrc = fs.readFileSync(
    path.join(__dirname, '../../ios/TJBotMobile/VoiceMic/VoiceMicModule.swift'),
    'utf8',
  );
  const pcmSrc = fs.readFileSync(
    path.join(__dirname, '../../ios/TJBotMobile/PcmStream/PcmStreamModule.swift'),
    'utf8',
  );

  it('drops every mic frame while fallback gate is enabled and speaker playback is active', () => {
    expect(micSrc).toContain('VoicePlaybackActivity.isActive');
    expect(micSrc).toContain('shouldDropForFallbackGate = true');
    expect(micSrc).not.toContain('rms < self.fallbackThreshold');
  });

  it('auto-enables the fallback gate when iOS downgrades requested hardware AEC', () => {
    expect(micSrc).toContain('self.fallbackGateEnabled = (self.effectiveAecMode != "hw" && aecRequested == "hw")');
  });

  it('keeps playback activity wired from native PCM playback', () => {
    expect(pcmSrc).toContain('VoicePlaybackActivity.setActive(active)');
    expect(pcmSrc).toContain('notifyPlaybackActive(true)');
    expect(pcmSrc).toContain('notifyPlaybackActive(false)');
  });

  it('marks playback active for a new response even when AVAudioPlayerNode is already playing idle', () => {
    const feedStartIdx = pcmSrc.indexOf('if !self.playbackStarted && self.fedFrames >= self.jitterBufferFrames');
    expect(feedStartIdx).toBeGreaterThanOrEqual(0);
    const feedBlock = pcmSrc.slice(feedStartIdx, feedStartIdx + 260);
    const nodePlayIdx = feedBlock.indexOf('if !node.isPlaying');
    const notifyIdx = feedBlock.indexOf('self.notifyPlaybackActive(true)');
    expect(nodePlayIdx).toBeGreaterThanOrEqual(0);
    expect(notifyIdx).toBeGreaterThan(nodePlayIdx);
    expect(feedBlock.slice(nodePlayIdx, notifyIdx)).toContain('}');
  });

  it('opens the fallback gate on the first valid audio chunk before jitter-buffer playback starts', () => {
    const firstChunkIdx = pcmSrc.indexOf('self.fedFrames += UInt64(frameCount)');
    const scheduleIdx = pcmSrc.indexOf('node.scheduleBuffer', firstChunkIdx);
    expect(firstChunkIdx).toBeGreaterThanOrEqual(0);
    expect(scheduleIdx).toBeGreaterThan(firstChunkIdx);
    const preScheduleBlock = pcmSrc.slice(firstChunkIdx, scheduleIdx);
    expect(preScheduleBlock).toContain('if !self.playbackActivityAnnounced');
    expect(preScheduleBlock).toContain('self.notifyPlaybackActive(true)');
  });

  it('resets native playback activity state for every new response', () => {
    const startResponseIdx = pcmSrc.indexOf('func startResponse(');
    expect(startResponseIdx).toBeGreaterThanOrEqual(0);
    const block = pcmSrc.slice(startResponseIdx, startResponseIdx + 900);
    expect(block).toContain('self.fedFrames = 0');
    expect(block).toContain('self.playedFrames = 0');
    expect(block).toContain('self.playbackStarted = false');
    expect(block).toContain('self.playbackActivityAnnounced = false');
    expect(block).toContain('self.turnOpen = true');
  });

  it('keeps fallback gate active briefly after playback reports drained', () => {
    expect(micSrc).toContain('playbackTailMs');
    expect(micSrc).toContain('tailUntil');
  });

  it('resets iOS VAD state when dropping speaker echo so the next user sentence can start a fresh turn', () => {
    const dropIdx = micSrc.indexOf('if shouldDropForFallbackGate');
    expect(dropIdx).toBeGreaterThanOrEqual(0);
    const dropBlock = micSrc.slice(dropIdx, dropIdx + 420);
    expect(dropBlock).toContain('self.vadSpeechActive = false');
    expect(dropBlock).toContain('self.vadHangoverFramesLeft = 0');
    expect(dropBlock).toContain('self.preRollBuffer.removeAll()');
    expect(dropBlock).toContain('self.preRollFilled = false');
  });
});
