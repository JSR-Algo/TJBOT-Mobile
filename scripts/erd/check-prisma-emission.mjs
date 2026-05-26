#!/usr/bin/env node
// check-prisma-emission.mjs — verify emitted Prisma schema vs source DBML for one folder.
//
// Phase P0 scope (per plan §10, narrowed to what P0 actually emits):
//   - Every Table in DBML has a `model <PascalCase>` in schema.prisma.
//   - Every enum in DBML has an enum in schema.prisma.
//   - Required columns (id, created_at, updated_at) present on each model.
//   - `@@map("snake_case_name")` matches the DBML table name.
//
// CLI:
//   node scripts/erd/check-prisma-emission.mjs --folder <name>
//   node scripts/erd/check-prisma-emission.mjs --all
//
// Exit code: 0 on match; 1 on drift (per-mismatch listed on stderr).

import fs from 'node:fs';
import path from 'node:path';
import { parseDbml } from './lib/parse-dbml.mjs';
import { APP_ROOT, DOCS_ROOT } from '../_lib/paths.mjs';

const PROJECT_ROOT = APP_ROOT;
const ERD_DIR = path.join(DOCS_ROOT, 'erd');

const ARGS = process.argv.slice(2);
let folder = null;
let allFolders = false;
for (let i = 0; i < ARGS.length; i++) {
  if (ARGS[i] === '--folder' && ARGS[i + 1]) folder = ARGS[++i];
  else if (ARGS[i] === '--all') allFolders = true;
}
if (!folder && !allFolders) {
  console.error('error: pass --folder <name> or --all');
  process.exit(2);
}

function rel(p) { return path.relative(PROJECT_ROOT, p); }

function pascalCase(snake) {
  return snake.split('_').map(p => p ? p[0].toUpperCase() + p.slice(1) : '').join('');
}

function listFolders() {
  return fs.readdirSync(ERD_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory() && e.name !== 'templates' && e.name !== '_global')
    .map(e => e.name)
    .sort();
}

function checkFolder(folderName) {
  const folderPath = path.join(ERD_DIR, folderName);
  const schemaPath = path.join(folderPath, 'schema.prisma');
  if (!fs.existsSync(schemaPath)) {
    console.error(`FAIL ${folderName}: missing emitted schema at ${rel(schemaPath)}`);
    return 1;
  }
  const schemaText = fs.readFileSync(schemaPath, 'utf8');

  const dbmlFiles = fs.readdirSync(folderPath)
    .filter(f => f.endsWith('.dbml'))
    .map(f => path.join(folderPath, f))
    .sort();
  if (dbmlFiles.length === 0) {
    console.error(`warn ${folderName}: no .dbml files to check`);
    return 0;
  }

  const failures = [];
  for (const dbmlPath of dbmlFiles) {
    const parsed = parseDbml(fs.readFileSync(dbmlPath, 'utf8'), dbmlPath);

    // Check tables
    for (const t of parsed.tables) {
      const modelName = pascalCase(t.name);
      const modelRe = new RegExp(`\\bmodel\\s+${modelName}\\s*\\{`);
      if (!modelRe.test(schemaText)) {
        failures.push(`missing model "${modelName}" (DBML table ${t.name})`);
        continue;
      }
      // Check @@map preserves snake_case.
      const mapRe = new RegExp(`@@map\\("${t.name}"\\)`);
      if (!mapRe.test(schemaText)) {
        failures.push(`model "${modelName}" missing @@map("${t.name}")`);
      }
      // Check required columns. Extract just this model's block.
      const blockRe = new RegExp(`model\\s+${modelName}\\s*\\{([\\s\\S]*?)^\\}`, 'm');
      const mb = schemaText.match(blockRe);
      const block = mb ? mb[1] : '';
      const colsPresent = new Set(t.columns.map(c => c.name));
      for (const req of ['id', 'created_at', 'updated_at']) {
        if (!colsPresent.has(req)) continue; // DBML doesn't have it → skip; entity-has-timestamps owns that rule
        // Prisma field uses camelCase form. Check the @map back-pointer to be definitive.
        const camel = req === 'id' ? 'id' :
          req.split('_').map((p, idx) => idx === 0 ? p : (p ? p[0].toUpperCase() + p.slice(1) : '')).join('');
        const fieldRe = new RegExp(`^\\s*${camel}\\s+`, 'm');
        if (!fieldRe.test(block)) {
          failures.push(`model "${modelName}" missing field "${camel}" (DBML column ${req})`);
        }
      }
    }

    // Check enums
    for (const e of parsed.enums) {
      const enumRe = new RegExp(`\\benum\\s+${e.name}\\s*\\{`);
      if (!enumRe.test(schemaText)) {
        failures.push(`missing enum "${e.name}" (declared in ${rel(dbmlPath)})`);
      }
    }
  }

  if (failures.length) {
    console.error(`FAIL ${folderName} (${failures.length} drift):`);
    for (const f of failures) console.error(`  - ${f}`);
    return 1;
  }
  console.log(`PASS ${folderName} — ${dbmlFiles.length} .dbml → schema.prisma in sync`);
  return 0;
}

const folders = allFolders ? listFolders() : [folder];
let bad = 0;
for (const f of folders) bad += checkFolder(f);
process.exit(bad === 0 ? 0 : 1);
