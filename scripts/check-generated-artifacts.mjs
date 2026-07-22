#!/usr/bin/env node

import { execFileSync } from 'node:child_process';

const forbidden = [
  { match: (path) => path === '.env', label: '.env' },
  { match: (path) => path === '.DS_Store' || path.endsWith('/.DS_Store'), label: '.DS_Store' },
  { match: (path) => path.startsWith('ios/Pods/'), label: 'ios/Pods/' },
  { match: (path) => path.startsWith('ios/build/'), label: 'ios/build/' },
  { match: (path) => path.startsWith('ios/build-sim/'), label: 'ios/build-sim/' },
  { match: (path) => path.startsWith('ios/build-device/'), label: 'ios/build-device/' },
  { match: (path) => path === 'ios/.xcode.env.local', label: 'ios/.xcode.env.local' },
  { match: (path) => path === 'DerivedData' || path.startsWith('DerivedData/') || path.includes('/DerivedData/'), label: 'DerivedData/' },
  { match: (path) => path === '.build' || path.startsWith('.build/') || path.includes('/.build/'), label: '.build/' },
  { match: (path) => path.includes('/ModuleCache.noindex/') || path.startsWith('ModuleCache.noindex/'), label: 'ModuleCache.noindex/' },
  { match: (path) => path.includes('/CompilationCache.noindex/') || path.startsWith('CompilationCache.noindex/'), label: 'CompilationCache.noindex/' },
  { match: (path) => path.includes('/SDKStatCaches.noindex/') || path.startsWith('SDKStatCaches.noindex/'), label: 'SDKStatCaches.noindex/' },
  { match: (path) => path.includes('.xcarchive/'), label: '*.xcarchive/' },
  { match: (path) => path.includes('.xcresult/'), label: '*.xcresult/' },
  { match: (path) => path.includes('.dSYM/') || path.endsWith('.dSYM.zip'), label: '*.dSYM/' },
  { match: (path) => path.endsWith('.xcuserstate'), label: '*.xcuserstate' },
  { match: (path) => path.startsWith('xcuserdata/') || path.includes('/xcuserdata/'), label: 'xcuserdata/' },
  { match: (path) => path.endsWith('.xccheckout'), label: '*.xccheckout' },
  { match: (path) => path.endsWith('.xcscmblueprint'), label: '*.xcscmblueprint' },
  { match: (path) => path.endsWith('.moved-aside'), label: '*.moved-aside' },
  { match: (path) => path.endsWith('.pbxuser') && !path.endsWith('/default.pbxuser') && path !== 'default.pbxuser', label: '*.pbxuser' },
  { match: (path) => /\.(mode1v3|mode2v3|perspectivev3)$/.test(path) && !path.endsWith('/default.mode1v3') && !path.endsWith('/default.mode2v3') && !path.endsWith('/default.perspectivev3') && !path.startsWith('default.'), label: 'Xcode per-user view state' },
  { match: (path) => path.startsWith('output/maestro/'), label: 'output/maestro/' },
];

const isForbiddenPath = (path) => forbidden.some(({ match }) => match(path));
const blockedFixtures = [
  '.env',
  '.DS_Store',
  'ios/Pods/Manifest.lock',
  'ios/build/Build/Products/app',
  'ios/build-sim/ModuleCache.noindex/cache.pcm',
  'ios/build-device/CompilationCache.noindex/cache',
  'ios/.xcode.env.local',
  'DerivedData/TJBot/Build/app',
  'ios/DerivedData/TJBot/Build/app',
  'ios/.build/checkouts/package/file',
  'ios/ModuleCache.noindex/cache.pcm',
  'ios/CompilationCache.noindex/cache',
  'ios/SDKStatCaches.noindex/cache',
  'artifacts/TJBot.xcarchive/Info.plist',
  'artifacts/tests.xcresult/Info.plist',
  'artifacts/TJBot.app.dSYM/Contents/Info.plist',
  'artifacts/TJBot.app.dSYM.zip',
  'ios/TJBotMobile.xcodeproj/project.xcworkspace/xcuserdata/user.xcuserdatad/UserInterfaceState.xcuserstate',
  'ios/TJBotMobile.xcodeproj/project.xcworkspace/xcshareddata/IDEWorkspaceChecks.plist.xccheckout',
  'ios/user.pbxuser',
  'ios/user.mode1v3',
  'output/maestro/home.png',
];
const allowedFixtures = [
  'ios/TJBotMobile.xcodeproj/project.pbxproj',
  'ios/TJBotMobile.xcworkspace/contents.xcworkspacedata',
  'ios/TJBotMobile.xcodeproj/xcshareddata/xcschemes/TJBotMobile.xcscheme',
  'ios/TJBotMobile/AppDelegate.swift',
  'ios/default.pbxuser',
  'ios/default.mode1v3',
];
const missed = blockedFixtures.filter((path) => !isForbiddenPath(path));
const falsePositives = allowedFixtures.filter(isForbiddenPath);
let ignoredFixtureOutput;
try {
  ignoredFixtureOutput = execFileSync(
    'git',
    ['check-ignore', '--no-index', '--stdin', '-z'],
    {
      encoding: 'utf8',
      input: `${[...blockedFixtures, ...allowedFixtures].join('\0')}\0`,
    },
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Generated-artifact guard could not verify .gitignore: ${message}`);
  process.exit(2);
}
const ignoredFixtures = new Set(ignoredFixtureOutput.split('\0').filter(Boolean));
const ignoreMisses = blockedFixtures.filter((path) => !ignoredFixtures.has(path));
const ignoreFalsePositives = allowedFixtures.filter((path) => ignoredFixtures.has(path));

if (missed.length > 0 || falsePositives.length > 0 || ignoreMisses.length > 0 || ignoreFalsePositives.length > 0) {
  console.error('Generated-artifact guard policy validation failed.');
  for (const path of missed) console.error(`MISSED: ${path}`);
  for (const path of falsePositives) console.error(`FALSE POSITIVE: ${path}`);
  for (const path of ignoreMisses) console.error(`NOT IGNORED: ${path}`);
  for (const path of ignoreFalsePositives) console.error(`WRONGLY IGNORED: ${path}`);
  process.exit(1);
}

if (process.argv.includes('--self-test')) {
  console.log(`Generated-artifact guard self-test passed (${blockedFixtures.length} blocked, ${allowedFixtures.length} allowed).`);
  process.exit(0);
}

const checkTrackedTree = process.argv.includes('--tracked');
if (!checkTrackedTree) {
  try {
    const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
    const repoLabel = repoRoot.split('/').filter(Boolean).at(-1);
    execFileSync(
      'gitnexus',
      ['detect-changes', '--repo', repoLabel, '--scope', 'staged', '--limit', '100'],
      { stdio: 'inherit' },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Generated-artifact guard requires staged GitNexus analysis: ${message}`);
    process.exit(2);
  }
}
const gitArgs = checkTrackedTree
  ? ['ls-files', '-z']
  : ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'];

let output;
try {
  output = execFileSync('git', gitArgs, { encoding: 'utf8' });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Generated-artifact guard could not inspect Git: ${message}`);
  process.exit(2);
}

const paths = output.split('\0').filter(Boolean);
const violations = paths.filter(isForbiddenPath);

if (violations.length > 0) {
  console.error('Generated-artifact guard blocked forbidden Git paths:');
  for (const path of violations) {
    console.error(`- ${path}`);
  }
  console.error('Keep local environment, Xcode caches, and Maestro screenshots outside Git.');
  process.exit(1);
}

const mode = checkTrackedTree ? 'tracked tree' : 'staged additions/modifications';
console.log(`Generated-artifact guard: ${mode} clean (${paths.length} paths checked).`);
