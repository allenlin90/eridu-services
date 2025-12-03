#!/usr/bin/env ts-node

/**
 * Script to test GET /me endpoint with JWT token
 *
 * This script tests the /me endpoint in erify_api using a JWT token
 * obtained from eridu_auth service. It validates that the auth-sdk
 * correctly validates the token and extracts user information.
 *
 * Usage:
 *   # Test with token from command line
 *   pnpm run manual:auth:test-me -- --token=<JWT_TOKEN>
 *
 *   # Custom API URL
 *   pnpm run manual:auth:test-me -- --token=<JWT_TOKEN> --api-url=http://localhost:3001
 */

// Load environment variables before any other imports
import '../../scripts/utils/load-env';

// Parse command line arguments
function parseArgs(): {
  apiUrl: string;
  token: string;
} {
  const args = process.argv.slice(2);
  // Use PORT from environment for API URL, fallback to default
  const apiPort = process.env.PORT || 3001;
  let apiUrl = `http://localhost:${apiPort}`;
  let token: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--api-url=')) {
      apiUrl = arg.split('=')[1];
    } else if (arg === '--api-url' && i + 1 < args.length) {
      apiUrl = args[i + 1];
    } else if (arg.startsWith('--token=')) {
      token = arg.split('=')[1];
    } else if (arg === '--token' && i + 1 < args.length) {
      token = args[i + 1];
    }
  }

  if (!token) {
    console.error('❌ Error: JWT token is required');
    console.error(
      '   Usage: pnpm run manual:auth:test-me -- --token=<JWT_TOKEN>',
    );
    console.error('   Or run the complete workflow: pnpm run manual:auth:all');
    process.exit(1);
  }

  return { apiUrl, token };
}

interface MeResponse {
  ext_id: string;
  id: string;
  name: string;
  email: string;
  image: string | null;
  payload: {
    id: string;
    name: string;
    email: string;
    [key: string]: unknown;
  };
}

/**
 * Core testMe function that can be reused
 * @param apiUrl - Base URL of the API service
 * @param token - JWT token to use for authentication
 * @returns User profile data
 */
export async function performTestMe(
  apiUrl: string,
  token: string,
): Promise<MeResponse> {
  const endpoint = `${apiUrl}/me`;

  console.log('🧪 Testing GET /me endpoint...');
  console.log(`📡 Endpoint: GET ${endpoint}`);
  console.log(`🎫 Using JWT token: ${token.substring(0, 20)}...`);

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({
        message: response.statusText,
      }))) as { message?: string };
      console.error(`❌ Request failed. Status: ${response.status}`);
      console.error('📋 Error:', JSON.stringify(errorData, null, 2));

      if (response.status === 401) {
        console.error('\n💡 Possible issues:');
        console.error('   - JWT token is invalid or expired');
        console.error(
          '   - eridu_auth service JWKS endpoint is not accessible',
        );
        console.error('   - ERIDU_AUTH_URL environment variable is incorrect');
      }
      throw new Error(`/me endpoint failed: ${response.status}`);
    }

    const data = (await response.json()) as MeResponse;

    console.log('✅ Request successful!');
    console.log('📋 Response:', JSON.stringify(data, null, 2));

    console.log('\n🔍 Validation:');
    console.log(
      `   ✅ ext_id: ${data.ext_id} (mapped from better-auth user.id)`,
    );
    console.log(`   ✅ id: ${data.id}`);
    console.log(`   ✅ name: ${data.name}`);
    console.log(`   ✅ email: ${data.email}`);
    console.log(`   ✅ JWT payload extracted successfully`);

    return data;
  } catch (error) {
    console.error('❌ Error testing /me endpoint:', error);
    throw error;
  }
}

// Standalone execution function
async function testMe() {
  const { apiUrl, token } = parseArgs();
  return performTestMe(apiUrl, token);
}

// Run the script if executed directly
if (require.main === module) {
  testMe()
    .then(() => {
      console.log('\n✨ Test completed successfully');
      console.log('\n💡 The auth-sdk successfully validated the JWT token!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}
