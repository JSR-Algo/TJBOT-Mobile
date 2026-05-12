#!/usr/bin/env node
// dbml-to-prisma.mjs — emit Prisma schema files from DBML.
//
// Phase P0 → P1 emitter. Implements plan §5 (type map), §6 (annotations), §7 (responsibilities).
//
// Features:
//   - Walk one folder (--folder) or every folder (--all). Dry-run prints, no write.
//   - Type mapping per plan §5.
//   - Intra-folder Refs: @relation w/ explicit name + onDelete from relationships.md cascade map.
//   - Cross-folder Refs: doc-only-comment (no @relation) — default per plan §4.
//   - Snake_case → PascalCase models + camelCase fields + @@map / @map round-trip.
//   - Hypertable annotation (`Note: '@timescaledb-hypertable ...'`) → `///` model-level doc.
//   - Immutable entities (audit-history-strategy.md immutable list) → suppress @updatedAt + doc.
//   - Polymorphic allow-list comments (audit_log, feature_flags, idempotency_keys, etc.).
//   - Soft-delete partial-index helper: `@@index([deletedAt])` + doc comment listing the WHERE.
//   - Singularization map for relation field names (replaces stripTrailingS).
//
// CLI:
//   node scripts/erd/dbml-to-prisma.mjs --folder <name>   # one folder
//   node scripts/erd/dbml-to-prisma.mjs --all             # every folder (excludes templates/_global)
//   node scripts/erd/dbml-to-prisma.mjs --folder <name> --dry-run
//
// Out of scope (deferred to later phases):
//   - prisma format / prisma validate execution (P2 — npm scripts present, npx-on-demand).
//   - Round-trip parity (P4).
//   - Partial-index `where: { deletedAt: null }` Prisma 5.x preview syntax (P2 toggle).

import fs from 'node:fs';
import path from 'node:path';
import { parseDbml } from './lib/parse-dbml.mjs';
import { readFrontmatter } from '../sequences/lib/parse-frontmatter.mjs';
import { APP_ROOT, DOCS_ROOT } from '../_lib/paths.mjs';

const PROJECT_ROOT = APP_ROOT;
const ERD_DIR = path.join(DOCS_ROOT, 'erd');

// ─── CLI parsing ────────────────────────────────────────────────────────────
const ARGS = process.argv.slice(2);
let folder = null;
let allFolders = false;
let dryRun = false;
for (let i = 0; i < ARGS.length; i++) {
  if (ARGS[i] === '--folder' && ARGS[i + 1]) { folder = ARGS[++i]; }
  else if (ARGS[i] === '--all') { allFolders = true; }
  else if (ARGS[i] === '--dry-run') { dryRun = true; }
  else if (ARGS[i] === '--help' || ARGS[i] === '-h') {
    console.log('Usage: dbml-to-prisma.mjs (--folder <name> | --all) [--dry-run]');
    process.exit(0);
  }
}
if (!folder && !allFolders) {
  console.error('error: pass --folder <name> or --all');
  process.exit(2);
}

function rel(p) { return path.relative(PROJECT_ROOT, p); }

// ─── Singularization map (relation field names) ────────────────────────────
// Plan P1 Item A: explicit map covers irregulars; default strips trailing 's' once.
// Goal: take a snake-cased plural table name → singular noun for a Prisma relation field.
const SINGULAR_OVERRIDES = {
  children: 'child',
  people: 'person',
  identities: 'identity',
  indices: 'index',
  // Non-plural names — keep verbatim.
  audit_log: 'audit_log',
  audit_events: 'audit_event',
  admin_commands: 'admin_command',
  audit_history: 'audit_history',
  // Compound plurals — last segment is what to singularize.
  mfa_secrets: 'mfa_secret',
  idempotency_keys: 'idempotency_key',
  password_reset_tokens: 'password_reset_token',
  email_verifications: 'email_verification',
  household_members: 'household_member',
  device_heartbeats: 'device_heartbeat',
  device_pairings: 'device_pairing',
  device_transfers: 'device_transfer',
  device_decommissions: 'device_decommission',
  auth_sessions: 'auth_session',
  refresh_tokens: 'refresh_token',
  stripe_customers: 'stripe_customer',
  stripe_webhook_events: 'stripe_webhook_event',
  subscription_plans: 'subscription_plan',
  subscriptions: 'subscription',
  entitlements: 'entitlement',
  invoices: 'invoice',
  orders: 'order',
  order_items: 'order_item',
  feature_flags: 'feature_flag',
  outbox_events: 'outbox_event',
  i18n_strings: 'i18n_string',
  media_assets: 'media_asset',
  users: 'user',
  households: 'household',
};
function singularize(snake) {
  if (SINGULAR_OVERRIDES[snake]) return SINGULAR_OVERRIDES[snake];
  // Default: drop trailing 's' if word ends in 's' (not 'ss', not 'us').
  if (/s$/.test(snake) && !/ss$/.test(snake) && !/us$/.test(snake)) {
    return snake.replace(/s$/, '');
  }
  return snake;
}

// ─── Cascade map (relationships.md §intra-folder) ──────────────────────────
// Plan P1 Item B. Source of truth is docs/erd/_global/relationships.md cascade column.
// Hard-coded data table — parsing the markdown table is brittle; the map is small.
// Format: `${leftTable}.${leftCol}->${rightTable}.${rightCol}` → cascade verb.
const CASCADE_MAP = {
  // 01-identity
  'auth_sessions.user_id->users.id': 'cascade',
  'children.household_id->households.id': 'cascade-delete-coppa',
  'email_verifications.user_id->users.id': 'cascade',
  'household_members.household_id->households.id': 'cascade-soft',
  'household_members.user_id->users.id': 'cascade-soft',
  'household_members.invited_by_user_id->users.id': 'restrict',
  'households.primary_parent_id->users.id': 'restrict',
  'mfa_secrets.user_id->users.id': 'cascade',
  'password_reset_tokens.user_id->users.id': 'cascade',
  'refresh_tokens.auth_session_id->auth_sessions.id': 'cascade',
  'refresh_tokens.rotated_to_id->refresh_tokens.id': 'restrict',
  // 02-device
  'device_decommissions.device_id->devices.id': 'restrict',
  'device_heartbeats.device_id->devices.id': 'cascade',
  'device_pairings.device_id->devices.id': 'cascade',
  'device_transfers.device_id->devices.id': 'restrict',
  // 04-realtime
  'session_turns.session_id->sessions.id': 'cascade',
  'session_transcripts.session_turn_id->session_turns.id': 'cascade',
  'session_transcripts.session_id->sessions.id': 'cascade',
  'provider_failover_records.session_id->sessions.id': 'cascade',
  'provider_failover_records.session_turn_id->session_turns.id': 'cascade',
  // 05-safety
  'safety_events.topic_id->safety_topics.id': 'restrict',
  'safety_events.fallback_template_id->fallback_templates.id': 'restrict',
  'safety_pii_redactions.safety_event_id->safety_events.id': 'cascade',
  // 06-content
  'levels.course_id->courses.id': 'cascade',
  'units.level_id->levels.id': 'cascade',
  'lessons.unit_id->units.id': 'cascade',
  'activities.lesson_id->lessons.id': 'cascade',
  'words.lesson_id->lessons.id': 'cascade',
  'words.activity_id->activities.id': 'cascade',
  'topics.parent_id->topics.id': 'restrict',
  'topic_decay_state.topic_id->topics.id': 'restrict',
  // 08-config
  'config_assignments.cohort_id->config_cohorts.id': 'restrict',
  'config_assignments.config_version_id->config_versions.id': 'restrict',
  'config_documents.current_version_id->config_versions.id': 'restrict',
  'config_push_events.document_id->config_documents.id': 'cascade',
  'config_push_events.version_id->config_versions.id': 'restrict',
  'config_versions.document_id->config_documents.id': 'cascade',
  'config_versions.signing_key_id->config_signing_keys.id': 'restrict',
  // 09-ota
  'ota_assignments.release_id->ota_releases.id': 'cascade',
  'ota_assignments.ota_cohort_id->ota_cohorts.id': 'cascade',
  'ota_crash_reports.assignment_id->ota_assignments.id': 'restrict',
  'ota_crash_reports.release_id->ota_releases.id': 'restrict',
  'ota_pause_decisions.release_id->ota_releases.id': 'restrict',
  // 10-notifications
  'email_sends.dispatch_id->notification_dispatches.id': 'cascade',
  'notification_receipts.dispatch_id->notification_dispatches.id': 'cascade',
  // 12-admin
  'admin_commands.admin_user_id->admin_users.id': 'restrict',
  'admin_role_assignments.admin_user_id->admin_users.id': 'restrict',
  'admin_role_assignments.granted_by_admin_id->admin_users.id': 'restrict',
  'admin_sessions.admin_user_id->admin_users.id': 'cascade',
  'safety_investigations.reported_by_admin_id->admin_users.id': 'restrict',
  // 13-security
  'key_rotations.kms_key_id->kms_keys.id': 'restrict',
  'kms_keys.rotated_from_id->kms_keys.id': 'restrict',
  'secret_versions.envelope_kms_key_id->kms_keys.id': 'restrict',
  // 14-retention
  'deletion_jobs.deletion_request_id->deletion_requests.id': 'restrict',
  // 15-manufacturing
  'factory_test_results.factory_record_id->factory_records.id': 'cascade',
  // 19-billing
  'entitlements.subscription_id->subscriptions.id': 'cascade-soft',
  'invoices.stripe_customer_id->stripe_customers.id': 'restrict',
  'invoices.subscription_id->subscriptions.id': 'restrict',
  'order_items.order_id->orders.id': 'cascade',
  'orders.stripe_customer_id->stripe_customers.id': 'restrict',
  'subscriptions.stripe_customer_id->stripe_customers.id': 'restrict',
  'subscriptions.plan_id->subscription_plans.id': 'restrict',
  // 20-authoring
  'content_revisions.draft_id->content_drafts.id': 'cascade',
  'publication_records.draft_id->content_drafts.id': 'restrict',
  'review_assignments.draft_id->content_drafts.id': 'cascade',
  'review_decisions.assignment_id->review_assignments.id': 'cascade',
  'review_decisions.draft_id->content_drafts.id': 'cascade',
  // 22-demo
  'demo_session_overrides.demo_device_id->demo_devices.id': 'cascade',
};

// Map cascade verb → Prisma onDelete + optional doc.
// All Prisma onUpdate stays `NoAction` (uuid PKs don't change).
function cascadeToPrisma(verb) {
  switch (verb) {
    case 'cascade':              return { onDelete: 'Cascade', doc: null };
    case 'restrict':             return { onDelete: 'Restrict', doc: null };
    case 'nullify':              return { onDelete: 'SetNull', doc: null };
    case 'cascade-soft':         return { onDelete: 'NoAction', doc: 'cascade-soft-delete (app-layer; sys-14 retention sweep cascades soft-delete)' };
    case 'cascade-delete-coppa': return { onDelete: 'NoAction', doc: 'cascade-delete-coppa (sys-14 retention worker enforces COPPA §312.10 hard-delete within window)' };
    default:                     return { onDelete: 'NoAction', doc: null };
  }
}

// ─── Immutable entities (audit-history-strategy.md §Immutable) ─────────────
// Plan P1 Item E. Hard-coded list — DB grant model enforces; Prisma carries the doc.
const IMMUTABLE_ENTITIES = new Set([
  'audit_log',
  'admin_commands',
  'admin_role_assignments',
  'audit_events',
  'mutation_log',
  'factory_records',
  'factory_test_results',
  'factory_serial_assignments',
  'device_decommissions',
  // device_transfers excluded — status updates allowed per audit-history-strategy.md
  'config_versions',
  'config_push_events',
  'ota_crash_reports',
  'ota_pause_decisions',
  'notification_receipts',
  'email_sends',
  'deletion_requests',
  'deletion_jobs',
  'backup_snapshots',
  'publication_records',
  'content_revisions',
  'key_rotations',
  'safety_pii_redactions',
  'cost_attributions',
]);

// ─── Polymorphic allow-list comments (plan §6) ─────────────────────────────
// Plan P1 Item F. Source: entity .md polymorphic sections; encoded here for emission.
const POLYMORPHIC_NOTES = {
  audit_log: '/// polymorphic: target_table allow-list validated against 102-table catalogue at app layer; target_id is string repr of pk (uuid or composite)',
  feature_flags: '/// polymorphic: scope_target_id depends on scope (household_id / user_id / device_id / cohort slug)',
  idempotency_keys: '/// polymorphic: actor_id may be user / admin / device / service id',
  outbox_events: '/// polymorphic: source_id + aggregate_id are opaque ids of producing rows; no FK',
  media_assets: '/// polymorphic: owner_service identifies producing service; allow-list per sys-06 / sys-09 / sys-20 / sys-22',
  cost_attributions: '/// polymorphic: target columns identify the cost-bearing entity; no FK by design',
  retention_policies: '/// polymorphic: subject_table identifies the entity governed by the policy',
};

// ─── Hypertable candidates (audit-history-strategy.md §Hypertables) ────────
// Plan P1 Item D. Used for the pre-validation pass. The annotation source IS the DBML
// table-level `Note: '@timescaledb-hypertable column=... interval=...'`. When the
// annotation is missing for a known candidate, the emitter records a gap (not fatal).
// HYPERTABLE_CANDIDATES expresses lane-owner expectations sourced from the live DBML
// Note annotations (the .dbml is the contract; audit-history-strategy.md is a summary).
// Used to detect missing annotations and to verify the column / interval the lane intends.
const HYPERTABLE_CANDIDATES = {
  device_heartbeats: { column: 'created_at', interval: '1d' },
  telemetry_events:  { column: 'created_at', interval: '1d' },
  session_turns:     { column: 'created_at', interval: '1d' },
  rate_limit_buckets:{ column: 'window_start', interval: '1h' },
  outbox_events:     { column: 'created_at', interval: '1d' },
};

// Parse table-level Note that carries the hypertable annotation. Accepts both
// space-separated (`@timescaledb-hypertable column=x interval=1d`) and
// parenthesised (`@timescaledb-hypertable(column=x, interval='1h')`) forms.
function parseHypertableNote(notes) {
  for (const n of notes || []) {
    // Parenthesised form first (most specific).
    let m = n.text.match(/@timescaledb-hypertable\s*\(\s*column\s*=\s*(\w+)\s*,\s*interval\s*=\s*\\?'?([^'\\)\s]+)\\?'?\s*\)/);
    if (m) return { column: m[1], interval: m[2] };
    // Space-separated form.
    m = n.text.match(/@timescaledb-hypertable\s+column=(\w+)\s+interval='?([^'\s]+)'?/);
    if (m) return { column: m[1], interval: m[2] };
  }
  return null;
}

// ─── Soft-delete detection ─────────────────────────────────────────────────
// Plan P1 Item C. Soft-delete = entity .md frontmatter retention is soft-ish
//   (any of: 'soft', 'coppa', 'coppa-on-deletion', 'child-COPPA-bound', or contains 'coppa')
// AND the DBML table has a `deleted_at` column.
function isSoftRetention(retentionValue) {
  if (!retentionValue) return false;
  const v = String(retentionValue).toLowerCase();
  return v === 'soft' || v.includes('coppa') || v === 'soft (sys-14 sweep)';
}

// ─── Type mapping (plan §5) ────────────────────────────────────────────────
function mapType(dbmlType, enumNames) {
  const t = dbmlType.toLowerCase();
  if (enumNames.has(t)) return { scalar: dbmlType, dbAttr: null, isEnum: true };
  if (t === 'uuid') return { scalar: 'String', dbAttr: '@db.Uuid' };
  const varcharM = t.match(/^varchar\((\d+)\)$/);
  if (varcharM) return { scalar: 'String', dbAttr: `@db.VarChar(${varcharM[1]})` };
  if (t === 'text') return { scalar: 'String', dbAttr: '@db.Text' };
  if (t === 'smallint') return { scalar: 'Int', dbAttr: '@db.SmallInt' };
  if (t === 'integer' || t === 'int') return { scalar: 'Int', dbAttr: null };
  if (t === 'bigint') return { scalar: 'BigInt', dbAttr: null };
  if (t === 'timestamptz') return { scalar: 'DateTime', dbAttr: '@db.Timestamptz(6)' };
  if (t === 'jsonb') return { scalar: 'Json', dbAttr: '@db.JsonB' };
  if (t === 'boolean' || t === 'bool') return { scalar: 'Boolean', dbAttr: null };
  if (t === 'inet') return { scalar: 'String', dbAttr: '@db.VarChar(45)' };
  return { scalar: 'String', dbAttr: null, unknown: true };
}

function pascalCase(snake) {
  return snake.split('_').map(p => p ? p[0].toUpperCase() + p.slice(1) : '').join('');
}
function camelCase(snake) {
  const parts = snake.split('_');
  return parts[0] + parts.slice(1).map(p => p ? p[0].toUpperCase() + p.slice(1) : '').join('');
}

// ─── DBML attr extraction ──────────────────────────────────────────────────
function extractAttr(attrs, key) {
  const re = new RegExp(`${key}:\\s*((?:\\\`[^\\\`]*\\\`)|(?:'[^']*')|(?:[^,\\]]+))`);
  const m = attrs.match(re);
  if (!m) return null;
  let v = m[1].trim();
  if (v.startsWith('`') && v.endsWith('`')) v = v.slice(1, -1);
  else if (v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1);
  return v;
}
function hasAttr(attrs, flag) {
  const stripped = attrs
    .replace(/note:\s*'(?:[^'\\]|\\.)*'/g, '')
    .replace(/default:\s*`(?:[^`\\]|\\.)*`/g, '')
    .replace(/default:\s*'(?:[^'\\]|\\.)*'/g, '');
  const re = new RegExp(`(?:^|[\\[,\\s])${flag}(?:[\\],\\s]|$)`, 'i');
  return re.test(stripped);
}

// ─── Frontmatter loader ────────────────────────────────────────────────────
// Reads `<dbml-stem>.md` frontmatter; returns {} if missing / unparseable.
function loadFrontmatter(dbmlAbsPath) {
  const md = dbmlAbsPath.replace(/\.dbml$/, '.md');
  if (!fs.existsSync(md)) return {};
  try {
    const parsed = readFrontmatter(md);
    return parsed.data || {};
  } catch {
    return {};
  }
}

// ─── Folder discovery ─────────────────────────────────────────────────────
function listFolders() {
  const out = [];
  for (const ent of fs.readdirSync(ERD_DIR, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    if (ent.name === 'templates' || ent.name === '_global') continue;
    out.push(ent.name);
  }
  return out.sort();
}

// ─── Emit one folder ──────────────────────────────────────────────────────
function emitFolder(folderName) {
  const folderPath = path.join(ERD_DIR, folderName);
  if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
    console.error(`error: folder not found: ${rel(folderPath)}`);
    process.exit(2);
  }

  const dbmlFiles = fs.readdirSync(folderPath)
    .filter(f => f.endsWith('.dbml'))
    .map(f => path.join(folderPath, f))
    .sort();
  if (dbmlFiles.length === 0) {
    console.error(`warn: no .dbml files in ${rel(folderPath)} — skipping`);
    return null;
  }

  const parsed = dbmlFiles.map(p => ({
    abs: p,
    parsed: parseDbml(fs.readFileSync(p, 'utf8'), p),
    fm: loadFrontmatter(p),
  }));

  const intraFolderTables = new Set();
  for (const { parsed: pf } of parsed) for (const t of pf.tables) intraFolderTables.add(t.name);
  const enumNames = new Set();
  for (const { parsed: pf } of parsed) for (const e of pf.enums) enumNames.add(e.name);

  // Track inverse refs across all files in the folder (a back-ref may be declared in a sibling file).
  const allRefs = [];
  for (const { parsed: pf } of parsed) {
    for (const r of pf.refs) {
      if (intraFolderTables.has(r.leftTable) && intraFolderTables.has(r.rightTable)) {
        allRefs.push(r);
      }
    }
  }
  const backRefs = new Map();
  for (const r of allRefs) {
    const relationName = `${r.leftTable}_${r.leftCol}_to_${r.rightTable}`;
    const arr = backRefs.get(r.rightTable) || [];
    arr.push({ relationName, sourceTable: r.leftTable, sourceCol: r.leftCol });
    backRefs.set(r.rightTable, arr);
  }
  const forwardRefByLeft = new Map(); // `${leftTable}.${leftCol}` → ref
  for (const r of allRefs) forwardRefByLeft.set(`${r.leftTable}.${r.leftCol}`, r);

  const out = [];
  const sourceList = dbmlFiles.map(f => rel(f)).join(', ');
  out.push(`// AUTO-GENERATED FROM docs/erd/${folderName}/*.dbml — do not hand-edit; regenerate via npm run prisma:emit`);
  out.push(`// Source files: ${sourceList}`);
  out.push(`// Generator: scripts/erd/dbml-to-prisma.mjs`);
  out.push('');
  out.push('generator client {');
  out.push('  provider = "prisma-client-js"');
  out.push('}');
  out.push('');
  out.push('datasource db {');
  out.push('  provider = "postgresql"');
  out.push('  url      = env("DATABASE_URL")');
  out.push('}');
  out.push('');

  // Emit enums first.
  for (const { parsed: pf } of parsed) {
    for (const e of pf.enums) {
      out.push(`enum ${e.name} {`);
      for (const v of (e.values || [])) out.push(`  ${v}`);
      out.push('}');
      out.push('');
    }
  }

  // Track gaps (hypertable annotation missing for known candidates).
  const hypertableGaps = [];

  // Emit models.
  for (const { abs, parsed: pf, fm } of parsed) {
    const sourceRel = rel(abs);

    for (const t of pf.tables) {
      // PK detection
      let pkColName = null;
      for (const c of t.columns) if (hasAttr(c.attrs, 'pk')) pkColName = c.name;
      const colNames = new Set(t.columns.map(c => c.name));
      const isImmutable = IMMUTABLE_ENTITIES.has(t.name);
      const polymorphicNote = POLYMORPHIC_NOTES[t.name];

      // Hypertable detection
      const hypertable = parseHypertableNote(t.notes);
      const hypertableCandidate = HYPERTABLE_CANDIDATES[t.name];
      if (hypertableCandidate && !hypertable) {
        hypertableGaps.push({ table: t.name, expected: hypertableCandidate });
      }

      // Soft-delete detection
      const hasDeletedAt = colNames.has('deleted_at');
      const softRetention = isSoftRetention(fm.retention);
      const isSoftDelete = hasDeletedAt && softRetention;

      out.push(`/// Source: ${sourceRel}`);
      if (isImmutable) {
        out.push('/// immutable — row is append-only. DB GRANT model REVOKEs UPDATE/DELETE for application roles; only RetentionWorker may delete after policy window.');
      }
      if (hypertable) {
        out.push(`/// hypertable: column=${hypertable.column} interval=${hypertable.interval} — post-migration create_hypertable() trigger required (TimescaleDB).`);
      } else if (hypertableCandidate) {
        out.push(`/// TODO hypertable: audit-history-strategy.md flags ${t.name} as a hypertable candidate (column=${hypertableCandidate.column} interval=${hypertableCandidate.interval}) but DBML lacks the @timescaledb-hypertable Note. Lane owner must add the annotation; emission is currently table-only.`);
      }
      if (polymorphicNote) out.push(polymorphicNote);
      if (isSoftDelete) {
        out.push('/// soft-delete: deleted_at IS NULL = active row; sys-14 retention sweep hard-deletes after policy window.');
      }
      out.push(`model ${pascalCase(t.name)} {`);

      // Columns
      for (const c of t.columns) {
        const isPk = c.name === pkColName;
        const typeInfo = mapType(c.type, enumNames);
        const fieldName = camelCase(c.name);
        const needsMap = fieldName !== c.name;

        const notNull = hasAttr(c.attrs, 'not null');
        const defaultRaw = extractAttr(c.attrs, 'default');
        const note = extractAttr(c.attrs, 'note');
        const isUnique = hasAttr(c.attrs, 'unique');

        const parts = [`  ${fieldName}`];
        let scalarOut = typeInfo.scalar;
        if (!notNull && !isPk) scalarOut += '?';
        parts.push(scalarOut);
        if (isPk) {
          if (typeInfo.scalar === 'String' && c.type.toLowerCase() === 'uuid') {
            parts.push('@id @default(uuid())');
            parts.push('@db.Uuid');
          } else {
            parts.push('@id');
            if (typeInfo.dbAttr) parts.push(typeInfo.dbAttr);
          }
        } else if (typeInfo.dbAttr) {
          parts.push(typeInfo.dbAttr);
        }

        if (isUnique && !isPk) parts.push('@unique');

        if (defaultRaw && !isPk) {
          const lower = defaultRaw.toLowerCase();
          const jsonbCast = defaultRaw.match(/^'?([^']*)'?::jsonb$/);
          if (lower === 'now()') {
            // Plan §6: immutable rows must NOT carry @updatedAt. Suppress for immutable
            // entities; also suppress for updated_at columns whose note explicitly says
            // the row is immutable (catches per-row callouts that aren't in the global list).
            if (c.name === 'updated_at') {
              const noteSaysImmutable = /equal to created_at|immutable/i.test(note || '');
              if (isImmutable || noteSaysImmutable) {
                parts.push('@default(now())');
              } else {
                parts.push('@default(now()) @updatedAt');
              }
            } else {
              parts.push('@default(now())');
            }
          } else if (jsonbCast && typeInfo.scalar === 'Json') {
            parts.push(`@default("${jsonbCast[1].replace(/"/g, '\\"')}")`);
          } else if (typeInfo.isEnum) {
            parts.push(`@default(${defaultRaw})`);
          } else if (/^(true|false)$/i.test(defaultRaw)) {
            parts.push(`@default(${defaultRaw.toLowerCase()})`);
          } else if (/^-?\d+$/.test(defaultRaw)) {
            parts.push(`@default(${defaultRaw})`);
          } else if (typeInfo.scalar === 'String') {
            parts.push(`@default("${defaultRaw.replace(/"/g, '\\"')}")`);
          } else {
            parts.push(`@default(dbgenerated("${defaultRaw.replace(/"/g, '\\"')}"))`);
          }
        }

        if (needsMap) parts.push(`@map("${c.name}")`);
        out.push(parts.join(' '));

        if (note) out.push(`  /// ${note}`);
        if (typeInfo.unknown) out.push(`  /// TODO: unknown DBML type "${c.type}" — review and refine type map`);

        // Cross-folder ref marker on the scalar column.
        // (Intra-folder refs handled below as separate relation fields.)
        // Detect Ref:s where the target table is NOT in this folder.
        // We need to scan refs from the PARSED file (cross-folder Refs are normally
        // commented in DBML so parseDbml drops them; this branch only fires when an
        // un-commented Ref crosses folders — rare but worth annotating.)
      }

      // Forward relation fields (intra-folder refs whose LEFT side is this table).
      // Build lookup: which scalar columns are optional (not [not null]). Prisma requires
      // the relation field to mirror the FK column's nullability.
      const optionalCols = new Set();
      for (const c of t.columns) {
        if (c.name === pkColName) continue;
        if (!hasAttr(c.attrs, 'not null')) optionalCols.add(c.name);
      }
      for (const r of allRefs) {
        if (r.leftTable !== t.name) continue;
        const cascadeVerb = CASCADE_MAP[`${r.leftTable}.${r.leftCol}->${r.rightTable}.${r.rightCol}`];
        const cascade = cascadeToPrisma(cascadeVerb);
        const relationName = `${r.leftTable}_${r.leftCol}_to_${r.rightTable}`;
        const targetModel = pascalCase(r.rightTable);
        const isSelfRef = r.leftTable === r.rightTable;
        const baseName = camelCase(singularize(r.rightTable));
        const sameTargetCount = allRefs.filter(rr => rr.leftTable === t.name && rr.rightTable === r.rightTable).length;
        let fieldName = baseName;
        if (sameTargetCount > 1 || isSelfRef) {
          const stem = r.leftCol.replace(/_id$/, '');
          fieldName = camelCase(stem);
        }
        const onDeletePart = cascade.onDelete ? `, onDelete: ${cascade.onDelete}` : '';
        const onUpdatePart = ', onUpdate: NoAction';
        const isOptional = optionalCols.has(r.leftCol);
        const optMarker = isOptional ? '?' : '';
        out.push(`  ${fieldName} ${targetModel}${optMarker} @relation(name: "${relationName}", fields: [${camelCase(r.leftCol)}], references: [${camelCase(r.rightCol)}]${onDeletePart}${onUpdatePart})`);
        if (cascade.doc) out.push(`  /// ${cascade.doc}`);
      }

      // Inverse relation fields (intra-folder refs whose RIGHT side is this table).
      const inverse = backRefs.get(t.name) || [];
      for (const br of inverse) {
        const sourceModel = pascalCase(br.sourceTable);
        const isSelfRef = br.sourceTable === t.name;
        let fieldName;
        if (isSelfRef) {
          // self-ref inverse — name from the FK column stem with a 'By' / 'From' hint.
          const stem = br.sourceCol.replace(/_id$/, '');
          fieldName = camelCase(`${stem}_inverse`);
        } else {
          // pluralize source-table name camelCased (back-ref is a list).
          fieldName = camelCase(br.sourceTable);
        }
        // Disambiguate when source has multiple FKs into this table.
        const sameSourceCount = inverse.filter(b => b.sourceTable === br.sourceTable).length;
        if (sameSourceCount > 1) {
          const stem = br.sourceCol.replace(/_id$/, '');
          fieldName = camelCase(`${br.sourceTable}_${stem}`);
        }
        out.push(`  ${fieldName} ${sourceModel}[] @relation(name: "${br.relationName}")`);
      }

      // Indexes
      for (const idx of t.indexes) {
        const cols = idx.cols.map(c => camelCase(c)).join(', ');
        const mapAttr = idx.name ? `, map: "${idx.name}"` : '';
        if (idx.unique) {
          out.push(`  @@unique([${cols}]${mapAttr})`);
        } else {
          out.push(`  @@index([${cols}]${mapAttr})`);
        }
      }

      // Soft-delete partial-index helper. Plan P1 Item C.
      // The strict Prisma 5.x partial-index syntax requires a preview feature; emit a plain
      // index on deletedAt and document the WHERE clause so the post-migration SQL trigger
      // (or Prisma 5.x toggle) can be applied later.
      if (isSoftDelete) {
        // Avoid duplicating if entity already declares an index on deleted_at.
        const hasDeletedAtIdx = t.indexes.some(i => i.cols.length === 1 && i.cols[0] === 'deleted_at');
        if (!hasDeletedAtIdx) {
          out.push(`  @@index([deletedAt], map: "idx_${t.name}_deleted_at_soft")`);
          out.push(`  /// soft-delete partial-index — apply post-migration: CREATE INDEX ... WHERE deleted_at IS NULL`);
        }
      }

      out.push(`  @@map("${t.name}")`);
      out.push('}');
      out.push('');
    }
  }

  const text = out.join('\n');
  const outPath = path.join(folderPath, 'schema.prisma');
  return { folderName, outPath, text, hypertableGaps };
}

// ─── Main ──────────────────────────────────────────────────────────────────
const folders = allFolders ? listFolders() : [folder];
const allGaps = [];
let exitCode = 0;
for (const f of folders) {
  const result = emitFolder(f);
  if (!result) continue;
  if (dryRun) {
    console.log(`\n=== DRY-RUN: ${rel(result.outPath)} ===`);
    console.log(result.text);
  } else {
    fs.writeFileSync(result.outPath, result.text + '\n', 'utf8');
    console.log(`[dbml-to-prisma] wrote ${rel(result.outPath)} (${result.text.split('\n').length} lines)`);
  }
  if (result.hypertableGaps && result.hypertableGaps.length) {
    for (const g of result.hypertableGaps) {
      allGaps.push({ folder: f, ...g });
    }
  }
}

// Optionally record hypertable annotation gaps for follow-up.
if (allGaps.length) {
  console.error(`\n[dbml-to-prisma] hypertable annotation gaps (${allGaps.length}):`);
  for (const g of allGaps) {
    console.error(`  - ${g.folder}/${g.table}: missing @timescaledb-hypertable Note (expected column=${g.expected.column} interval=${g.expected.interval})`);
  }
  console.error('  Owner action: add `Note: \'@timescaledb-hypertable column=<col> interval=<window>\'` inside the table block.');
}

process.exit(exitCode);
