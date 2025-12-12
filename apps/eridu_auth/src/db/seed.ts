import fs from 'node:fs';
import path from 'node:path';

import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { user } from '@/db/schema';
import env from '@/env';
import { auth } from '@/lib/auth';

if (!env.DB_SEEDING) {
  throw new Error('You must set DB_SEEDING to "true" when running seeds');
}

/**
 * Seed file for creating test users for integration testing
 *
 * This creates users that can be used to test:
 * - erify_api authentication via JWT tokens
 * - auth-sdk JWT validation
 * - Different user roles and permissions
 *
 * Usage:
 *   pnpm db:seed
 *
 * Test users created:
 * - test-user@example.com (password: testpassword123) - Regular user
 * - test-admin@example.com (password: testpassword123) - Admin user
 * - test-user-2@example.com (password: testpassword123) - Regular user
 */

type TestUser = {
  email: string;
  name: string;
  password: string;
  role?: string;
  emailVerified?: boolean | string;
};

const TEST_USERS: TestUser[] = [
  {
    email: 'test-user@example.com',
    name: 'Test User',
    password: 'testpassword123',
    role: 'user',
    emailVerified: true,
  },
  {
    email: 'test-admin@example.com',
    name: 'Test Admin',
    password: 'testpassword123',
    role: 'admin',
    emailVerified: true,
  },
  {
    email: 'test-user-2@example.com',
    name: 'Test User 2',
    password: 'testpassword123',
    role: 'user',
    emailVerified: true,
  },
];

async function seedUsers(usersToSeed: TestUser[], sourceName: string) {
  console.log(`\n🌱 Seeding users from ${sourceName}...`);

  for (const testUser of usersToSeed) {
    try {
      // Check if user already exists
      const existingUsers = await db
        .select()
        .from(user)
        .where(eq(user.email, testUser.email))
        .limit(1);
      const existingUser = existingUsers[0];

      if (existingUser) {
        console.log(`⏭️  User ${testUser.email} already exists, skipping...`);
        continue;
      }

      // Create a mock request for the sign-up endpoint
      const mockRequest = new Request(
        `${env.BETTER_AUTH_URL}/api/auth/sign-up/email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: testUser.email,
            password: testUser.password,
            name: testUser.name,
          }),
        },
      );

      // Call Better Auth's handler to create the user
      const response = await auth.handler(mockRequest);

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: 'Unknown error' })) as { message?: string };
        throw new Error(
          `Failed to create user ${testUser.email}: ${errorData?.message || response.statusText}`,
        );
      }

      // Update user with role and email verification status if needed
      const createdUser = await db
        .select()
        .from(user)
        .where(eq(user.email, testUser.email))
        .limit(1);

      if (createdUser[0]) {
        const updates: { role?: string; emailVerified?: boolean } = {};

        if (testUser.role && createdUser[0].role !== testUser.role) {
          updates.role = testUser.role;
        }

        const shouldVerify = testUser.emailVerified === true || testUser.emailVerified === 'true' || testUser.emailVerified === '1';
        if (shouldVerify && !createdUser[0].emailVerified) {
          updates.emailVerified = true;
        }

        if (Object.keys(updates).length > 0) {
          await db
            .update(user)
            .set(updates)
            .where(eq(user.email, testUser.email));
        }
      }

      console.log(`✅ Created user: ${testUser.email} (${testUser.role})`);
    } catch (error) {
      console.error(`❌ Error creating user ${testUser.email}:`, error);
      // Continue to next user
    }
  }
}

async function getCsvUsers(): Promise<TestUser[]> {
  const csvPath = path.resolve(process.cwd(), 'users.csv');

  if (!fs.existsSync(csvPath)) {
    return [];
  }

  console.log(`\n📄 Found users.csv at ${csvPath}`);

  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split(/\r?\n/).filter((line) => line.trim() !== '');

  if (lines.length < 2) {
    console.warn('⚠️ CSV file appears to be empty or only has headers');
    return [];
  }

  const headers = lines[0].split(',').map((h) => h.trim());
  const csvUsers: TestUser[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim());
    if (values.length < 3) {
      continue;
    }

    const userObj: any = {};
    headers.forEach((header, index) => {
      if (values[index] !== undefined) {
        userObj[header] = values[index];
      }
    });

    if (userObj.email && userObj.name && userObj.password) {
      csvUsers.push(userObj as TestUser);
    }
  }

  return csvUsers;
}

async function seed() {
  console.log('🚀 Starting database seeding...');

  try {
    // 1. Seed hardcoded test users (ONLY in non-production)
    if (env.NODE_ENV !== 'production') {
      // await seedUsers(TEST_USERS, 'Hardcoded Test Users');
      console.log('Skipping hardcoded test users in non-production environment.');
    } else {
      console.log('Skipping hardcoded test users in production environment.');
    }

    // 2. Seed from CSV if exists
    const csvUsers = await getCsvUsers();
    if (csvUsers.length > 0) {
      await seedUsers(csvUsers, 'CSV File');
    } else {
      console.log('\nℹ️  No users.csv found or it was empty. Skipping CSV seeding.');
    }

    console.log('\n📋 Test Users Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    TEST_USERS.forEach((u) => {
      console.log(`  Email: ${u.email}`);
      console.log(`  Password: ${u.password}`);
      console.log(`  Role: ${u.role}`);
      console.log(`  Email Verified: ${u.emailVerified}`);
      console.log('');
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n💡 Usage in Integration Tests:');
    console.log('  1. Login to get JWT token:');
    console.log('     POST /api/auth/sign-in');
    console.log(
      '     Body: { "email": "test-user@example.com", "password": "testpassword123" }',
    );
    console.log('');
    console.log('  2. Use JWT token in erify_api requests:');
    console.log('     Authorization: Bearer <JWT_TOKEN>');
    console.log('');
    console.log('  3. Test auth-sdk JWT validation:');
    console.log(
      '     The SDK will validate tokens using JWKS from /api/auth/jwks',
    );
    console.log('');

    console.log('✨ Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    // @ts-expect-error - drizzle client end method may not be in type definitions
    await db.$client.end();
  }
}

seed().catch((error) => {
  console.error('Fatal error during seeding:', error);
  process.exit(1);
});
