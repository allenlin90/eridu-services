#!/usr/bin/env ts-node

/**
 * Script to run the complete JWT authentication workflow
 *
 * This script orchestrates the complete authentication workflow:
 * 1. Login to erify_auth and get JWT token
 * 2. Test GET /me endpoint with the JWT token
 *
 * Usage:
 *   # Run complete workflow with default URLs
 *   pnpm run manual:auth:all
 *
 *   # Custom auth service URL
 *   pnpm run manual:auth:all -- --auth-url=http://localhost:3000
 *
 *   # Custom API URL
 *   pnpm run manual:auth:all -- --api-url=http://localhost:3001
 *
 *   # Custom test user
 *   pnpm run manual:auth:all -- --email=test-user@example.com --password=testpassword123
 *
 * Note: This script runs all steps sequentially. If any step fails,
 * the script will exit with an error code.
 */

// Load environment variables before any other imports
import '../../../scripts/utils/load-env';

// Import reusable functions from individual scripts
import { performLogin } from '../1.login';
import { performTestMe } from '../2.test-me';

// Parse command line arguments
function parseArgs(): {
  authUrl: string;
  apiUrl: string;
  email?: string;
  password?: string;
} {
  const args = process.argv.slice(2);
  // Use ERIFY_AUTH_URL from environment, fallback to default
  let authUrl = process.env.ERIFY_AUTH_URL || 'http://localhost:3000';
  // Use PORT from environment for API URL, fallback to default
  const apiPort = process.env.PORT || 3001;
  let apiUrl = `http://localhost:${apiPort}`;
  let email: string | undefined;
  let password: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--auth-url=')) {
      authUrl = arg.split('=')[1];
    } else if (arg === '--auth-url' && i + 1 < args.length) {
      authUrl = args[i + 1];
    } else if (arg.startsWith('--api-url=')) {
      apiUrl = arg.split('=')[1];
    } else if (arg === '--api-url' && i + 1 < args.length) {
      apiUrl = args[i + 1];
    } else if (arg.startsWith('--email=')) {
      email = arg.split('=')[1];
    } else if (arg === '--email' && i + 1 < args.length) {
      email = args[i + 1];
    } else if (arg.startsWith('--password=')) {
      password = arg.split('=')[1];
    } else if (arg === '--password' && i + 1 < args.length) {
      password = args[i + 1];
    }
  }

  return { authUrl, apiUrl, email, password };
}

// Main function
async function main() {
  const { authUrl, apiUrl, email, password } = parseArgs();

  console.log('🚀 Starting complete JWT authentication workflow...');
  console.log(`   Auth Service URL: ${authUrl}`);
  console.log(`   API Service URL: ${apiUrl}`);
  if (email) {
    console.log(`   Email: ${email}`);
  }
  console.log(`\nThis will run the following steps:`);
  console.log(`   1. Login to erify_auth and get JWT token`);
  console.log(`   2. Test GET /me endpoint with JWT token`);

  const results: Array<{ name: string; success: boolean }> = [];
  let token: string | undefined;

  try {
    // Step 1: Login
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 Step 1: Login and Get JWT Token`);
    console.log(`${'='.repeat(60)}\n`);
    token = await performLogin(authUrl, email, password);
    results.push({ name: 'Login and Get JWT Token', success: true });

    // Step 2: Test /me endpoint
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 Step 2: Test GET /me Endpoint`);
    console.log(`${'='.repeat(60)}\n`);
    await performTestMe(apiUrl, token);
    results.push({ name: 'Test GET /me Endpoint', success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ Workflow failed: ${errorMessage}`);
    console.error(
      `\n⚠️  Workflow stopped. Previous steps completed successfully.`,
    );
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
    console.log(`\n💡 The auth-sdk successfully validated the JWT token!`);
    console.log(`\n📋 Summary:`);
    console.log(`   - JWT token obtained from erify_auth`);
    console.log(`   - Token validated by @eridu/auth-sdk`);
    console.log(`   - User profile accessed via /me endpoint`);
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
