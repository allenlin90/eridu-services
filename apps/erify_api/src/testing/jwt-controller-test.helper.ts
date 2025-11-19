/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Provider, Test, TestingModule } from '@nestjs/testing';

import { UtilityService } from '@/utility/utility.service';

import {
  type AuthenticatedUser,
  createAuthenticatedUser,
  createJwtAuthProviders,
  setupJwtAuthMocks,
} from './jwt-auth-test.helper';

/**
 * Common mock services used across JWT-protected controllers
 */
export const commonMockServices = {
  utilityService: {
    generateBrandedId: jest.fn(),
    isTimeOverlapping: jest.fn(),
  },
};

/**
 * Configuration for creating a JWT-protected controller test module.
 */
export interface JwtControllerTestConfig<TController> {
  /** The controller class to test */
  controllerClass: new (...args: any[]) => TController;
  /** Service mocks specific to this controller - key should be the service class, value the mock instance */
  serviceMocks: Map<new (...args: any[]) => any, Record<string, jest.Mock>>;
  /** Additional providers to include in the test module */
  additionalProviders?: Provider[];
  /** Custom JWT auth providers (optional) */
  jwtProviders?: Provider[];
}

/**
 * Creates a NestJS testing module for JWT-protected controllers with standardized setup.
 *
 * Includes:
 * - JWT auth mocks (AuthService, JwtAuthGuard)
 * - Common utility service mock
 * - Your custom service mocks
 *
 * @param config - Configuration for the test module
 * @returns A compiled TestingModule
 *
 * @example
 * ```typescript
 * const module = await createJwtControllerTestModule({
 *   controllerClass: ShowsController,
 *   serviceMocks: {
 *     ShowsService: mockShowsService,
 *   },
 * });
 * ```
 */
export async function createJwtControllerTestModule<TController>({
  controllerClass,
  serviceMocks,
  additionalProviders = [],
  jwtProviders = createJwtAuthProviders(),
}: JwtControllerTestConfig<TController>): Promise<TestingModule> {
  const providers: Provider[] = [
    controllerClass,
    // JWT auth providers

    ...jwtProviders,
    // Common utility service
    {
      provide: UtilityService,
      useValue: commonMockServices.utilityService,
    },
    // Service mocks

    ...Array.from(serviceMocks.entries()).map(
      ([serviceClass, mockInstance]) => ({
        provide: serviceClass,
        useValue: mockInstance,
      }),
    ),

    ...additionalProviders,
  ];

  return Test.createTestingModule({
    controllers: [controllerClass],
    providers,
  }).compile();
}

/**
 * Creates an authenticated user for controller testing with common defaults.
 * This is a convenience wrapper around createAuthenticatedUser with
 * more controller-specific defaults.
 *
 * @param overrides - Fields to override in the authenticated user
 * @returns An AuthenticatedUser object suitable for controller tests
 *
 * @example
 * ```typescript
 * const user = createControllerUser({
 *   ext_id: 'custom_user_id',
 *   email: 'custom@example.com',
 * });
 * ```
 */
export function createControllerUser(
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  return createAuthenticatedUser(overrides);
}

/**
 * Helper to create paginated response expectations for controller tests.
 *
 * @param data - The data array
 * @param meta - Pagination metadata
 * @returns Expected response object
 *
 * @example
 * ```typescript
 * const expected = createPaginatedResponse(shows, paginationMeta);
 * expect(result).toEqual(expected);
 * ```
 */

export function createPaginatedResponse(data: any[], meta: any) {
  return {
    data,
    meta,
  };
}

/**
 * Sets up JWT controller mocks globally for all tests in a file.
 * Call this once at the top of your test file (outside describe blocks).
 *
 * This combines JWT auth setup with common controller utilities.
 *
 * @example
 * ```typescript
 * import { setupJwtControllerMocks } from '@/testing/jwt-controller-test.helper';
 *
 * setupJwtControllerMocks();
 *
 * describe('MyController', () => {
 *   // Your tests here
 * });
 * ```
 */
export function setupJwtControllerMocks(): void {
  setupJwtAuthMocks();
  // Additional controller-specific setup can go here
}
