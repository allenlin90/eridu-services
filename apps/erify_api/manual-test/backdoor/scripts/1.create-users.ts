#!/usr/bin/env ts-node

/**
 * Script to create users via backdoor endpoint
 *
 * This script creates users using the backdoor endpoint which requires
 * BACKDOOR_API_KEY authentication. It reads from test payload files
 * and creates users sequentially.
 *
 * Usage:
 *   # Create users with default API URL
 *   pnpm run manual:backdoor:create-users
 *
 *   # Custom API base URL
 *   pnpm run manual:backdoor:create-users -- --api-url=http://localhost:3000
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

// Parse API URL from command line arguments
// Supports both --api-url=value and --api-url value formats
function parseApiUrl(): string {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--api-url=')) {
      return arg.split('=')[1];
    } else if (arg === '--api-url' && i + 1 < args.length) {
      return args[i + 1];
    }
  }
  return `http://${API_HOST}:${PORT}`;
}

const API_BASE_URL = parseApiUrl();

const BACKDOOR_USERS_ENDPOINT = `${API_BASE_URL}/backdoor/users`;

// Load test payload
const payloadPath = path.join(__dirname, '../payloads/01-create-user.json');
const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf-8'));

async function createUser() {
  console.log('🚀 Creating user via backdoor endpoint...');
  console.log(`📡 Endpoint: POST ${BACKDOOR_USERS_ENDPOINT}`);
  console.log(`📦 Payload:`, JSON.stringify(payload, null, 2));

  try {
    const { status, data } = await backdoorHttpRequest(
      'POST',
      BACKDOOR_USERS_ENDPOINT,
      payload,
    );

    if (status === 201) {
      console.log('✅ User created successfully!');
      console.log('📋 Response:', JSON.stringify(data, null, 2));
      return data as { id: string };
    } else {
      console.error(`❌ Failed to create user. Status: ${status}`);
      console.error('📋 Response:', JSON.stringify(data, null, 2));
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error creating user:', error);
    process.exit(1);
  }
}

// Run the script
createUser()
  .then(() => {
    console.log('✨ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
