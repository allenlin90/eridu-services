#!/usr/bin/env ts-node

/**
 * Script to upload planDocuments to schedules (mocks Google Sheets workflow)
 *
 * This script simulates the Google Sheets AppsScript workflow:
 * 1. Optionally creates empty schedules via bulk endpoint
 * 2. Gets all schedules for the date range
 * 3. Maps client IDs to schedule IDs
 * 4. Updates each schedule's planDocument using the update payloads
 *
 * Usage:
 *   # Upload planDocuments to existing schedules
 *   pnpm run upload:schedule-plans
 *
 *   # Create schedules first, then upload
 *   pnpm run upload:schedule-plans -- --create-schedules
 *
 *   # Custom API base URL
 *   pnpm run upload:schedule-plans -- --api-url=http://localhost:3000
 *
 * Authentication:
 *   The script automatically includes X-API-Key header if GOOGLE_SHEETS_API_KEY
 *   is configured in the .env file. This allows testing endpoints in both dev
 *   (no key in .env) and production (key in .env) modes.
 */

import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

// Import schemas from the source of truth
import {
  createPaginatedResponseSchema,
  PaginatedResponse,
} from '@/lib/pagination/pagination.schema';
import {
  bulkCreateScheduleResultSchema,
  updateScheduleSchema,
} from '@/models/schedule/schemas/schedule.schema';

import { httpRequest } from '../../scripts/utils/http-request';

// Create a schema for parsing API responses (DTO format with snake_case)
// Note: scheduleDto in the schema file is a transform schema (internal -> DTO) with a .pipe() output.
// For parsing API responses, we need the DTO format directly, so we define it here based on
// the output shape defined in schedule.schema.ts (lines 139-157).
// This matches the API response format exactly.
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

// Infer types from schemas to ensure they match the API exactly
type ScheduleDto = z.infer<typeof scheduleDtoResponseSchema>;
type BulkCreateScheduleResultDto = z.infer<
  typeof bulkCreateScheduleResultSchema
>;
type UpdateScheduleInputDto = z.input<typeof updateScheduleSchema>;

const API_HOST = process.env.API_HOST || 'localhost';
const PORT = process.env.PORT || 3000;

// Configuration
const DEFAULT_API_URL = `http://${API_HOST}:${PORT}`;
const BASE_URL = '/google-sheets/schedules';

interface UpdateResult {
  clientId: string;
  scheduleId: string;
  clientName: string;
  success: boolean;
  error?: string;
  showsCount?: number;
}

interface UpdatePayloadJson {
  plan_document?: {
    shows?: unknown[];
    metadata?: {
      clientName?: string;
    };
  };
  version: number;
}

// Parse command line arguments
function parseArgs(): {
  createSchedules: boolean;
  apiUrl: string;
} {
  const args = process.argv.slice(2);
  let createSchedules = false;
  let apiUrl = DEFAULT_API_URL;

  for (const arg of args) {
    if (arg === '--create-schedules') {
      createSchedules = true;
    }
    if (arg.startsWith('--api-url=')) {
      apiUrl = arg.split('=')[1];
    }
  }

  return { createSchedules, apiUrl };
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
  const parseResult = bulkCreateScheduleResultSchema.safeParse(response.data);
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
      }
    }
  }

  // Also check successful_schedules array if available
  if (result.successful_schedules) {
    for (const schedule of result.successful_schedules) {
      if (schedule.id && schedule.client_id) {
        if (!scheduleMap.has(schedule.client_id)) {
          scheduleMap.set(schedule.client_id, schedule.id);
        }
      }
    }
  }

  console.log(
    `✅ Created ${scheduleMap.size}/${result.total} schedules successfully`,
  );

  if (result.failed > 0) {
    console.warn(`⚠️  ${result.failed} schedules failed to create`);
  }

  return scheduleMap;
}

// Get all schedules for the current month
async function getSchedules(apiUrl: string): Promise<Map<string, string>> {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );

  const startDateStr = startDate.toISOString();
  const endDateStr = endDate.toISOString();

  console.log(
    `📋 Fetching schedules for ${startDateStr.split('T')[0]} to ${endDateStr.split('T')[0]}...`,
  );

  const response = await httpRequest<PaginatedResponse<ScheduleDto>>(
    'GET',
    `${apiUrl}${BASE_URL}?start_date_from=${encodeURIComponent(startDateStr)}&start_date_to=${encodeURIComponent(endDateStr)}&include_plan_document=false&limit=1000`,
  );

  if (response.status !== 200) {
    throw new Error(
      `Failed to get schedules: ${response.status} - ${JSON.stringify(response.data)}`,
    );
  }

  // Validate response data matches expected schema
  const paginatedResponseSchema = createPaginatedResponseSchema(
    scheduleDtoResponseSchema,
  );
  const parseResult = paginatedResponseSchema.safeParse(response.data);
  if (!parseResult.success) {
    throw new Error(
      `Invalid response format: ${parseResult.error.message} - ${JSON.stringify(response.data)}`,
    );
  }
  const paginatedResponse = parseResult.data;
  const schedules = paginatedResponse.data || [];
  const scheduleMap = new Map<string, string>(); // client_id -> schedule_id

  for (const schedule of schedules) {
    if (schedule.id && schedule.client_id) {
      scheduleMap.set(schedule.client_id, schedule.id);
    }
  }

  console.log(`✅ Found ${scheduleMap.size} schedules`);

  return scheduleMap;
}

// Update schedule with planDocument
async function updateSchedule(
  apiUrl: string,
  scheduleId: string,
  updatePayload: UpdateScheduleInputDto,
): Promise<{ success: boolean; error?: string; showsCount?: number }> {
  try {
    const response = await httpRequest<ScheduleDto>(
      'PATCH',
      `${apiUrl}${BASE_URL}/${scheduleId}`,
      updatePayload,
    );

    if (response.status === 200 || response.status === 204) {
      // Validate response data matches expected schema
      const parseResult = scheduleDtoResponseSchema.safeParse(response.data);
      if (!parseResult.success) {
        // If validation fails, still try to get shows count from payload
        const showsCount =
          (updatePayload.plan_document?.shows as unknown[])?.length || 0;
        return { success: true, showsCount };
      }
      const scheduleResponse = parseResult.data;
      const showsCount =
        (updatePayload.plan_document?.shows as unknown[])?.length ||
        (scheduleResponse.plan_document?.shows as unknown[])?.length ||
        0;
      return { success: true, showsCount };
    } else if (response.status === 409) {
      return {
        success: false,
        error: `Version conflict (409). Schedule may have been updated by another process.`,
      };
    } else {
      return {
        success: false,
        error: `HTTP ${response.status}: ${JSON.stringify(response.data)}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Main function
async function main() {
  const { createSchedules: shouldCreate, apiUrl } = parseArgs();

  console.log('🚀 Starting schedule planDocument upload workflow...');
  console.log(`   API URL: ${apiUrl}`);
  console.log(`   Create schedules first: ${shouldCreate ? 'Yes' : 'No'}\n`);

  let scheduleMap: Map<string, string>;

  // Step 1: Create schedules or get existing ones
  if (shouldCreate) {
    scheduleMap = await createSchedules(apiUrl);
    // Wait a bit for schedules to be fully created
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } else {
    scheduleMap = await getSchedules(apiUrl);
  }

  if (scheduleMap.size === 0) {
    console.error(
      '❌ No schedules found. Create schedules first with --create-schedules flag.',
    );
    process.exit(1);
  }

  // Step 2: Load update payloads
  const updatePayloadsDir = path.join(__dirname, '../payloads/update-payloads');
  if (!fs.existsSync(updatePayloadsDir)) {
    throw new Error(
      `Update payloads directory not found: ${updatePayloadsDir}\nRun: pnpm run generate:schedule-payload`,
    );
  }

  const updatePayloadFiles = fs
    .readdirSync(updatePayloadsDir)
    .filter((file) => file.endsWith('.json'))
    .sort();

  if (updatePayloadFiles.length === 0) {
    throw new Error(
      `No update payload files found in ${updatePayloadsDir}\nRun: pnpm run generate:schedule-payload`,
    );
  }

  console.log(
    `\n📤 Uploading planDocuments for ${updatePayloadFiles.length} schedules...\n`,
  );

  // Step 3: Update each schedule
  const updateResults: UpdateResult[] = [];

  for (const file of updatePayloadFiles) {
    // Extract client number from filename (e.g., "02-update-schedule-01-Nike.json" -> "01")
    const clientNumberMatch = file.match(/02-update-schedule-(\d+)-/);
    if (!clientNumberMatch) {
      console.warn(
        `⚠️  Could not extract client number from filename: ${file}`,
      );
      continue;
    }

    const clientNumber = clientNumberMatch[1].padStart(2, '0');
    const clientId = `client_000000000000000000${clientNumber}`;

    // Find corresponding schedule ID
    const scheduleId = scheduleMap.get(clientId);
    if (!scheduleId) {
      console.warn(
        `⚠️  No schedule found for client ${clientId} (file: ${file})`,
      );
      continue;
    }

    // Load update payload
    const updatePayloadPath = path.join(updatePayloadsDir, file);
    const updatePayloadJson = JSON.parse(
      fs.readFileSync(updatePayloadPath, 'utf-8'),
    ) as UpdatePayloadJson;

    // Use snake_case format as expected by the API schema
    const updatePayload: UpdateScheduleInputDto = {
      plan_document: updatePayloadJson.plan_document,
      version: updatePayloadJson.version,
    };

    // Extract client name from payload metadata
    const clientName =
      updatePayloadJson.plan_document?.metadata?.clientName || 'Unknown';

    const showsCount = updatePayloadJson.plan_document?.shows?.length || 0;

    // Update schedule
    console.log(
      `📤 Updating schedule ${scheduleId} for ${clientName} (${showsCount} shows)...`,
    );

    const result = await updateSchedule(apiUrl, scheduleId, updatePayload);

    if (result.success) {
      updateResults.push({
        clientId,
        scheduleId,
        clientName,
        success: true,
        showsCount: result.showsCount ?? showsCount,
      });
      console.log(
        `   ✅ Successfully updated schedule ${scheduleId} (${result.showsCount ?? showsCount} shows)`,
      );
    } else {
      updateResults.push({
        clientId,
        scheduleId,
        clientName,
        success: false,
        error: result.error,
        showsCount,
      });
      console.error(
        `   ❌ Failed to update schedule ${scheduleId}: ${result.error}`,
      );
    }

    // Small delay to avoid overwhelming the API
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Step 4: Summary
  const successful = updateResults.filter((r) => r.success).length;
  const failed = updateResults.filter((r) => !r.success).length;
  const totalShows = updateResults.reduce(
    (sum, r) => sum + (r.showsCount || 0),
    0,
  );

  console.log(`\n📊 Summary:`);
  console.log(`   - Schedules found: ${scheduleMap.size}`);
  console.log(`   - Update payloads processed: ${updatePayloadFiles.length}`);
  console.log(`   - Successful updates: ${successful}`);
  console.log(`   - Failed updates: ${failed}`);
  console.log(`   - Total shows uploaded: ${totalShows}`);

  if (failed > 0) {
    console.log(`\n⚠️  Failed updates:`);
    updateResults
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`   - ${r.clientName} (${r.scheduleId}): ${r.error}`);
      });
    process.exit(1);
  } else {
    console.log(`\n✅ All schedule planDocuments uploaded successfully!`);
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
