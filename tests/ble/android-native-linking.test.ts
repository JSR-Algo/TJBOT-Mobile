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

  test('links react-native-svg into both Android React hosts', () => {
    expect(read('android/settings.gradle')).toContain("include ':react-native-svg'");
    expect(read('android/app/build.gradle')).toContain("implementation project(':react-native-svg')");
    expect(read('android/app/src/main/java/com/tjbotmobile/TbotReactHostProvider.kt')).toMatch(/import com\.horcrux\.svg\.SvgPackage[\s\S]*add\(SvgPackage\(\)\)/);
    expect(read('android/app/src/main/java/com/tjbotmobile/MainApplication.kt')).toMatch(/import com\.horcrux\.svg\.SvgPackage[\s\S]*add\(SvgPackage\(\)\)/);
  });

  test('BootstrapApplication exposes the ReactApplication contract used by Detox Android', () => {
    const bootstrap = read('android/app/src/main/java/com/tjbotmobile/BootstrapApplication.kt');

    expect(read('android/app/src/main/AndroidManifest.xml')).toContain('android:name=".BootstrapApplication"');
    expect(bootstrap).toContain('import com.facebook.react.ReactApplication');
    expect(bootstrap).toContain('class BootstrapApplication : Application(), ReactApplication');
    expect(bootstrap).toContain('override val reactHost: ReactHost');
    expect(bootstrap).toContain('TJBotReactHostProvider.getReactHost()');
  });

  test('denies all cleartext traffic in main and release builds', () => {
    const relativePath = 'android/app/src/main/res/xml/network_security_config.xml';
    const absolutePath = path.join(root, relativePath);
    const manifest = read('android/app/src/main/AndroidManifest.xml');

    expect(fs.existsSync(absolutePath)).toBe(true);
    expect(manifest).toContain('android:usesCleartextTraffic="false"');
    expect(manifest).toContain('android:networkSecurityConfig="@xml/network_security_config"');

    const config = read(relativePath);
    expect(config).toContain('<base-config cleartextTrafficPermitted="false" />');
    expect(config).not.toContain('cleartextTrafficPermitted="true"');
    expect(config).not.toContain('<domain');
  });

  test('keeps physical-device LAN traffic available only in debug builds', () => {
    const relativePath = 'android/app/src/debug/res/xml/network_security_config.xml';

    expect(fs.existsSync(path.join(root, relativePath))).toBe(true);
    expect(read(relativePath)).toContain('<base-config cleartextTrafficPermitted="true" />');
    expect(read('.gitignore')).toContain('!android/app/src/main/res/xml/network_security_config.xml');
  });
});
