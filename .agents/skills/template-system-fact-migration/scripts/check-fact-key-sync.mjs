#!/usr/bin/env node
// check-fact-key-sync.mjs
//
// Guards against drift between the fact-key catalog (source of truth, TypeScript)
// and the hand-maintained key->required_type CASE map inside
// bind-template-system-facts.sql.
//
// The migration's type guard relies on that SQL map matching the catalog; if a key
// is added/retyped in the catalog but not the SQL (or vice versa), the migration
// would guard against the wrong type. This check makes that mismatch a hard failure.
//
// Usage:
//   node check-fact-key-sync.mjs <schema.ts path> <migration.sql path>
// Exits non-zero (and prints the diff) on any mismatch.

import { readFileSync } from 'node:fs';

const [, , schemaPath, sqlPath] = process.argv;
if (!schemaPath || !sqlPath) {
  console.error('Usage: node check-fact-key-sync.mjs <schema.ts> <migration.sql>');
  process.exit(2);
}

// Catalog: each entry is `<key>: { ... field_type: '<type>' }`. field_type is the
// last property in the block, so a lazy match from the key open-brace is safe.
function parseCatalog(src) {
  const start = src.indexOf('SYSTEM_FACT_KEY_DEFINITIONS');
  const end = src.indexOf('} as const', start);
  const block = src.slice(start, end === -1 ? undefined : end);
  const map = {};
  const re = /(\w+):\s*\{[\s\S]*?field_type:\s*'([a-z]+)'/g;
  let m;
  while ((m = re.exec(block)) !== null) map[m[1]] = m[2];
  return map;
}

// SQL: `WHEN '<key>' THEN '<type>'` inside the CASE.
function parseSql(src) {
  const map = {};
  const re = /WHEN\s+'(\w+)'\s+THEN\s+'([a-z]+)'/g;
  let m;
  while ((m = re.exec(src)) !== null) map[m[1]] = m[2];
  return map;
}

const catalog = parseCatalog(readFileSync(schemaPath, 'utf8'));
const sql = parseSql(readFileSync(sqlPath, 'utf8'));

const errors = [];
for (const [key, type] of Object.entries(catalog)) {
  if (!(key in sql)) errors.push(`missing in SQL:     ${key} (catalog: ${type})`);
  else if (sql[key] !== type) errors.push(`type mismatch:       ${key} — catalog ${type}, SQL ${sql[key]}`);
}
for (const key of Object.keys(sql)) {
  if (!(key in catalog)) errors.push(`stale in SQL:        ${key} (not in catalog)`);
}

if (Object.keys(catalog).length === 0) {
  console.error('FAIL — parsed 0 keys from catalog; check schema path/format.');
  process.exit(2);
}

if (errors.length > 0) {
  console.error('FAIL — fact-key map in SQL has drifted from the catalog:');
  for (const e of errors) console.error(`  ${e}`);
  console.error('\nUpdate the key->required_type CASE in bind-template-system-facts.sql.');
  process.exit(1);
}

console.log(`OK — fact-key map in sync with catalog (${Object.keys(catalog).length} keys).`);
