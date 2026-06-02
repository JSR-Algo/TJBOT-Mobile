#!/usr/bin/env node
// scan-hardcoded.mjs
// AST-backed i18n gate for the React Native app. Flags likely user-facing
// literals in screen JSX, accessibility props, and feature-copy object/call
// positions unless they are present in src/services/i18n/locales/en.json or
// explicitly allowlisted.

import fs from 'node:fs';
import path from 'node:path';
import globPkg from 'glob';
import ts from 'typescript';

const { sync: globSync } = globPkg;

const args = process.argv.slice(2);
const rootArgIndex = args.indexOf('--root');
const ROOT = rootArgIndex >= 0 && args[rootArgIndex + 1]
  ? path.resolve(args[rootArgIndex + 1])
  : process.cwd();
const LOCALES = path.join(ROOT, 'src/services/i18n/locales');
const ALLOWLIST_PATH = path.join(ROOT, 'scripts/i18n/.i18n-allowlist');

const asJson = args.includes('--json');
const writeReport = args.includes('--report');

const JSX_COPY_ATTRS = new Set([
  'accessibilityHint',
  'accessibilityLabel',
  'alt',
  'aria-label',
  'body',
  'caption',
  'cta',
  'heading',
  'label',
  'placeholder',
  'right',
  'subtitle',
  'title',
]);

const FEATURE_COPY_PROPS = new Set([
  'accessibilityLabel',
  'body',
  'copy',
  'description',
  'detail',
  'empty',
  'error',
  'footer',
  'header',
  'heading',
  'label',
  'message',
  'name',
  'placeholder',
  'reason',
  's',
  'status',
  'sub',
  't',
  'text',
  'title',
  'value',
]);

const FEATURE_COPY_CALLS = new Set([
  'setEmailError',
  'setError',
  'setGeneralError',
  'setMessage',
  'setPasswordError',
  'setResetMessage',
]);

const TRANSLATABLE_COMPONENTS = new Set([
  'Box',
  'CircleBtn',
  'DeviceBigBtn',
  'PasswordInput',
  'Pressable',
  'PrimaryCTA',
  'PrivacyActionButton',
  'Text',
]);

const enPath = path.join(LOCALES, 'en.json');
if (!fs.existsSync(enPath)) {
  throw new Error(`Missing EN locale catalog: ${enPath}`);
}

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const EN_KEYS = new Set(Object.keys(en).filter(key => !key.startsWith('_')));
const EN_VALUES = new Set(
  Object.values(en)
    .filter(value => typeof value === 'string')
    .map(value => value.trim())
    .filter(Boolean),
);

const allowlist = new Set();
if (fs.existsSync(ALLOWLIST_PATH)) {
  fs.readFileSync(ALLOWLIST_PATH, 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .forEach(line => allowlist.add(line));
}

function isCatalogued(text) {
  const trimmed = text.trim();
  return EN_KEYS.has(trimmed) || EN_VALUES.has(trimmed);
}

function isAllowlisted(text) {
  return allowlist.has(text.trim());
}

function isLikelyI18nKey(text) {
  return /^[a-z][a-z0-9_-]*(\.[a-zA-Z0-9_-]+)+$/.test(text.trim());
}

function isDataLike(text) {
  const t = text.trim();
  if (/^(https?:|mailto:|tel:|@\/|\.\.?\/|\/)/.test(t)) return true;
  if (/^#[0-9a-fA-F]{3,8}$/.test(t)) return true;
  if (/^\d+(\.\d+)?(px|rem|em|%|s|ms|MB|GB|GHz|°C)?$/.test(t)) return true;
  if (/^\$\d+(\.\d{2})?$/.test(t)) return true;
  if (/^[A-Z][A-Z0-9_]+$/.test(t)) return true;
  if (/^[a-z][a-z0-9_]*_[a-z0-9_]+$/.test(t)) return true;
  if (/^(rgba?|hsla?|linear-gradient|var)\(/.test(t)) return true;
  if (/^[\d.\s,a-fA-F#%():/-]+$/.test(t) && /\d/.test(t)) return true;
  if (t.length <= 3 && /\p{Extended_Pictographic}/u.test(t)) return true;
  return false;
}

function hasHumanLetters(text) {
  return /[A-Za-zÀ-ỹ]/u.test(text);
}

function isSingleIdentifier(text) {
  const t = text.trim();
  return !/\s/.test(t) && /^[A-Za-z][A-Za-z0-9_-]*$/.test(t);
}

function isHardcodedCandidate(text) {
  const t = text.trim().replace(/\s+/g, ' ');
  if (!t || t.length < 2) return false;
  if (!hasHumanLetters(t)) return false;
  if (isAllowlisted(t) || isCatalogued(t)) return false;
  if (isLikelyI18nKey(t) || isDataLike(t)) return false;
  if (isSingleIdentifier(t)) return false;
  return true;
}

function cleanJsxText(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function lineOf(sourceFile, node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function tagNameOf(node) {
  const tagName = node.tagName;
  if (!tagName) return '';
  return tagName.getText().split('.').pop() ?? '';
}

function attributeNameOf(node) {
  return node.name.getText();
}

function literalText(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }

  if (ts.isJsxExpression(node) && node.expression) {
    return literalText(node.expression);
  }

  return null;
}

function propertyNameOf(name) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return name.getText();
}

function calleeNameOf(expression) {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  return '';
}

function addFinding(findings, sourceFile, relFile, node, kind, text) {
  const normalized = text.trim().replace(/\s+/g, ' ');
  if (!isHardcodedCandidate(normalized)) return;
  findings.push({ file: relFile, line: lineOf(sourceFile, node), kind, text: normalized });
}

function scanFile(relFile) {
  const absFile = path.join(ROOT, relFile);
  const sourceText = fs.readFileSync(absFile, 'utf8');
  const sourceKind = relFile.endsWith('.jsx') ? ts.ScriptKind.JSX : ts.ScriptKind.TSX;
  const sourceFile = ts.createSourceFile(relFile, sourceText, ts.ScriptTarget.Latest, true, sourceKind);
  const findings = [];
  const isFeatureFile = relFile.startsWith('src/features/');

  function visit(node) {
    if (ts.isJsxText(node)) {
      addFinding(findings, sourceFile, relFile, node, 'jsx-text', cleanJsxText(node.getText()));
    }

    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const componentName = tagNameOf(node);
      for (const prop of node.attributes.properties) {
        if (!ts.isJsxAttribute(prop)) continue;
        const attrName = attributeNameOf(prop);
        if (!JSX_COPY_ATTRS.has(attrName)) continue;
        if (!prop.initializer) continue;

        const text = literalText(prop.initializer);
        if (text === null) continue;
        const isRuntimeTranslated = TRANSLATABLE_COMPONENTS.has(componentName) && isCatalogued(text);
        if (isRuntimeTranslated) continue;
        addFinding(findings, sourceFile, relFile, prop, `jsx-attr:${attrName}`, text);
      }
    }

    if (isFeatureFile && ts.isPropertyAssignment(node)) {
      const propName = propertyNameOf(node.name);
      if (FEATURE_COPY_PROPS.has(propName)) {
        const text = literalText(node.initializer);
        if (text !== null) {
          addFinding(findings, sourceFile, relFile, node, `prop:${propName}`, text);
        }
      }
    }

    if (isFeatureFile && ts.isCallExpression(node)) {
      const calleeName = calleeNameOf(node.expression);
      if (FEATURE_COPY_CALLS.has(calleeName)) {
        for (const arg of node.arguments) {
          const text = literalText(arg);
          if (text !== null) {
            addFinding(findings, sourceFile, relFile, arg, `call:${calleeName}`, text);
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return findings;
}

const filesToScan = globSync('src/**/*.{jsx,tsx}', {
  cwd: ROOT,
  ignore: ['src/**/*.test.{jsx,tsx}', 'src/**/*.spec.{jsx,tsx}'],
  nodir: true,
}).sort();

const findings = filesToScan.flatMap(scanFile);

if (writeReport) {
  const reportPath = path.join(ROOT, 'scripts/i18n/last-scan.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify({ count: findings.length, findings }, null, 2));
}

if (asJson) {
  console.log(JSON.stringify({ count: findings.length, findings }, null, 2));
} else {
  const byFile = new Map();
  for (const finding of findings) {
    if (!byFile.has(finding.file)) byFile.set(finding.file, []);
    byFile.get(finding.file).push(finding);
  }

  for (const [file, items] of [...byFile.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n${file}  (${items.length})`);
    const cap = 12;
    for (const item of items.slice(0, cap)) {
      console.log(`  ${String(item.line).padStart(4)} ${item.kind.padEnd(28)} ${JSON.stringify(item.text).slice(0, 80)}`);
    }
    if (items.length > cap) console.log(`  ... +${items.length - cap} more`);
  }

  console.log(`\nTOTAL hardcoded (not in en.json, not allowlisted): ${findings.length}`);
}

process.exit(findings.length > 0 ? 1 : 0);
