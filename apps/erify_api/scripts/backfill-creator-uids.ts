import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Prisma } from '@prisma/client';
import { Pool } from 'pg';

import {
  toCreatorUid,
} from '../src/models/creator/creator-uid.util';

type Args = {
  dryRun: boolean;
};

type RewriteResult = {
  value: unknown;
  changed: boolean;
};

function parseArgs(): Args {
  const args = process.argv.slice(2);
  return { dryRun: args.includes('--dry-run') };
}

function updateCreatorUidInJson(value: unknown): RewriteResult {
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item) => {
      const result = updateCreatorUidInJson(item);
      changed = changed || result.changed;
      return result.value;
    });
    return { value: next, changed };
  }

  if (value && typeof value === 'object') {
    let changed = false;
    const next: Record<string, unknown> = {};

    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      if (
        typeof raw === 'string'
        && (key === 'mcId' || key === 'mc_id' || key === 'creatorId' || key === 'creator_id')
      ) {
        const rewritten = toCreatorUid(raw);
        next[key] = rewritten;
        changed = changed || rewritten !== raw;
        continue;
      }

      const nested = updateCreatorUidInJson(raw);
      next[key] = nested.value;
      changed = changed || nested.changed;
    }

    return { value: next, changed };
  }

  return { value, changed: false };
}

function normalizeMetadata(
  metadata: unknown,
  legacyUid: string,
): Record<string, unknown> {
  const base = (metadata && typeof metadata === 'object' && !Array.isArray(metadata))
    ? { ...(metadata as Record<string, unknown>) }
    : {};
  if (!base.legacy_mc_uid) {
    base.legacy_mc_uid = legacyUid;
  }
  return base;
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

  const creatorsToRewrite = await prisma.mC.findMany({
    where: { uid: { startsWith: 'mc_' } },
    select: { id: true, uid: true, metadata: true },
  });

  const rewrittenById = creatorsToRewrite
    .map((creator) => ({
      id: creator.id,
      from: creator.uid,
      to: toCreatorUid(creator.uid),
      metadata: creator.metadata,
    }))
    .filter((item) => item.from !== item.to);

  const newUids = rewrittenById.map((item) => item.to);
  if (newUids.length > 0) {
    const conflicts = await prisma.mC.findMany({
      where: {
        uid: { in: newUids },
        id: { notIn: rewrittenById.map((item) => item.id) },
      },
      select: { id: true, uid: true },
    });
    if (conflicts.length > 0) {
      throw new Error(
        `UID collision detected for rewritten creator UIDs: ${conflicts.map((c) => c.uid).join(', ')}`,
      );
    }
  }

  const schedules = await prisma.schedule.findMany({
    where: { deletedAt: null },
    select: { id: true, uid: true, planDocument: true },
  });
  const scheduleSnapshots = await prisma.scheduleSnapshot.findMany({
    select: { id: true, uid: true, planDocument: true },
  });

  const scheduleUpdates = schedules
    .map((schedule) => {
      const rewritten = updateCreatorUidInJson(schedule.planDocument);
      return {
        id: schedule.id,
        uid: schedule.uid,
        planDocument: rewritten.value,
        changed: rewritten.changed,
      };
    })
    .filter((item) => item.changed);

  const snapshotUpdates = scheduleSnapshots
    .map((snapshot) => {
      const rewritten = updateCreatorUidInJson(snapshot.planDocument);
      return {
        id: snapshot.id,
        uid: snapshot.uid,
        planDocument: rewritten.value,
        changed: rewritten.changed,
      };
    })
    .filter((item) => item.changed);

  console.log(`Creators to rewrite: ${rewrittenById.length}`);
  console.log(`Schedules to rewrite: ${scheduleUpdates.length}`);
  console.log(`Schedule snapshots to rewrite: ${snapshotUpdates.length}`);

  if (dryRun) {
    console.log('Dry run enabled. No database changes were written.');
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const item of rewrittenById) {
      await tx.mC.update({
        where: { id: item.id },
        data: {
          uid: item.to,
          metadata: normalizeMetadata(item.metadata, item.from) as Prisma.InputJsonValue,
        },
      });
    }

    for (const item of scheduleUpdates) {
      await tx.schedule.update({
        where: { id: item.id },
        data: { planDocument: item.planDocument as Prisma.InputJsonValue },
      });
    }

    for (const item of snapshotUpdates) {
      await tx.scheduleSnapshot.update({
        where: { id: item.id },
        data: { planDocument: item.planDocument as Prisma.InputJsonValue },
      });
    }
  });

  console.log('Creator UID prefix backfill completed.');
  await prisma.$disconnect();
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
