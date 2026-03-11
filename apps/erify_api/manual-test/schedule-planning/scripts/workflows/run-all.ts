#!/usr/bin/env ts-node

/**
 * Script to run the complete schedule planning workflow
 *
 * This script orchestrates the complete schedule planning workflow:
 * 1. Ensure schedules exist and upload schedule plan documents
 * 2. Validate all schedules
 * 3. Publish validated schedules
 *
 * Usage:
 *   # Run complete workflow with default API URL
 *   pnpm run manual:schedule:all
 *
 *   # Custom API base URL
 *   pnpm run manual:schedule:all -- --api-url=http://localhost:3000
 *
 * Note: This script runs all steps sequentially. If any step fails,
 * the script will exit with an error code.
 */

// Note: Individual scripts will load env via httpRequest import
// We don't need to load it here since each script runs in its own process

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const API_HOST = process.env.API_HOST || 'localhost';
const PORT = process.env.PORT || 3000;

// Configuration
const DEFAULT_API_URL = `http://${API_HOST}:${PORT}`;

// Parse command line arguments
function parseArgs(): {
  apiUrl: string;
} {
  const args = process.argv.slice(2);
  let apiUrl = DEFAULT_API_URL;

  for (const arg of args) {
    if (arg.startsWith('--api-url=')) {
      apiUrl = arg.split('=')[1];
    }
  }

  return { apiUrl };
}

// Run a script and capture output
function runScript(
  scriptPath: string,
  apiUrl: string,
  stepName: string,
  args?: string[],
): { success: boolean; output: string } {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📋 Step: ${stepName}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    // Resolve paths relative to this script's location
    // This script is in: manual-test/schedule-planning/scripts/workflows/
    // Target scripts are in: manual-test/schedule-planning/scripts/
    const scriptDir = path.resolve(__dirname, '..');
    const fullPath = path.join(scriptDir, scriptPath);

    // Ensure the path exists
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Script not found: ${fullPath}`);
    }

    // Run from the project root (apps/erify_api)
    const projectRoot = path.resolve(__dirname, '../../../../');
    // Pass environment variables to child process
    const env = { ...process.env };
    const extraArgs = args && args.length > 0 ? ` ${args.join(' ')}` : '';
    const output = execSync(
      `ts-node -r tsconfig-paths/register "${fullPath}" --api-url=${apiUrl}${extraArgs}`,
      {
        cwd: projectRoot,
        encoding: 'utf-8',
        stdio: 'inherit',
        env,
      },
    );
    return { success: true, output };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, output: errorMessage };
  }
}

// Main function
function main() {
  const { apiUrl } = parseArgs();

  console.log('🚀 Starting complete schedule planning workflow...');
  console.log(`   API URL: ${apiUrl}`);
  console.log(`\nThis will run the following steps:`);
  console.log(`   1. Ensure schedules + overwrite plan documents`);
  console.log(`   2. Validate all schedules`);
  console.log(`   3. Publish validated schedules`);

  const steps = [
    {
      script: '2.upload-schedule-plan-documents.ts',
      name: 'Ensure Schedules + Upload Plan Documents',
      args: ['--create-schedules'],
    },
    {
      script: '3.validate-schedules.ts',
      name: 'Validate Schedules',
    },
    {
      script: '4.publish-schedules.ts',
      name: 'Publish Schedules',
    },
  ];

  const results: Array<{ name: string; success: boolean }> = [];

  for (const step of steps) {
    const result = runScript(step.script, apiUrl, step.name, step.args);
    results.push({ name: step.name, success: result.success });

    if (!result.success) {
      console.error(`\n❌ Step "${step.name}" failed!`);
      console.error(`   Error: ${result.output}`);
      console.error(
        `\n⚠️  Workflow stopped. Previous steps completed successfully.`,
      );
      process.exit(1);
    }
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Workflow Summary`);
  console.log(`${'='.repeat(60)}`);

  results.forEach((result) => {
    const status = result.success ? '✅' : '❌';
    console.log(`   ${status} ${result.name}`);
  });

  const allSuccess = results.every((r) => r.success);
  if (allSuccess) {
    console.log(`\n✅ All steps completed successfully!`);
  } else {
    console.log(`\n❌ Some steps failed. See errors above.`);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(
      '❌ Error:',
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}
