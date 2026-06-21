import 'dotenv/config';

import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ClsModule } from 'nestjs-cls';

import { ClientModule } from '@/models/client/client.module';
import { ClientMechanicModule } from '@/models/client-mechanic/client-mechanic.module';
import { ClientMechanicService } from '@/models/client-mechanic/client-mechanic.service';
import { TaskTemplateModule } from '@/models/task-template/task-template.module';
import { TaskTemplateService } from '@/models/task-template/task-template.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * One-off backfill: before the client-mechanic catalog existed (PR 20.1-20.7),
 * moderation templates encoded reusable product/promo cues as ad-hoc checkbox
 * fields with a generic label ("Product machenic" / "Promotion machenic" —
 * always misspelled in production data) and the real instruction in
 * `description`. This script converts those fields to the new `mechanic_ref`
 * system: creates `ClientMechanic` catalog rows from the distinct instruction
 * text per client, binds `TaskTemplate.clientId`, and attaches `mechanic_ref`
 * to each matching field so coverage tracking and edit-once-propagates work
 * going forward.
 *
 * Scope (verified against a prod-data-sync'd local DB before writing this):
 *   - 43 of 59 live templates have at least one matching field; all are
 *     schema_engine = task_template_v2.
 *   - ~4,475 individual fields match; within a single template they dedupe
 *     heavily (e.g. 144 fields -> 27 distinct descriptions), and the SAME
 *     descriptions repeat verbatim across a client's template variants
 *     (verified: Pandora Thailand's BAU/Double/Payday templates share all 27).
 *   - TaskTemplate.clientId is NULL on every template — this script sets it.
 *   - ClientMechanic table starts empty — this script creates the catalog.
 *
 * Client resolution (in order):
 *   1. Distinct Show.clientId via tasks -> task_targets(SHOW) -> shows for
 *      this template, if exactly one.
 *   2. Fuzzy match: the template name's segment before " - " against
 *      Client.name (case-insensitive equality or prefix). Ambiguous or
 *      no-match templates are skipped and reported, never guessed.
 *
 * Mechanic dedup key: (resolved client, exact instructionBody text), shared
 * across ALL of that client's affected templates — not just within one.
 *
 * Within-loop duplicates: if the same description appears more than once in
 * the same template+loop (real data has plenty, e.g. a repeated tagline),
 * only the first occurrence is converted; the rest are left as plain fields
 * and reported for manual cleanup — binding both would violate per-loop
 * (mechanic_id, group) uniqueness.
 *
 * Idempotent: skips items that already carry a `mechanic_ref`; reuses an
 * existing ClientMechanic row if one with the same client + instructionBody
 * already exists (so a partial prior run, or running this after someone
 * manually created the same mechanic, doesn't create a duplicate).
 *
 * Writes go through the real `TaskTemplateService.updateTemplateWithSnapshot`
 * (the same path the builder UI uses) — so version bump, snapshot creation,
 * schema validation, and TaskTemplateMechanicRef sync all happen exactly as
 * they would for a manual edit. One call per affected template (not per task).
 *
 * Usage:
 *   pnpm --filter erify_api exec ts-node -r tsconfig-paths/register scripts/backfill-product-promotion-mechanics.ts
 *   pnpm --filter erify_api exec ts-node -r tsconfig-paths/register scripts/backfill-product-promotion-mechanics.ts --apply
 *
 * Dry-run by default. Refuses a non-localhost DATABASE_URL unless ALLOW_PROD=1
 * is set (matches the local-only-by-default convention used elsewhere in this
 * repo's backfill scripts).
 */

export const MECHANIC_LABEL_PATTERN = /mechan|machen/i;

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
  name: string;
  version: number;
  studioUid: string;
  currentSchema: { items: FieldItem[]; [k: string]: unknown };
};

export type ClientRow = { id: bigint; uid: string; name: string };

export function cleanLabel(label: string): string {
  // The only typo found in production data; kept narrow rather than a fuzzy
  // speller so the script never silently "corrects" an unrelated label.
  return label.replace(/machenic/gi, 'mechanic').trim();
}

export function shortSnippet(text: string, max = 40): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

export function ensureLocalDatabase(databaseUrl: string | undefined, allowProd: string | undefined): void {
  const isLocal = /(localhost|127\.0\.0\.1|::1)/.test(databaseUrl ?? '');
  if (!isLocal && allowProd !== '1') {
    throw new Error(
      'DATABASE_URL does not look like a local database. Set ALLOW_PROD=1 to run against it intentionally.',
    );
  }
}

type MinimalPrisma = {
  $queryRaw: PrismaService['$queryRaw'];
  client: { findUnique: PrismaService['client']['findUnique']; findMany: PrismaService['client']['findMany'] };
  taskTemplate: { findMany: PrismaService['taskTemplate']['findMany'] };
  clientMechanic: { findMany: PrismaService['clientMechanic']['findMany'] };
};

export async function resolveClientForTemplate(
  prisma: MinimalPrisma,
  template: { id: bigint; name: string },
  clientsByName: Map<string, ClientRow>,
): Promise<{ client: ClientRow | null; reason: string }> {
  const showClients = await prisma.$queryRaw<{ client_id: bigint }[]>`
    SELECT DISTINCT s.client_id
    FROM tasks t
    JOIN task_targets tt ON tt.task_id = t.id AND tt.target_type = 'SHOW' AND tt.deleted_at IS NULL
    JOIN shows s ON s.id = tt.show_id
    WHERE t.template_id = ${template.id} AND t.deleted_at IS NULL
  `;

  if (showClients.length === 1) {
    const match = await prisma.client.findUnique({ where: { id: showClients[0].client_id } });
    if (match)
      return { client: { id: match.id, uid: match.uid, name: match.name }, reason: 'show-history' };
  }
  if (showClients.length > 1) {
    return { client: null, reason: `ambiguous: ${showClients.length} distinct clients in show history` };
  }

  // No usable show history — fuzzy-match the template name's first segment.
  const prefix = template.name.split(' - ')[0]?.trim().toLowerCase();
  if (!prefix)
    return { client: null, reason: 'no name segment to match' };

  const candidates = Array.from(clientsByName.values()).filter((c) => {
    const name = c.name.toLowerCase();
    return name === prefix || name.startsWith(prefix) || prefix.startsWith(name);
  });

  if (candidates.length === 1)
    return { client: candidates[0], reason: 'name-match' };
  if (candidates.length === 0)
    return { client: null, reason: `no client name matches "${prefix}"` };
  return { client: null, reason: `ambiguous: ${candidates.length} client names match "${prefix}"` };
}

export type BackfillDeps = {
  prisma: MinimalPrisma;
  taskTemplateService: Pick<TaskTemplateService, 'updateTemplateWithSnapshot'>;
  clientMechanicService: Pick<ClientMechanicService, 'createMechanic'>;
  apply: boolean;
  logger?: (m: string) => void;
};

export type BackfillResult = {
  templatesAffected: number;
  templatesSkipped: { uid: string; name: string; reason: string }[];
  mechanicsCreated: number;
  mechanicsReused: number;
  fieldsConverted: number;
  duplicatesLeftUnconverted: number;
  templatesUpdated: number;
  templatesFailed: number;
};

export async function runBackfill({
  prisma,
  taskTemplateService,
  clientMechanicService,
  apply,
  logger = console.log,
}: BackfillDeps): Promise<BackfillResult> {
  logger(`--- Product/Promotion Mechanic Backfill --- ${apply ? 'APPLY' : 'DRY-RUN'}`);

  const allClients = await prisma.client.findMany({ where: { deletedAt: null } });
  const clientsByName = new Map(allClients.map((c) => [c.name.toLowerCase(), { id: c.id, uid: c.uid, name: c.name }]));

  const rawTemplates = await prisma.taskTemplate.findMany({
    where: { deletedAt: null },
    include: { studio: { select: { uid: true } } },
  });

  const templates: TemplateRow[] = rawTemplates
    .filter((t: any) => {
      const items = t.currentSchema?.items as FieldItem[] | undefined;
      return Array.isArray(items) && items.some((i) => MECHANIC_LABEL_PATTERN.test(i.label ?? ''));
    })
    .map((t: any) => ({
      id: t.id,
      uid: t.uid,
      name: t.name,
      version: t.version,
      studioUid: t.studio!.uid,
      currentSchema: t.currentSchema as TemplateRow['currentSchema'],
    }));

  logger(`Templates with ad-hoc mechanic fields: ${templates.length}`);

  // Resolve client per template; group by resolved client uid.
  const byClient = new Map<string, { client: ClientRow; templates: TemplateRow[] }>();
  const skipped: BackfillResult['templatesSkipped'] = [];

  for (const t of templates) {
    const { client, reason } = await resolveClientForTemplate(prisma, t, clientsByName);
    if (!client) {
      skipped.push({ uid: t.uid, name: t.name, reason });
      continue;
    }
    const group = byClient.get(client.uid) ?? { client, templates: [] };
    group.templates.push(t);
    byClient.set(client.uid, group);
  }

  logger(`Resolved to ${byClient.size} client(s); skipped ${skipped.length} template(s) (ambiguous/no match):`);
  for (const s of skipped) logger(`  - ${s.uid} "${s.name}": ${s.reason}`);

  let mechanicsCreated = 0;
  let mechanicsReused = 0;
  let fieldsConverted = 0;
  let duplicatesLeftUnconverted = 0;
  let templatesUpdated = 0;
  let templatesFailed = 0;

  for (const [clientUid, group] of byClient) {
    const existingMechanics = await prisma.clientMechanic.findMany({
      where: { clientId: group.client.id, deletedAt: null },
    });
    // Tracks both pre-existing and (real or dry-run-projected) newly created
    // mechanics for this client, so a description repeated across this
    // client's templates is counted as "reused" after its first occurrence
    // even in dry-run mode, where nothing is actually persisted.
    const mechanicByBody = new Map<string, { uid: string; contentRevision: number }>(
      existingMechanics.map((m: any) => [m.instructionBody, { uid: m.uid, contentRevision: m.contentRevision }]),
    );

    logger(`\nClient ${group.client.name} (${clientUid}): ${group.templates.length} template(s)`);

    for (const template of group.templates) {
      const items = template.currentSchema.items;
      const seenInLoop = new Set<string>(); // `${group}::${description}` already converted in this template
      let converted = 0;
      let duplicates = 0;

      const nextItems: FieldItem[] = [];
      for (const item of items) {
        const isMechanicField = MECHANIC_LABEL_PATTERN.test(item.label ?? '');
        if (!isMechanicField || item.mechanic_ref) {
          nextItems.push(item);
          continue;
        }

        const description = (item.description ?? '').trim();
        if (!description) {
          nextItems.push(item);
          continue;
        }
        const loopKey = `${item.group ?? ''}::${description}`;
        if (seenInLoop.has(loopKey)) {
          duplicates++;
          nextItems.push(item); // left unconverted — duplicate within the same loop
          continue;
        }
        seenInLoop.add(loopKey);

        let mechanic = mechanicByBody.get(description);
        if (mechanic) {
          mechanicsReused++;
        } else if (apply) {
          const created = await clientMechanicService.createMechanic(clientUid, {
            title: `${cleanLabel(item.label)} — ${shortSnippet(description)}`,
            instructionLabel: cleanLabel(item.label),
            instructionBody: description,
          });
          mechanic = { uid: created.uid, contentRevision: created.contentRevision };
          mechanicByBody.set(description, mechanic);
          mechanicsCreated++;
        } else {
          // Dry-run: project what would be created, without writing, so a
          // repeated description across this client's templates is still
          // correctly counted as "reused" on its second occurrence.
          mechanic = { uid: 'dry-run', contentRevision: 1 };
          mechanicByBody.set(description, mechanic);
          mechanicsCreated++;
        }

        nextItems.push({
          ...item,
          mechanic_ref: {
            client_id: clientUid,
            mechanic_id: mechanic.uid,
            content_revision: mechanic.contentRevision,
          },
        });
        converted++;
      }

      fieldsConverted += converted;
      duplicatesLeftUnconverted += duplicates;
      logger(`  ${template.uid} "${template.name}": ${converted} converted, ${duplicates} duplicate(s) left unconverted`);

      if (converted === 0)
        continue;

      if (apply) {
        try {
          await taskTemplateService.updateTemplateWithSnapshot(template.uid, template.studioUid, {
            version: template.version,
            clientUid,
            currentSchema: { ...template.currentSchema, items: nextItems },
          });
          templatesUpdated++;
        } catch (err) {
          templatesFailed++;
          logger(`  FAILED to update ${template.uid}: ${(err as Error).message}`);
        }
      }
    }
  }

  const result: BackfillResult = {
    templatesAffected: templates.length,
    templatesSkipped: skipped,
    mechanicsCreated,
    mechanicsReused,
    fieldsConverted,
    duplicatesLeftUnconverted,
    templatesUpdated,
    templatesFailed,
  };

  logger('\n--- Summary ---');
  logger(`Templates affected: ${result.templatesAffected} (skipped ${result.templatesSkipped.length} for client ambiguity)`);
  logger(`Mechanics ${apply ? 'created' : 'that would be created'}: ${result.mechanicsCreated}`);
  logger(`Mechanics reused (already existed): ${result.mechanicsReused}`);
  logger(`Fields ${apply ? 'converted' : 'that would be converted'}: ${result.fieldsConverted}`);
  logger(`Duplicate-in-loop fields left unconverted: ${result.duplicatesLeftUnconverted}`);
  if (apply) {
    logger(`Templates updated: ${result.templatesUpdated}`);
    logger(`Templates failed: ${result.templatesFailed}`);
  }
  return result;
}

@Module({
  imports: [
    PrismaModule,
    TaskTemplateModule,
    ClientMechanicModule,
    ClientModule,
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
  // eslint-disable-next-line node/no-process-env
  ensureLocalDatabase(process.env.DATABASE_URL, process.env.ALLOW_PROD);
  const apply = process.argv.includes('--apply');

  const app = await NestFactory.createApplicationContext(BackfillModule, { logger: false });
  try {
    await runBackfill({
      prisma: app.get(PrismaService),
      taskTemplateService: app.get(TaskTemplateService),
      clientMechanicService: app.get(ClientMechanicService),
      apply,
    });
  } finally {
    await app.close();
  }
}

if (process.argv[1]?.includes('backfill-product-promotion-mechanics')) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
