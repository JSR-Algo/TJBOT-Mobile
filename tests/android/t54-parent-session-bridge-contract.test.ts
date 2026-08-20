import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../..');
const bridgePath = path.join(
  root,
  'android/app/src/androidTest/java/com/tjbotmobile/t54/ParentSessionAssignmentBridgeTest.java',
);
const contractPath = path.join(
  root,
  'android/app/src/androidTest/java/com/tjbotmobile/t54/T54AssignmentContract.java',
);
const secureStorePath = path.join(
  root,
  'android/app/src/androidTest/java/com/tjbotmobile/t54/T54SecureStoreReader.java',
);

describe('T5.4 Parent session assignment bridge contract', () => {
  it('is a fixed-identity, live-route, exactly-once test-only bridge', () => {
    const bridge = fs.readFileSync(bridgePath, 'utf8');
    const contract = fs.readFileSync(contractPath, 'utf8');
    const secureStore = fs.readFileSync(secureStorePath, 'utf8');
    const all = `${bridge}\n${contract}\n${secureStore}`;

    expect(contract).toContain('91deb5af-c1c0-416b-956d-266d510eac5e');
    expect(contract).toContain('2bbcd940-f9da-47cf-8a99-f1eaf2380e8c');
    expect(contract).toContain('w02-feelings');
    expect(contract).toContain('LESSON_VERSION = 7');
    expect(contract).toContain('PROFILE = "espTft"');
    expect(bridge).toContain('PASS50');
    expect(bridge).toContain('waitForActiveRoot');
    expect(bridge).toContain('getUiAutomation()');
    expect(bridge).toContain('Hôm nay');
    expect(bridge).toContain('Trạng thái bài học trực tiếp');
    expect(bridge).toContain('Hiện không có bài học nào đang diễn ra');
    expect(secureStore).toContain('getSharedPreferences("SecureStore"');
    expect(secureStore).toContain('AndroidKeyStore');
    expect(secureStore).toContain('AES/GCM/NoPadding');
    expect(all.match(/setRequestMethod\("POST"\)/g)).toHaveLength(1);
    expect(bridge).toContain('setInstanceFollowRedirects(false)');
    expect(bridge).toContain('getExternalFilesDir(null)');
    expect(all).not.toMatch(/Log\.[a-z]+\([^\n]*(accessToken|refreshToken|token)/i);
    expect(all).not.toMatch(/System\.out\.print[^\n]*(accessToken|refreshToken|token)/i);
  });
});
