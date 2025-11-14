#!/usr/bin/env ts-node

/**
 * Script to run the complete schedule planning workflow
 *
 * This script orchestrates the complete schedule planning workflow:
 * 1. Create schedules (one per client)
 * 2. Upload schedule plan documents
 * 3. Validate all schedules
 * 4. Publish validated schedules
 *
 * Usage:
 *   # Run complete workflow with default API URL
 *   pnpm run test:schedule:all
 *
 *   # Custom API base URL
 *   pnpm run test:schedule:all -- --api-url=http://localhost:3000
 *
 * Note: This script runs all steps sequentially. If any step fails,
 * the script will exit with an error code.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const API_HOST = process.env.API_HOST || 'localhost';
const PORT = process.env.PORT || 3001;

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
): { success: boolean; output: string } {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📋 Step: ${stepName}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    // Resolve paths relative to this script's location
    // This script is in: test-payloads/scripts/workflows/schedule-planning/
    // Target scripts are in: test-payloads/scripts/schedule-planning-flow/
    const scriptDir = path.resolve(__dirname, '../../schedule-planning-flow');
    const fullPath = path.join(scriptDir, scriptPath);
    
    // Ensure the path exists
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Script not found: ${fullPath}`);
    }

    // Run from the project root (apps/erify_api)
    const projectRoot = path.resolve(__dirname, '../../../../');
    const output = execSync(
      `ts-node -r tsconfig-paths/register "${fullPath}" --api-url=${apiUrl}`,
      {
        cwd: projectRoot,
        encoding: 'utf-8',
        stdio: 'inherit',
      },
    );
    return { success: true, output };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    return { success: false, output: errorMessage };
  }
}

// Main function
async function main() {
  const { apiUrl } = parseArgs();

  console.log('🚀 Starting complete schedule planning workflow...');
  console.log(`   API URL: ${apiUrl}`);
  console.log(`\nThis will run the following steps:`);
  console.log(`   1. Create schedules (bulk create)`);
  console.log(`   2. Upload schedule plan documents`);
  console.log(`   3. Validate all schedules`);
  console.log(`   4. Publish validated schedules`);

  const steps = [
    {
      script: '1.create-schedules.ts',
      name: 'Create Schedules',
    },
    {
      script: '2.upload-schedule-plan-documents.ts',
      name: 'Upload Schedule Plan Documents',
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
    const result = runScript(step.script, apiUrl, step.name);
    results.push({ name: step.name, success: result.success });

    if (!result.success) {
      console.error(`\n❌ Step "${step.name}" failed!`);
      console.error(`   Error: ${result.output}`);
      console.error(`\n⚠️  Workflow stopped. Previous steps completed successfully.`);
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
  main().catch((error) => {
    console.error(
      '❌ Error:',
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  });
}

