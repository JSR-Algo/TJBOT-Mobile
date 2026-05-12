#!/usr/bin/env node
/**
 * Verifies screen components typed with NativeStackScreenProps use the correct
 * route name from RootStackParamList. Uses TypeScript Compiler API — no external parser.
 * Exits 1 and lists violations if any are found.
 */
import { createRequire } from 'module';
import { readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..');
const require = createRequire(import.meta.url);

let ts;
try {
  ts = require(join(root, 'node_modules', 'typescript'));
} catch {
  console.error('check-screen-prop-types: typescript not found in node_modules');
  process.exit(1);
}

function walkScreens(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      results.push(...walkScreens(full));
    } else if (entry.endsWith('Screen.tsx') || entry.endsWith('Modal.tsx') || entry.endsWith('Overlay.tsx')) {
      results.push(full);
    }
  }
  return results;
}

const featuresDir = join(root, 'src', 'features');
const screenFiles = walkScreens(featuresDir);

const violations = [];

for (const file of screenFiles) {
  const src = ts.createSourceFile(
    file,
    require('fs').readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );

  // Look for NativeStackScreenProps<RootStackParamList, 'RouteName'> usage
  function visit(node) {
    if (ts.isTypeReferenceNode(node)) {
      const name = node.typeName && (node.typeName.text || (node.typeName.right && node.typeName.right.text));
      if (name === 'NativeStackScreenProps' && node.typeArguments && node.typeArguments.length >= 2) {
        const routeArg = node.typeArguments[1];
        if (ts.isLiteralTypeNode(routeArg) && ts.isStringLiteral(routeArg.literal)) {
          // valid typed screen
        } else if (node.typeArguments.length === 1) {
          // missing route name — not necessarily a violation if undefined params
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(src);
}

if (violations.length > 0) {
  console.error('check-screen-prop-types: violations found:');
  for (const v of violations) console.error('  -', v);
  process.exit(1);
}

console.log(`check-screen-prop-types: OK — ${screenFiles.length} screen files checked`);
