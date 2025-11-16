#!/usr/bin/env ts-node

/**
 * Script to run the complete backdoor workflow
 *
 * This script orchestrates the complete backdoor workflow:
 * 1. Create a user
 * 2. Update the created user
 * 3. Create a studio membership for the user
 *
 * Usage:
 *   # Run complete workflow with default API URL
 *   pnpm run manual:backdoor:all
 *
 *   # Custom API base URL
 *   pnpm run manual:backdoor:all -- --api-url=http://localhost:3000
 *
 *   # Custom studio ID (optional, defaults to studio_123 from payload)
 *   pnpm run manual:backdoor:all -- --studio-id=studio_456
 *
 * Note: This script runs all steps sequentially. If any step fails,
 * the script will exit with an error code.
 */

import * as fs from 'fs';
import * as path from 'path';

import { backdoorHttpRequest } from '../../../scripts/utils/backdoor-http-request';

const API_HOST = process.env.API_HOST || 'localhost';
const PORT = process.env.PORT || 3000;

// Parse command line arguments
// Supports both --arg=value and --arg value formats
function parseArgs(): {
  apiUrl: string;
  studioId?: string;
} {
  const args = process.argv.slice(2);
  let apiUrl = `http://${API_HOST}:${PORT}`;
  let studioId: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--api-url=')) {
      apiUrl = arg.split('=')[1];
    } else if (arg === '--api-url' && i + 1 < args.length) {
      apiUrl = args[i + 1];
    } else if (arg.startsWith('--studio-id=')) {
      studioId = arg.split('=')[1];
    } else if (arg === '--studio-id' && i + 1 < args.length) {
      studioId = args[i + 1];
    }
  }

  return { apiUrl, studioId };
}

// Load payloads
function loadPayloads() {
  // Payloads are in manual-test/backdoor/payloads/, not in scripts/payloads/
  const payloadsDir = path.join(__dirname, '../../payloads');
  const createUserPayload = JSON.parse(
    fs.readFileSync(
      path.join(payloadsDir, '01-create-user.json'),
      'utf-8',
    ),
  );
  const updateUserPayload = JSON.parse(
    fs.readFileSync(
      path.join(payloadsDir, '02-update-user.json'),
      'utf-8',
    ),
  );
  const createMembershipPayload = JSON.parse(
    fs.readFileSync(
      path.join(payloadsDir, '03-create-membership.json'),
      'utf-8',
    ),
  );

  return {
    createUserPayload,
    updateUserPayload,
    createMembershipPayload,
  };
}

// Step 1: Create user
async function createUser(apiUrl: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📋 Step 1: Create User`);
  console.log(`${'='.repeat(60)}\n`);

  const { createUserPayload } = loadPayloads();
  
  // Generate unique email to avoid conflicts when running multiple times
  const timestamp = Date.now();
  const randomSuffix = Math.floor(Math.random() * 10000);
  const baseEmail = createUserPayload.email || 'admin@example.com';
  const [emailLocal, emailDomain] = baseEmail.split('@');
  const uniqueEmail = `${emailLocal}+${timestamp}-${randomSuffix}@${emailDomain}`;
  
  // Create payload with unique email
  const payload = {
    ...createUserPayload,
    email: uniqueEmail,
  };
  
  const endpoint = `${apiUrl}/backdoor/users`;

  console.log(`📡 Endpoint: POST ${endpoint}`);
  console.log(`📦 Payload:`, JSON.stringify(payload, null, 2));

  try {
    const { status, data } = await backdoorHttpRequest(
      'POST',
      endpoint,
      payload,
    );

    if (status === 201) {
      console.log('✅ User created successfully!');
      const userData = data as { id: string; email: string; name: string };
      console.log(`   User ID: ${userData.id}`);
      console.log(`   Email: ${userData.email}`);
      console.log(`   Name: ${userData.name}`);
      return userData.id;
    } else {
      console.error(`❌ Failed to create user. Status: ${status}`);
      console.error('📋 Response:', JSON.stringify(data, null, 2));
      throw new Error(`Failed to create user: ${status}`);
    }
  } catch (error) {
    console.error('❌ Error creating user:', error);
    throw error;
  }
}

// Step 2: Update user
async function updateUser(apiUrl: string, userId: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📋 Step 2: Update User`);
  console.log(`${'='.repeat(60)}\n`);

  const { updateUserPayload } = loadPayloads();
  const endpoint = `${apiUrl}/backdoor/users/${userId}`;

  console.log(`📡 Endpoint: PATCH ${endpoint}`);
  console.log(`👤 User ID: ${userId}`);
  console.log(`📦 Payload:`, JSON.stringify(updateUserPayload, null, 2));

  try {
    const { status, data } = await backdoorHttpRequest(
      'PATCH',
      endpoint,
      updateUserPayload,
    );

    if (status === 200) {
      console.log('✅ User updated successfully!');
      const userData = data as { id: string; name: string };
      console.log(`   User ID: ${userData.id}`);
      console.log(`   Updated Name: ${userData.name}`);
      return data;
    } else {
      console.error(`❌ Failed to update user. Status: ${status}`);
      console.error('📋 Response:', JSON.stringify(data, null, 2));
      throw new Error(`Failed to update user: ${status}`);
    }
  } catch (error) {
    console.error('❌ Error updating user:', error);
    throw error;
  }
}

// Step 3: Create membership
async function createMembership(
  apiUrl: string,
  userId: string,
  studioId?: string,
) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📋 Step 3: Create Studio Membership`);
  console.log(`${'='.repeat(60)}\n`);

  const { createMembershipPayload } = loadPayloads();
  const endpoint = `${apiUrl}/backdoor/studio-memberships`;

  // Use provided studio ID or default from payload
  const finalStudioId = studioId || createMembershipPayload.studio_id;
  const payload = {
    ...createMembershipPayload,
    user_id: userId,
    studio_id: finalStudioId,
  };

  console.log(`📡 Endpoint: POST ${endpoint}`);
  console.log(`👤 User ID: ${userId}`);
  console.log(`🏢 Studio ID: ${finalStudioId}`);
  console.log(`📦 Payload:`, JSON.stringify(payload, null, 2));

  try {
    const { status, data } = await backdoorHttpRequest(
      'POST',
      endpoint,
      payload,
    );

    if (status === 201) {
      console.log('✅ Studio membership created successfully!');
      const membershipData = data as {
        id: string;
        user_id: string;
        studio_id: string;
        role: string;
      };
      console.log(`   Membership ID: ${membershipData.id}`);
      console.log(`   User ID: ${membershipData.user_id}`);
      console.log(`   Studio ID: ${membershipData.studio_id}`);
      console.log(`   Role: ${membershipData.role}`);
      return data;
    } else {
      console.error(`❌ Failed to create membership. Status: ${status}`);
      console.error('📋 Response:', JSON.stringify(data, null, 2));
      throw new Error(`Failed to create membership: ${status}`);
    }
  } catch (error) {
    console.error('❌ Error creating membership:', error);
    throw error;
  }
}

// Main function
async function main() {
  const { apiUrl, studioId } = parseArgs();

  console.log('🚀 Starting complete backdoor workflow...');
  console.log(`   API URL: ${apiUrl}`);
  if (studioId) {
    console.log(`   Studio ID: ${studioId}`);
  }
  console.log(`\nThis will run the following steps:`);
  console.log(`   1. Create a user`);
  console.log(`   2. Update the created user`);
  console.log(`   3. Create a studio membership for the user`);

  const results: Array<{ name: string; success: boolean }> = [];
  let userId: string | undefined;

  try {
    // Step 1: Create user
    userId = await createUser(apiUrl);
    results.push({ name: 'Create User', success: true });

    // Step 2: Update user
    await updateUser(apiUrl, userId);
    results.push({ name: 'Update User', success: true });

    // Step 3: Create membership
    await createMembership(apiUrl, userId, studioId);
    results.push({ name: 'Create Membership', success: true });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error(`\n❌ Workflow failed: ${errorMessage}`);
    console.error(`\n⚠️  Workflow stopped. Previous steps completed successfully.`);
    process.exit(1);
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
    console.log(`\n📋 Created Resources:`);
    console.log(`   - User ID: ${userId}`);
    console.log(`   - Membership created for user ${userId}`);
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

