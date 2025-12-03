/**
 * Shared utility to load .env file
 *
 * This module loads the .env file from the erify_api root directory
 * (where package.json scripts run from). Importing this module ensures
 * environment variables are available before any other imports that depend on them.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file from erify_api root directory (where package.json scripts run from)
const envPath = path.resolve(process.cwd(), '.env');
const result = dotenv.config({ path: envPath, override: false });

if (result.error) {
  console.warn(
    `Warning: Failed to load .env file from ${envPath}:`,
    result.error.message,
  );
} else {
  // dotenv.config() should automatically populate process.env
  // But we explicitly set them to ensure they're available
  if (result.parsed) {
    for (const [key, value] of Object.entries(result.parsed)) {
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}
