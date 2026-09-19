import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const mobile = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const detail = 'src/features/course-library/screens/CourseDetailScreen.tsx';

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'screen-props-'));
  const files = ['tsconfig.json', 'src/navigation/routes.ts', 'src/navigation/types.ts',
    'src/features/course-library/navigation.ts', 'scripts/check-screen-prop-types.mjs'];
  const visit = dir => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const file = join(dir, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (/(Screen|Modal|Overlay)\.tsx$/.test(entry.name)) files.push(relative(mobile, file));
    }
  };
  visit(join(mobile, 'src/features/course-library'));
  const helper = 'scripts/_lib/screen-prop-analysis.mjs';
  if (existsSync(join(mobile, helper))) files.push(helper);
  for (const file of files) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    copyFileSync(join(mobile, file), join(root, file));
  }
  symlinkSync(join(mobile, 'node_modules'), join(root, 'node_modules'), 'dir');
  return root;
}

function run(root) {
  const result = spawnSync(process.execPath, [join(root, 'scripts/check-screen-prop-types.mjs')], {
    cwd: root, encoding: 'utf8', timeout: 30000,
  });
  assert.ifError(result.error);
  return result;
}

function edit(root, file, before, after) {
  const path = join(root, file);
  const text = readFileSync(path, 'utf8');
  assert.ok(text.includes(before));
  writeFileSync(path, text.replace(before, after));
}

test('rejects a real registered screen using another valid route key', () => {
  const root = fixture();
  try {
    edit(root, detail, "NativeStackScreenProps<RootStackParamList, 'CourseDetailScreen'>",
      "NativeStackScreenProps<RootStackParamList, 'CourseLibraryScreen'>");
    const result = run(root);
    assert.equal(result.status, 1, 'valid route membership alone must not pass G10');
    assert.match(result.stderr, /CourseDetailScreen\.tsx:\d+.*expected CourseDetailScreen.*actual CourseLibraryScreen/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('accepts original registrations, navigation-only props and actual optional error props', () => {
  const root = fixture();
  try {
    const extra = 'src/features/fallback/screens/AppErrorScreen.tsx';
    mkdirSync(dirname(join(root, extra)), { recursive: true });
    copyFileSync(join(mobile, extra), join(root, extra));
    const result = run(root);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /scanned=13 typed=13 registered=12 unregistered=1 violations=0/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

const invalid = [
  ['unused correct Props with untyped parameter', ': Props) {', ') {', /actual untyped/],
  ['unused correct Props with wrong parameter', ': Props) {', ': { navigation: object; route: object }) {', /unsupported component prop annotation/],
  ['missing route argument', "NativeStackScreenProps<RootStackParamList, 'CourseDetailScreen'>", 'NativeStackScreenProps<RootStackParamList>', /missing NativeStackScreenProps route argument/],
  ['parse error', 'type Props =', 'type Props = ; const broken = (', /parse error/],
  ['fake same-spelled native type', "import type { NativeStackScreenProps } from '@react-navigation/native-stack';",
    "type NativeStackScreenProps<P, R> = { navigation: object; route: object };", /unsupported prop type; expected actual NativeStackScreenProps/],
  ['fake same-spelled root list', "import type { RootStackParamList } from '@/navigation/routes';",
    "type RootStackParamList = { CourseDetailScreen: undefined };", /actual RootStackParamList/],
  ['intersection navigation override', "NativeStackScreenProps<RootStackParamList, 'CourseDetailScreen'>;",
    "NativeStackScreenProps<RootStackParamList, 'CourseDetailScreen'> & { navigation: never };", /navigation\/route override/],
];
for (const [label, before, after, diagnostic] of invalid) {
  test('rejects ' + label, () => {
    const root = fixture();
    try {
      edit(root, detail, before, after);
      const result = run(root);
      assert.equal(result.status, 1, result.stdout);
      assert.match(result.stderr, diagnostic);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
}

test('resolves imported type, route and component aliases with a typed _props parameter', () => {
  const root = fixture();
  try {
    edit(root, detail, "import type { NativeStackScreenProps }", "import type { NativeStackScreenProps as ScreenProps }");
    edit(root, detail, "import type { RootStackParamList }", "import type { RootStackParamList as Params }");
    edit(root, detail, "NativeStackScreenProps<RootStackParamList, 'CourseDetailScreen'>", "ScreenProps<Params, 'CourseDetailScreen'>");
    edit(root, detail, '({ navigation, route }: Props)', '(_props: Props)');
    const metadata = 'src/features/course-library/navigation.ts';
    edit(root, metadata, 'import CourseDetailScreen from', 'import Detail from');
    edit(root, metadata, 'component: CourseDetailScreen', 'component: Detail');
    edit(root, metadata, "import { ROUTES }", "import { ROUTES as NAMES }");
    const file = join(root, metadata);
    writeFileSync(file, readFileSync(file, 'utf8').replaceAll('ROUTES.', 'NAMES.'));
    const result = run(root);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /typed=12 registered=12.*violations=0/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('rejects one missing metadata module while other real registrations and registry imports remain', () => {
  const root = fixture();
  try {
    cpSync(join(mobile, 'src'), join(root, 'src'), { recursive: true });
    const control = run(root);
    assert.equal(control.status, 0, control.stderr);
    assert.match(control.stdout, /scanned=135 typed=135 registered=127 unregistered=8 violations=0/);
    rmSync(join(root, 'src/features/course-library/navigation.ts'));
    const result = run(root);
    assert.equal(result.status, 1, result.stdout);
    assert.match(result.stderr, /featureRegistry\.ts:\d+.*missing required navigation module.*course-library\/navigation/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

for (const [label, change] of [
  ['missing routes', root => rmSync(join(root, 'src/navigation/routes.ts'))],
  ['empty routes', root => writeFileSync(join(root, 'src/navigation/routes.ts'), '')],
  ['empty feature tree', root => { rmSync(join(root, 'src/features'), { recursive: true }); mkdirSync(join(root, 'src/features')); }],
  ['missing metadata', root => rmSync(join(root, 'src/features/course-library/navigation.ts'))],
  ['empty metadata', root => writeFileSync(join(root, 'src/features/course-library/navigation.ts'), '')],
  ['missing registered component', root => rmSync(join(root, detail))],
  ['unsupported component export', root => edit(root, detail, 'export default function CourseDetailScreen', 'function CourseDetailScreen')],
]) {
  test('fails required input: ' + label, () => {
    const root = fixture();
    try {
      change(root);
      const result = run(root);
      assert.equal(result.status, 1, result.stdout);
      assert.ok(result.stderr.trim());
      assert.equal(result.stdout.includes('PASS component'), false);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
}
