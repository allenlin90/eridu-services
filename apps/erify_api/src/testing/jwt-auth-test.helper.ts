import type { JwtPayload } from '@eridu/auth-sdk/types';

import { AuthService } from '@/lib/auth/auth.service';
import { JwtAuthGuard } from '@/lib/auth/jwt-auth.guard';

// Mock auth-sdk modules to avoid ES module import issues
jest.mock('@eridu/auth-sdk/adapters/nestjs/current-user.decorator', () => ({
  CurrentUser: jest.fn(() => () => {}),
}));

jest.mock('@eridu/auth-sdk/schemas/jwt-payload.schema', () => ({
  jwtPayloadSchema: {
    describe: jest.fn(() => ({
      describe: jest.fn(() => ({})),
    })),
  },
}));

jest.mock('@eridu/auth-sdk/adapters/nestjs/jwt-auth.guard', () => ({
  JwtAuthGuard: class MockSdkJwtAuthGuard {},
}));

jest.mock('@eridu/auth-sdk/server/jwks/jwks-service', () => ({
  JwksService: class MockJwksService {
    constructor() {}
    async initialize() {}
  },
}));

jest.mock('@eridu/auth-sdk/server/jwt/jwt-verifier', () => ({
  JwtVerifier: class MockJwtVerifier {
    constructor() {}
  },
}));

jest.mock('@eridu/auth-sdk/server/jwks/types', () => ({}));
jest.mock('@eridu/auth-sdk/server/jwt/types', () => ({}));
jest.mock('@eridu/auth-sdk/types', () => ({}));

/**
 * Common JWT payload for testing
 */
export const mockJwtPayload: JwtPayload = {
  id: 'user_test123',
  name: 'Test User',
  email: 'test@example.com',
  image: undefined,
  iat: 1640995200, // 2022-01-01T00:00:00Z
  exp: 1672531200, // 2023-01-01T00:00:00Z
};

/**
 * Creates a mock AuthService with getJwtVerifier method.
 *
 * @returns A partial mock AuthService
 *
 * @example
 * ```typescript
 * const authServiceMock = createMockAuthService();
 * ```
 */
export function createMockAuthService(): Partial<jest.Mocked<AuthService>> {
  return {
    getJwtVerifier: jest.fn(),
  };
}

/**
 * Creates a mock JwtAuthGuard that allows requests by default.
 * Override the canActivate method in tests if you need different behavior.
 *
 * @param canActivateReturnValue - Whether the guard should allow the request (default: true)
 * @returns A partial mock JwtAuthGuard
 *
 * @example
 * ```typescript
 * const jwtGuardMock = createMockJwtAuthGuard();
 * // or to deny access
 * const jwtGuardMock = createMockJwtAuthGuard(false);
 * ```
 */
export function createMockJwtAuthGuard(
  canActivateReturnValue = true,
): Partial<jest.Mocked<JwtAuthGuard>> {
  return {
    canActivate: jest.fn().mockReturnValue(canActivateReturnValue),
  };
}

/**
 * Common authenticated user object for testing controllers.
 * This matches the AuthenticatedUser type from JwtAuthGuard.
 */
export const mockAuthenticatedUser = {
  ext_id: 'user_test123',
  id: 'user_test123',
  name: 'Test User',
  email: 'test@example.com',
  image: undefined,
  payload: mockJwtPayload,
};

/**
 * Creates an authenticated user object for testing.
 * This matches the AuthenticatedUser type from JwtAuthGuard.
 *
 * @param overrides - Fields to override in the authenticated user
 * @returns An AuthenticatedUser object
 *
 * @example
 * ```typescript
 * const user = createAuthenticatedUser({
 *   ext_id: 'custom_user_id',
 *   email: 'custom@example.com',
 * });
 * ```
 */
export function createAuthenticatedUser(
  overrides: Partial<typeof mockAuthenticatedUser> = {},
): typeof mockAuthenticatedUser {
  return {
    ...mockAuthenticatedUser,
    ...overrides,
  };
}

/**
 * Creates common providers for JWT auth testing.
 * Includes AuthService and JwtAuthGuard mocks.
 *
 * @param authServiceMock - Custom AuthService mock (optional)
 * @param jwtGuardMock - Custom JwtAuthGuard mock (optional)
 * @returns Array of provider objects for NestJS testing module
 *
 * @example
 * ```typescript
 * const providers = createJwtAuthProviders();
 *
 * const module = await Test.createTestingModule({
 *   controllers: [MyController],
 *   providers: [
 *     MyService,
 *     ...providers,
 *   ],
 * }).compile();
 * ```
 */
export function createJwtAuthProviders(
  authServiceMock = createMockAuthService(),
  jwtGuardMock = createMockJwtAuthGuard(),
): any[] {
  return [
    {
      provide: AuthService,
      useValue: authServiceMock,
    },
    {
      provide: JwtAuthGuard,
      useValue: jwtGuardMock,
    },
  ];
}

/**
 * Sets up JWT auth mocks globally for all tests in a file.
 * Call this once at the top of your test file (outside describe blocks).
 *
 * @example
 * ```typescript
 * import { setupJwtAuthMocks } from '@/testing/jwt-auth-test.helper';
 *
 * setupJwtAuthMocks();
 *
 * describe('MyController', () => {
 *   // Your tests here
 * });
 * ```
 */
export function setupJwtAuthMocks(): void {
  // All mocks are already set up via jest.mock calls above
  // This function serves as a clear entry point for setup
}
