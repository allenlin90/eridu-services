import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '@prisma/client';
import { Pool } from 'pg';

export const POST_PRODUCTION_TEMPLATE_UID = 'ttpl_n6f7qAZQmPA4He6MOR-y';

type Args = {
  dryRun: boolean;
  includeReview: boolean;
};

function parseArgs(): Args {
  const args = process.argv.slice(2);
  let dryRun = true; // default to dry-run for safety

  if (args.includes('--apply')) {
    dryRun = false;
  }

  return { dryRun, includeReview: args.includes('--include-review') };
}

export type BackfillResult = {
  processedCount: number;
  updatedCount: number;
  skippedCount: number;
};

export async function runBackfill({
  prisma,
  dryRun,
  includeReview = false,
  logger = console.log,
}: {
  prisma: any;
  dryRun: boolean;
  includeReview?: boolean;
  logger?: (msg: string) => void;
}): Promise<BackfillResult> {
  logger('--- Starting Show Performance Data Backfill ---');
  if (dryRun) {
    logger('Running in DRY-RUN mode. No changes will be written to the database.');
  } else {
    logger('Running in APPLY mode. Changes will be written to the database.');
  }
  const statuses = includeReview ? ['COMPLETED', 'REVIEW'] : ['COMPLETED'];
  logger(`Task statuses included: ${statuses.join(', ')}`);

  // Query finalized tasks with snapshots and templates. REVIEW is opt-in only:
  // projecting unapproved submissions would make analytics disagree with the
  // approval gate.
  const tasks = await prisma.task.findMany({
    where: {
      status: { in: statuses },
      deletedAt: null,
    },
    include: {
      snapshot: true,
      template: true,
    },
    orderBy: {
      completedAt: 'asc',
    },
  });

  logger(`Loaded ${tasks.length} task(s).`);

  let processedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const task of tasks) {
    const templateUid = task.template?.uid;
    if (!templateUid) continue;

    const snapshot = task.snapshot;
    if (!snapshot) continue;

    const schema = snapshot.schema;
    if (!schema || !Array.isArray(schema.items)) continue;

    // Build map from field ID to system_fact_key
    const fieldToFactKey = new Map<string, string>();
    for (const item of schema.items) {
      if (item.system_fact_key) {
        fieldToFactKey.set(item.id, item.system_fact_key);
      }
    }

    const content = (task.content as Record<string, unknown> | null) ?? {};

    // Walk content to find performance-related hydrated keys
    for (const [contentKey, rawValue] of Object.entries(content)) {
      if (rawValue === null || rawValue === undefined || rawValue === '') {
        continue;
      }

      // hydrated keys are like fld_xxx:platform:sp_yyy
      const parts = contentKey.split(':');
      if (parts.length !== 3 || parts[1] !== 'platform') {
        continue;
      }

      const fieldId = parts[0];
      const showPlatformUid = parts[2];

      const factKey = fieldToFactKey.get(fieldId);
      if (!factKey) continue;

      if (![
        'show_platform_gmv',
        'show_platform_view_count',
        'show_platform_ctr',
        'show_platform_cto',
      ].includes(factKey)) {
        continue;
      }

      processedCount++;

      // Resolve the database field name
      let dbField: 'gmv' | 'viewerCount' | 'ctr' | 'cto';
      let isDecimal = true;
      if (factKey === 'show_platform_gmv') {
        dbField = 'gmv';
      } else if (factKey === 'show_platform_view_count') {
        dbField = 'viewerCount';
        isDecimal = false;
      } else if (factKey === 'show_platform_ctr') {
        dbField = 'ctr';
      } else {
        dbField = 'cto';
      }

      // Parse incoming value
      let incomingDecimal: Prisma.Decimal | null = null;
      let incomingViewCount = 0;
      if (isDecimal) {
        try {
          incomingDecimal = new Prisma.Decimal(rawValue as any);
        } catch {
          logger(`Warning: Failed to parse decimal value "${rawValue}" for show platform ${showPlatformUid}`);
          continue;
        }
        if (!incomingDecimal.isFinite()) continue;
      } else {
        incomingViewCount = Number(rawValue);
        if (!Number.isFinite(incomingViewCount)) continue;
      }

      // Look up ShowPlatform row
      const showPlatform = await prisma.showPlatform.findFirst({
        where: {
          uid: showPlatformUid,
          deletedAt: null,
        },
      });

      if (!showPlatform) {
        logger(`Warning: ShowPlatform ${showPlatformUid} not found or deleted.`);
        continue;
      }

      // Precedence logic:
      const metadata = (showPlatform.metadata as Record<string, any> | null) ?? {};
      const recordedTemplate = metadata.performance_templates?.[factKey];

      if (
        recordedTemplate === POST_PRODUCTION_TEMPLATE_UID &&
        templateUid !== POST_PRODUCTION_TEMPLATE_UID
      ) {
        skippedCount++;
        continue;
      }

      const currentValue = showPlatform[dbField];

      // Check if unchanged
      const unchanged = isDecimal
        ? currentValue !== null && incomingDecimal!.equals(currentValue as Prisma.Decimal)
        : currentValue === incomingViewCount;

      if (unchanged && recordedTemplate === templateUid) {
        continue;
      }

      // Update in DB if not dryRun
      const nextMetadata = {
        ...metadata,
        performance_templates: {
          ...(metadata.performance_templates ?? {}),
          [factKey]: templateUid,
        },
      };

      const updateData: Record<string, any> = {
        metadata: nextMetadata,
        [dbField]: isDecimal ? incomingDecimal : incomingViewCount,
      };

      if (!dryRun) {
        await prisma.showPlatform.update({
          where: { id: showPlatform.id },
          data: updateData,
        });
      }

      updatedCount++;
    }
  }

  logger('--- Backfill Summary ---');
  logger(`Total performance values processed: ${processedCount}`);
  logger(`Total values updated/written: ${updatedCount}`);
  logger(`Total values skipped due to lower priority: ${skippedCount}`);

  return { processedCount, updatedCount, skippedCount };
}

async function main() {
  const { dryRun, includeReview } = parseArgs();
  
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not defined in environment variables');
  }
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    await runBackfill({ prisma, dryRun, includeReview });
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

// Check if run directly
if (process.argv[1]?.endsWith('backfill-performance.ts') || process.argv[1]?.endsWith('backfill-performance.js')) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
