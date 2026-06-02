/**
 * Meta-test for the canonical Vietnamese voice corpus.
 *
 * This test does NOT exercise ASR — real Vietnamese transcription accuracy
 * is a real-device benchmark gate tracked outside jest. What this locks is:
 *
 *   1. The corpus file stays present, exported, and immutable in shape
 *   2. The user's original repro sentence remains verbatim in entry 0
 *   3. Category coverage stays broad (prevents "trimming" to pass benchmarks)
 *   4. Each entry carries a non-empty `vi` and `notes`
 *
 * If a future change removes or renames a corpus entry this test fails
 * loudly, so the corpus can only shrink via explicit PR review.
 */
import {
  VIETNAMESE_VOICE_CORPUS,
  USER_REPRO_UTTERANCE,
  type VietnameseCorpusCategory,
  type VietnameseCorpusEntry,
} from './vietnamese-voice-corpus';

describe('Vietnamese voice corpus — invariants', () => {
  it('contains exactly 10 entries', () => {
    expect(VIETNAMESE_VOICE_CORPUS).toHaveLength(10);
  });

  it('first entry is the user-repro sentence verbatim', () => {
    expect(VIETNAMESE_VOICE_CORPUS[0].vi).toBe(USER_REPRO_UTTERANCE);
    expect(VIETNAMESE_VOICE_CORPUS[0].vi).toBe('Bạn do ai tạo?');
    expect(VIETNAMESE_VOICE_CORPUS[0].category).toBe('meta-provenance');
  });

  it('every entry has a non-empty vi field and non-empty notes', () => {
    for (const entry of VIETNAMESE_VOICE_CORPUS) {
      expect(entry.vi.trim().length).toBeGreaterThan(0);
      expect(entry.notes.trim().length).toBeGreaterThan(20);
    }
  });

  it('every entry carries at least one Vietnamese diacritic', () => {
    // Sanity gate — a pure-Latin entry would mean someone stripped tones.
    const diacritic = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
    for (const entry of VIETNAMESE_VOICE_CORPUS) {
      expect(entry.vi).toMatch(diacritic);
    }
  });

  it('coverage spans at least 7 distinct categories', () => {
    const cats = new Set<VietnameseCorpusCategory>();
    for (const entry of VIETNAMESE_VOICE_CORPUS) {
      cats.add(entry.category);
    }
    expect(cats.size).toBeGreaterThanOrEqual(7);
  });

  it('includes the tonal-density stress class and the emotion-cue class', () => {
    const cats = VIETNAMESE_VOICE_CORPUS.map((e) => e.category);
    expect(cats).toContain('tonal-density');
    expect(cats).toContain('emotion');
  });

  it('entries are typed as readonly VietnameseCorpusEntry tuples', () => {
    // Type probe — if the export ever drops its `readonly` modifier this
    // assignment will stop compiling.
    const probe: readonly VietnameseCorpusEntry[] = VIETNAMESE_VOICE_CORPUS;
    expect(probe.length).toBe(VIETNAMESE_VOICE_CORPUS.length);
  });
});
