import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts', 'physical-provisioning-smoke.mjs');

type SelfTestReport = {
  ios: {
    onlinePhysicalDeviceIds: string[];
    offlinePhysicalDeviceIds: string[];
  };
  devicectlIos: {
    onlinePhysicalDeviceIds: string[];
    offlinePhysicalDeviceIds: string[];
  };
  devicectlDetails: {
    developerServicesReady: boolean;
  };
  android: {
    readyDeviceIds: string[];
    blockedDeviceIds: string[];
  };
  adbResolution: {
    sdkFallback: string | null;
  };
  missingHost: {
    blockers: { code: string }[];
  };
};

function runSelfTest(): SelfTestReport {
  const output = execFileSync('node', [SCRIPT, '--self-test-json'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  return JSON.parse(output) as SelfTestReport;
}

describe('physical BLE/BluFi provisioning smoke harness', () => {
  it('has npm scripts for iOS, Android, and combined physical smoke preflight', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts['smoke:provisioning:ios']).toContain('--platform=ios');
    expect(pkg.scripts['smoke:provisioning:android']).toContain('--platform=android');
    expect(pkg.scripts['smoke:provisioning:both']).toContain('--platform=both');
  });

  it('parses online iOS devices, authorized Android devices, and missing-host blockers', () => {
    const report = runSelfTest();

    expect(report.ios.onlinePhysicalDeviceIds).toEqual(['00008110-ONLINE']);
    expect(report.ios.offlinePhysicalDeviceIds).toEqual(['00008110-CUSTOM-NAME', '00008110-OFFLINE']);
    expect(report.devicectlIos.onlinePhysicalDeviceIds).toEqual(['DC4CF837-665D-5E57-A83F-E6229525E513']);
    expect(report.devicectlIos.offlinePhysicalDeviceIds).toEqual(['E7A8B2C6-711F-5936-A7C9-864CC781F3B0']);
    expect(report.devicectlDetails.developerServicesReady).toBe(false);
    expect(report.android.readyDeviceIds).toEqual(['ZY22READY']);
    expect(report.android.blockedDeviceIds).toEqual(['R58MUNAUTH']);
    expect(report.adbResolution.sdkFallback).toBe('/tmp/android-sdk/platform-tools/adb');
    expect(report.missingHost.blockers.map(blocker => blocker.code)).toEqual([
      'ROBOT_USB_SERIAL_UNAVAILABLE',
      'IOS_DEVICE_UNAVAILABLE',
      'ANDROID_ADB_UNAVAILABLE',
    ]);
  });

  it('does not print Wi-Fi password environment values in reports', () => {
    const output = execFileSync('node', [SCRIPT, '--self-test-json'], {
      cwd: ROOT,
      env: { ...process.env, TBOT_SMOKE_WIFI_PASSWORD: 'do-not-print-this-password' },
      encoding: 'utf8',
    });

    expect(output).not.toContain('do-not-print-this-password');
  });

  it('registers the pairing deep-link scheme for iOS and Android physical devices', () => {
    const iosInfo = fs.readFileSync(path.join(ROOT, 'ios', 'TJBotMobile', 'Info.plist'), 'utf8');
    const androidManifest = fs.readFileSync(path.join(ROOT, 'android', 'app', 'src', 'main', 'AndroidManifest.xml'), 'utf8');

    expect(iosInfo).toContain('CFBundleURLTypes');
    expect(iosInfo).toContain('<string>TJBot</string>');
    expect(iosInfo).toContain('<string>tjbot</string>');
    expect(androidManifest).toContain('<action android:name="android.intent.action.VIEW" />');
    expect(androidManifest).toContain('<data android:scheme="TJBot" />');
    expect(androidManifest).toContain('<data android:scheme="tjbot" />');
  });
});
