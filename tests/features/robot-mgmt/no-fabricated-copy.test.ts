import fs from 'fs';
import path from 'path';

const SCREENS_DIR = path.join(__dirname, '../../../src/features/robot-mgmt/screens');

const SCREEN_FILES = fs
  .readdirSync(SCREENS_DIR)
  .filter(file => file.endsWith('.tsx'))
  .sort();

/**
 * Fabricated hardware values that the P2 de-fake removed from robot-mgmt
 * screens. Asserting their absence guarantees no screen can quietly
 * re-introduce an invented robot state.
 */
const FABRICATED_STRINGS = [
  'Buddy Panda',
  'ROB-2A8F',
  'Online · all good',
  'Everything is working',
  '78%',
  'Casa-Familia',
  'Casa-Guest',
  'Linden 3B',
  'Verizon-7K2',
  '3 installed',
  'v1.4.2',
  'v1.5.0',
  '28°C',
  '3 days',
  '1.21 GB',
  '4.0 GB',
  '1.2 GB used',
  '420 MB',
  '380 MB',
  '410 MB',
  'Hello Friends',
  'Yummy Words',
  '192.168.1.42',
  '−48',
  '32 min to full',
  'On dock',
  'like new',
  'About 5 hours',
  'last test today',
  'Volume 6',
  'volume 6',
  '9:00 PM – 7:00 AM',
  'iOS app v3.1',
  'Move closer to Robot',
  "Stand about an arm's length from Robot",
  'Where Robot listens best',
  'Low · good for lessons',
  'Plenty for lessons',
  'Update Robot now',
  'I can hear Robot',
  'New version available',
  '5 GHz',
];

/** Screens that must render ConnectorStateNotice for their blocked paths. */
const NOTICE_WIRED_SCREENS = new Set([
  'MyRobotScreen.tsx',
  'RobotStatusScreen.tsx',
  'RobotBatteryScreen.tsx',
  'RobotStorageScreen.tsx',
  'RobotFirmwareScreen.tsx',
  'RobotWifiScreen.tsx',
  'RobotSoundScreen.tsx',
  'SpeakerTestScreen.tsx',
]);

describe('robot-mgmt screens carry no fabricated hardware copy', () => {
  it('covers the expected screen set', () => {
    expect(SCREEN_FILES.length).toBeGreaterThanOrEqual(12);
    for (const required of NOTICE_WIRED_SCREENS) {
      expect(SCREEN_FILES).toContain(required);
    }
  });

  for (const file of SCREEN_FILES) {
    it(`${file} contains none of the removed fake values`, () => {
      const source = fs.readFileSync(path.join(SCREENS_DIR, file), 'utf8');
      for (const fake of FABRICATED_STRINGS) {
        expect(source.includes(fake)).toBe(false);
      }
    });
  }

  it('every status-driven screen renders ConnectorStateNotice for blocked states', () => {
    for (const file of NOTICE_WIRED_SCREENS) {
      const source = fs.readFileSync(path.join(SCREENS_DIR, file), 'utf8');
      expect(source.includes('ConnectorStateNotice')).toBe(true);
    }
  });
});
