#!/usr/bin/env ts-node

/**
 * Script to validate all schedules before publishing (mocks Google Sheets workflow)
 *
 * This script validates all schedules that have been uploaded:
 * 1. Gets all schedules for the current month
 * 2. Calls the validation endpoint for each schedule
 * 3. Reports validation results and errors
 *
 * Usage:
 *   # Validate all schedules for current month
 *   pnpm run validate:schedules
 *
 *   # Custom API base URL
 *   pnpm run validate:schedules -- --api-url=http://localhost:3000
 */

import { z } from 'zod';

// Import schemas from the source of truth
import {
  createPaginatedResponseSchema,
  PaginatedResponse,
} from '@/common/pagination/schema/pagination.schema';
import { validationResultSchema } from '@/schedule-planning/schemas/schedule-planning.schema';

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
type ValidationResult = z.infer<typeof validationResultSchema>;

const API_HOST = process.env.API_HOST || 'localhost';
const PORT = process.env.PORT || 3001;

// Configuration
const DEFAULT_API_URL = `http://${API_HOST}:${PORT}`;
const BASE_URL = '/admin/schedules';

interface ValidationResultSummary {
  scheduleId: string;
  clientId: string | null;
  clientName: string | null;
  scheduleName: string;
  isValid: boolean;
  errorCount: number;
  errors: ValidationResult['errors'];
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

// Make HTTP request
async function httpRequest<T = unknown>(
  method: string,
  url: string,
  body?: unknown,
): Promise<{ status: number; data: T }> {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    let jsonData: unknown;
    try {
      jsonData = await response.json();
    } catch {
      // If JSON parsing fails, return empty object as fallback
      jsonData = {};
    }

    return {
      status: response.status,
      // Type assertion is necessary here because response.json() returns unknown
      // The caller is responsible for validating the response matches the expected type
      data: jsonData as T,
    };
  } catch (error) {
    throw new Error(
      `HTTP ${method} ${url} failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
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

// Validate a single schedule
async function validateSchedule(
  apiUrl: string,
  scheduleId: string,
): Promise<{
  success: boolean;
  validationResult?: ValidationResult;
  error?: string;
}> {
  try {
    const response = await httpRequest<ValidationResult>(
      'POST',
      `${apiUrl}${BASE_URL}/${scheduleId}/validate`,
    );

    if (response.status === 200) {
      // Validate response data matches expected schema
      const parseResult = validationResultSchema.safeParse(response.data);
      if (!parseResult.success) {
        return {
          success: false,
          error: `Invalid validation response format: ${parseResult.error.message}`,
        };
      }
      return { success: true, validationResult: parseResult.data };
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

  console.log('🔍 Starting schedule validation workflow...');
  console.log(`   API URL: ${apiUrl}\n`);

  // Step 1: Get all schedules
  const schedules = await getSchedules(apiUrl);

  if (schedules.length === 0) {
    console.error(
      '❌ No schedules found. Upload schedules first with pnpm run upload:schedule-plans',
    );
    process.exit(1);
  }

  // Filter to only validate schedules in draft status (pre-publish validation)
  // Published schedules don't need validation before publishing
  const schedulesToValidate = schedules.filter((schedule) => {
    return schedule.status === 'draft';
  });

  if (schedulesToValidate.length === 0) {
    console.warn('⚠️  No schedules to validate (all may already be published)');
    process.exit(0);
  }

  console.log(`\n🔍 Validating ${schedulesToValidate.length} schedules...\n`);

  // Step 2: Validate each schedule
  const validationResults: ValidationResultSummary[] = [];

  for (const schedule of schedulesToValidate) {
    const clientName = schedule.client_name || 'Unknown';
    const scheduleName = schedule.name || schedule.id;

    console.log(`🔍 Validating schedule ${schedule.id} (${clientName})...`);

    const result = await validateSchedule(apiUrl, schedule.id);

    if (result.success && result.validationResult) {
      const validation = result.validationResult;
      const summary: ValidationResultSummary = {
        scheduleId: schedule.id,
        clientId: schedule.client_id,
        clientName,
        scheduleName,
        isValid: validation.isValid,
        errorCount: validation.errors.length,
        errors: validation.errors,
      };

      validationResults.push(summary);

      if (validation.isValid) {
        console.log(`   ✅ Valid (no errors)`);
      } else {
        console.log(
          `   ❌ Invalid (${validation.errors.length} error${validation.errors.length > 1 ? 's' : ''})`,
        );
        // Print first few errors
        validation.errors.slice(0, 3).forEach((error) => {
          const showRef =
            error.showIndex !== undefined
              ? `show[${error.showIndex}]`
              : error.showTempId
                ? `show(${error.showTempId})`
                : 'schedule';
          console.log(`      - ${showRef}: ${error.type} - ${error.message}`);
        });
        if (validation.errors.length > 3) {
          console.log(
            `      ... and ${validation.errors.length - 3} more error(s)`,
          );
        }
      }
    } else {
      const summary: ValidationResultSummary = {
        scheduleId: schedule.id,
        clientId: schedule.client_id,
        clientName,
        scheduleName,
        isValid: false,
        errorCount: 0,
        errors: [],
        error: result.error,
      };

      validationResults.push(summary);
      console.error(`   ❌ Validation request failed: ${result.error}`);
    }

    // Small delay to avoid overwhelming the API
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Step 3: Summary
  const valid = validationResults.filter((r) => r.isValid).length;
  const invalid = validationResults.filter((r) => !r.isValid).length;
  const totalErrors = validationResults.reduce(
    (sum, r) => sum + r.errorCount,
    0,
  );

  console.log(`\n📊 Validation Summary:`);
  console.log(`   - Schedules validated: ${validationResults.length}`);
  console.log(`   - Valid schedules: ${valid}`);
  console.log(`   - Invalid schedules: ${invalid}`);
  console.log(`   - Total validation errors: ${totalErrors}`);

  if (invalid > 0) {
    console.log(`\n⚠️  Invalid schedules:`);
    validationResults
      .filter((r) => !r.isValid)
      .forEach((r) => {
        if (r.error) {
          console.log(
            `   - ${r.clientName} (${r.scheduleId}): Request failed - ${r.error}`,
          );
        } else {
          const errorTypes = r.errors.map((e) => e.type).join(', ');
          console.log(
            `   - ${r.clientName} (${r.scheduleId}): ${r.errorCount} error(s) - ${errorTypes}`,
          );
        }
      });
    console.log(`\n❌ Validation failed. Please fix errors before publishing.`);
    process.exit(1);
  } else {
    console.log(`\n✅ All schedules are valid and ready to publish!`);
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
