import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { nanoid } from 'nanoid';
import { Pool } from 'pg';

type Args = {
  dryRun: boolean;
};

type CandidatePair = {
  studioId: bigint | number | string;
  studioUid: string;
  mcId: bigint | number | string;
  creatorUid: string;
  defaultRate: string | null;
  defaultRateType: string | null;
  defaultCommissionRate: string | null;
};

type ExistingRosterKey = `${string}:${string}`;

const STUDIO_CREATOR_UID_PREFIX = 'smc';

function parseArgs(): Args {
  const args = process.argv.slice(2);
  return { dryRun: args.includes('--dry-run') };
}

function createRosterKey(studioId: bigint, mcId: bigint): ExistingRosterKey {
  return `${studioId.toString()}:${mcId.toString()}`;
}

function generateStudioCreatorUid(): string {
  return `${STUDIO_CREATOR_UID_PREFIX}_${nanoid(20)}`;
}

function normalizeBigInt(value: bigint | number | string): bigint {
  return typeof value === 'bigint' ? value : BigInt(value);
}

async function main() {
  const { dryRun } = parseArgs();

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not defined in environment variables');
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const candidatePairs = await prisma.$queryRaw<CandidatePair[]>`
    SELECT DISTINCT
      s.id AS "studioId",
      s.uid AS "studioUid",
      c.id AS "mcId",
      c.uid AS "creatorUid",
      c.default_rate::text AS "defaultRate",
      c.default_rate_type AS "defaultRateType",
      c.default_commission_rate::text AS "defaultCommissionRate"
    FROM "show_creators" sc
    INNER JOIN "shows" s
      ON s.id = sc.show_id
    INNER JOIN "creators" c
      ON c.id = sc.mc_id
    WHERE sc.deleted_at IS NULL
      AND s.deleted_at IS NULL
      AND c.deleted_at IS NULL
      AND s.studio_id IS NOT NULL
  `;

  const existingRoster = await prisma.studioMc.findMany({
    select: {
      studioId: true,
      mcId: true,
      deletedAt: true,
    },
  });

  const existingKeys = new Set<ExistingRosterKey>(
    existingRoster.map((item) => createRosterKey(item.studioId, item.mcId)),
  );

  const rowsToInsert = candidatePairs.filter(
    (pair) => !existingKeys.has(createRosterKey(normalizeBigInt(pair.studioId), normalizeBigInt(pair.mcId))),
  );

  console.log(`Historical studio/creator pairs found: ${candidatePairs.length}`);
  console.log(`Existing studio roster rows found: ${existingRoster.length}`);
  console.log(`Studio roster rows to backfill: ${rowsToInsert.length}`);

  if (rowsToInsert.length > 0) {
    const preview = rowsToInsert.slice(0, 10).map((pair) => ({
      studio_uid: pair.studioUid,
      creator_uid: pair.creatorUid,
    }));
    console.log('Backfill preview (first 10 rows):');
    console.table(preview);
  }

  if (dryRun || rowsToInsert.length === 0) {
    if (dryRun) {
      console.log('Dry run enabled. No database changes were written.');
    }
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const pair of rowsToInsert) {
      const studioId = normalizeBigInt(pair.studioId);
      const mcId = normalizeBigInt(pair.mcId);
      await tx.studioMc.create({
        data: {
          uid: generateStudioCreatorUid(),
          studio: { connect: { id: studioId } },
          mc: { connect: { id: mcId } },
          ...(pair.defaultRate !== null && { defaultRate: pair.defaultRate }),
          defaultRateType: pair.defaultRateType,
          ...(pair.defaultCommissionRate !== null && { defaultCommissionRate: pair.defaultCommissionRate }),
          isActive: true,
          metadata: {},
        },
      });
    }
  });

  console.log('Studio creator roster backfill completed.');
  await prisma.$disconnect();
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
