#!/usr/bin/env ts-node

/**
 * Script to publish validated schedules (mocks Google Sheets workflow)
 *
 * This script publishes all validated schedules:
 * 1. Gets all schedules for the current month
 * 2. Filters to draft schedules (assumes they've been validated)
 * 3. Publishes each schedule using the publish endpoint
 * 4. Reports publishing results and errors
 *
 * Usage:
 *   # Publish all validated schedules for current month
 *   pnpm run publish:schedules
 *
 *   # Custom API base URL
 *   pnpm run publish:schedules -- --api-url=http://localhost:3000
 *
 * Note: Run validate:schedules first to ensure all schedules are valid before publishing.
 *
 * Authentication:
 *   The script automatically includes X-API-Key header if GOOGLE_SHEETS_API_KEY
 *   is configured in the .env file. This allows testing endpoints in both dev
 *   (no key in .env) and production (key in .env) modes.
 */

import { z } from 'zod';

// Import schemas from the source of truth
import {
  createPaginatedResponseSchema,
  PaginatedResponse,
} from '@/lib/pagination/pagination.schema';

import { httpRequest } from '../../scripts/utils/http-request';

// Create a schema for parsing API responses (DTO format with snake_case)
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

const API_HOST = process.env.API_HOST || 'localhost';
const PORT = process.env.PORT || 3000;

// Configuration
const DEFAULT_API_URL = `http://${API_HOST}:${PORT}`;
const BASE_URL = '/google-sheets/schedules';

interface PublishResultSummary {
  scheduleId: string;
  clientId: string | null;
  clientName: string | null;
  scheduleName: string;
  success: boolean;
  publishedAt: string | null;
  publishedByName: string | null;
  error?: string; // HTTP or other errors
}

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

// Get all schedules for the current month
async function getSchedules(apiUrl: string): Promise<ScheduleDto[]> {
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

  console.log(`✅ Found ${schedules.length} schedules`);

  return schedules;
}

// Get current schedule with latest version
async function getCurrentSchedule(
  apiUrl: string,
  scheduleId: string,
): Promise<{
  success: boolean;
  schedule?: ScheduleDto;
  error?: string;
}> {
  try {
    const response = await httpRequest<ScheduleDto>(
      'GET',
      `${apiUrl}${BASE_URL}/${scheduleId}`,
    );

    if (response.status === 200) {
      // Validate response data matches expected schema
      const parseResult = scheduleDtoResponseSchema.safeParse(response.data);
      if (!parseResult.success) {
        return {
          success: false,
          error: `Invalid schedule response format: ${parseResult.error.message}`,
        };
      }
      return { success: true, schedule: parseResult.data };
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

// Publish a single schedule
async function publishSchedule(
  apiUrl: string,
  scheduleId: string,
  version: number,
): Promise<{
  success: boolean;
  publishedSchedule?: ScheduleDto;
  error?: string;
}> {
  try {
    const response = await httpRequest<ScheduleDto>(
      'POST',
      `${apiUrl}${BASE_URL}/${scheduleId}/publish`,
      { version },
    );

    if (response.status === 200) {
      // Validate response data matches expected schema
      const parseResult = scheduleDtoResponseSchema.safeParse(response.data);
      if (!parseResult.success) {
        return {
          success: false,
          error: `Invalid publish response format: ${parseResult.error.message}`,
        };
      }
      return { success: true, publishedSchedule: parseResult.data };
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
  const { apiUrl } = parseArgs();

  console.log('🚀 Starting schedule publishing workflow...');
  console.log(`   API URL: ${apiUrl}\n`);

  // Step 1: Get all schedules
  const schedules = await getSchedules(apiUrl);

  if (schedules.length === 0) {
    console.error(
      '❌ No schedules found. Upload schedules first with pnpm run upload:schedule-plans',
    );
    process.exit(1);
  }

  // Filter to only publish schedules in draft status
  // Published schedules are already published
  const schedulesToPublish = schedules.filter((schedule) => {
    return schedule.status === 'draft';
  });

  if (schedulesToPublish.length === 0) {
    console.warn('⚠️  No schedules to publish (all may already be published)');
    process.exit(0);
  }

  console.log(`\n🚀 Publishing ${schedulesToPublish.length} schedules...\n`);

  // Step 2: Publish each schedule
  const publishResults: PublishResultSummary[] = [];

  for (const schedule of schedulesToPublish) {
    const clientName = schedule.client_name || 'Unknown';
    const scheduleName = schedule.name || schedule.id;

    // Fetch current schedule to get the latest version
    // This is important because the version may have been incremented during upload
    console.log(
      `📋 Fetching current version for schedule ${schedule.id} (${clientName})...`,
    );
    const currentScheduleResult = await getCurrentSchedule(apiUrl, schedule.id);

    if (!currentScheduleResult.success || !currentScheduleResult.schedule) {
      const summary: PublishResultSummary = {
        scheduleId: schedule.id,
        clientId: schedule.client_id,
        clientName,
        scheduleName,
        success: false,
        publishedAt: null,
        publishedByName: null,
        error: `Failed to fetch current schedule: ${currentScheduleResult.error}`,
      };
      publishResults.push(summary);
      console.error(
        `   ❌ Failed to fetch current schedule: ${currentScheduleResult.error}`,
      );
      continue;
    }

    const currentSchedule = currentScheduleResult.schedule;

    // Check if schedule is still in draft status (might have been published by another process)
    if (currentSchedule.status !== 'draft') {
      console.log(
        `   ⚠️  Schedule is already ${currentSchedule.status}, skipping...`,
      );
      continue;
    }

    console.log(
      `🚀 Publishing schedule ${schedule.id} (${clientName}) - version ${currentSchedule.version}...`,
    );

    const result = await publishSchedule(
      apiUrl,
      schedule.id,
      currentSchedule.version,
    );

    if (result.success && result.publishedSchedule) {
      const published = result.publishedSchedule;
      const summary: PublishResultSummary = {
        scheduleId: schedule.id,
        clientId: schedule.client_id,
        clientName,
        scheduleName,
        success: true,
        publishedAt: published.published_at,
        publishedByName: published.published_by_name,
      };

      publishResults.push(summary);

      console.log(
        `   ✅ Published successfully${published.published_at ? ` at ${published.published_at}` : ''}`,
      );
    } else {
      const summary: PublishResultSummary = {
        scheduleId: schedule.id,
        clientId: schedule.client_id,
        clientName,
        scheduleName,
        success: false,
        publishedAt: null,
        publishedByName: null,
        error: result.error,
      };

      publishResults.push(summary);
      console.error(`   ❌ Publish failed: ${result.error}`);
    }

    // Small delay to avoid overwhelming the API
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Step 3: Summary
  const successful = publishResults.filter((r) => r.success).length;
  const failed = publishResults.filter((r) => !r.success).length;

  console.log(`\n📊 Publishing Summary:`);
  console.log(`   - Schedules attempted: ${publishResults.length}`);
  console.log(`   - Successfully published: ${successful}`);
  console.log(`   - Failed: ${failed}`);

  if (failed > 0) {
    console.log(`\n⚠️  Failed schedules:`);
    publishResults
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(
          `   - ${r.clientName} (${r.scheduleId}): ${r.error || 'Unknown error'}`,
        );
      });
    console.log(`\n❌ Some schedules failed to publish.`);
    process.exit(1);
  } else {
    console.log(`\n✅ All schedules published successfully!`);
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
