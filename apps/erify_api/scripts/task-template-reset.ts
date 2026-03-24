import { NestFactory } from '@nestjs/core';

import { AppModule } from '../src/app.module';
import {
  type TaskTemplateResetDefinitionReference,
  type TaskTemplateResetInput,
  type TaskTemplateResetPlan,
  TaskTemplateResetService,
} from '../src/models/task-template/task-template-reset.service';
import { TaskTemplateModule } from '../src/models/task-template/task-template.module';

type ParsedArgs = TaskTemplateResetInput & {
  confirm: boolean;
};

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  let studioUid: string | undefined;
  let allTemplates = false;
  let confirm = false;
  const templateUids: string[] = [];

  for (const arg of args) {
    if (arg.startsWith('--studio-id=')) {
      studioUid = arg.slice('--studio-id='.length);
      continue;
    }

    if (arg.startsWith('--template-uid=')) {
      templateUids.push(arg.slice('--template-uid='.length));
      continue;
    }

    if (arg === '--all-templates') {
      allTemplates = true;
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

  return {
    studioUid,
    templateUids,
    allTemplates,
    confirm,
  };
}

function printUsageAndExit(code: number): never {
  console.log(`Usage:
  pnpm run db:task-template:reset -- --studio-id=<std_uid> --all-templates [--confirm]
  pnpm run db:task-template:reset -- --studio-id=<std_uid> --template-uid=<ttpl_uid> [--template-uid=<ttpl_uid>] [--confirm]

Behavior:
  - Dry-run is the default behavior.
  - Add --confirm to execute the reset.
  - The script aborts if saved task report definitions in the same studio reference the target templates.
`);
  process.exit(code);
}

function printBlockingDefinitions(definitions: TaskTemplateResetDefinitionReference[]) {
  if (definitions.length === 0) {
    return;
  }

  console.log('\nBlocking task report definitions:');
  for (const definition of definitions) {
    const sourceRefs = definition.sourceTemplateIds.length > 0
      ? `source_templates=[${definition.sourceTemplateIds.join(', ')}]`
      : '';
    const columnRefs = definition.templateScopedColumnTemplateIds.length > 0
      ? `columns=[${definition.templateScopedColumnTemplateIds.join(', ')}]`
      : '';
    const details = [sourceRefs, columnRefs].filter((value) => value.length > 0).join(' ');
    console.log(`- ${definition.id} (${definition.name}) ${details}`.trim());
  }
}

function printPlan(plan: TaskTemplateResetPlan, confirm: boolean) {
  console.log(`Task template reset plan for studio ${plan.studio.uid} (${plan.studio.name})`);
  console.log(`Mode: ${confirm ? 'EXECUTE' : 'DRY RUN'}`);
  console.log(`Templates: ${plan.templates.length}`);
  console.log(`Snapshots: ${plan.totalSnapshotCount}`);
  console.log(`Tasks: ${plan.totalTaskCount} total / ${plan.totalActiveTaskCount} active`);

  console.log('\nTemplates:');
  for (const template of plan.templates) {
    console.log(
      `- ${template.uid} | ${template.name} | snapshots=${template.snapshotCount} | tasks=${template.taskCountTotal} total / ${template.taskCountActive} active | shows=${template.boundShowCount} | last_used_at=${template.lastUsedAt ?? 'never'}${template.isSoftDeleted ? ' | soft_deleted=true' : ''}`,
    );
  }

  printBlockingDefinitions(plan.staleReportDefinitions);
}

async function main() {
  const args = parseArgs();

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const resetService = app
      .select(TaskTemplateModule)
      .get(TaskTemplateResetService, { strict: true });

    const plan = await resetService.planReset({
      studioUid: args.studioUid,
      templateUids: args.templateUids,
      allTemplates: args.allTemplates,
    });

    printPlan(plan, args.confirm);

    if (!args.confirm) {
      console.log('\nDry run complete. Re-run with --confirm to execute the reset.');
      return;
    }

    const result = await resetService.executeReset({
      studioUid: args.studioUid,
      templateUids: args.templateUids,
      allTemplates: args.allTemplates,
    });

    console.log('\nReset completed.');
    console.log(`Deleted templates: ${result.deletedTemplateCount}`);
    console.log(`Deleted tasks: ${result.deletedTaskCount}`);
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
