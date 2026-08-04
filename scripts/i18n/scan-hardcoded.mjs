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
  'prompt',
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
  'alert',
  'setEmailError',
  'setError',
  'setGeneralError',
  'setMessage',
  'setPasswordError',
  'setResetMessage',
  'resolveGeminiUserError',
]);

const TRANSLATABLE_COMPONENTS = new Set([
  'Box',
  'Button',
  'CircleBtn',
  'DeviceBigBtn',
  'DeviceRow',
  'DeviceShell',
  'Icon',
  'Input',
  'IntroFrame',
  'MicButton',
  'OnbBigBtn',
  'OnbShell',
  'ParentScroll',
  'ParentStateCard',
  'PasswordInput',
  'PageHeader',
  'PRow',
  'PRowGroup',
  'Pressable',
  'PrimaryCTA',
  'PrivacyActionButton',
  'PurchaseStatusCard',
  'Robot',
  'RobotImage',
  'Section',
  'SettingRow',
  'StatChip',
  'StatusCard',
  'Text',
  'ToggleRow',
  'TopBar',
]);

const TRANSLATION_CALLS = new Set([
  't',
  'translateCopy',
  'translateTemplate',
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
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return true;
  if (/^(https?:|mailto:|tel:|@\/|\.\.?\/|\/)/.test(t)) return true;
  if (/^#[0-9a-fA-F]{3,8}$/.test(t)) return true;
  if (/^\d+(\.\d+)?(px|rem|em|%|s|ms|MB|GB|GHz|°C)?$/.test(t)) return true;
  if (/^\$\d+(\.\d{2})?$/.test(t)) return true;
  if (/^[A-Z][A-Z0-9_]+$/.test(t)) return true;
  if (/^[a-z][a-z0-9_]*_[a-z0-9_]+$/.test(t)) return true;
  if (/^(rgba?|hsla?|linear-gradient|var)\(/.test(t)) return true;
  if (/^(?:\{\{value\d+\}\}[\s·→:.,/\-]*)+$/.test(t)) return true;
  if (/^[\d.\s,a-fA-F#%():/-]+$/.test(t) && /\d/.test(t)) return true;
  if (t.length <= 3 && /\p{Extended_Pictographic}/u.test(t)) return true;
  return false;
}

function hasHumanLetters(text) {
  return /[A-Za-zÀ-ỹ]/u.test(text);
}

function isHardcodedCandidate(text) {
  const t = text.trim().replace(/\s+/g, ' ');
  if (!t || t.length < 2) return false;
  if (!hasHumanLetters(t)) return false;
  if (isAllowlisted(t) || isCatalogued(t)) return false;
  if (isLikelyI18nKey(t) || isDataLike(t)) return false;
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

function isUntranslatedCandidate(text) {
  const normalized = text.trim().replace(/\s+/g, ' ');
  if (!normalized || normalized.length < 2) return false;
  if (!hasHumanLetters(normalized)) return false;
  if (isAllowlisted(normalized) || isLikelyI18nKey(normalized) || isDataLike(normalized)) return false;
  return true;
}

function addUntranslatedFinding(findings, sourceFile, relFile, node, kind, text) {
  const normalized = text.trim().replace(/\s+/g, ' ');
  if (!isUntranslatedCandidate(normalized)) return;
  findings.push({ file: relFile, line: lineOf(sourceFile, node), kind, text: normalized });
}

function reactNativeTextNames(sourceFile) {
  const names = new Set();
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || statement.moduleSpecifier.text !== 'react-native') continue;
    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    for (const element of bindings.elements) {
      if ((element.propertyName?.text ?? element.name.text) === 'Text') names.add(element.name.text);
    }
  }
  return names;
}

function isTranslationCall(node) {
  if (!ts.isCallExpression(node)) return false;
  return TRANSLATION_CALLS.has(calleeNameOf(node.expression));
}

function collectStaticCopy(node, declarations, seen = new Set()) {
  if (!node) return [];
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return [{ node, text: node.text, translated: false, dynamic: false }];
  }
  if (ts.isTemplateExpression(node)) {
    const text = node.head.text + node.templateSpans
      .map((span, index) => `{{value${index + 1}}}${span.literal.text}`)
      .join('');
    return [{ node, text, translated: false, dynamic: true }];
  }
  if (ts.isIdentifier(node) && declarations.has(node.text) && !seen.has(node.text)) {
    const nextSeen = new Set(seen);
    nextSeen.add(node.text);
    return collectStaticCopy(declarations.get(node.text), declarations, nextSeen);
  }
  if (ts.isParenthesizedExpression(node)
    || ts.isAsExpression(node)
    || ts.isTypeAssertionExpression(node)
    || ts.isNonNullExpression(node)
    || ts.isSatisfiesExpression(node)) {
    return collectStaticCopy(node.expression, declarations, seen);
  }
  if (ts.isConditionalExpression(node)) {
    return [
      ...collectStaticCopy(node.whenTrue, declarations, seen),
      ...collectStaticCopy(node.whenFalse, declarations, seen),
    ];
  }
  if (ts.isBinaryExpression(node)) {
    if (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
      return collectStaticCopy(node.right, declarations, seen);
    }
    if ([
      ts.SyntaxKind.BarBarToken,
      ts.SyntaxKind.QuestionQuestionToken,
      ts.SyntaxKind.PlusToken,
    ].includes(node.operatorToken.kind)) {
      const items = [
        ...collectStaticCopy(node.left, declarations, seen),
        ...collectStaticCopy(node.right, declarations, seen),
      ];
      return node.operatorToken.kind === ts.SyntaxKind.PlusToken
        ? items.map(item => ({ ...item, dynamic: true }))
        : items;
    }
    return [];
  }
  if (ts.isElementAccessExpression(node) && ts.isIdentifier(node.expression)) {
    return collectStaticCopy(node.expression, declarations, seen);
  }
  if (ts.isPropertyAccessExpression(node)) return [];
  if (ts.isCallExpression(node)) {
    if (!isTranslationCall(node)) return [];
    const translatedCopy = collectStaticCopy(node.arguments[0], declarations, seen)
      .map(item => ({ ...item, translated: true, dynamic: false }));
    if (calleeNameOf(node.expression) !== 'translateTemplate') return translatedCopy;
    return [
      ...translatedCopy,
      ...collectStaticCopy(node.arguments[1], declarations, seen),
    ];
  }
  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.flatMap(element => collectStaticCopy(element, declarations, seen));
  }
  if (ts.isObjectLiteralExpression(node)) {
    return node.properties.flatMap(property => {
      if (ts.isPropertyAssignment(property)) return collectStaticCopy(property.initializer, declarations, seen);
      if (ts.isShorthandPropertyAssignment(property)) return collectStaticCopy(property.name, declarations, seen);
      return [];
    });
  }
  return [];
}

function parentElementOfJsxExpression(node) {
  if (ts.isJsxElement(node.parent)) return node.parent.openingElement;
  if (ts.isJsxAttribute(node.parent)) return node.parent.parent.parent;
  return null;
}

function hasI18nDisabled(openingElement) {
  return openingElement.attributes.properties.some(attribute => {
    if (!ts.isJsxAttribute(attribute) || attributeNameOf(attribute) !== 'i18n') return false;
    if (!attribute.initializer) return true;
    if (ts.isStringLiteral(attribute.initializer)) return attribute.initializer.text === 'false';
    return ts.isJsxExpression(attribute.initializer)
      && attribute.initializer.expression?.kind === ts.SyntaxKind.FalseKeyword;
  });
}

function scanFile(relFile) {
  const absFile = path.join(ROOT, relFile);
  const sourceText = fs.readFileSync(absFile, 'utf8');
  const sourceKind = relFile.endsWith('.jsx') ? ts.ScriptKind.JSX : ts.ScriptKind.TSX;
  const sourceFile = ts.createSourceFile(relFile, sourceText, ts.ScriptTarget.Latest, true, sourceKind);
  const findings = [];
  const isUiFile = relFile.startsWith('src/features/')
    || relFile.startsWith('src/screens/')
    || relFile.startsWith('src/components/');
  const nativeTextNames = reactNativeTextNames(sourceFile);
  const declarations = new Map();

  function indexDeclarations(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      declarations.set(node.name.text, node.initializer);
    }
    ts.forEachChild(node, indexDeclarations);
  }

  indexDeclarations(sourceFile);

  function visit(node) {
    if (ts.isJsxText(node)) {
      const text = cleanJsxText(node.getText());
      const parentOpening = ts.isJsxElement(node.parent) ? node.parent.openingElement : null;
      const parentTag = parentOpening ? tagNameOf(parentOpening) : '';
      if (nativeTextNames.has(parentTag) || (parentOpening && hasI18nDisabled(parentOpening))) {
        addUntranslatedFinding(findings, sourceFile, relFile, node, 'translation-bypass:text', text);
      } else {
        addFinding(findings, sourceFile, relFile, node, 'jsx-text', text);
      }
    }

    if (ts.isJsxExpression(node) && node.expression) {
      const parentElement = parentElementOfJsxExpression(node);
      const parentTag = parentElement ? tagNameOf(parentElement) : '';
      const bypassesTranslation = ts.isJsxElement(node.parent)
        && (nativeTextNames.has(parentTag) || (parentElement && hasI18nDisabled(parentElement)));
      const isCopyAttribute = ts.isJsxAttribute(node.parent) && JSX_COPY_ATTRS.has(attributeNameOf(node.parent));
      const attributeTranslates = parentElement
        ? TRANSLATABLE_COMPONENTS.has(parentTag)
        : false;
      const isRenderedChild = ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent);

      if ((isRenderedChild || isCopyAttribute) && isTranslationCall(node.expression)) {
        for (const item of collectStaticCopy(node.expression, declarations)) {
          addFinding(findings, sourceFile, relFile, item.node, 'translation-call', item.text);
        }
      } else if (isRenderedChild || isCopyAttribute) {
        for (const item of collectStaticCopy(node.expression, declarations)) {
          if (bypassesTranslation || item.dynamic || (isCopyAttribute && !attributeTranslates)) {
            if (item.translated) {
              addFinding(findings, sourceFile, relFile, item.node, 'translation-call', item.text);
            } else {
              addUntranslatedFinding(
                findings,
                sourceFile,
                relFile,
                item.node,
                item.dynamic
                  ? 'translation-bypass:dynamic-expression'
                  : 'translation-bypass:expression',
                item.text,
              );
            }
          } else {
            addFinding(findings, sourceFile, relFile, item.node, 'jsx-expression', item.text);
          }
        }
      }
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
        if (TRANSLATABLE_COMPONENTS.has(componentName)) {
          addFinding(findings, sourceFile, relFile, prop, `jsx-attr:${attrName}`, text);
        } else {
          addUntranslatedFinding(
            findings,
            sourceFile,
            relFile,
            prop,
            `jsx-attr-untranslated:${attrName}`,
            text,
          );
        }
      }
    }

    if (ts.isPropertyAssignment(node)) {
      const propName = propertyNameOf(node.name);
      const isCopyContainer = ts.isObjectLiteralExpression(node.initializer)
        || ts.isArrayLiteralExpression(node.initializer);
      if (!isCopyContainer && ((isUiFile && FEATURE_COPY_PROPS.has(propName)) || propName === 'errorMessage')) {
        for (const item of collectStaticCopy(node.initializer, declarations)) {
          if (!item.translated) {
            addFinding(findings, sourceFile, relFile, item.node, `prop:${propName}`, item.text);
          }
        }
      }
    }

    if (ts.isCallExpression(node)) {
      const calleeName = calleeNameOf(node.expression);
      if (TRANSLATION_CALLS.has(calleeName) && node.arguments[0]) {
        for (const item of collectStaticCopy(node.arguments[0], declarations)) {
          addFinding(findings, sourceFile, relFile, item.node, 'translation-call', item.text);
        }
      }
      const scansCopy = calleeName === 'alert' || FEATURE_COPY_CALLS.has(calleeName);
      if (scansCopy) {
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

const filesToScan = globSync('src/**/*.{js,jsx,ts,tsx}', {
  cwd: ROOT,
  ignore: [
    'src/**/*.d.ts',
    'src/**/*.test.{js,jsx,ts,tsx}',
    'src/**/*.spec.{js,jsx,ts,tsx}',
    'src/**/states.ts',
    'src/navigation/inventory.ts',
  ],
  nodir: true,
}).sort();

const findings = filesToScan
  .flatMap(scanFile)
  .filter((finding, index, all) => all.findIndex(candidate => (
    candidate.file === finding.file
    && candidate.line === finding.line
    && candidate.kind === finding.kind
    && candidate.text === finding.text
  )) === index);

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
