import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { execFileSync, spawnSync } from 'child_process';

const root = join(__dirname, '..', '..');

describe('Android network security resources', () => {
  it('ships every XML resource referenced by the application manifest', () => {
    const manifest = readFileSync(
      join(root, 'android/app/src/main/AndroidManifest.xml'),
      'utf8',
    );
    const resource = manifest.match(/android:networkSecurityConfig="@xml\/([^"]+)"/)?.[1];

    expect(resource).toBeDefined();
    expect(
      existsSync(join(root, `android/app/src/main/res/xml/${resource}.xml`)),
    ).toBe(true);

    const relativePath = `android/app/src/main/res/xml/${resource}.xml`;
    expect(execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', relativePath], {
      cwd: root,
      encoding: 'utf8',
    }).trim()).toBe(relativePath);
    const ignored = spawnSync('git', ['check-ignore', relativePath], {
      cwd: root,
      encoding: 'utf8',
    });
    expect(ignored.status).toBe(1);
    expect(ignored.stdout.trim()).toBe('');
  });

  it('denies release cleartext while keeping the debug transport override', () => {
    const releaseConfig = readFileSync(
      join(root, 'android/app/src/main/res/xml/network_security_config.xml'),
      'utf8',
    );
    const debugConfig = readFileSync(
      join(root, 'android/app/src/debug/res/xml/network_security_config.xml'),
      'utf8',
    );

    expect(releaseConfig).toContain('<base-config cleartextTrafficPermitted="false" />');
    expect(debugConfig).toContain('<base-config cleartextTrafficPermitted="true" />');
  });
});
