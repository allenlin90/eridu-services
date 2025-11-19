/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Provider, Test, TestingModule } from '@nestjs/testing';

/**
 * Common mock services used across admin controllers
 */
export const adminMockServices = {
  utilityService: {
    generateBrandedId: jest.fn(),
    isTimeOverlapping: jest.fn(),
  },
  configService: {
    get: jest.fn(),
  },
};

/**
 * Configuration for creating an admin controller test module.
 * Admin controllers typically don't use JWT auth but may have other guards.
 */
export interface AdminControllerTestConfig<TController> {
  /** The controller class to test */
  controllerClass: new (...args: any[]) => TController;
  /** Service mocks specific to this controller - key should be the service class, value the mock instance */
  serviceMocks: Map<unknown, unknown>;
  /** Additional providers to include in the test module */
  additionalProviders?: Provider[];
  /** Guards to include (admin controllers may use different auth) */
  guards?: unknown[];
}

/**
 * Creates a NestJS testing module for admin controllers with standardized setup.
 *
 * Admin controllers typically:
 * - Don't use JWT auth (may use different auth mechanisms)
 * - Use common utility and config services
 * - Have specific service mocks
 *
 * @param config - Configuration for the test module
 * @returns A compiled TestingModule
 *
 * @example
 * ```typescript
 * const module = await createAdminControllerTestModule({
 *   controllerClass: AdminUserController,
 *   serviceMocks: {
 *     UserService: mockUserService,
 *   },
 * });
 * ```
 */
export async function createAdminControllerTestModule<TController>({
  controllerClass,
  serviceMocks,
  additionalProviders = [],
  guards = [],
}: AdminControllerTestConfig<TController>): Promise<TestingModule> {
  const providers: Provider[] = [
    controllerClass,
    // Common services
    {
      provide: 'UtilityService',
      useValue: adminMockServices.utilityService,
    },
    {
      provide: 'ConfigService',
      useValue: adminMockServices.configService,
    },
    // Service mocks

    ...Array.from(serviceMocks.entries()).map(
      ([serviceClass, mockInstance]) => ({
        provide: serviceClass,
        useValue: mockInstance,
      }),
    ),
    // Guards (if any)

    ...guards.map((guard) => ({
      provide: guard,
      useValue: { canActivate: jest.fn(() => true) },
    })),

    ...additionalProviders,
  ];

  return Test.createTestingModule({
    controllers: [controllerClass],
    providers,
  }).compile();
}

/**
 * Sets up admin controller mocks globally for all tests in a file.
 * Call this once at the top of your test file (outside describe blocks).
 *
 * @example
 * ```typescript
 * import { setupAdminControllerMocks } from '@/testing/admin-controller-test.helper';
 *
 * setupAdminControllerMocks();
 *
 * describe('AdminController', () => {
 *   // Your tests here
 * });
 * ```
 */
export function setupAdminControllerMocks(): void {
  // Admin controllers typically don't need global mocks
  // but this provides a consistent interface
}

/**
 * Helper to create admin response expectations for controller tests.
 *
 * @param data - The response data
 * @param meta - Optional metadata
 * @returns Expected response object
 *
 * @example
 * ```typescript
 * const expected = createAdminResponse(user);
 * expect(result).toEqual(expected);
 * ```
 */

export function createAdminResponse<
  TData = unknown,
  TMeta = Record<string, unknown>,
>(data: TData, meta?: TMeta): TData | { data: TData; meta: TMeta } {
  if (meta) {
    return {
      data,
      meta,
    };
  }
  return data;
}
