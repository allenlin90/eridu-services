#!/usr/bin/env ts-node

/**
 * Script to login and get JWT token from erify_auth service
 *
 * This script authenticates with the erify_auth service using seeded test user
 * credentials and extracts the JWT token from the response.
 *
 * Usage:
 *   # Login with default auth URL
 *   pnpm run manual:auth:login
 *
 *   # Custom auth service URL
 *   pnpm run manual:auth:login -- --auth-url=http://localhost:3000
 *
 *   # Custom credentials
 *   pnpm run manual:auth:login -- --email=test-user@example.com --password=testpassword123
 */

// Load environment variables before any other imports
import '../../scripts/utils/load-env';

import * as fs from 'fs';
import * as path from 'path';

// Parse command line arguments
function parseArgs(): {
  authUrl: string;
  email?: string;
  password?: string;
} {
  const args = process.argv.slice(2);
  // Use ERIFY_AUTH_URL from environment, fallback to default
  let authUrl = process.env.ERIFY_AUTH_URL || 'http://localhost:3000';
  let email: string | undefined;
  let password: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--auth-url=')) {
      authUrl = arg.split('=')[1];
    } else if (arg === '--auth-url' && i + 1 < args.length) {
      authUrl = args[i + 1];
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

  return { authUrl, email, password };
}

// Load login payload
function loadLoginPayload(email?: string, password?: string) {
  const payloadPath = path.join(__dirname, '../payloads/01-login.json');
  const defaultPayload = JSON.parse(fs.readFileSync(payloadPath, 'utf-8')) as {
    email: string;
    password: string;
  };

  return {
    email: email || defaultPayload.email,
    password: password || defaultPayload.password,
  };
}

/**
 * Core login function - pure function that returns JWT token
 * @param authUrl - Base URL of the auth service
 * @param email - User email (optional, will use default from payload if not provided)
 * @param password - User password (optional, will use default from payload if not provided)
 * @returns JWT token string
 */
export async function performLogin(
  authUrl: string,
  email?: string,
  password?: string,
): Promise<string> {
  const payload = loadLoginPayload(email, password);
  const endpoint = `${authUrl}/api/auth/sign-in/email`;

  console.log('🔐 Logging in to erify_auth service...');
  console.log(`📡 Endpoint: POST ${endpoint}`);
  console.log(`👤 Email: ${payload.email}`);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({
        message: response.statusText,
      }))) as { message?: string };
      console.error(`❌ Login failed. Status: ${response.status}`);
      console.error('📋 Error:', JSON.stringify(errorData, null, 2));
      throw new Error(`Login failed: ${response.status}`);
    }

    // Sign-in response sets cookies for session
    // Extract cookies from sign-in response to pass to token endpoint
    const setCookieHeader = response.headers.get('set-cookie');
    const cookies = setCookieHeader
      ? setCookieHeader
          .split(',')
          .map((c) => c.trim().split(';')[0])
          .join('; ')
      : '';

    // Better Auth requires calling /api/auth/token endpoint to get JWT token
    console.log('🔄 Fetching JWT token from token endpoint...');

    const tokenResponse = await fetch(`${authUrl}/api/auth/token`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(cookies ? { Cookie: cookies } : {}),
      },
      credentials: 'include', // Include cookies from sign-in
    });

    if (!tokenResponse.ok) {
      const errorData = (await tokenResponse.json().catch(() => ({
        message: tokenResponse.statusText,
      }))) as { message?: string };
      console.error(`❌ Failed to get token. Status: ${tokenResponse.status}`);
      console.error('📋 Error:', JSON.stringify(errorData, null, 2));
      throw new Error(`Failed to get JWT token: ${tokenResponse.status}`);
    }

    const tokenData = (await tokenResponse.json()) as { token: string };
    const token = tokenData.token;

    if (!token) {
      console.error('❌ JWT token not found in token response');
      console.log(
        '📋 Token response data:',
        JSON.stringify(tokenData, null, 2),
      );
      throw new Error('JWT token not found in token response');
    }

    console.log('✅ Login successful!');
    console.log('🎫 JWT Token:', token);

    // Return token for use in next step
    return token;
  } catch (error) {
    console.error('❌ Error during login:', error);
    throw error;
  }
}

// Standalone execution function
async function login() {
  const { authUrl, email, password } = parseArgs();
  const token = await performLogin(authUrl, email, password);
  console.log('\n✨ Login completed successfully');
  console.log('\n💡 Next step: Test /me endpoint');
  console.log(`   pnpm run manual:auth:test-me -- --token=${token}`);
  return token;
}

// Run the script if executed directly
if (require.main === module) {
  login()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}
