# Auth SDK

**Current Status**: Phase 1 ✅ - JWT/JWKS validation + NestJS adapters + React client

## Overview

The `@eridu/auth-sdk` package provides **framework-agnostic server utilities** and **framework-specific adapters** for authentication, enabling services to validate JWT tokens issued by the `eridu_auth` service (Better Auth).

**Components**:
- **Server Utilities** (`./server`): Framework-agnostic JWKS fetching, caching, and JWT verification
- **NestJS Adapters** (`./adapters/nestjs`): Guard and decorator implementations for NestJS
- **React Client** (`./client/react`): Better Auth client wrapper with redirect utilities
- **Schemas** (`./schemas`): Zod validation schemas for JWT payloads
- **Types** (`./types`): Shared TypeScript types for JWT and user data

**Purpose**: Single source of truth for authentication logic. Used by:
- **erify_api**: Server-side JWT validation via NestJS guard
- **eridu_auth**: User profile and JWT payload validation via schemas
- **erify_creators/erify_studios**: React client for session management and redirects

## Executive Summary

**Status**: ✅ **SDK Package** - Ready for implementation

This SDK design provides:

- **JWKS Management**: Fetch and cache JSON Web Key Sets from Better Auth's JWKS endpoint
- **JWT Verification**: Local token verification using cached public keys (no network calls per request)
- **Framework Adapters**: NestJS guard and decorator implementations for easy integration
- **Type Safety**: Shared TypeScript types for JWT payloads and user information

## Current State Analysis

### erify_api Requirements

**Needed Components:**

1. **JWKS Service** - Fetch JWKS from `{ERIDU_AUTH_URL}/api/auth/jwks` on startup, cache in memory, support edge/worker runtimes
2. **JWT Validation Guard** - Local JWT verification using JWKS, extract user info, validate issuer/audience
3. **Admin Guard** - Service-specific (depends on StudioMembership) - remains in erify_api
4. **JWKS Management Endpoints** - Framework-specific - remains in erify_api

### eridu_auth Service

**Provides:**

- Better Auth service with JWT plugin enabled
- JWKS endpoint: `GET /api/auth/jwks` (standard Better Auth endpoint)
- Algorithm: EdDSA/Ed25519 (Better Auth default)
- Base path: `/api/auth` (configurable)
- JWT payload includes: `id`, `name`, `email`, `image`, `activeOrganizationId`, `activeTeamId`, `impersonatedBy`

### Package Structure

```
packages/auth-sdk/
├── src/
│   ├── server/                    # Server-side utilities
│   │   ├── jwks/
│   │   │   ├── jwks-service.ts   # Core JWKS fetching & caching
│   │   │   ├── jwks-client.ts    # HTTP client for JWKS endpoint
│   │   │   └── types.ts          # JWKS-related types
│   │   ├── jwt/
│   │   │   ├── jwt-verifier.ts   # Core JWT verification logic
│   │   │   ├── jwt-payload.ts    # JWT payload types & parsing
│   │   │   └── types.ts          # JWT-related types
│   │   └── index.ts              # Server-side exports
│   ├── adapters/                 # Framework-specific adapters
│   │   ├── nestjs/
│   │   │   ├── jwt-auth.guard.ts      # NestJS guard (uses core verifier)
│   │   │   ├── current-user.decorator.ts # Type-safe user extraction decorator
│   │   │   └── index.ts
│   │   └── index.ts
│   └── types.ts                  # Shared TypeScript types
└── package.json
```

## Package Exports

The package provides granular exports for tree-shaking and flexibility:

```json
{
  "exports": {
    "./server/jwks/jwks-service": "./dist/server/jwks/jwks-service.js",
    "./server/jwks/jwks-client": "./dist/server/jwks/jwks-client.js",
    "./server/jwks/types": "./dist/server/jwks/types.js",
    "./server/jwt/jwt-verifier": "./dist/server/jwt/jwt-verifier.js",
    "./server/jwt/jwt-payload": "./dist/server/jwt/jwt-payload.js",
    "./server/jwt/types": "./dist/server/jwt/types.js",
    "./adapters/nestjs/jwt-auth.guard": "./dist/adapters/nestjs/jwt-auth.guard.js",
    "./adapters/nestjs/current-user.decorator": "./dist/adapters/nestjs/current-user.decorator.js",
    "./adapters/nestjs": "./dist/adapters/nestjs/index.js",
    "./schemas/jwt-payload.schema": "./dist/schemas/jwt-payload.schema.js",
    "./client/react": "./dist/client/react.js",
    "./types": "./dist/types.js"
  }
}
```

## Installation

```bash
pnpm add @eridu/auth-sdk
```

## Dependencies

**Required Dependencies:**

- `jose`: ^6.0.11 - JWT verification with JWKS support
- `zod`: ^4.1.12 - Configuration validation

**Runtime Requirements:**

- Node.js 22+ (for native `fetch` API)
- TypeScript 5.8+

## Core Components

### 1. JWKS Service

**Purpose**: Fetch and cache JSON Web Key Sets from Better Auth's JWKS endpoint with automatic recovery.

**Features:**

- **Startup Initialization**: Fetches JWKS from `{ERIDU_AUTH_URL}/api/auth/jwks` on application startup
- **Automatic Caching**: Caches JWKS in memory for efficient local JWT verification (zero network overhead per request)
- **Automatic Recovery**: If cache is lost (server restart, redeploy, etc.), automatically refetches on next use
- **Key Rotation Support**: JwtVerifier triggers automatic JWKS refresh when unknown key ID detected
- **All Runtime Environments**: Works in server, edge, and worker runtimes (cache recovery handles stateless environments)
- **Public Methods**: `initialize()`, `getJwks()`, `getKeys()`, `refreshJwks()`, `getKeysCount()`, `getLastFetchedTime()`

**Usage:**

```typescript
import { BETTER_AUTH_ENDPOINTS } from '@eridu/auth-sdk';
import { JwksService } from '@eridu/auth-sdk/server/jwks/jwks-service';

const jwksService = new JwksService({
  authServiceUrl: process.env.ERIDU_AUTH_URL!,
  jwksPath: BETTER_AUTH_ENDPOINTS.JWKS, // '/api/auth/jwks'
});

// Initialize on startup (fetches and caches JWKS)
// If initialization fails, the service will automatically recover on first use
await jwksService.initialize();

// Get cached JWKS (automatically refetches if cache is lost)
const jwks = await jwksService.getJwks();

// Get specific keys from cache
const keys = await jwksService.getKeys();

// Manually refresh JWKS (useful for key rotation)
await jwksService.refreshJwks();
```

### 2. JWT Verifier

**Purpose**: Verify JWT tokens locally using cached JWKS (zero network overhead per request).

**Features:**

- **Local Verification**: Uses jose's `jwtVerify()` with cached JWKS - no network calls per request
- **Issuer Validation**: Validates JWT issuer matches `ERIDU_AUTH_URL`
- **Audience Validation**: Validates JWT audience (defaults to issuer if not specified)
- **Automatic Rotation**: Detects unknown key IDs and automatically refreshes JWKS, then retries
- **User Extraction**: Extracts and validates user info from JWT payload
- **Payload Validation**: Uses `validateJwtPayload()` to ensure required fields are present

**Usage:**

```typescript
import { JwksService } from '@eridu/auth-sdk/server/jwks/jwks-service';
import { JwtVerifier } from '@eridu/auth-sdk/server/jwt/jwt-verifier';

const jwksService = new JwksService({
  authServiceUrl: process.env.ERIDU_AUTH_URL!,
});
await jwksService.initialize();

const jwtVerifier = new JwtVerifier({
  jwksService,
  issuer: process.env.ERIDU_AUTH_URL!,
  audience: process.env.ERIDU_AUTH_URL!, // optional, defaults to issuer
});

// Verify token (locally using cached JWKS)
const payload = await jwtVerifier.verify(token);
// Returns JwtPayload type with full token claims

// Extract user info from payload
const userInfo = jwtVerifier.extractUserInfo(payload);
// Returns UserInfo: { id, name, email, image? }
```

### 3. NestJS Adapter

**Purpose**: NestJS guard implementation for easy integration into NestJS applications.

**Usage:**

```typescript
import { ConfigService } from '@nestjs/config';

import { JwtAuthGuard } from '@eridu/auth-sdk/adapters/nestjs';
// Use in controllers with @CurrentUser() decorator (recommended)
import { CurrentUser } from '@eridu/auth-sdk/adapters/nestjs';
import { JwksService, JwtVerifier } from '@eridu/auth-sdk/server';
import type { UserInfo } from '@eridu/auth-sdk/types';

@Module({
  providers: [
    {
      provide: JwksService,
      useFactory: async (config: ConfigService) => {
        const service = new JwksService({
          authServiceUrl: config.get('ERIDU_AUTH_URL')!,
          // jwksPath defaults to BETTER_AUTH_ENDPOINTS.JWKS ('/api/auth/jwks')
        });
        // Initialize on startup (fetches and caches JWKS)
        // If init fails, auto-recovery handles it on first JWT verification
        await service.initialize();
        return service;
      },
      inject: [ConfigService],
    },
    {
      provide: JwtVerifier,
      useFactory: (jwksService: JwksService, config: ConfigService) => {
        return new JwtVerifier({
          jwksService,
          issuer: config.get('ERIDU_AUTH_URL')!,
        });
      },
      inject: [JwksService, ConfigService],
    },
    JwtAuthGuard,
  ],
  exports: [JwksService, JwtVerifier, JwtAuthGuard],
})
export class CommonModule {}

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  @Get()
  getProfile(@CurrentUser() user: UserInfo) {
    // Type-safe user extraction - no need to access req.user manually
    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }
}

// Alternative: Use @Request() with AuthenticatedRequest (legacy approach)
@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  @Get('profile')
  getProfile(@Request() req: AuthenticatedRequest) {
    return req.user; // UserInfo attached by guard
  }
}
```

**Note**: Environment variables are validated via Zod schema (e.g., in `env.schema.ts`) on application startup. The SDK uses a runtime resolution strategy where configuration values are passed through constructor parameters.

### 4. React Client

**Purpose**: Better Auth client wrapper for frontend applications with convenience utilities.

**Features:**

- **JWT Client Plugin**: Automatically handles JWT tokens with `jwtClient()` plugin
- **Redirect to Login**: Helper function to redirect to login page with callback URL
- **Type Safety**: Re-exports Better Auth `Session` type
- **Callback Handling**: Prevents redirect loops (checks if already on auth app)
- **Standard Integration**: Works seamlessly with Better Auth's React client

**Usage:**

```typescript
import type { Session } from '@eridu/auth-sdk/client/react';
import { createAuthClient } from '@eridu/auth-sdk/client/react';

const { client, redirectToLogin } = createAuthClient({
  baseURL: 'http://localhost:3000',
});

// Get current session
const { data: session } = await client.getSession();

// Redirect to login if not authenticated
if (!session?.user) {
  redirectToLogin(); // Redirects to /sign-in with callback URL
}

// Or provide custom return URL
redirectToLogin('http://localhost:5173/dashboard');
```

### 5. CurrentUser Decorator

**Purpose**: Type-safe decorator to extract authenticated user from request objects in NestJS controllers.

**Features:**

- Type-safe user extraction without manual request typing
- Works with `UserInfo` type by default
- Supports transformed user types when using custom guards
- Throws `UnauthorizedException` if user is not found (guard should have set it)
- Cleaner code than accessing `request.user` directly

**Usage:**

```typescript
import { CurrentUser, JwtAuthGuard } from '@eridu/auth-sdk/adapters/nestjs';
import type { UserInfo } from '@eridu/auth-sdk/types';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  @Get()
  getProfile(@CurrentUser() user: UserInfo) {
    // TypeScript knows user is UserInfo
    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }

  @Get(':id')
  getItem(@CurrentUser() user: UserInfo, @Param('id') id: string) {
    return this.service.getItem(id, user.id);
  }
}
```

**Usage with Transformed User Type:**

If your app extends `JwtAuthGuard` and transforms the user:

```typescript
import { CurrentUser, JwtAuthGuard } from '@eridu/auth-sdk/adapters/nestjs';

// App-specific user type (from guard transformation)
type AuthenticatedUser = {
  ext_id: string;
  id: string;
  name: string;
  email: string;
  image?: string;
  payload: JwtPayload;
};

@Controller('profile')
@UseGuards(CustomJwtAuthGuard) // Transforms UserInfo → AuthenticatedUser
export class ProfileController {
  @Get()
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    // Type annotation ensures AuthenticatedUser type
    return {
      ext_id: user.ext_id,
      email: user.email,
    };
  }
}
```

**Benefits:**

- **Type-safe**: TypeScript knows the exact type of user (via annotation)
- **Context-aware**: Only works when guard is applied
- **No global type pollution**: Doesn't affect Express types globally
- **Cleaner code**: No need to check if user exists (throws if missing)

## Type Definitions

### JWT Payload

**Full JWT payload from Better Auth** (all claims plus standard JWT fields):

```typescript
export type JwtPayload = {
  // Better Auth specific claims
  id: string; // User ID
  name: string; // User display name
  email: string; // User email
  image?: string | null; // Profile image URL
  activeOrganizationId?: string | null; // Current org context
  activeTeamId?: string | null; // Current team context
  impersonatedBy?: string | null; // If session is impersonated

  // Standard JWT claims
  sub?: string; // Subject (standard claim)
  iat?: number; // Issued at
  exp?: number; // Expiration
  iss?: string; // Issuer
  aud?: string; // Audience
};
```

**Zod Validation Schema:**

Use `jwtPayloadSchema` for runtime validation:

```typescript
import { jwtPayloadSchema } from '@eridu/auth-sdk/schemas/jwt-payload.schema';

const validated = jwtPayloadSchema.parse(payload);
```

### User Info

**Extracted user information** (subset of JWT payload for common use):

```typescript
export type UserInfo = {
  id: string; // User ID
  name: string; // User display name
  email: string; // User email
  image?: string; // Profile image URL (optional)
};
```

## Environment Configuration

### Required Environment Variables

**erify_api (consuming service):**

- `ERIDU_AUTH_URL`: Base URL of the eridu_auth service
  - **Example**: `http://localhost:3000` or `https://auth.example.com`
  - **Required**: Must be a valid URL
  - **Usage**: Used to construct JWKS endpoint (`{ERIDU_AUTH_URL}/api/auth/jwks`) and validate JWT issuer/audience
  - **Validation**: Validate via Zod schema in your application's `env.schema.ts` on startup

**eridu_auth (auth service):**

- `BETTER_AUTH_URL`: Base URL for Better Auth (should match ERIDU_AUTH_URL in consuming apps)
- `BETTER_AUTH_SECRET`: Secret key for JWT signing
- Base path: `/api/auth` (Better Auth default)

### Configuration Strategy

The SDK uses **runtime configuration injection** where services receive configuration through constructor parameters:

```typescript
// Configuration is passed at runtime, not at build time
const jwksService = new JwksService({
  authServiceUrl: configService.get('ERIDU_AUTH_URL'), // From env var
  jwksPath: BETTER_AUTH_ENDPOINTS.JWKS, // '/api/auth/jwks' from constants
});

await jwksService.initialize(); // Uses authServiceUrl at runtime
```

**Benefits:**
- No hardcoded values in compiled code
- Environment-specific configuration without rebuilds
- Easy testing with mock configurations
- Works across dev, staging, and production environments

### Validation Checklist

- ✅ `ERIDU_AUTH_URL` matches `BETTER_AUTH_URL` in eridu_auth
- ✅ JWKS endpoint is accessible: `GET {ERIDU_AUTH_URL}/api/auth/jwks`
- ✅ JWT tokens are issued by the eridu_auth service
- ✅ JwtVerifier issuer validation matches ERIDU_AUTH_URL

## Architecture

### Integration Flow

```mermaid
sequenceDiagram
    participant Client
    participant API as erify_api
    participant SDK as auth-sdk
    participant Auth as eridu_auth
    participant DB as Database

    Note over API,SDK: Server Startup
    API->>SDK: Initialize JwksService
    SDK->>Auth: Fetch JWKS from /api/auth/jwks
    Auth-->>SDK: Return JWKS (public keys)
    SDK->>SDK: Cache JWKS

    Note over Client,DB: Request Flow
    Client->>API: Request with JWT token
    API->>SDK: Validate token (JwtAuthGuard)
    SDK->>SDK: Get JWKS (cached or fetch)
    alt JWKS cached
        SDK-->>SDK: Return cached JWKS
    else Edge/Worker (no cache)
        SDK->>Auth: Fetch JWKS (on-demand)
        Auth-->>SDK: Return JWKS
    end
    SDK->>SDK: Verify JWT locally using JWKS
    SDK->>SDK: Extract user info from payload
    SDK->>API: Attach user to request
    API->>DB: Query membership (if admin check needed)
    DB-->>API: Return membership data
    API-->>Client: Response (write/read-only)
```

### How JWT/JWKS Validation Works

1. **Server Startup**: When the server starts, `JwksService.initialize()` fetches the JWKS from `{ERIDU_AUTH_URL}/api/auth/jwks`
2. **JWKS Caching**: The JWKS (public keys) are cached in memory for efficient local JWT verification
3. **Edge/Worker Runtime**: If `EDGE_RUNTIME=true`, JWKS are not cached and are fetched on-demand when needed
4. **JWT Verification**: Each request validates the JWT token locally using the cached JWKS - no network call per request
5. **Automatic Key Rotation**: If a JWT contains an unknown key ID (`kid`), the service automatically refreshes the JWKS and retries verification
6. **Manual Refresh**: Applications can provide endpoints to manually refresh JWKS for key rotation and recovery scenarios

## Implementation Plan

### Phase 1: SDK Foundation

1. Create SDK structure in auth-sdk package
2. Implement JwksService
3. Implement JwtVerifier
4. Add TypeScript types
5. Write unit tests

### Phase 2: NestJS Adapter

1. Create NestJS adapter directory
2. Implement JwtAuthGuard
3. Implement CurrentUser decorator ✅
4. Write adapter tests
5. Document usage ✅

### Phase 3: erify_api Integration

1. Add SDK dependency to erify_api
2. Update CommonModule to use SDK
3. Implement AdminGuard (service-specific, remains in erify_api)
4. Update controllers to use guards
5. Add JWKS management endpoints (framework-specific, remains in erify_api)
6. Integration testing

### Phase 4: Documentation & Cleanup

1. Update all documentation
2. Remove local implementation (if exists)
3. Remove `jose` dependency from erify_api (SDK provides it)
4. Final validation

## Benefits

1. **Code Reusability**: Single source of truth for JWT/JWKS logic
2. **Consistency**: Same validation logic across all services
3. **Maintainability**: Updates to JWT handling in one place
4. **Testability**: Core logic can be unit tested independently
5. **Future Services**: New microservices can use the same SDK
6. **Type Safety**: Shared types ensure consistency
7. **Framework Agnostic**: Core utilities work in any Node.js environment
8. **Framework Adapters**: Easy integration with popular frameworks

## Compatibility Matrix

| Component             | Framework          | Status                                            |
| --------------------- | ------------------ | ------------------------------------------------- |
| JwksService           | Framework-agnostic | ✅ Can be used anywhere                            |
| JwtVerifier           | Framework-agnostic | ✅ Can be used anywhere                            |
| JwtAuthGuard          | NestJS             | ✅ Adapter provided                                |
| CurrentUser Decorator | NestJS             | ✅ Adapter provided                                |
| Admin Guard           | NestJS + erify_api | ⚠️ Keep in erify_api (depends on StudioMembership) |
| JWKS Endpoints        | NestJS + erify_api | ⚠️ Keep in erify_api (framework-specific)          |

## Security Considerations

### Token Security

- JWT tokens are validated locally using public keys from Better Auth's JWKS endpoint
- No shared secret required - uses asymmetric key cryptography (EdDSA/Ed25519)
- JWKS are fetched on server startup and cached for efficiency
- On edge/worker runtimes, JWKS are fetched on-demand when caching isn't available
- Tokens should be extracted from Authorization header only
- Automatic key rotation support - refreshes JWKS when unknown key ID detected

### Better Auth Integration

- **JWKS Endpoint**: Fetched directly via HTTP from Better Auth's standard endpoint
  - Default endpoint: `{ERIDU_AUTH_URL}/api/auth/jwks` (Better Auth's default `basePath`)
  - Uses standard HTTP `fetch` API - no client library required
- **JWT Issuer**: Matches `ERIDU_AUTH_URL` (configured in Better Auth's `baseURL`)
- **JWT Audience**: Matches `ERIDU_AUTH_URL` (default in Better Auth)
- **Algorithm**: EdDSA with Ed25519 curve (Better Auth default)
- **Key Format**: JWK (JSON Web Key) format as per RFC 7517

## Testing Strategy

### SDK Unit Tests

- JwksService: fetch, cache, refresh, edge runtime
- JwtVerifier: verify, extract user info, error handling
- NestJS adapter: guard behavior, request attachment, CurrentUser decorator

### Integration Tests

- End-to-end authentication flow
- Admin guard with StudioMembership (erify_api specific)
- JWKS refresh endpoints
- Error handling

## Error Handling

### Authentication Errors

- `UnauthorizedException`: No token provided, invalid token, token expired
- `ForbiddenException`: Admin access required, user not authenticated

### JWKS Errors

- Network failures when fetching JWKS
- Invalid JWKS format
- Key rotation detection and automatic refresh

## Troubleshooting

### Common Issues

1. **JWT Token Invalid**
   - Verify token format (Bearer <token>)
   - Check token expiration
   - Verify ERIDU_AUTH_URL is correct and eridu_auth service is accessible
   - Check JWKS endpoint is accessible: `GET {ERIDU_AUTH_URL}/api/auth/jwks`
   - Verify token issuer and audience match ERIDU_AUTH_URL
   - Check logs for JWKS fetch errors on startup

2. **JWKS Fetch Failed**
   - Verify ERIDU_AUTH_URL is correct and accessible
   - Check that the JWKS endpoint is accessible: `GET {ERIDU_AUTH_URL}/api/auth/jwks`
   - Verify Better Auth's `basePath` matches the default `/api/auth` (or update JWKS URL construction if custom)
   - Check network connectivity to eridu_auth service
   - Verify eridu_auth service is running and JWKS endpoint is available
   - Check eridu_auth logs for errors
   - For edge/worker runtimes, ensure on-demand fetching is working
   - **Recovery**: Use manual refresh endpoints (if implemented by consuming service) to refresh JWKS

3. **Type Mismatches**
   - Ensure JWT payload types match Better Auth's JWT configuration
   - Verify types are imported correctly from SDK

### Debugging Tools

In development environment, log user information for debugging purposes. Check `request.user` (attached by `JwtAuthGuard`) or use `@CurrentUser()` decorator to verify user information extraction.

## Migration Path

### From Local Implementation

If you have existing JWT/JWKS implementation in your service:

1. Install SDK: `pnpm add @eridu/auth-sdk`
2. Replace local JWKS service with SDK's `JwksService`
3. Replace local JWT verifier with SDK's `JwtVerifier`
4. Update guards to use SDK's NestJS adapter
5. Remove local implementation code
6. Remove `jose` dependency (SDK provides it)

### Backward Compatibility

- No breaking changes expected
- SDK provides same functionality as local implementation
- Gradual migration supported

## Related Documentation

- **[Implementation Strategy](../../apps/erify_api/docs/IMPLEMENTATION_STRATEGY.md)** - SDK implementation plan for erify_api
- **[Authentication Guide](../../apps/erify_api/docs/AUTHENTICATION_GUIDE.md)** - Authentication guide for erify_api
- **[Phase 1 Roadmap](../../apps/erify_api/docs/roadmap/PHASE_1.md)** - Implementation roadmap
- **[Architecture Overview](../../apps/erify_api/docs/ARCHITECTURE.md)** - System architecture

## License

ISC
