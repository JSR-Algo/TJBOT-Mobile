import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('Android BLE native linking', () => {
  test('links react-native-ble-plx manually when autolinking is disabled', () => {
    expect(read('react-native.config.js')).toMatch(/react-native-ble-plx[\s\S]*android:\s*null/);
    expect(read('android/settings.gradle')).toContain("include ':react-native-ble-plx'");
    expect(read('android/app/build.gradle')).toContain("implementation project(':react-native-ble-plx')");
    expect(read('android/app/src/main/java/com/tjbotmobile/TbotReactHostProvider.kt')).toMatch(/import com\.bleplx\.BlePlxPackage[\s\S]*add\(BlePlxPackage\(\)\)/);
    expect(read('android/app/src/main/java/com/tjbotmobile/MainApplication.kt')).toMatch(/import com\.bleplx\.BlePlxPackage[\s\S]*add\(BlePlxPackage\(\)\)/);
  });
});
