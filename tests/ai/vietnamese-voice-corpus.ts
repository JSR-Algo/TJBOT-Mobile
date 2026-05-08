/**
 * Canonical Vietnamese utterance corpus for TBOT realtime-voice benchmarks.
 *
 * Purpose: lock in a reviewable, extensible list of Vietnamese phrases that
 * future on-device runs can replay against Gemini Live to measure WER.
 * Commit to git so the corpus is diffable — replacing or shrinking entries
 * to "pass the benchmark" is visible in review.
 *
 * Source: user repro (2026-04-24) spoke "Bạn do ai tạo?" on iOS staging and
 * Gemini Live (no speechConfig.languageCode) transcribed it as "Bà ấy có
 * nấu không?". Phase 1 adds the BCP-47 hint; this corpus is the regression
 * target.
 *
 * Shape is deliberately minimal — extend in Phase 3 with per-entry
 * `expectedIntent`, `expectedResponseLanguage`, and WER budget once the
 * acceptance-criteria row (AC 2.9) exists in
 * docs/qa/realtime-voice-acceptance.md.
 */

export type VietnameseCorpusCategory =
  | 'meta-provenance'
  | 'meta-identity'
  | 'simple-fact'
  | 'command'
  | 'child-curiosity'
  | 'math'
  | 'emotion'
  | 'context-pronoun'
  | 'tonal-density';

export interface VietnameseCorpusEntry {
  readonly vi: string;
  readonly category: VietnameseCorpusCategory;
  readonly notes: string;
}

export const VIETNAMESE_VOICE_CORPUS: readonly VietnameseCorpusEntry[] = [
  {
    vi: 'Bạn do ai tạo?',
    category: 'meta-provenance',
    notes:
      'Original user repro (2026-04-24). Without languageCode, Gemini Live transcribed this as "Bà ấy có nấu không?" Must transcribe verbatim after Phase 1.',
  },
  {
    vi: 'Bạn tên gì?',
    category: 'meta-identity',
    notes: 'Short self-introduction question. Tonal pair ba/ban commonly mis-split by English-biased ASR.',
  },
  {
    vi: 'Con mèo kêu thế nào?',
    category: 'simple-fact',
    notes: 'Child noun + onomatopoeia question. "Meo" diacritic sensitive.',
  },
  {
    vi: 'Kể cho tôi một câu chuyện.',
    category: 'command',
    notes: 'Polite imperative. Tests command-vs-question disambiguation.',
  },
  {
    vi: 'Con khủng long có còn sống không?',
    category: 'child-curiosity',
    notes:
      'Multi-tone sequence (khủng/long/còn) on a child-typical curiosity question. Long utterance tests mid-sentence language stability.',
  },
  {
    vi: 'Một cộng một bằng mấy?',
    category: 'math',
    notes: 'Numeric reasoning prompt. Tests that "một" is not silently transcribed as "mot" (no tone).',
  },
  {
    vi: 'Bầu trời màu gì?',
    category: 'simple-fact',
    notes: 'Color question, short and common. Tonal pair bầu/trời.',
  },
  {
    vi: 'Mình buồn quá.',
    category: 'emotion',
    notes: 'Emotion cue the safety layer should detect in Phase 3. Here it is corpus-only; no filter assertion yet.',
  },
  {
    vi: 'Còn con chó thì sao?',
    category: 'context-pronoun',
    notes:
      'Follow-up question requiring prior-turn context. Tests the Live session conversation carry-over under Vietnamese input.',
  },
  {
    vi: 'Bà nội tôi 70 tuổi.',
    category: 'tonal-density',
    notes:
      'High-tone-density statement. Every word carries a diacritic — the hardest class of Vietnamese ASR input.',
  },
] as const;

/**
 * Quick lookup — asserted in the meta-test to remain exactly this string
 * so accidental edits to the user-repro entry are caught.
 */
export const USER_REPRO_UTTERANCE = 'Bạn do ai tạo?' as const;
