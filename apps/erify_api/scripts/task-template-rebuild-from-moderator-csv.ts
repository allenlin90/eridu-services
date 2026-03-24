import { NestFactory } from '@nestjs/core';

import { AppModule } from '../src/app.module';
import {
  type ModeratorCsvMigrationPlan,
  TaskTemplateModeratorCsvService,
} from '../src/models/task-template/task-template-moderator-csv.service';
import { TaskTemplateModule } from '../src/models/task-template/task-template.module';

type ParsedArgs = {
  studioUid: string;
  csvPath: string;
  confirm: boolean;
};

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  let studioUid: string | undefined;
  let csvPath: string | undefined;
  let confirm = false;

  for (const arg of args) {
    if (arg.startsWith('--studio-id=')) {
      studioUid = arg.slice('--studio-id='.length);
      continue;
    }

    if (arg.startsWith('--csv-path=')) {
      csvPath = arg.slice('--csv-path='.length);
      continue;
    }

    if (arg === '--confirm') {
      confirm = true;
      continue;
    }

    if (arg === '--dry-run') {
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      printUsageAndExit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!studioUid) {
    throw new Error('Missing required argument: --studio-id=<std_uid>');
  }

  if (!csvPath) {
    throw new Error('Missing required argument: --csv-path=/absolute/path/to/file.csv');
  }

  return {
    studioUid,
    csvPath,
    confirm,
  };
}

function printUsageAndExit(code: number): never {
  console.log(`Usage:
  pnpm run db:task-template:rebuild-moderator-csv -- --studio-id=<std_uid> --csv-path=/path/to/file.csv
  pnpm run db:task-template:rebuild-moderator-csv -- --studio-id=<std_uid> --csv-path=/path/to/file.csv --confirm

Behavior:
  - Dry-run is the default behavior.
  - The script creates/updates loop-indexed shared fields first.
  - If templates already exist in the studio, it hard-resets them before recreating all moderator templates from the CSV.
`);
  process.exit(code);
}

function printPlan(plan: ModeratorCsvMigrationPlan, confirm: boolean) {
  console.log(`Moderator CSV rebuild plan for studio ${plan.studioUid}`);
  console.log(`Mode: ${confirm ? 'EXECUTE' : 'DRY RUN'}`);
  console.log(`Source file: ${plan.sourceFilename}`);
  console.log(`Max loop detected: ${plan.maxLoop}`);
  console.log(`Shared fields to ensure: ${plan.sharedFields.length}`);
  console.log(`Templates to create: ${plan.templates.length}`);
  console.log(`Existing templates in studio: ${plan.existingTemplateCount}`);

  if (plan.resetPlan) {
    console.log(`Reset required: yes (${plan.resetPlan.templates.length} template(s), ${plan.resetPlan.totalTaskCount} task(s))`);
    if (plan.resetPlan.staleReportDefinitions.length > 0) {
      console.log('Blocking task report definitions:');
      for (const definition of plan.resetPlan.staleReportDefinitions) {
        console.log(`- ${definition.id} (${definition.name})`);
      }
    }
  } else {
    console.log('Reset required: no');
  }

  console.log('\nTemplates:');
  for (const template of plan.templates) {
    const loopCount = template.currentSchema.metadata?.loops?.length ?? 0;
    const itemCount = template.currentSchema.items.length;
    console.log(`- ${template.name} | loops=${loopCount} | items=${itemCount}`);
  }

  if (plan.customDataCollectionLabels.length > 0) {
    console.log('\nCustom data collection labels kept template-scoped:');
    for (const label of plan.customDataCollectionLabels) {
      console.log(`- ${label}`);
    }
  }
}

async function main() {
  const args = parseArgs();

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const migrationService = app
      .select(TaskTemplateModule)
      .get(TaskTemplateModeratorCsvService, { strict: true });

    const plan = await migrationService.planMigration({
      studioUid: args.studioUid,
      csvPath: args.csvPath,
    });

    printPlan(plan, args.confirm);

    if (!args.confirm) {
      console.log('\nDry run complete. Re-run with --confirm to execute the rebuild.');
      return;
    }

    const result = await migrationService.executeMigration({
      studioUid: args.studioUid,
      csvPath: args.csvPath,
    });

    console.log('\nModerator CSV rebuild completed.');
    console.log(`Created shared fields: ${result.createdSharedFieldCount}`);
    console.log(`Updated shared fields: ${result.updatedSharedFieldCount}`);
    console.log(`Created templates: ${result.createdTemplateCount}`);
    if (result.resetResult) {
      console.log(`Deleted templates: ${result.resetResult.deletedTemplateCount}`);
      console.log(`Deleted tasks: ${result.resetResult.deletedTaskCount}`);
    }
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
