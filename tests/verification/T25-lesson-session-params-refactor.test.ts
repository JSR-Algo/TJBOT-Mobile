import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(__dirname, '../..');
const routesPath = path.join(projectRoot, 'src/navigation/routes.ts');
const routesSource = fs.readFileSync(routesPath, 'utf-8');

// The 24 lesson-session screens declared in src/navigation/routes.ts.
const LESSON_SESSION_SCREENS = [
  'ConnectingScreen',
  'GreetingScreen',
  'LessonReadyScreen',
  'RobotListeningScreen',
  'UserSpeakingScreen',
  'RobotSpeakingScreen',
  'ThinkingScreen',
  'ActivityIntroScreen',
  'ActivityDoneScreen',
  'SuccessScreen',
  'LessonDoneScreen',
  'ExitConfirmScreen',
  'RetryScreen',
  'SilenceScreen',
  'BargeinScreen',
  'GentleScreen',
  'OfftopicScreen',
  'SafetyScreen',
  'CostCappedScreen',
  'ParentStoppedScreen',
  'TimedOutScreen',
  'AudioErrorScreen',
  'AbandonedDisconnectScreen',
  'ReconnectingScreen',
];

describe('T25: Extract LessonSessionParams and normalize route param types', () => {
  it('exports a LessonSessionParams type from routes.ts', () => {
    expect(routesSource).toMatch(/export\s+type\s+LessonSessionParams\b/);
  });

  it.each(LESSON_SESSION_SCREENS)(
    '%s reuses LessonSessionParams instead of repeating inline fields',
    (screenName) => {
      const line = routesSource
        .split('\n')
        .find((l) => l.trim().startsWith(`${screenName}:`));

      expect(line).toBeDefined();
      expect(line).toMatch(/LessonSessionParams/);
      // The common fields should live in LessonSessionParams, not be repeated
      // on every screen line.
      expect(line).not.toMatch(/courseId\?:/);
      expect(line).not.toMatch(/voiceStateBeforeInterruption\?:/);
      expect(line).not.toMatch(/resumeReason\?:/);
    },
  );

  it('does not use the verbose undefined | { ... } pattern for lesson-session optional params', () => {
    const lines = routesSource.split('\n');
    const lessonSessionStart = lines.findIndex((l) => l.trim() === '// lesson-session');
    const progressStart = lines.findIndex((l) => l.trim() === '// progress');
    const lessonSessionSection = lines
      .slice(
        lessonSessionStart === -1 ? 0 : lessonSessionStart,
        progressStart === -1 ? undefined : progressStart,
      )
      .join('\n');
    const matches = lessonSessionSection.match(/undefined\s*\|\s*\{/g) ?? [];
    expect(matches).toHaveLength(0);
  });

  it('keeps the shared lesson-session fields in exactly one place', () => {
    // After the refactor, voiceStateBeforeInterruption should only appear inside
    // the LessonSessionParams definition.
    const matches = routesSource.match(/\bvoiceStateBeforeInterruption\b/g) ?? [];
    expect(matches.length).toBeLessThanOrEqual(1);
  });
});
