#!/usr/bin/env ts-node

/**
 * Script to create empty schedules from bulk create payload
 *
 * This script creates schedules using the bulk create endpoint.
 * It reads the bulk create payload and creates all schedules in a single API call.
 *
 * Usage:
 *   # Create schedules with default API URL
 *   pnpm run create:schedules
 *
 *   # Custom API base URL
 *   pnpm run create:schedules -- --api-url=http://localhost:3000
 *
 * Authentication:
 *   The script automatically includes X-API-Key header if GOOGLE_SHEETS_API_KEY
 *   is configured in the .env file. This allows testing endpoints in both dev
 *   (no key in .env) and production (key in .env) modes.
 */

import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

import { httpRequest } from '../../scripts/utils/http-request';

// Import schemas from the source of truth
// Note: We define response schemas below because the schema file uses transform schemas
// that expect internal format, but API returns DTO format

// Create a schema for parsing API responses (DTO format with snake_case)
// The scheduleDto in bulkCreateScheduleResultSchema is a transform schema.
// For parsing API responses, we need the DTO format directly.
const scheduleDtoResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  status: z.string(),
  published_at: z.string().nullable(),
  plan_document: z.record(z.string(), z.any()),
  version: z.number().int(),
  metadata: z.record(z.string(), z.any()),
  client_id: z.string().nullable(),
  client_name: z.string().nullable(),
  created_by: z.string().nullable(),
  created_by_name: z.string().nullable(),
  published_by: z.string().nullable(),
  published_by_name: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

// Create a response schema that matches the actual API response format
const bulkCreateScheduleResultResponseSchema = z.object({
  total: z.number().int(),
  successful: z.number().int(),
  failed: z.number().int(),
  results: z.array(
    z.object({
      index: z.number().int().optional(),
      schedule_id: z.string().nullable(),
      client_id: z.string().nullable(),
      client_name: z.string().nullable(),
      success: z.boolean(),
      error: z.string().nullable(),
      error_code: z.string().nullable(),
    }),
  ),
  successful_schedules: z.array(scheduleDtoResponseSchema).optional(),
});

// Infer types from schemas to ensure they match the API exactly
type BulkCreateScheduleResultDto = z.infer<
  typeof bulkCreateScheduleResultResponseSchema
>;

const API_HOST = process.env.API_HOST || 'localhost';
const PORT = process.env.PORT || 3000;

// Configuration
const DEFAULT_API_URL = `http://${API_HOST}:${PORT}`;
const BASE_URL = '/google-sheets/schedules';

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

// Create schedules via bulk endpoint
async function createSchedules(apiUrl: string): Promise<Map<string, string>> {
  const bulkCreatePath = path.join(
    __dirname,
    '../payloads/01-bulk-create-schedule.json',
  );

  if (!fs.existsSync(bulkCreatePath)) {
    throw new Error(
      `Bulk create payload not found: ${bulkCreatePath}\nRun: pnpm run generate:schedule-payload`,
    );
  }

  const bulkCreatePayload = JSON.parse(
    fs.readFileSync(bulkCreatePath, 'utf-8'),
  ) as { schedules: unknown[] };

  console.log(`📤 Creating ${bulkCreatePayload.schedules.length} schedules...`);

  const response = await httpRequest<BulkCreateScheduleResultDto>(
    'POST',
    `${apiUrl}${BASE_URL}/bulk`,
    bulkCreatePayload,
  );

  if (response.status !== 201) {
    throw new Error(
      `Failed to create schedules: ${response.status} - ${JSON.stringify(response.data)}`,
    );
  }

  // Validate response data matches expected schema
  const parseResult = bulkCreateScheduleResultResponseSchema.safeParse(
    response.data,
  );
  if (!parseResult.success) {
    throw new Error(
      `Invalid response format: ${parseResult.error.message} - ${JSON.stringify(response.data)}`,
    );
  }
  const result = parseResult.data;
  const scheduleMap = new Map<string, string>(); // client_id -> schedule_id

  // Map from results array
  if (result.results) {
    for (const r of result.results) {
      if (r.success && r.schedule_id && r.client_id) {
        scheduleMap.set(r.client_id, r.schedule_id);
        console.log(
          `   ✅ Created schedule ${r.schedule_id} for client ${r.client_id} (${r.client_name || 'Unknown'})`,
        );
      } else if (!r.success) {
        console.error(
          `   ❌ Failed to create schedule for client ${r.client_id || 'Unknown'}: ${r.error || 'Unknown error'}`,
        );
      }
    }
  }

  // Also check successful_schedules array if available
  // Note: successful_schedules contains ScheduleDto format (snake_case), not internal format
  if (result.successful_schedules) {
    for (const schedule of result.successful_schedules) {
      // The schedule is already in DTO format from the API
      if (schedule.id && schedule.client_id) {
        if (!scheduleMap.has(schedule.client_id)) {
          scheduleMap.set(schedule.client_id, schedule.id);
        }
      }
    }
  }

  console.log(
    `\n✅ Created ${scheduleMap.size}/${result.total} schedules successfully`,
  );

  if (result.failed > 0) {
    console.warn(`⚠️  ${result.failed} schedules failed to create`);
  }

  return scheduleMap;
}

// Main function
async function main() {
  const { apiUrl } = parseArgs();

  console.log('🚀 Starting schedule creation workflow...');
  console.log(`   API URL: ${apiUrl}\n`);

  try {
    const scheduleMap = await createSchedules(apiUrl);

    if (scheduleMap.size === 0) {
      console.error('❌ No schedules were created.');
      process.exit(1);
    }

    console.log(`\n📊 Summary:`);
    console.log(`   - Total schedules created: ${scheduleMap.size}`);
    console.log(`\n✅ Schedule creation completed successfully!`);
  } catch (error) {
    console.error(
      '❌ Error:',
      error instanceof Error ? error.message : String(error),
    );
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
