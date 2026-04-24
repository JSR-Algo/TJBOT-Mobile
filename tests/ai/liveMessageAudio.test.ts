import { extractInlineAudioParts } from '../../src/ai/liveMessageAudio';

describe('extractInlineAudioParts', () => {
  it('returns every audio payload in modelTurn.parts order', () => {
    expect(
      extractInlineAudioParts({
        modelTurn: {
          parts: [
            { inlineData: { data: 'chunk-1' } },
            { inlineData: { data: 'chunk-2' } },
            { inlineData: { data: 'chunk-3' } },
          ],
        },
      }),
    ).toEqual(['chunk-1', 'chunk-2', 'chunk-3']);
  });

  it('ignores non-audio parts and preserves audio after the first position', () => {
    expect(
      extractInlineAudioParts({
        modelTurn: {
          parts: [
            {},
            { inlineData: { data: '' } },
            { inlineData: { data: 'late-audio' } },
            { inlineData: { data: 'tail-audio' } },
          ],
        },
      }),
    ).toEqual(['late-audio', 'tail-audio']);
  });

  it('returns an empty list when modelTurn.parts is missing', () => {
    expect(extractInlineAudioParts(undefined)).toEqual([]);
    expect(extractInlineAudioParts({})).toEqual([]);
    expect(extractInlineAudioParts({ modelTurn: { parts: null } })).toEqual([]);
  });
});
