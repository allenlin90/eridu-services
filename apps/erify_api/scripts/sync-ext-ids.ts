import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

type MappingRecord = {
  email: string;
  ext_id: string;
};

type Args = {
  dryRun: boolean;
  authDbUrl?: string;
};

function parseArgs(): Args {
  const args = process.argv.slice(2);
  let dryRun = false;
  let authDbUrl: string | undefined;

  for (const arg of args) {
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg.startsWith('--auth-db-url=')) {
      authDbUrl = arg.split('=')[1];
    }
  }

  return { dryRun, authDbUrl };
}

async function loadMappingFromAuthDatabase(connectionString: string): Promise<MappingRecord[]> {
  const authPool = new Pool({ connectionString });
  try {
    const result = await authPool.query<{ id: string; email: string | null }>(
      'SELECT id, email FROM "user" WHERE email IS NOT NULL',
    );
    return result.rows
      .filter((row) => Boolean(row.email))
      .map((row) => ({
        email: row.email!,
        ext_id: row.id,
      }));
  } finally {
    await authPool.end();
  }
}

async function main() {
  const { dryRun, authDbUrl } = parseArgs();
  const resolvedAuthDbUrl = authDbUrl ?? process.env.ERIDU_AUTH_DATABASE_URL;
  if (!resolvedAuthDbUrl) {
    throw new Error(
      'ERIDU_AUTH_DATABASE_URL is required (or pass --auth-db-url=...)',
    );
  }
  const records = await loadMappingFromAuthDatabase(resolvedAuthDbUrl);

  if (!records.length) {
    throw new Error(
      'No auth users loaded. Ensure ERIDU_AUTH_DATABASE_URL (or --auth-db-url) points to eridu_auth database with user records.',
    );
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not defined in environment variables');
  }
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log(`Loaded ${records.length} ext_id mappings from eridu_auth.user`);
  if (dryRun) {
    console.log('Running in dry-run mode. No database changes will be written.');
  }

  let matched = 0;
  let updated = 0;
  const misses: string[] = [];

  for (const record of records) {
    const user = await prisma.user.findFirst({
      where: {
        deletedAt: null,
        email: record.email,
      },
      select: { uid: true, email: true, extId: true },
    });

    if (!user) {
      misses.push(record.email);
      continue;
    }

    matched += 1;
    if (user.extId === record.ext_id) {
      continue;
    }

    if (!dryRun) {
      await prisma.user.update({
        where: { uid: user.uid },
        data: { extId: record.ext_id },
      });
    }

    updated += 1;
  }

  console.log(`Matched users: ${matched}`);
  console.log(`Updated ext_id: ${updated}`);
  if (misses.length > 0) {
    console.log(`Unmatched identifiers (${misses.length}):`);
    misses.forEach((id) => console.log(`- ${id}`));
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
