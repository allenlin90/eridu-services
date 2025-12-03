# Database Seeding Guide

This guide explains how to seed the database with test users for integration testing with `erify_api` and `auth-sdk`.

## Overview

The seed file creates test users that can be used for:

- Testing authentication flows in `erify_api`
- Validating JWT tokens with `auth-sdk`
- Testing different user roles and permissions
- Integration testing across services

## Running the Seed

```bash
# From the eridu_auth directory
pnpm db:seed
```

Or from the monorepo root:

```bash
pnpm --filter eridu-auth db:seed
```

## Test Users Created

The seed creates the following test users:

| Email                     | Password          | Role    | Email Verified |
| ------------------------- | ----------------- | ------- | -------------- |
| `test-user@example.com`   | `testpassword123` | `user`  | ✅ Yes         |
| `test-admin@example.com`  | `testpassword123` | `admin` | ✅ Yes         |
| `test-user-2@example.com` | `testpassword123` | `user`  | ✅ Yes         |

## Usage in Integration Tests

### 1. Login to Get JWT Token

```bash
curl -X POST http://localhost:3000/api/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-user@example.com",
    "password": "testpassword123"
  }'
```

Response will include a JWT token in the response body or as a cookie.

### 2. Use JWT Token in erify_api Requests

```bash
curl -X GET http://localhost:3001/api/me/profile \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### 3. Test auth-sdk JWT Validation

The `auth-sdk` will automatically:

- Fetch JWKS from `/api/auth/jwks` on startup
- Validate JWT tokens locally using cached public keys
- Extract user information from the token payload

## Example Integration Test

```typescript
// Example test using the seeded users
describe('Authentication Integration', () => {
  it('should authenticate with seeded user', async () => {
    // Login to get JWT token
    const loginResponse = await fetch(
      'http://localhost:3000/api/auth/sign-in',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test-user@example.com',
          password: 'testpassword123',
        }),
      },
    );

    const { token } = await loginResponse.json();

    // Use token in erify_api request
    const apiResponse = await fetch('http://localhost:3001/api/me/profile', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(apiResponse.status).toBe(200);
  });
});
```

## Resetting Seed Data

To reset and re-seed the database:

1. **Option 1: Delete users manually** (seeds will skip existing users)

   ```sql
   DELETE FROM account WHERE user_id IN (
     SELECT id FROM "user" WHERE email LIKE 'test-%@example.com'
   );
   DELETE FROM "user" WHERE email LIKE 'test-%@example.com';
   ```

2. **Option 2: Reset entire database** (⚠️ destroys all data)
   ```bash
   # Drop and recreate database, then run migrations and seeds
   pnpm db:migrate
   pnpm db:seed
   ```

## Notes

- Users are created with `emailVerified: true` so they can be used immediately
- Passwords are hashed using bcrypt with 10 salt rounds (same as Better Auth)
- The seed script will skip users that already exist (idempotent)
- All test users use the same password for convenience: `testpassword123`

## Troubleshooting

### Users not authenticating

1. Verify the user exists in the database:

   ```sql
   SELECT * FROM "user" WHERE email = 'test-user@example.com';
   ```

2. Verify the account exists:

   ```sql
   SELECT * FROM account WHERE user_id = '<user_id>';
   ```

3. Check that `providerId` is `'credential'` for email/password accounts

### Password hashing issues

If authentication fails, verify the password hash format matches Better Auth's expectations. The seed uses bcrypt with 10 salt rounds, which should match Better Auth's default.
