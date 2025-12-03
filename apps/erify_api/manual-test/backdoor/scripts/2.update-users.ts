#!/usr/bin/env ts-node

/**
 * Script to update users via backdoor endpoint
 *
 * This script updates users using the backdoor endpoint which requires
 * BACKDOOR_API_KEY authentication. It reads from test payload files
 * and updates a user by ID.
 *
 * Usage:
 *   # Update user with default API URL
 *   pnpm run manual:backdoor:update-users -- --user-id=user_123
 *
 *   # Custom API base URL
 *   pnpm run manual:backdoor:update-users -- --user-id=user_123 --api-url=http://localhost:3000
 *
 * Authentication:
 *   The script automatically includes X-API-Key header if BACKDOOR_API_KEY
 *   is configured in the .env file. This allows testing endpoints in both dev
 *   (no key in .env) and production (key in .env) modes.
 */

import * as fs from 'fs';
import * as path from 'path';

import { backdoorHttpRequest } from '../../scripts/utils/backdoor-http-request';

const API_HOST = process.env.API_HOST || 'localhost';
const PORT = process.env.PORT || 3000;

// Parse command line arguments
// Supports both --arg=value and --arg value formats
function parseArgs(): { apiUrl: string; userId: string | null } {
  const args = process.argv.slice(2);
  let apiUrl = `http://${API_HOST}:${PORT}`;
  let userId: string | null = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--api-url=')) {
      apiUrl = arg.split('=')[1];
    } else if (arg === '--api-url' && i + 1 < args.length) {
      apiUrl = args[i + 1];
    } else if (arg.startsWith('--user-id=')) {
      userId = arg.split('=')[1];
    } else if (arg === '--user-id' && i + 1 < args.length) {
      userId = args[i + 1];
    }
  }

  return { apiUrl, userId };
}

const { apiUrl: API_BASE_URL, userId } = parseArgs();

if (!userId) {
  console.error('❌ Error: --user-id argument is required');
  console.error(
    'Usage: pnpm run manual:backdoor:update-users -- --user-id=user_123',
  );
  process.exit(1);
}

const BACKDOOR_USERS_ENDPOINT = `${API_BASE_URL}/backdoor/users/${userId}`;

// Load test payload
const payloadPath = path.join(__dirname, '../payloads/02-update-user.json');
const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf-8'));

async function updateUser() {
  console.log('🚀 Updating user via backdoor endpoint...');
  console.log(`📡 Endpoint: PATCH ${BACKDOOR_USERS_ENDPOINT}`);
  console.log(`👤 User ID: ${userId}`);
  console.log(`📦 Payload:`, JSON.stringify(payload, null, 2));

  try {
    const { status, data } = await backdoorHttpRequest(
      'PATCH',
      BACKDOOR_USERS_ENDPOINT,
      payload,
    );

    if (status === 200) {
      console.log('✅ User updated successfully!');
      console.log('📋 Response:', JSON.stringify(data, null, 2));
      return data;
    } else {
      console.error(`❌ Failed to update user. Status: ${status}`);
      console.error('📋 Response:', JSON.stringify(data, null, 2));
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error updating user:', error);
    process.exit(1);
  }
}

// Run the script
updateUser()
  .then(() => {
    console.log('✨ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
