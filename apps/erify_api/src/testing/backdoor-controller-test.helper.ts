/* eslint-disable  */
import type { Provider, TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { BackdoorApiKeyGuard } from '@/lib/guards/backdoor-api-key.guard';

/**
 * Common mock services used across backdoor controllers
 */
export const backdoorMockServices = {
  configService: {
    get: jest.fn(),
  },
  backdoorApiKeyGuard: {
    canActivate: jest.fn(() => true),
  },
};

/**
 * Configuration for creating a backdoor controller test module.
 * Backdoor controllers use API key authentication.
 */
export type BackdoorControllerTestConfig<TController> = {
  /** The controller class to test */
  controllerClass: new (...args: any[]) => TController;
  /** Service mocks specific to this controller - key should be the service class, value the mock instance */
  serviceMocks: Map<unknown, unknown>;
  /** Additional providers to include in the test module */
  additionalProviders?: Provider[];
  /** Whether to include the backdoor API key guard (default: true) */
  includeApiKeyGuard?: boolean;
};

/**
 * Creates a NestJS testing module for backdoor controllers with standardized setup.
 *
 * Backdoor controllers typically:
 * - Use API key authentication (BackdoorApiKeyGuard)
 * - Have specific service mocks
 * - Use config service for API keys
 *
 * @param config - Configuration for the test module
 * @returns A compiled TestingModule
 *
 * @example
 * ```typescript
 * const module = await createBackdoorControllerTestModule({
 *   controllerClass: BackdoorUserController,
 *   serviceMocks: {
 *     UserService: mockUserService,
 *   },
 * });
 * ```
 */
export async function createBackdoorControllerTestModule<TController>({
  controllerClass,
  serviceMocks,
  additionalProviders = [],
  includeApiKeyGuard = true,
}: BackdoorControllerTestConfig<TController>): Promise<TestingModule> {
  const providers: Provider[] = [
    controllerClass,
    // Config service
    {
      provide: 'ConfigService',
      useValue: backdoorMockServices.configService,
    },
    // Service mocks

    ...Array.from(serviceMocks.entries()).map(
      ([serviceClass, mockInstance]) => ({
        provide: serviceClass,
        useValue: mockInstance,
      }),
    ),
    // Backdoor API key guard (if enabled)

    ...(includeApiKeyGuard
      ? [
          {
            provide: BackdoorApiKeyGuard,
            useValue: backdoorMockServices.backdoorApiKeyGuard,
          },
        ]
      : []),

    ...additionalProviders,
  ];

  return Test.createTestingModule({
    controllers: [controllerClass],
    providers,
  }).compile();
}

/**
 * Sets up backdoor controller mocks globally for all tests in a file.
 * Call this once at the top of your test file (outside describe blocks).
 *
 * @example
 * ```typescript
 * import { setupBackdoorControllerMocks } from '@/testing/backdoor-controller-test.helper';
 *
 * setupBackdoorControllerMocks();
 *
 * describe('BackdoorController', () => {
 *   // Your tests here
 * });
 * ```
 */
export function setupBackdoorControllerMocks(): void {
  // Backdoor controllers typically don't need global mocks beyond what's in the module
}

/**
 * Helper to create backdoor response expectations for controller tests.
 *
 * @param data - The response data
 * @returns Expected response object
 *
 * @example
 * ```typescript
 * const expected = createBackdoorResponse(user);
 * expect(result).toEqual(expected);
 * ```
 */

export function createBackdoorResponse<TData = unknown>(data: TData): TData {
  return data;
}

/**
 * Creates a mock backdoor API key guard for testing.
 *
 * @param canActivateReturnValue - Whether the guard should allow the request (default: true)
 * @returns A partial mock BackdoorApiKeyGuard
 *
 * @example
 * ```typescript
 * const guardMock = createBackdoorApiKeyGuard();
 * // or to deny access
 * const guardMock = createBackdoorApiKeyGuard(false);
 * ```
 */
export function createBackdoorApiKeyGuard(canActivateReturnValue = true) {
  return {
    canActivate: jest.fn().mockReturnValue(canActivateReturnValue),
  };
}
