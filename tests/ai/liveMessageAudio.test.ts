import { extractInlineAudioParts } from '../../src/ai/liveMessageAudio';

describe('extractInlineAudioParts', () => {
  it('returns every audio payload in modelTurn.parts order with its part index', () => {
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
    ).toEqual([
      { data: 'chunk-1', index: 0 },
      { data: 'chunk-2', index: 1 },
      { data: 'chunk-3', index: 2 },
    ]);
  });

  it('preserves the original part index when non-audio parts are skipped', () => {
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
    ).toEqual([
      { data: 'late-audio', index: 2 },
      { data: 'tail-audio', index: 3 },
    ]);
  });

  it('returns an empty list when modelTurn.parts is missing', () => {
    expect(extractInlineAudioParts(undefined)).toEqual([]);
    expect(extractInlineAudioParts({})).toEqual([]);
    expect(extractInlineAudioParts({ modelTurn: { parts: null } })).toEqual([]);
  });

  it('flags index 0 — the wrapper position used by responseId tagging', () => {
    const result = extractInlineAudioParts({
      modelTurn: {
        parts: [{ inlineData: { data: 'first-chunk-of-response' } }],
      },
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ data: 'first-chunk-of-response', index: 0 });
  });
});
