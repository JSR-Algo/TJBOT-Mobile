import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const reanimatedCmakePath = new URL(
  '../../node_modules/react-native-reanimated/android/CMakeLists.txt',
  import.meta.url,
);

test('Reanimated links Worklets through its Prefab target', async () => {
  const cmake = await readFile(reanimatedCmakePath, 'utf8');

  assert.doesNotMatch(
    cmake,
    /android\/build\/intermediates\/cmake/,
    'Reanimated must not import libworklets.so from an AGP intermediate path',
  );
  assert.match(cmake, /find_package\(react-native-worklets REQUIRED CONFIG\)/);
  assert.match(cmake, /react-native-worklets::worklets/);
});
