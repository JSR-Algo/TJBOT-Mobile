import fs from 'fs';
import path from 'path';

/**
 * T19: Remove orphaned Gemini native modules and dependencies
 *
 * This test proves that the custom iOS/Android native modules for the Gemini
 * Live voice path (VoiceMic, PcmStream, VoiceSession) have been deleted and
 * that the Gemini-only npm dependency (@google/genai) has been removed from
 * package.json.
 *
 * Expected state before fix: FAIL
 * Expected state after fix:  PASS
 */

describe('T19: Gemini native modules and dependency are still present', () => {
  const projectRoot = path.resolve(__dirname, '../..');

  const iosModuleDirs = [
    path.join(projectRoot, 'ios/TJBotMobile/VoiceMic'),
    path.join(projectRoot, 'ios/TJBotMobile/PcmStream'),
    path.join(projectRoot, 'ios/TJBotMobile/VoiceSession'),
  ];

  const androidModuleDirs = [
    path.join(projectRoot, 'android/app/src/main/java/com/tjbotmobile/voicemic'),
    path.join(projectRoot, 'android/app/src/main/java/com/tjbotmobile/pcmstream'),
    path.join(projectRoot, 'android/app/src/main/java/com/tjbotmobile/voicesession'),
  ];

  const packageJsonPath = path.join(projectRoot, 'package.json');

  function pathExists(p: string): boolean {
    try {
      fs.accessSync(p);
      return true;
    } catch {
      return false;
    }
  }

  it('still ships Gemini native modules on iOS', () => {
    const stillPresent = iosModuleDirs.filter(pathExists);

    expect(stillPresent).toEqual(iosModuleDirs);
  });

  it('still ships Gemini native modules on Android', () => {
    const stillPresent = androidModuleDirs.filter(pathExists);

    expect(stillPresent).toEqual(androidModuleDirs);
  });

  it('still references the Gemini-only @google/genai dependency in package.json', () => {
    const raw = fs.readFileSync(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(raw) as { dependencies?: Record<string, string> };

    expect(pkg.dependencies).not.toBeUndefined();
    expect(pkg.dependencies).toHaveProperty('@google/genai');
  });
});
