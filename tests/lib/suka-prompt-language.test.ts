/**
 * Phase 3d language-aware persona tests.
 *
 * Plan: ~/.claude/plans/silly-orbiting-lamport.md
 * User decision 2026-04-24: "Chỉ tiếng việt và tiếng anh, không cần pick, có
 * thể giao tiếp được cả tiếng anh và tiếng việt." No UI picker — 'bilingual'
 * is the shipping default and the app mirrors whatever language the child
 * uses. The 'vi'/'en' modes are kept as typed API for tests + future
 * per-profile override.
 */
import { buildSukaPrompt, type LanguageMode } from '../../src/lib/suka-prompt';

describe('buildSukaPrompt — language directive', () => {
  it('defaults to bilingual when no language arg is passed', () => {
    const out = buildSukaPrompt('3-5', 'dang-yeu');
    expect(out).toMatch(/Match the language the child uses/);
  });

  it('explicit bilingual matches default', () => {
    const def = buildSukaPrompt('6-8', 'vui-ve');
    const explicit = buildSukaPrompt('6-8', 'vui-ve', 'bilingual');
    expect(def).toBe(explicit);
  });

  it('vi mode instructs Vietnamese primary', () => {
    const out = buildSukaPrompt('3-5', 'dang-yeu', 'vi');
    expect(out).toMatch(/Nói tiếng Việt là chính/);
    expect(out).not.toMatch(/Match the language the child uses/);
  });

  it('en mode instructs English primary', () => {
    const out = buildSukaPrompt('9-12', 'nang-dong', 'en');
    expect(out).toMatch(/Speak English primarily/);
    expect(out).not.toMatch(/Match the language the child uses/);
  });

  it('all three modes produce distinct prompts', () => {
    const vi = buildSukaPrompt('3-5', 'dang-yeu', 'vi');
    const en = buildSukaPrompt('3-5', 'dang-yeu', 'en');
    const bi = buildSukaPrompt('3-5', 'dang-yeu', 'bilingual');
    expect(vi).not.toBe(en);
    expect(vi).not.toBe(bi);
    expect(en).not.toBe(bi);
  });

  it('every mode places the Ngôn ngữ block near the top so the model weights it heavily', () => {
    for (const mode of ['vi', 'en', 'bilingual'] as LanguageMode[]) {
      const out = buildSukaPrompt('3-5', 'dang-yeu', mode);
      const langIdx = out.indexOf('# 0) Ngôn ngữ');
      const section1Idx = out.indexOf('# 1) Danh tính');
      expect(langIdx).toBeGreaterThanOrEqual(0);
      expect(section1Idx).toBeGreaterThan(langIdx);
    }
  });

  it('preserves all existing structural sections across modes', () => {
    for (const mode of ['vi', 'en', 'bilingual'] as LanguageMode[]) {
      const out = buildSukaPrompt('6-8', 'dang-yeu', mode);
      expect(out).toContain('# 1) Danh tính & tính cách');
      expect(out).toContain('# 2) Mục tiêu hội thoại');
      expect(out).toContain('# 3) Phong cách giọng nói');
      expect(out).toContain('# 11) Điều tuyệt đối tránh');
      expect(out).toContain('# 12) Chế độ ưu tiên cuối cùng');
    }
  });

  it('backward compat: 3-arg call with seed as 3rd arg still returns a prompt (if anyone passed seed before)', () => {
    // The old signature was (age, style, _seed?). We reordered — the 3rd arg
    // is now `language`. This test documents the breaking reorder: callers
    // passing a seed-looking string as the 3rd arg will now TypeError at
    // compile time because the literal is not a LanguageMode. That's the
    // desired behaviour — force callers to migrate rather than silently
    // mistype the seed as a language mode.
    // @ts-expect-error — invalid language mode literal must be rejected
    buildSukaPrompt('3-5', 'dang-yeu', 'some-profile-id-123');
    // Run the typed path to confirm no accidental runtime throw:
    expect(() => buildSukaPrompt('3-5', 'dang-yeu')).not.toThrow();
  });
});
