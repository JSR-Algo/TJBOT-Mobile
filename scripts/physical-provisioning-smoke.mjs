#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOBILE_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(MOBILE_ROOT, '..');
const FIRMWARE_ROOT = path.join(REPO_ROOT, 'robot', 'TBOT-Firmware');
const PAIRING_DEEP_LINK = 'TJBot://device/pair-intro';

const args = process.argv.slice(2);

if (args.includes('--self-test-json')) {
  process.stdout.write(`${JSON.stringify(buildSelfTestReport())}\n`);
  process.exit(0);
}

const platform = readArg('platform') ?? 'both';
const json = args.includes('--json');
const report = buildReadinessReport({
  platform,
  robotPort: readArg('robot-port') ?? process.env.TBOT_ROBOT_PORT,
});

if (json) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} else {
  printTextReport(report);
}

process.exit(report.blockers.length === 0 ? 0 : 2);

function readArg(name) {
  const prefix = `--${name}=`;
  return args.find(arg => arg.startsWith(prefix))?.slice(prefix.length);
}

function buildReadinessReport(options) {
  const normalizedPlatform = normalizePlatform(options.platform);
  const firmware = inspectFirmwareConfig();
  const robot = inspectRobotUsb(options.robotPort);
  const ios = normalizedPlatform === 'ios' || normalizedPlatform === 'both'
    ? inspectIosDevices()
    : null;
  const android = normalizedPlatform === 'android' || normalizedPlatform === 'both'
    ? inspectAndroidDevices()
    : null;
  const nativeLinks = inspectNativeDeepLinks();
  const blockers = [];

  if (!firmware.ready) blockers.push({ code: 'FIRMWARE_BLUFI_CONFIG_NOT_READY', detail: firmware.detail });
  if (!robot.ready) blockers.push({ code: 'ROBOT_USB_SERIAL_UNAVAILABLE', detail: robot.detail });
  if (ios && ios.onlinePhysicalDeviceIds.length === 0) {
    blockers.push({ code: 'IOS_DEVICE_UNAVAILABLE', detail: ios.detail });
  }
  if (android) {
    if (!android.adbAvailable) blockers.push({ code: 'ANDROID_ADB_UNAVAILABLE', detail: android.detail });
    else if (android.readyDeviceIds.length === 0) blockers.push({ code: 'ANDROID_DEVICE_UNAVAILABLE', detail: android.detail });
  }
  if (!nativeLinks.iosReady && (normalizedPlatform === 'ios' || normalizedPlatform === 'both')) {
    blockers.push({ code: 'IOS_DEEP_LINK_NOT_REGISTERED', detail: nativeLinks.iosDetail });
  }
  if (!nativeLinks.androidReady && (normalizedPlatform === 'android' || normalizedPlatform === 'both')) {
    blockers.push({ code: 'ANDROID_DEEP_LINK_NOT_REGISTERED', detail: nativeLinks.androidDetail });
  }

  return {
    status: blockers.length === 0 ? 'ready' : 'blocked',
    platform: normalizedPlatform,
    pairingDeepLink: PAIRING_DEEP_LINK,
    firmware,
    robot,
    ios,
    android,
    nativeLinks,
    credentials: {
      ssid: process.env.TBOT_SMOKE_WIFI_SSID ? 'set' : 'unset',
      password: process.env.TBOT_SMOKE_WIFI_PASSWORD ? 'set' : 'unset',
    },
    blockers,
    operatorSteps: buildOperatorSteps(normalizedPlatform),
  };
}

function normalizePlatform(value) {
  if (value === 'ios' || value === 'android' || value === 'both') return value;
  throw new Error('--platform must be ios, android, or both');
}

function inspectFirmwareConfig() {
  const sdkconfig = readIfExists(path.join(FIRMWARE_ROOT, 'sdkconfig'));
  const defaults = readIfExists(path.join(FIRMWARE_ROOT, 'sdkconfig.defaults'));
  const combined = `${sdkconfig}\n${defaults}`;
  const ready = combined.includes('# CONFIG_USE_HOTSPOT_WIFI_PROVISIONING is not set')
    && combined.includes('CONFIG_USE_ESP_BLUFI_WIFI_PROVISIONING=y')
    && sdkconfig.includes('CONFIG_BT_BLE_BLUFI_ENABLE=y');
  return {
    ready,
    detail: ready
      ? 'BluFi enabled; hotspot provisioning disabled in generated/default config.'
      : 'Expected BluFi enabled and hotspot disabled in robot/TBOT-Firmware sdkconfig files.',
  };
}

function inspectRobotUsb(robotPort) {
  const ports = listCuPorts();
  const candidates = robotPort ? [robotPort] : ports.filter(isLikelyEspSerialPort);
  const ready = candidates.some(port => ports.includes(port));
  return {
    ready,
    requestedPort: robotPort ?? null,
    ports,
    candidates,
    detail: ready
      ? `ESP32-S3 serial candidate: ${candidates.find(port => ports.includes(port))}`
      : 'No /dev/cu.* ESP32-S3 USB serial/download candidate found.',
  };
}

function inspectIosDevices() {
  const xcrun = runCommand('xcrun', ['xctrace', 'list', 'devices']);
  if (!xcrun.ok) {
    return {
      xcrunAvailable: false,
      onlinePhysicalDeviceIds: [],
      offlinePhysicalDeviceIds: [],
      detail: 'xcrun xctrace list devices failed.',
    };
  }
  const parsed = parseXctraceDevices(xcrun.stdout);
  return {
    xcrunAvailable: true,
    ...parsed,
    detail: parsed.onlinePhysicalDeviceIds.length > 0
      ? `iOS physical device ready: ${parsed.onlinePhysicalDeviceIds[0]}`
      : 'No online physical iPhone/iPad listed by xcrun; offline devices do not count.',
  };
}

function inspectAndroidDevices() {
  const adbCommand = resolveAdbCommand();
  if (!adbCommand) {
    return {
      adbAvailable: false,
      readyDeviceIds: [],
      blockedDeviceIds: [],
      detail: 'adb is not installed, not on PATH, and not found in the default Android SDK locations.',
    };
  }
  const adb = runCommand(adbCommand, ['devices', '-l']);
  if (!adb.ok) {
    return {
      adbAvailable: true,
      readyDeviceIds: [],
      blockedDeviceIds: [],
      detail: 'adb devices -l failed.',
    };
  }
  const parsed = parseAdbDevices(adb.stdout);
  return {
    adbAvailable: true,
    ...parsed,
    detail: parsed.readyDeviceIds.length > 0
      ? `Android physical device ready: ${parsed.readyDeviceIds[0]}`
      : 'No authorized Android device listed by adb devices -l.',
  };
}

function resolveAdbCommand(env = process.env, exists = fs.existsSync, pathLookup = () => commandExists('adb')) {
  if (env.ADB && exists(env.ADB)) return env.ADB;
  if (pathLookup()) return 'adb';

  for (const root of androidSdkRoots(env)) {
    const candidate = path.join(root, 'platform-tools', 'adb');
    if (exists(candidate)) return candidate;
  }

  return null;
}

function androidSdkRoots(env) {
  return [
    env.ANDROID_HOME,
    env.ANDROID_SDK_ROOT,
    env.HOME ? path.join(env.HOME, 'Library', 'Android', 'sdk') : undefined,
    env.HOME ? path.join(env.HOME, 'Android', 'Sdk') : undefined,
  ].filter(Boolean);
}

function inspectNativeDeepLinks() {
  const iosInfo = readIfExists(path.join(MOBILE_ROOT, 'ios', 'TJBotMobile', 'Info.plist'));
  const androidManifest = readIfExists(path.join(MOBILE_ROOT, 'android', 'app', 'src', 'main', 'AndroidManifest.xml'));
  const iosReady = iosInfo.includes('CFBundleURLTypes')
    && iosInfo.includes('<string>TJBot</string>')
    && iosInfo.includes('<string>tjbot</string>');
  const androidReady = androidManifest.includes('<action android:name="android.intent.action.VIEW" />')
    && androidManifest.includes('<data android:scheme="TJBot" />')
    && androidManifest.includes('<data android:scheme="tjbot" />');
  return {
    iosReady,
    androidReady,
    iosDetail: iosReady ? 'iOS URL schemes registered.' : 'iOS Info.plist missing TJBot/tjbot URL schemes.',
    androidDetail: androidReady ? 'Android intent filters registered.' : 'AndroidManifest missing TJBot/tjbot VIEW intent filters.',
  };
}

function buildOperatorSteps(platform) {
  const steps = [
    'Flash the BluFi-enabled firmware build to the robot over an ESP32-S3 USB serial/download port.',
    'Put the robot into Wi-Fi provisioning mode and confirm it advertises TBot-Blufi.',
  ];
  if (platform === 'ios' || platform === 'both') {
    steps.push(`iOS: install a signed dev build, open ${PAIRING_DEEP_LINK}, grant Bluetooth, then complete PairIntro -> PairSuccess.`);
  }
  if (platform === 'android' || platform === 'both') {
    steps.push(`Android: install debug build, run adb shell am start -W -a android.intent.action.VIEW -d '${PAIRING_DEEP_LINK}' com.TJBotmobile, grant Bluetooth, then complete PairIntro -> PairSuccess.`);
  }
  steps.push('Verify backend attempt reaches device_authenticated/completed and no backend request/log contains a Wi-Fi password value.');
  return steps;
}

function parseXctraceDevices(output) {
  const onlinePhysicalDeviceIds = [];
  const offlinePhysicalDeviceIds = [];
  let section = null;
  for (const rawLine of output.split('\n')) {
    const line = rawLine.trim();
    if (line === '== Devices ==') {
      section = 'online';
      continue;
    }
    if (line === '== Devices Offline ==') {
      section = 'offline';
      continue;
    }
    if (line === '== Simulators ==') {
      section = 'simulator';
      continue;
    }
    if (!section || section === 'simulator') continue;
    const match = line.match(/^(.+?)\s+\([^)]*\)\s+\(([^)]+)\)$/);
    if (!match) continue;
    const [, name, id] = match;
    if (/\bMac(Book|\smini|\sStudio|\sPro)?\b/i.test(name)) continue;
    if (section === 'online') onlinePhysicalDeviceIds.push(id);
    if (section === 'offline') offlinePhysicalDeviceIds.push(id);
  }
  return { onlinePhysicalDeviceIds, offlinePhysicalDeviceIds };
}

function parseAdbDevices(output) {
  const readyDeviceIds = [];
  const blockedDeviceIds = [];
  for (const rawLine of output.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('List of devices attached')) continue;
    const [id, state] = line.split(/\s+/, 2);
    if (!id || !state) continue;
    if (state === 'device') readyDeviceIds.push(id);
    else blockedDeviceIds.push(id);
  }
  return { readyDeviceIds, blockedDeviceIds };
}

function buildSelfTestReport() {
  const ios = parseXctraceDevices(`
== Devices ==
Manh's MacBook Air (F60CA545-C1A7-5F93-A041-928680F0A985)
iPhone Ready (26.4.2) (00008110-ONLINE)
== Devices Offline ==
Datdzno1 (18.7.8) (00008110-CUSTOM-NAME)
iPhone Offline (26.4.2) (00008110-OFFLINE)
== Simulators ==
iPhone 17 Pro (26.4.1) (SIMULATOR-ID)
`);
  const android = parseAdbDevices(`
List of devices attached
ZY22READY device product:pixel model:Pixel_8 device:shiba transport_id:1
R58MUNAUTH unauthorized usb:336592896X transport_id:2
`);
  return {
    ios,
    android,
    adbResolution: {
      sdkFallback: resolveAdbCommand(
        { ANDROID_HOME: '/tmp/android-sdk', PATH: '/definitely-missing' },
        candidate => candidate === '/tmp/android-sdk/platform-tools/adb',
        () => false,
      ),
    },
    missingHost: {
      blockers: [
        { code: 'ROBOT_USB_SERIAL_UNAVAILABLE' },
        { code: 'IOS_DEVICE_UNAVAILABLE' },
        { code: 'ANDROID_ADB_UNAVAILABLE' },
      ],
    },
  };
}

function listCuPorts() {
  try {
    return fs.readdirSync('/dev')
      .filter(name => name.startsWith('cu.'))
      .map(name => `/dev/${name}`)
      .sort();
  } catch {
    return [];
  }
}

function isLikelyEspSerialPort(port) {
  if (/Bluetooth|debug-console/i.test(port)) return false;
  return /usbmodem|usbserial|wchusbserial|SLAB_USBtoUART|cu\.serial/i.test(port);
}

function commandExists(command) {
  return runCommand('/usr/bin/env', ['sh', '-lc', `command -v ${shellQuote(command)}`]).ok;
}

function runCommand(command, commandArgs) {
  try {
    return {
      ok: true,
      stdout: execFileSync(command, commandArgs, {
        cwd: MOBILE_ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 15000,
      }),
      stderr: '',
    };
  } catch (error) {
    return {
      ok: false,
      stdout: String(error.stdout ?? ''),
      stderr: String(error.stderr ?? error.message ?? ''),
    };
  }
}

function readIfExists(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function shellQuote(value) {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function printTextReport(report) {
  console.log(`Physical provisioning smoke: ${report.status}`);
  console.log(`Platform: ${report.platform}`);
  console.log(`Pairing link: ${report.pairingDeepLink}`);
  console.log(`Firmware: ${report.firmware.detail}`);
  console.log(`Robot USB: ${report.robot.detail}`);
  if (report.ios) console.log(`iOS: ${report.ios.detail}`);
  if (report.android) console.log(`Android: ${report.android.detail}`);
  console.log(`Credentials: ssid=${report.credentials.ssid}, password=${report.credentials.password}`);
  if (report.blockers.length > 0) {
    console.log('Blockers:');
    for (const blocker of report.blockers) console.log(`- ${blocker.code}: ${blocker.detail}`);
  }
  console.log('Operator steps:');
  report.operatorSteps.forEach((step, index) => console.log(`${index + 1}. ${step}`));
}
