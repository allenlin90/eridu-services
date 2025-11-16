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
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

