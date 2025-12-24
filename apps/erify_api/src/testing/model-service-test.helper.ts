import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { UtilityService } from '@/utility/utility.service';

/**
 * Common repository methods that most model repositories implement.
 * Extend this interface for repositories with additional methods.
 */
export type BaseRepositoryMethods = {
  create: jest.Mock;
  findByUid?: jest.Mock;
  findOne?: jest.Mock;
  update: jest.Mock;
  softDelete: jest.Mock;
  findMany: jest.Mock;
  count: jest.Mock;
};

/**
 * Creates a mock repository with common CRUD methods.
 * All methods are jest.fn() by default and can be overridden in tests.
 *
 * @param additionalMethods - Optional additional repository methods to include
 * @returns A partial mock repository object
 *
 * @example
 * ```typescript
 * const repositoryMock = createMockRepository({
 *   findActiveShows: jest.fn(),
 *   findShowsByClient: jest.fn(),
 * });
 * ```
 */
export function createMockRepository<T extends BaseRepositoryMethods>(
  additionalMethods: Partial<T> = {},
): Partial<T> {
  return {
    create: jest.fn(),
    findByUid: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    ...additionalMethods,
  } as Partial<T>;
}

/**
 * Creates a mock UtilityService with generateBrandedId method.
 *
 * @param defaultUid - Default UID to return from generateBrandedId (optional)
 * @returns A partial mock UtilityService
 *
 * @example
 * ```typescript
 * const utilityMock = createMockUtilityService('user_123');
 * // or
 * const utilityMock = createMockUtilityService();
 * utilityMock.generateBrandedId = jest.fn().mockReturnValue('custom_uid');
 * ```
 */
export function createMockUtilityService(
  defaultUid?: string,
): Partial<jest.Mocked<UtilityService>> {
  return {
    generateBrandedId: jest.fn().mockReturnValue(defaultUid || 'test_uid'),
  };
}

/**
 * Configuration for creating a test module for model services.
 */
export type ModelServiceTestConfig<TService, TRepository> = {
  /** The service class to test */
  serviceClass: new (...args: any[]) => TService;
  /** The repository class to mock */
  repositoryClass: new (...args: any[]) => TRepository;
  /** Mock repository instance */
  repositoryMock: Partial<TRepository>;
  /** Mock UtilityService instance */
  utilityMock?: Partial<jest.Mocked<UtilityService>>;
  /** Additional providers to include in the test module */
  additionalProviders?: any[];
};

/**
 * Creates a NestJS testing module for model service tests with standardized setup.
 *
 * @param config - Configuration for the test module
 * @param config.serviceClass - The service class to test
 * @param config.repositoryClass - The repository class to mock
 * @param config.repositoryMock - Mock instance for the repository
 * @param config.utilityMock - Optional mock for UtilityService
 * @param config.additionalProviders - Additional providers for the test module
 * @returns A compiled TestingModule
 *
 * @example
 * ```typescript
 * const module = await createModelServiceTestModule({
 *   serviceClass: UserService,
 *   repositoryClass: UserRepository,
 *   repositoryMock: userRepositoryMock,
 *   utilityMock: utilityMock,
 * });
 * ```
 */
export async function createModelServiceTestModule<TService, TRepository>({
  serviceClass,
  repositoryClass,
  repositoryMock,
  utilityMock = createMockUtilityService(),
  additionalProviders = [],
}: ModelServiceTestConfig<TService, TRepository>): Promise<TestingModule> {
  const providers: any[] = [
    serviceClass,
    {
      provide: repositoryClass,
      useValue: repositoryMock,
    },
    {
      provide: UtilityService,
      useValue: utilityMock,
    },

    ...additionalProviders,
  ];

  return Test.createTestingModule({
    providers,
  }).compile();
}

/**
 * Common mock data factory for entities with standard fields.
 * Useful for creating consistent test data across model tests.
 */
export type BaseMockEntity = {
  id: bigint;
  uid: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  metadata: Record<string, unknown>;
};

/**
 * Creates a base mock entity with standard fields.
 *
 * @param overrides - Fields to override in the base entity
 * @returns A mock entity object
 *
 * @example
 * ```typescript
 * const mockUser = createBaseMockEntity({
 *   uid: 'user_123',
 *   email: 'test@example.com',
 * });
 * ```
 */
export function createBaseMockEntity<T extends Partial<BaseMockEntity>>(
  overrides: T = {} as T,
): BaseMockEntity & T {
  const now = new Date();
  return {
    id: BigInt(1),
    uid: 'test_uid',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    metadata: {},
    ...overrides,
  } as BaseMockEntity & T;
}

/**
 * Sets up common test mocks and utilities.
 * Call this in a beforeEach hook to reset mocks between tests.
 *
 * @example
 * ```typescript
 * beforeEach(() => {
 *   setupTestMocks();
 * });
 * ```
 */
export function setupTestMocks(): void {
  jest.clearAllMocks();
}
