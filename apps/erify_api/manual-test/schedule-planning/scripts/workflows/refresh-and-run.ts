#!/usr/bin/env ts-node

/**
 * Script to run the full local schedule-planning refresh cycle.
 *
 * Workflow:
 * 1. Refresh local DB (migrate reset + deploy + seed)
 * 2. Sync ext IDs from eridu_auth -> erify_api
 * 3. Regenerate Prisma Client from current schema
 * 4. Run all required cutover backfills
 * 5. Generate schedule payloads
 * 6. Run schedule workflow (upload -> validate -> publish)
 *
 * Usage:
 *   pnpm run manual:schedule:refresh-and-run
 *   pnpm run manual:schedule:refresh-and-run -- --clients=50 --api-url=http://localhost:3000
 *   pnpm run manual:schedule:refresh-and-run -- --skip-db-refresh --skip-ext-sync
 */

import { execSync } from 'node:child_process';
import * as path from 'node:path';

const API_HOST = process.env.API_HOST || 'localhost';
const PORT = process.env.PORT || 3000;
const DEFAULT_API_URL = `http://${API_HOST}:${PORT}`;

type Args = {
  apiUrl: string;
  shows?: number;
  clients?: number;
  chunkSize?: number;
  skipDbRefresh: boolean;
  skipExtSync: boolean;
  skipGenerate: boolean;
};

function parsePositiveInteger(value: string, flag: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${flag} value: "${value}". Expected a positive integer.`);
  }
  return parsed;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const parsed: Args = {
    apiUrl: DEFAULT_API_URL,
    skipDbRefresh: false,
    skipExtSync: false,
    skipGenerate: false,
  };

  for (const arg of args) {
    if (arg === '--') {
      continue;
    }
    if (arg.startsWith('--api-url=')) {
      parsed.apiUrl = arg.split('=')[1];
      continue;
    }
    if (arg.startsWith('--shows=')) {
      parsed.shows = parsePositiveInteger(arg.split('=')[1], '--shows');
      continue;
    }
    if (arg.startsWith('--clients=')) {
      parsed.clients = parsePositiveInteger(arg.split('=')[1], '--clients');
      continue;
    }
    if (arg.startsWith('--chunk-size=')) {
      parsed.chunkSize = parsePositiveInteger(arg.split('=')[1], '--chunk-size');
      continue;
    }
    if (arg === '--skip-db-refresh') {
      parsed.skipDbRefresh = true;
      continue;
    }
    if (arg === '--skip-ext-sync') {
      parsed.skipExtSync = true;
      continue;
    }
    if (arg === '--skip-generate') {
      parsed.skipGenerate = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return parsed;
}

function runStep(
  title: string,
  command: string,
  projectRoot: string,
): void {
  console.log(`\n${'='.repeat(72)}`);
  console.log(`📋 ${title}`);
  console.log(`${'='.repeat(72)}`);
  console.log(`$ ${command}\n`);

  execSync(command, {
    cwd: projectRoot,
    stdio: 'inherit',
    env: { ...process.env },
  });
}

function main() {
  const args = parseArgs();
  const projectRoot = path.resolve(__dirname, '../../../../');

  console.log('🚀 Starting full schedule manual workflow...');
  console.log(`   API URL: ${args.apiUrl}`);
  console.log(
    `   DB refresh: ${args.skipDbRefresh ? 'skipped' : 'enabled'} | Ext ID sync: ${args.skipExtSync ? 'skipped' : 'enabled'} | Prisma generate: enabled | Backfills: enabled | Payload generate: ${args.skipGenerate ? 'skipped' : 'enabled'}`,
  );

  if (!args.skipDbRefresh) {
    runStep('Refresh local DB', 'pnpm run db:local:refresh', projectRoot);
  }

  if (!args.skipExtSync) {
    runStep('Sync ext IDs from eridu_auth', 'pnpm run db:extid:sync', projectRoot);
  }

  runStep('Regenerate Prisma Client', 'pnpm run db:generate', projectRoot);
  runStep('Backfill creator UIDs', 'pnpm run db:creator-uid:backfill', projectRoot);
  runStep('Backfill studio creator roster', 'pnpm run db:studio-creator:backfill', projectRoot);

  if (!args.skipGenerate) {
    const generateArgs: string[] = [];

    if (args.shows !== undefined) {
      generateArgs.push(`--shows=${args.shows}`);
    }
    if (args.clients !== undefined) {
      generateArgs.push(`--clients=${args.clients}`);
    }
    if (args.chunkSize !== undefined) {
      generateArgs.push(`--chunk-size=${args.chunkSize}`);
    }

    const generateCommand = generateArgs.length > 0
      ? `pnpm run manual:schedule:generate -- ${generateArgs.join(' ')}`
      : 'pnpm run manual:schedule:generate';

    runStep('Generate schedule payloads', generateCommand, projectRoot);
  }

  runStep(
    'Run schedule upload/validate/publish workflow',
    `pnpm run manual:schedule:all -- --api-url=${args.apiUrl}`,
    projectRoot,
  );

  console.log('\n✅ Full schedule manual workflow completed successfully.');
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(
      '\n❌ refresh-and-run failed:',
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}
