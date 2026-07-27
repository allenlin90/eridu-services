import 'dotenv/config';

import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { SCENE_QC_INTENTIONALLY_UNBOUND } from './scene-qc-evidence-binding-map';

import { isSceneQcEligibleShowStatus } from '@/capabilities/scene-qc/scene-qc-eligibility-policy';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * Read-only, CI-usable Scene QC evidence-binding gate (plan sections 4.3 /
 * rollout step 3). Exits non-zero when any IN-SCOPE active Task snapshot has
 * zero TaskTemplateSceneQcEvidenceRef rows and is not an intentionally-unbound
 * template.
 *
 * Scope definition: a TaskTemplateSnapshot S is in scope when there exists a
 * non-deleted Task T with T.snapshotId = S.id, and a non-deleted TaskTarget on
 * T with targetType='SHOW' whose Show is non-deleted, whose ShowStatus.systemKey
 * is Scene-QC-eligible (reuses Child PR 1's isSceneQcEligibleShowStatus --
 * never re-derived here), and whose startTime >= --since.
 *
 * No local-DB gate: this script is read-only and intended to run against the
 * target environment before cutover (rollout step 3).
 *
 * Usage:
 *   pnpm --filter erify_api exec tsx scripts/verify-scene-qc-evidence-bindings.ts --since 2026-07-01
 *   pnpm --filter erify_api exec tsx scripts/verify-scene-qc-evidence-bindings.ts --since 2026-07-01 --json
 */

type InScopeSnapshotRow = {
  snapshot_id: bigint;
  template_id: bigint;
  template_uid: string;
  version: number;
  show_status_system_key: string | null;
};

type MinimalPrisma = {
  $queryRaw: PrismaService['$queryRaw'];
  taskTemplateSceneQcEvidenceRef: {
    findMany: PrismaService['taskTemplateSceneQcEvidenceRef']['findMany'];
  };
};

export type Violation = {
  templateUid: string;
  snapshotId: string;
  version: number;
};

export type VerifyResult = {
  inScopeCount: number;
  boundCount: number;
  intentionallyUnboundCount: number;
  violations: Violation[];
  staleRowWarnings: string[];
};

export async function findInScopeSnapshots(prisma: MinimalPrisma, since: Date): Promise<InScopeSnapshotRow[]> {
  const rows = await prisma.$queryRaw<
    { snapshot_id: bigint; template_id: bigint; template_uid: string; version: number; show_status_system_key: string | null }[]
  >`
    SELECT DISTINCT
      tts.id AS snapshot_id,
      tts.template_id AS template_id,
      tt.uid AS template_uid,
      tts.version AS version,
      ss.system_key AS show_status_system_key
    FROM task_template_snapshots tts
    JOIN task_templates tt ON tt.id = tts.template_id
    JOIN tasks t ON t.snapshot_id = tts.id AND t.deleted_at IS NULL
    JOIN task_targets ttg ON ttg.task_id = t.id AND ttg.target_type = 'SHOW' AND ttg.deleted_at IS NULL
    JOIN shows s ON s.id = ttg.show_id AND s.deleted_at IS NULL
    JOIN show_status ss ON ss.id = s.show_status_id
    WHERE s.start_time >= ${since}
  `;
  return rows.filter((r) => isSceneQcEligibleShowStatus(r.show_status_system_key));
}

export async function runVerify(params: {
  prisma: MinimalPrisma;
  since: Date;
  intentionallyUnbound?: readonly { templateUid: string; reason: string }[];
}): Promise<VerifyResult> {
  const { prisma, since, intentionallyUnbound = SCENE_QC_INTENTIONALLY_UNBOUND } = params;
  const unboundUids = new Set(intentionallyUnbound.map((e) => e.templateUid));

  const inScope = await findInScopeSnapshots(prisma, since);
  const snapshotIds = inScope.map((r) => r.snapshot_id);

  const boundRows = snapshotIds.length > 0
    ? await prisma.taskTemplateSceneQcEvidenceRef.findMany({
      where: { snapshotId: { in: snapshotIds } },
      select: { snapshotId: true, fieldKey: true },
    })
    : [];
  const boundSnapshotIds = new Set((boundRows as { snapshotId: bigint }[]).map((r) => r.snapshotId));

  const violations: Violation[] = [];
  let intentionallyUnboundCount = 0;

  for (const row of inScope) {
    if (boundSnapshotIds.has(row.snapshot_id)) {
      continue;
    }
    if (unboundUids.has(row.template_uid)) {
      intentionallyUnboundCount++;
      continue;
    }
    violations.push({
      templateUid: row.template_uid,
      snapshotId: row.snapshot_id.toString(),
      version: row.version,
    });
  }

  return {
    inScopeCount: inScope.length,
    boundCount: inScope.length - violations.length - intentionallyUnboundCount,
    intentionallyUnboundCount,
    violations,
    staleRowWarnings: [],
  };
}

@Module({ imports: [PrismaModule] })
class VerifyModule {}

async function main() {
  const sinceArgIndex = process.argv.indexOf('--since');
  const sinceArg = sinceArgIndex >= 0 ? process.argv[sinceArgIndex + 1] : undefined;
  if (!sinceArg) {
    console.error('--since YYYY-MM-DD is required');
    process.exit(1);
  }
  const since = new Date(sinceArg);
  if (Number.isNaN(since.getTime())) {
    console.error(`--since "${sinceArg}" is not a valid date`);
    process.exit(1);
  }
  const asJson = process.argv.includes('--json');

  const app = await NestFactory.createApplicationContext(VerifyModule, { logger: false });
  try {
    const prisma = app.get(PrismaService);
    const result = await runVerify({ prisma, since });

    if (asJson) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`--- Scene QC Evidence Binding Verification (since ${sinceArg}) ---`);
      console.log(`In-scope snapshots: ${result.inScopeCount}`);
      console.log(`Bound: ${result.boundCount}`);
      console.log(`Intentionally unbound: ${result.intentionallyUnboundCount}`);
      console.log(`Violations: ${result.violations.length}`);
      for (const v of result.violations) {
        console.log(`  VIOLATION ${v.templateUid} snapshot ${v.snapshotId} (v${v.version}) has no evidence binding`);
      }
    }

    process.exitCode = result.violations.length > 0 ? 1 : 0;
  } finally {
    await app.close();
  }
}

if (process.argv[1]?.includes('verify-scene-qc-evidence-bindings')) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
