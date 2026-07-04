import { buildCompanionVoicePrompt } from '../../../src/features/lessonDemo/companionVoicePrompt';
import { getCuratedLessonCatalog } from '../../../src/features/lessonDemo/content/curatedLegacyLessons';

describe('buildCompanionVoicePrompt', () => {
  it('uses companion mode and avoids lesson teaching instructions', () => {
    const lesson = getCuratedLessonCatalog('4-6')[0]!;
    const prompt = buildCompanionVoicePrompt(lesson);

    expect(prompt).toContain('COMPANION MODE');
    expect(prompt).toContain('do NOT teach it yet');
    expect(prompt).toContain('Do NOT drill vocabulary');
    expect(prompt).not.toContain('LESSON MODE');
    expect(prompt).toContain(lesson.title ?? lesson.theme);
  });
});