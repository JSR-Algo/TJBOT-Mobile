/**
 * Static assertions for VoiceMic event API surface.
 * Mirrors the grep-style pattern used by useGeminiConversation-p0.test.ts.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../..');
const voiceMicSrc = fs.readFileSync(
  path.join(REPO_ROOT, 'src/native/VoiceMic.ts'),
  'utf8',
);

describe('VoiceMic — event API surface (static assertions)', () => {
  it('exports onAecAttachFailed subscribing to voiceAecAttachFailed native event', () => {
    expect(voiceMicSrc).toContain('voiceAecAttachFailed');
    expect(voiceMicSrc).toContain('onAecAttachFailed');
  });
});
