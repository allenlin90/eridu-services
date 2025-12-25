import type { User } from '@prisma/client';

/**
 * Base mock entity with common fields
 */
export type BaseMockEntity = {
  id: bigint;
  uid: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  metadata: any;
  [key: string]: any;
};

/**
 * Creates a base mock entity with standard fields.
 * This is similar to the one in model-service-test.helper.ts but centralized here.
 *
 * @param overrides - Fields to override in the base entity
 * @returns A mock entity object
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
    metadata: {} as any,
    ...overrides,
  } as BaseMockEntity & T;
}

/**
 * User mock data factory
 */
export const userMockFactory = {
  /**
   * Creates a complete User entity mock
   */
  create: (overrides: Partial<User> = {}): User => ({
    ...createBaseMockEntity({
      email: 'test@example.com',
      name: 'Test User',
      extId: 'test-ext-id',
      isBanned: false,
      isSystemAdmin: false,
      profileUrl: null,
      ...overrides,
    }),
  } as User),

  /**
   * Creates a user creation DTO
   */
  createDto: (
    overrides: Partial<{
      email: string;
      name: string;
      metadata: Record<string, unknown>;
    }> = {},
  ) => ({
    email: 'test@example.com',
    name: 'Test User',
    metadata: {},
    ...overrides,
  }),

  /**
   * Creates a user update DTO
   */
  updateDto: (
    overrides: Partial<{
      email?: string;
      name?: string;
      metadata?: Record<string, unknown>;
    }> = {},
  ) => ({
    email: 'updated@example.com',
    name: 'Updated User',
    metadata: { updated: true },
    ...overrides,
  }),
};

/**
 * Show mock data factory
 */
export const showMockFactory = {
  /**
   * Creates a complete Show entity mock
   */
  create: (overrides: Partial<any> = {}) => ({
    ...createBaseMockEntity({
      name: 'Test Show',
      startTime: new Date('2024-01-01T10:00:00Z'),
      endTime: new Date('2024-01-01T12:00:00Z'),
      clientId: BigInt(1),
      studioRoomId: BigInt(1),
      showTypeId: BigInt(1),
      showStatusId: BigInt(1),
      showStandardId: BigInt(1),
      scheduleId: null,
      ...overrides,
    }),
  }),

  /**
   * Creates a show with relations (client, studioRoom, etc.)
   */
  withRelations: (overrides: Partial<any> = {}) => ({
    ...showMockFactory.create(overrides),
    client: {
      id: BigInt(1),
      uid: 'client_123',
      name: 'Test Client',
      contactPerson: 'John Doe',
      contactEmail: 'john@example.com',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
    studioRoom: {
      id: BigInt(1),
      uid: 'room_123',
      name: 'Test Room',
      studioId: BigInt(1),
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
    showType: {
      id: BigInt(1),
      uid: 'type_123',
      name: 'Test Type',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
    showStatus: {
      id: BigInt(1),
      uid: 'status_123',
      name: 'Test Status',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
    showStandard: {
      id: BigInt(1),
      uid: 'standard_123',
      name: 'Test Standard',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
    showPlatforms: [],
  }),
};

/**
 * Client mock data factory
 */
export const clientMockFactory = {
  create: (overrides: Partial<any> = {}) => ({
    ...createBaseMockEntity({
      name: 'Test Client',
      contactPerson: 'John Doe',
      contactEmail: 'john@example.com',
      ...overrides,
    }),
  }),
};

/**
 * Studio mock data factory
 */
export const studioMockFactory = {
  create: (overrides: Partial<any> = {}) => ({
    ...createBaseMockEntity({
      name: 'Test Studio',
      ...overrides,
    }),
  }),
};

/**
 * Platform mock data factory
 */
export const platformMockFactory = {
  create: (overrides: Partial<any> = {}) => ({
    ...createBaseMockEntity({
      name: 'Test Platform',
      ...overrides,
    }),
  }),
};

/**
 * Schedule mock data factory
 */
export const scheduleMockFactory = {
  create: (overrides: Partial<any> = {}) => ({
    ...createBaseMockEntity({
      name: 'Test Schedule',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
      ...overrides,
    }),
  }),
};

/**
 * Pagination mock data factory
 */
export const paginationMockFactory = {
  /**
   * Creates pagination query DTO
   */
  query: (
    overrides: Partial<{
      page: number;
      limit: number;
      skip: number;
      take: number;
    }> = {},
  ) => ({
    page: 1,
    limit: 10,
    skip: 0,
    take: 10,
    ...overrides,
  }),

  /**
   * Creates pagination metadata
   */
  meta: (overrides: Partial<any> = {}) => ({
    page: 1,
    limit: 10,
    total: 25,
    totalPages: 3,
    hasNextPage: true,
    hasPreviousPage: false,
    ...overrides,
  }),

  /**
   * Creates paginated response
   */
  response: (data: any[], metaOverrides: Partial<any> = {}) => ({
    data,
    meta: paginationMockFactory.meta(metaOverrides),
  }),
};

/**
 * Common test data constants
 */
export const testConstants = {
  uids: {
    user: 'user_test123',
    client: 'client_test123',
    studio: 'studio_test123',
    room: 'room_test123',
    show: 'show_test123',
    platform: 'platform_test123',
    schedule: 'schedule_test123',
  },
  emails: {
    user: 'test@example.com',
    admin: 'admin@example.com',
    client: 'client@example.com',
  },
  names: {
    user: 'Test User',
    client: 'Test Client',
    studio: 'Test Studio',
    show: 'Test Show',
  },
};
