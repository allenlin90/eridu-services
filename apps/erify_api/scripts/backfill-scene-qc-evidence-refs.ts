import 'dotenv/config';

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ClsModule } from 'nestjs-cls';

import {
  getFieldContentKey,
  isImageOnlyAcceptRule,
  safeParseTemplateSchema,
} from '@eridu/api-types/task-management';

import { SCENE_QC_EVIDENCE_BINDINGS, type SceneQcEvidenceBinding } from './scene-qc-evidence-binding-map';

import { envSchema } from '@/config/env.schema';
import { TaskTemplateModule } from '@/models/task-template/task-template.module';
import { TaskTemplateService } from '@/models/task-template/task-template.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * Scene QC evidence-binding cutover backfill (plan sections 4.2 / 5.2 / 5.7).
 *
 * Binds `evidence_purpose: 'scene_qc'` onto the reviewed field(s) named in
 * `scene-qc-evidence-binding-map.ts` for every mapped template, via TWO passes:
 *
 *   1. Durability pass (JSON): reads the template's `currentSchema`, sets the
 *      marker on the mapped field(s), and writes through the REAL
 *      `TaskTemplateService.updateTemplateWithSnapshot` path (the same one the
 *      builder UI uses). This bumps version, creates a new snapshot, revalidates
 *      through `safeParseTemplateSchema` (fails loudly on a non-image-accept
 *      field), and lets `TaskTemplateRepository.syncSceneQcEvidenceRefsForTemplate`
 *      write the new snapshot's ref rows. MANDATORY: without the JSON marker,
 *      the next builder edit's delete-then-recreate sync silently erases the
 *      binding.
 *   2. Historical pass (rows only): for every OTHER snapshot of that template
 *      referenced by at least one non-deleted Task, parses its immutable schema,
 *      resolves the mapped field(s)' content key + snapshot-time label, and
 *      `createMany({ skipDuplicates: true })`s directly into
 *      `taskTemplateSceneQcEvidenceRef`. NEVER rewrites snapshot JSON.
 *
 * Idempotent: step 1 no-ops (reported as `already_marked`) when the marker is
 * already present in `currentSchema`; step 2 relies on the ref table's
 * `@@unique([snapshotId, fieldKey])` + `skipDuplicates`.
 *
 * Modes:
 *   --report          Read-only: lists candidate image fields per template
 *                      (file type, image-only accept, no evidence_purpose yet)
 *                      plus the current map's dry-run plan and any stale entry.
 *   (no flags)         Dry-run of --apply. No writes.
 *   --apply            Executes both passes for real.
 *
 * Usage:
 *   pnpm --filter erify_api exec ts-node -r tsconfig-paths/register scripts/backfill-scene-qc-evidence-refs.ts --report
 *   pnpm --filter erify_api exec ts-node -r tsconfig-paths/register scripts/backfill-scene-qc-evidence-refs.ts
 *   pnpm --filter erify_api exec ts-node -r tsconfig-paths/register scripts/backfill-scene-qc-evidence-refs.ts --apply
 *
 * Dry-run by default. Refuses a non-localhost DATABASE_URL unless ALLOW_PROD=1
 * is set (matches the local-only-by-default convention used elsewhere in this
 * repo's backfill scripts).
 */

export function ensureLocalDatabase(databaseUrl: string | undefined, allowProd: string | undefined): void {
  const isLocal = /(localhost|127\.0\.0\.1|::1)/.test(databaseUrl ?? '');
  if (!isLocal && allowProd !== '1') {
    throw new Error(
      'DATABASE_URL does not look like a local database. Set ALLOW_PROD=1 to run against it intentionally.',
    );
  }
}

type FieldItem = {
  id?: string;
  key: string;
  type?: string;
  label: string;
  evidence_purpose?: string;
  validation?: { accept?: string };
  [k: string]: unknown;
};

type MinimalPrisma = {
  taskTemplate: {
    findMany: PrismaService['taskTemplate']['findMany'];
    findFirst: PrismaService['taskTemplate']['findFirst'];
  };
  taskTemplateSnapshot: { findMany: PrismaService['taskTemplateSnapshot']['findMany'] };
  taskTemplateSceneQcEvidenceRef: {
    createMany: PrismaService['taskTemplateSceneQcEvidenceRef']['createMany'];
  };
  task: { count: PrismaService['task']['count'] };
};

export type ReportRow = {
  templateUid: string;
  templateName: string;
  version: number;
  engine: string;
  fieldKey: string;
  label: string;
  taskCount: number;
};

/**
 * Read-only candidate scan: every non-deleted template's `file` fields with an
 * image-only accept rule and no `evidence_purpose` yet.
 */
export async function findCandidateEvidenceFields(prisma: MinimalPrisma): Promise<ReportRow[]> {
  const templates = await prisma.taskTemplate.findMany({
    where: { deletedAt: null },
  });

  const rows: ReportRow[] = [];
  for (const template of templates as any[]) {
    const parsed = safeParseTemplateSchema(template.currentSchema);
    if (!parsed.success) {
      continue;
    }
    const engine = (template.currentSchema as { schema_engine?: string })?.schema_engine ?? 'task_template_v1';

    for (const item of parsed.data.items as FieldItem[]) {
      if (item.type !== 'file' || item.evidence_purpose) {
        continue;
      }
      if (!isImageOnlyAcceptRule(item.validation?.accept)) {
        continue;
      }
      const taskCount = await prisma.task.count({
        where: { templateId: template.id, deletedAt: null },
      });
      rows.push({
        templateUid: template.uid,
        templateName: template.name,
        version: template.version,
        engine,
        fieldKey: getFieldContentKey(parsed.data, item as { key: string; id?: string }),
        label: item.label,
        taskCount,
      });
    }
  }
  return rows;
}

export type BackfillDeps = {
  prisma: MinimalPrisma;
  taskTemplateService: Pick<TaskTemplateService, 'updateTemplateWithSnapshot'>;
  bindings: readonly SceneQcEvidenceBinding[];
  apply: boolean;
  logger?: (m: string) => void;
};

export type BackfillResult = {
  templatesProcessed: number;
  templatesAlreadyMarked: number;
  templatesFailed: number;
  snapshotsBound: number;
  rowsCreated: number;
  unresolvedFieldKeys: { templateUid: string; fieldKey: string }[];
  unresolvedMapEntries: string[];
};

export async function runBackfill({
  prisma,
  taskTemplateService,
  bindings,
  apply,
  logger = console.log,
}: BackfillDeps): Promise<BackfillResult> {
  logger(`--- Scene QC Evidence Binding Backfill --- ${apply ? 'APPLY' : 'DRY-RUN'}`);

  const result: BackfillResult = {
    templatesProcessed: 0,
    templatesAlreadyMarked: 0,
    templatesFailed: 0,
    snapshotsBound: 0,
    rowsCreated: 0,
    unresolvedFieldKeys: [],
    unresolvedMapEntries: [],
  };

  for (const binding of bindings) {
    const template = await prisma.taskTemplate.findFirst({
      where: { uid: binding.templateUid, deletedAt: null },
      include: { client: true, studio: true } as any,
    }) as any;

    if (!template) {
      result.unresolvedMapEntries.push(binding.templateUid);
      logger(`  SKIP ${binding.templateUid}: template not found (removed/renamed?)`);
      continue;
    }

    const parsed = safeParseTemplateSchema(template.currentSchema);
    if (!parsed.success) {
      result.templatesFailed++;
      logger(`  FAILED ${binding.templateUid}: current schema does not parse`);
      continue;
    }

    const items = parsed.data.items as FieldItem[];
    const alreadyMarked = binding.fieldKeys.every((fieldKey) =>
      items.some((item) => {
        try {
          return getFieldContentKey(parsed.data, item as { key: string; id?: string }) === fieldKey
            && item.evidence_purpose === 'scene_qc';
        } catch {
          return false;
        }
      }));

    if (alreadyMarked) {
      result.templatesAlreadyMarked++;
      logger(`  ${binding.templateUid}: already marked -- skipping version bump`);
    } else {
      const resolvedKeys = new Set(
        items
          .map((item) => {
            try {
              return getFieldContentKey(parsed.data, item as { key: string; id?: string });
            } catch {
              return null;
            }
          })
          .filter((k): k is string => k !== null),
      );
      const missingFieldKeys = binding.fieldKeys.filter((fieldKey) => !resolvedKeys.has(fieldKey));

      if (missingFieldKeys.length > 0) {
        // Fail closed: applying a mapping that only partially resolves would
        // silently mark some fields and skip others while still reporting
        // this template as bound. Abort the current-snapshot pass entirely
        // for this template rather than writing a half-applied binding.
        result.templatesFailed++;
        for (const fieldKey of missingFieldKeys) {
          result.unresolvedFieldKeys.push({ templateUid: binding.templateUid, fieldKey });
          logger(`  ${binding.templateUid}: field key "${fieldKey}" not found in current schema -- ABORTING current-snapshot binding for this template`);
        }
      } else {
        const nextItems = items.map((item) => {
          let contentKey: string;
          try {
            contentKey = getFieldContentKey(parsed.data, item as { key: string; id?: string });
          } catch {
            return item;
          }
          return binding.fieldKeys.includes(contentKey)
            ? { ...item, evidence_purpose: 'scene_qc' }
            : item;
        });

        if (apply) {
          try {
            await taskTemplateService.updateTemplateWithSnapshot(binding.templateUid, template.studio.uid, {
              version: template.version,
              clientUid: template.client?.uid,
              currentSchema: { ...(template.currentSchema as object), items: nextItems },
            });
            result.snapshotsBound++;
            logger(`  ${binding.templateUid}: marked current schema and created a new snapshot`);
          } catch (err) {
            result.templatesFailed++;
            logger(`  FAILED to update ${binding.templateUid}: ${(err as Error).message}`);
          }
        } else {
          result.snapshotsBound++;
          logger(`  ${binding.templateUid}: would mark current schema and create a new snapshot`);
        }
      }
    }
    result.templatesProcessed++;

    // Historical pass: bind OTHER snapshots referenced by live (non-deleted) Tasks.
    const historicalSnapshots = await prisma.taskTemplateSnapshot.findMany({
      where: {
        templateId: template.id,
        tasks: { some: { deletedAt: null } },
      },
    }) as any[];

    for (const snapshot of historicalSnapshots) {
      const snapshotParsed = safeParseTemplateSchema(snapshot.schema);
      if (!snapshotParsed.success) {
        continue;
      }
      const snapshotItems = snapshotParsed.data.items as FieldItem[];
      const rows: { templateId: bigint; snapshotId: bigint; fieldKey: string; label: string }[] = [];

      for (const fieldKey of binding.fieldKeys) {
        const match = snapshotItems.find((item) => {
          try {
            return getFieldContentKey(snapshotParsed.data, item as { key: string; id?: string }) === fieldKey;
          } catch {
            return false;
          }
        });
        if (!match) {
          logger(`  ${binding.templateUid} snapshot v${snapshot.version}: field key "${fieldKey}" not present -- skipped`);
          continue;
        }
        rows.push({
          templateId: template.id,
          snapshotId: snapshot.id,
          fieldKey,
          label: match.label,
        });
      }

      if (rows.length === 0) {
        continue;
      }

      if (apply) {
        const created = await prisma.taskTemplateSceneQcEvidenceRef.createMany({
          data: rows,
          skipDuplicates: true,
        });
        result.rowsCreated += created.count;
      } else {
        result.rowsCreated += rows.length;
      }
      logger(`  ${binding.templateUid} snapshot v${snapshot.version}: ${apply ? 'bound' : 'would bind'} ${rows.length} row(s)`);
    }
  }

  logger('\n--- Summary ---');
  logger(`Templates processed: ${result.templatesProcessed} (already marked: ${result.templatesAlreadyMarked}, failed: ${result.templatesFailed})`);
  logger(`Current-snapshot bindings ${apply ? 'created' : 'that would be created'}: ${result.snapshotsBound}`);
  logger(`Historical snapshot rows ${apply ? 'created' : 'that would be created'}: ${result.rowsCreated}`);
  if (result.unresolvedFieldKeys.length > 0) {
    logger(`Unresolved field keys: ${result.unresolvedFieldKeys.length}`);
  }
  if (result.unresolvedMapEntries.length > 0) {
    logger(`Unresolved map entries (template not found): ${result.unresolvedMapEntries.length}`);
  }

  return result;
}

/**
 * True when any binding failed, aborted (unresolved field key), or referenced
 * a template that no longer exists. `main()` uses this to fail the process
 * even though `runBackfill` itself never throws for a per-template problem --
 * a script whose exit code is always 0 is not a safe cutover gate.
 */
export function hasUnresolvedOrFailedBindings(result: BackfillResult): boolean {
  return (
    result.templatesFailed > 0
    || result.unresolvedFieldKeys.length > 0
    || result.unresolvedMapEntries.length > 0
  );
}

@Module({
  imports: [
    // PrismaService injects ConfigService; without a real ConfigModule.forRoot()
    // registration somewhere in the tree, Nest has no provider for it and the
    // injector passes `undefined`, crashing PrismaService's constructor.
    // Mirrors the real AppModule's setup (src/app.module.ts) exactly, including
    // the env schema validation, so a missing/invalid DATABASE_URL fails loudly
    // here the same way it would in the real app.
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: (config: Record<string, unknown>) => {
        const result = envSchema.safeParse(config);
        if (!result.success) {
          const errorMessage = result.error.issues
            .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
            .join('\n');
          throw new Error(`Invalid environment variables:\n${errorMessage}`);
        }
        return result.data;
      },
    }),
    PrismaModule,
    TaskTemplateModule,
    // TaskTemplateRepository injects TransactionHost<TransactionalAdapterPrisma>
    // (the @Transactional() decorator's CLS-backed tx host); without this it's
    // an unregistered dependency and NestFactory.createApplicationContext fails
    // to bootstrap. Mirrors the real AppModule's setup (src/app.module.ts).
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
class BackfillModule {}

async function main() {
  ensureLocalDatabase(process.env.DATABASE_URL, process.env.ALLOW_PROD);
  const report = process.argv.includes('--report');
  const apply = process.argv.includes('--apply');

  // `logger: false` would silence a bootstrap failure entirely: with Nest's
  // default `abortOnError: true`, a DI/provider error calls `process.exit(1)`
  // directly rather than rejecting this promise, so a silenced logger means
  // the operator sees nothing but a bare non-zero exit code. Keep error/warn
  // visible so a bootstrap failure is diagnosable.
  const app = await NestFactory.createApplicationContext(BackfillModule, { logger: ['error', 'warn'] });
  try {
    const prisma = app.get(PrismaService);

    if (report) {
      const rows = await findCandidateEvidenceFields(prisma);
      console.log(`--- Scene QC Evidence Candidate Fields --- (${rows.length} found)`);
      for (const row of rows) {
        console.log(`  ${row.templateUid} "${row.templateName}" v${row.version} [${row.engine}] :: ${row.fieldKey} ("${row.label}") -- ${row.taskCount} task(s)`);
      }
      console.log('\n--- Current map dry-run plan ---');
      const reportResult = await runBackfill({
        prisma,
        taskTemplateService: app.get(TaskTemplateService),
        bindings: SCENE_QC_EVIDENCE_BINDINGS,
        apply: false,
      });
      if (hasUnresolvedOrFailedBindings(reportResult)) {
        process.exitCode = 1;
      }
      return;
    }

    const result = await runBackfill({
      prisma,
      taskTemplateService: app.get(TaskTemplateService),
      bindings: SCENE_QC_EVIDENCE_BINDINGS,
      apply,
    });
    if (hasUnresolvedOrFailedBindings(result)) {
      process.exitCode = 1;
    }
  } finally {
    await app.close();
  }
}

if (process.argv[1]?.includes('backfill-scene-qc-evidence-refs')) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
