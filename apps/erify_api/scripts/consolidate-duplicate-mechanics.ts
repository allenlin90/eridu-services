import 'dotenv/config';

import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ClsModule } from 'nestjs-cls';

import { ClientMechanicModule } from '@/models/client-mechanic/client-mechanic.module';
import { ClientMechanicService } from '@/models/client-mechanic/client-mechanic.service';
import { TaskTemplateModule } from '@/models/task-template/task-template.module';
import { TaskTemplateService } from '@/models/task-template/task-template.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * One-off cleanup of the PR 20.8 backfill's own blind spot: that backfill
 * deduped mechanics per client by EXACT instructionBody string match, so two
 * descriptions differing only by whitespace, a stray character, or a cosmetic
 * label prefix ("*Best Seller*") survived as separate ClientMechanic rows
 * even though they describe the identical product/SKU and were independently
 * checked into different template loops.
 *
 * Candidate groups were found by sending each client's full mechanic list
 * (title/instruction_label/instruction_body) to a Haiku-model agent per
 * client, instructed to be conservative: group only when confident, and never
 * group records differing in product code/SKU, color, size, age range, price,
 * or pack/quantity. Every agent-proposed group below was then manually
 * verified against the actual instruction_body text before being included
 * here — five "duplicate" groups the swisslab agent proposed were REJECTED
 * because they actually differed by package quantity (e.g. "(3 แถม 1)" buy-3-
 * get-1 vs "(2 กระปุก)" 2-jar vs unqualified single unit), which is exactly
 * the kind of distinguishing detail the conservative instruction said must
 * NOT be merged. This script intentionally hardcodes the resulting plan
 * rather than re-running the clustering — it is a one-off fix for a known,
 * already-reviewed set of duplicates, not a re-runnable dedup pass.
 *
 * For each group: every live (non-deleted) template's `currentSchema.items`
 * referencing a duplicate's mechanic_id is remapped to the canonical's
 * mechanic_id (refreshing content_revision/label/description to the
 * canonical's current values, mirroring the builder's "Upgrade Reference"
 * action). If a loop already independently carries the canonical mechanic's
 * own field (so remapping would create two items with the same (group,
 * mechanic_id), violating the per-loop uniqueness rule), the duplicate's
 * field in that loop is dropped instead of remapped — the canonical's field
 * already covers that loop. Historical task snapshots are never touched
 * (they are immutable by design); only the live template schema changes.
 *
 * Each duplicate mechanic is retired (not hard-deleted) after its templates
 * are updated — matches `ClientMechanicService`'s S4 lifecycle rule, and old
 * snapshots still reference the duplicate's mechanic_id permanently.
 *
 * Writes go through `TaskTemplateService.updateTemplateWithSnapshot` (one
 * call per affected template) and `ClientMechanicService.retireMechanic`, the
 * same paths the builder UI and mechanics-management UI use.
 *
 * Usage:
 *   pnpm --filter erify_api exec ts-node -r tsconfig-paths/register scripts/consolidate-duplicate-mechanics.ts
 *   pnpm --filter erify_api exec ts-node -r tsconfig-paths/register scripts/consolidate-duplicate-mechanics.ts --apply
 *
 * Dry-run by default. Refuses a non-localhost DATABASE_URL unless ALLOW_PROD=1.
 */

export type MergeGroup = {
  clientUid: string;
  clientName: string;
  canonicalUid: string;
  duplicateUids: string[];
  reason: string;
};

export const MERGE_PLAN: MergeGroup[] = [
  {
    clientUid: 'client_KRStqYFHvwwlBQJsNtmh',
    clientName: 'Bata Official Store',
    canonicalUid: 'cmech_dPEJsSolnttaPNbxNMeY',
    duplicateUids: ['cmech_mY9Id3tezKSz4vQJnYFx'],
    reason: 'Identical MATATA shoe description (3-5yr code, 5-7yr code); whitespace-only diff',
  },
  {
    clientUid: 'client_KRStqYFHvwwlBQJsNtmh',
    clientName: 'Bata Official Store',
    canonicalUid: 'cmech_6v4mgcvZ6BO_ox8C_FqO',
    duplicateUids: ['cmech_3PwddSTU75CMKKaFaYCe'],
    reason: 'Identical FROZEN MATATA shoe description; whitespace-only diff',
  },
  {
    clientUid: 'client_KRStqYFHvwwlBQJsNtmh',
    clientName: 'Bata Official Store',
    canonicalUid: 'cmech_Z7wm-nNYmPgLUEPmK8Cm',
    duplicateUids: ['cmech_LChi0yOkgMJe6U34a-Gi'],
    reason: 'Identical B-BUTTERFLY shoe description (code 3416614/4416614); whitespace-only diff',
  },
  {
    clientUid: 'client_KRStqYFHvwwlBQJsNtmh',
    clientName: 'Bata Official Store',
    canonicalUid: 'cmech_HYEhp7KSwLDQ9dGOalJC',
    duplicateUids: ['cmech_NDAYDyhBSYa0m22WHaF_'],
    reason: 'Same MEN\'S DRESS CAMPUS shoe, code 8516522; one copy adds a "*Best Seller*" label prefix only',
  },
  {
    clientUid: 'client_KRStqYFHvwwlBQJsNtmh',
    clientName: 'Bata Official Store',
    canonicalUid: 'cmech_HKAk12XXzvMqll8olBdS',
    duplicateUids: ['cmech_HjeVsNoilaOIzCgmZ6fC'],
    reason: 'Same Energy+ purple sandal, code 5719945; canonical has the more complete description',
  },
  {
    clientUid: 'client_KRStqYFHvwwlBQJsNtmh',
    clientName: 'Bata Official Store',
    canonicalUid: 'cmech_y7--NYsHeUXqy9Cmng3T',
    duplicateUids: ['cmech_WXSTRQpbDNTp2xZW4gHD'],
    reason: 'Same Energy+ brown men\'s sandal, code 8716641; description reordering/badge-prefix only',
  },
  {
    clientUid: 'client_1GweW5FwosIbmq5gRYdw',
    clientName: 'Jacob Outlet',
    canonicalUid: 'cmech_2xhP3cxnPTnSo-CVBcSh',
    duplicateUids: ['cmech_pEaWIgTOb03_4H6xeidc'],
    reason: 'Same model 22487 weave-pattern wallet; punctuation-only diff',
  },
  {
    clientUid: 'client_1GweW5FwosIbmq5gRYdw',
    clientName: 'Jacob Outlet',
    canonicalUid: 'cmech_d_xHgFRedtoDxyc0ZHXA',
    duplicateUids: ['cmech_fhOwy9Ua_lSWAaFCkJag'],
    reason: 'Same model SMITH 22637 soft leather wallet; duplicate has a stray leading quote character only',
  },
  {
    clientUid: 'client_1GweW5FwosIbmq5gRYdw',
    clientName: 'Jacob Outlet',
    canonicalUid: 'cmech_4XZe4kC0qb-_kMpRlAbG',
    duplicateUids: ['cmech__er4W8E6h_6WNxmHV7UH', 'cmech_7p21MrxGA3tOA8hvAQgF'],
    reason: 'Same live-only voucher terms verbatim (5% min 650 cap 65 / 10% min 950 cap 100); only the campaign-name label and a typo differ',
  },
];

export type FieldItem = {
  id: string;
  key: string;
  type: string;
  label: string;
  description?: string;
  group?: string;
  mechanic_ref?: { client_id: string; mechanic_id: string; content_revision: number };
  [k: string]: unknown;
};

export type TemplateRow = {
  id: bigint;
  uid: string;
  version: number;
  studioUid: string;
  currentSchema: { items: FieldItem[]; [k: string]: unknown };
};

type CanonicalInfo = {
  uid: string;
  clientUid: string;
  contentRevision: number;
  instructionLabel: string;
  instructionBody: string;
};

export function ensureLocalDatabase(databaseUrl: string | undefined, allowProd: string | undefined): void {
  const isLocal = /(localhost|127\.0\.0\.1|::1)/.test(databaseUrl ?? '');
  if (!isLocal && allowProd !== '1') {
    throw new Error(
      'DATABASE_URL does not look like a local database. Set ALLOW_PROD=1 to run against it intentionally.',
    );
  }
}

/** Every duplicate UID must appear in exactly one group, and never also be a canonical. */
export function validateMergePlan(plan: MergeGroup[]): void {
  const canonicalUids = new Set(plan.map((g) => g.canonicalUid));
  const seenDuplicates = new Set<string>();
  for (const group of plan) {
    for (const dupUid of group.duplicateUids) {
      if (canonicalUids.has(dupUid))
        throw new Error(`Merge plan error: "${dupUid}" is both a canonical and a duplicate`);
      if (seenDuplicates.has(dupUid))
        throw new Error(`Merge plan error: "${dupUid}" appears as a duplicate in more than one group`);
      seenDuplicates.add(dupUid);
    }
  }
}

type MinimalPrisma = {
  taskTemplate: { findMany: PrismaService['taskTemplate']['findMany'] };
  clientMechanic: { findMany: PrismaService['clientMechanic']['findMany'] };
};

export type ConsolidateDeps = {
  prisma: MinimalPrisma;
  taskTemplateService: Pick<TaskTemplateService, 'updateTemplateWithSnapshot'>;
  clientMechanicService: Pick<ClientMechanicService, 'retireMechanic'>;
  plan?: MergeGroup[];
  apply: boolean;
  logger?: (m: string) => void;
};

export type ConsolidateResult = {
  groupsProcessed: number;
  fieldsRemapped: number;
  fieldsDroppedAsLoopCollision: number;
  templatesUpdated: number;
  templatesFailed: number;
  mechanicsRetired: number;
  mechanicsRetireFailed: number;
};

export async function runConsolidation({
  prisma,
  taskTemplateService,
  clientMechanicService,
  plan = MERGE_PLAN,
  apply,
  logger = console.log,
}: ConsolidateDeps): Promise<ConsolidateResult> {
  logger(`--- Duplicate Mechanic Consolidation --- ${apply ? 'APPLY' : 'DRY-RUN'}`);
  validateMergePlan(plan);

  const canonicalUids = [...new Set(plan.map((g) => g.canonicalUid))];
  const allDuplicateUids = plan.flatMap((g) => g.duplicateUids);

  const canonicalRows = await prisma.clientMechanic.findMany({
    where: { uid: { in: canonicalUids }, deletedAt: null },
    select: { uid: true, contentRevision: true, instructionLabel: true, instructionBody: true, client: { select: { uid: true } } },
  });
  const canonicalByUid = new Map<string, CanonicalInfo>(
    canonicalRows.map((m: any) => [m.uid, {
      uid: m.uid,
      clientUid: m.client.uid,
      contentRevision: m.contentRevision,
      instructionLabel: m.instructionLabel,
      instructionBody: m.instructionBody,
    }]),
  );

  for (const group of plan) {
    const canonical = canonicalByUid.get(group.canonicalUid);
    if (!canonical)
      throw new Error(`Canonical mechanic "${group.canonicalUid}" (${group.clientName}) not found or deleted`);
    if (canonical.clientUid !== group.clientUid) {
      throw new Error(
        `Canonical mechanic "${group.canonicalUid}" belongs to client "${canonical.clientUid}", expected "${group.clientUid}" (${group.clientName})`,
      );
    }
  }

  // duplicate mechanic_id -> { canonicalUid, clientUid } for fast lookup while walking template items
  const duplicateTarget = new Map<string, { canonicalUid: string; clientUid: string }>();
  for (const group of plan) {
    for (const dupUid of group.duplicateUids) {
      duplicateTarget.set(dupUid, { canonicalUid: group.canonicalUid, clientUid: group.clientUid });
    }
  }

  const rawTemplates = await prisma.taskTemplate.findMany({
    where: { deletedAt: null },
    include: { studio: { select: { uid: true } } },
  });

  const templates: TemplateRow[] = rawTemplates
    .filter((t: any) => {
      const items = t.currentSchema?.items as FieldItem[] | undefined;
      return Array.isArray(items) && items.some((i) => i.mechanic_ref && duplicateTarget.has(i.mechanic_ref.mechanic_id));
    })
    .map((t: any) => ({
      id: t.id,
      uid: t.uid,
      version: t.version,
      studioUid: t.studio!.uid,
      currentSchema: t.currentSchema as TemplateRow['currentSchema'],
    }));

  logger(`Templates referencing a duplicate mechanic: ${templates.length}`);

  let fieldsRemapped = 0;
  let fieldsDroppedAsLoopCollision = 0;
  let templatesUpdated = 0;
  let templatesFailed = 0;

  for (const template of templates) {
    const items = template.currentSchema.items;

    // Loop identities already claimed by a non-duplicate field (covers a
    // canonical mechanic already independently assigned to that same loop).
    const claimed = new Set<string>();
    for (const item of items) {
      if (item.mechanic_ref && !duplicateTarget.has(item.mechanic_ref.mechanic_id))
        claimed.add(`${item.group ?? ''}::${item.mechanic_ref.mechanic_id}`);
    }

    let changed = false;
    const nextItems: FieldItem[] = [];
    for (const item of items) {
      const target = item.mechanic_ref ? duplicateTarget.get(item.mechanic_ref.mechanic_id) : undefined;
      if (!target) {
        nextItems.push(item);
        continue;
      }

      const claimKey = `${item.group ?? ''}::${target.canonicalUid}`;
      if (claimed.has(claimKey)) {
        // Canonical's own field already covers this loop — drop the
        // duplicate's field rather than create a second item with the same
        // (group, mechanic_id), which would violate per-loop uniqueness.
        changed = true;
        fieldsDroppedAsLoopCollision++;
        continue;
      }
      claimed.add(claimKey);

      const canonical = canonicalByUid.get(target.canonicalUid)!;
      nextItems.push({
        ...item,
        label: canonical.instructionLabel,
        description: canonical.instructionBody,
        mechanic_ref: {
          client_id: target.clientUid,
          mechanic_id: canonical.uid,
          content_revision: canonical.contentRevision,
        },
      });
      changed = true;
      fieldsRemapped++;
    }

    if (!changed)
      continue;

    logger(`  ${template.uid}: remapped/dropped duplicate mechanic field(s)`);

    if (apply) {
      try {
        await taskTemplateService.updateTemplateWithSnapshot(template.uid, template.studioUid, {
          version: template.version,
          currentSchema: { ...template.currentSchema, items: nextItems },
        });
        templatesUpdated++;
      } catch (err) {
        templatesFailed++;
        logger(`  FAILED to update ${template.uid}: ${(err as Error).message}`);
      }
    }
  }

  let mechanicsRetired = 0;
  let mechanicsRetireFailed = 0;
  if (apply) {
    for (const dupUid of allDuplicateUids) {
      const target = duplicateTarget.get(dupUid)!;
      try {
        await clientMechanicService.retireMechanic({ mechanicUid: dupUid, clientUid: target.clientUid });
        mechanicsRetired++;
      } catch (err) {
        mechanicsRetireFailed++;
        logger(`  FAILED to retire ${dupUid}: ${(err as Error).message}`);
      }
    }
  }

  const result: ConsolidateResult = {
    groupsProcessed: plan.length,
    fieldsRemapped,
    fieldsDroppedAsLoopCollision,
    templatesUpdated,
    templatesFailed,
    mechanicsRetired,
    mechanicsRetireFailed,
  };

  logger('\n--- Summary ---');
  logger(`Merge groups: ${result.groupsProcessed} (${allDuplicateUids.length} duplicate mechanics)`);
  logger(`Fields ${apply ? 'remapped' : 'that would be remapped'}: ${result.fieldsRemapped}`);
  logger(`Fields ${apply ? 'dropped' : 'that would be dropped'} (loop collision with canonical): ${result.fieldsDroppedAsLoopCollision}`);
  if (apply) {
    logger(`Templates updated: ${result.templatesUpdated}`);
    logger(`Templates failed: ${result.templatesFailed}`);
    logger(`Mechanics retired: ${result.mechanicsRetired}`);
    logger(`Mechanics retire failed: ${result.mechanicsRetireFailed}`);
  }
  return result;
}

@Module({
  imports: [
    PrismaModule,
    TaskTemplateModule,
    ClientMechanicModule,
    ClsModule.forRoot({
      global: true,
      plugins: [
        new ClsPluginTransactional({
          imports: [PrismaModule],
          adapter: new TransactionalAdapterPrisma({ prismaInjectionToken: PrismaService }),
        }),
      ],
    }),
  ],
})
class ConsolidateModule {}

async function main() {
  // eslint-disable-next-line node/no-process-env
  ensureLocalDatabase(process.env.DATABASE_URL, process.env.ALLOW_PROD);
  const apply = process.argv.includes('--apply');

  const app = await NestFactory.createApplicationContext(ConsolidateModule, { logger: false });
  try {
    await runConsolidation({
      prisma: app.get(PrismaService),
      taskTemplateService: app.get(TaskTemplateService),
      clientMechanicService: app.get(ClientMechanicService),
      apply,
    });
  } finally {
    await app.close();
  }
}

if (process.argv[1]?.includes('consolidate-duplicate-mechanics')) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
