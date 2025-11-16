#!/usr/bin/env ts-node

/**
 * Script to create studio memberships via backdoor endpoint
 *
 * This script creates studio memberships using the backdoor endpoint which requires
 * BACKDOOR_API_KEY authentication. It reads from test payload files
 * and creates memberships sequentially.
 *
 * Usage:
 *   # Create membership with default API URL
 *   pnpm run manual:backdoor:create-memberships
 *
 *   # Custom API base URL
 *   pnpm run manual:backdoor:create-memberships -- --api-url=http://localhost:3000
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

const BACKDOOR_MEMBERSHIPS_ENDPOINT = `${API_BASE_URL}/backdoor/studio-memberships`;

// Load test payload
const payloadPath = path.join(
  __dirname,
  '../payloads/03-create-membership.json',
);
const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf-8'));

async function createMembership() {
  console.log('🚀 Creating studio membership via backdoor endpoint...');
  console.log(`📡 Endpoint: POST ${BACKDOOR_MEMBERSHIPS_ENDPOINT}`);
  console.log(`📦 Payload:`, JSON.stringify(payload, null, 2));

  try {
    const { status, data } = await backdoorHttpRequest(
      'POST',
      BACKDOOR_MEMBERSHIPS_ENDPOINT,
      payload,
    );

    if (status === 201) {
      console.log('✅ Studio membership created successfully!');
      console.log('📋 Response:', JSON.stringify(data, null, 2));
      return data as { id: string };
    } else {
      console.error(`❌ Failed to create membership. Status: ${status}`);
      console.error('📋 Response:', JSON.stringify(data, null, 2));
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error creating membership:', error);
    process.exit(1);
  }
}

// Run the script
createMembership()
  .then(() => {
    console.log('✨ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });

