import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Schedule } from '@prisma/client';

import { ScheduleService } from '@/models/schedule/schedule.service';
import { ScheduleSnapshotService } from '@/models/schedule-snapshot/schedule-snapshot.service';
import { ShowService } from '@/models/show/show.service';
import { ShowMcService } from '@/models/show-mc/show-mc.service';
import { ShowPlatformService } from '@/models/show-platform/show-platform.service';
import {
  PrismaService,
  TransactionClient,
  TransactionOptions,
} from '@/prisma/prisma.service';

// Test helper type for mock transaction clients used in publishing tests
// This allows test mocks to only implement the properties they need
// The mock structure matches what's actually used in tests
type PublishingMockTransactionClientStructure = {
  show: {
    deleteMany: jest.Mock;
    createMany: jest.Mock;
    findMany: jest.Mock;
  };
  showMC: {
    createMany: jest.Mock;
  };
  showPlatform: {
    createMany: jest.Mock;
  };
  schedule: {
    update: jest.Mock;
  };
  client: {
    findMany: jest.Mock;
  };
  studioRoom: {
    findMany: jest.Mock;
  };
  showType: {
    findMany: jest.Mock;
  };
  showStatus: {
    findMany: jest.Mock;
  };
  showStandard: {
    findMany: jest.Mock;
  };
  mC: {
    findMany: jest.Mock;
  };
  platform: {
    findMany: jest.Mock;
  };
};

// Helper function to convert mock transaction client to TransactionClient for tests
// This is safe because the callback only accesses properties that exist on the mock
// Using a type assertion that TypeScript accepts for test mocks
function asTransactionClient(
  mock: PublishingMockTransactionClientStructure,
): TransactionClient {
  // Type assertion is necessary here because test mocks don't implement full TransactionClient
  // The callback will only access properties that exist on the mock
  return mock as PublishingMockTransactionClientStructure & TransactionClient;
}

import { PublishingService, ScheduleWithRelations } from './publishing.service';
import { PlanDocument } from './schemas/schedule-planning.schema';
import { ValidationService } from './validation.service';

describe('PublishingService', () => {
  let service: PublishingService;
  let scheduleService: jest.Mocked<ScheduleService>;
  let scheduleSnapshotService: jest.Mocked<ScheduleSnapshotService>;
  let showService: jest.Mocked<ShowService>;
  let showMcService: jest.Mocked<ShowMcService>;
  let showPlatformService: jest.Mocked<ShowPlatformService>;
  let validationService: jest.Mocked<ValidationService>;
  let prismaService: jest.Mocked<PrismaService>;
  let getScheduleByIdMock: jest.Mock;
  let validateScheduleMock: jest.Mock;
  let createScheduleSnapshotMock: jest.Mock;
  let generateShowUidMock: jest.Mock;
  let generateShowMcUidMock: jest.Mock;
  let generateShowPlatformUidMock: jest.Mock;
  let transactionMock: jest.Mock;
  let mockTransactionClient: {
    show: {
      deleteMany: jest.Mock;
      createMany: jest.Mock;
      findMany: jest.Mock;
    };
    showMC: {
      createMany: jest.Mock;
    };
    showPlatform: {
      createMany: jest.Mock;
    };
    schedule: {
      update: jest.Mock;
    };
    client: {
      findMany: jest.Mock;
    };
    studioRoom: {
      findMany: jest.Mock;
    };
    showType: {
      findMany: jest.Mock;
    };
    showStatus: {
      findMany: jest.Mock;
    };
    showStandard: {
      findMany: jest.Mock;
    };
    mC: {
      findMany: jest.Mock;
    };
    platform: {
      findMany: jest.Mock;
    };
  };

  const mockPlanDocument: PlanDocument = {
    metadata: {
      lastEditedBy: 'user_test123',
      lastEditedAt: '2024-01-01T00:00:00Z',
      totalShows: 2,
      clientName: 'Test Client',
      dateRange: {
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-31T23:59:59Z',
      },
    },
    shows: [
      {
        tempId: 'temp_1',
        name: 'Test Show 1',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T12:00:00Z',
        clientUid: 'client_test123',
        studioRoomUid: 'room_test123',
        showTypeUid: 'sht_test123',
        showStatusUid: 'shst_test123',
        showStandardUid: 'shsd_test123',
        mcs: [
          {
            mcUid: 'mc_test123',
            note: 'MC Note 1',
          },
        ],
        platforms: [
          {
            platformUid: 'platform_test123',
            liveStreamLink: 'https://example.com/stream1',
            platformShowId: 'platform_show_1',
          },
        ],
        metadata: { custom: 'data1' },
      },
      {
        tempId: 'temp_2',
        name: 'Test Show 2',
        startTime: '2024-01-02T10:00:00Z',
        endTime: '2024-01-02T12:00:00Z',
        clientUid: 'client_test123',
        studioRoomUid: 'room_test123',
        showTypeUid: 'sht_test123',
        showStatusUid: 'shst_test123',
        showStandardUid: 'shsd_test123',
        mcs: [],
        platforms: [],
      },
    ],
  };

  const mockSchedule: Schedule & {
    client: { uid: string; name: string } | null;
    createdByUser: { uid: string; name: string; email: string } | null;
    planDocument: PlanDocument;
  } = {
    id: BigInt(1),
    uid: 'schedule_test123',
    name: 'Test Schedule',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-31'),
    status: 'draft',
    version: 1,
    clientId: BigInt(1),
    createdBy: BigInt(1),
    publishedBy: null,
    publishedAt: null,
    planDocument: mockPlanDocument,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    client: {
      uid: 'client_test123',
      name: 'Test Client',
    },
    createdByUser: {
      uid: 'user_test123',
      name: 'Test User',
      email: 'test@example.com',
    },
  };

  const mockPublishedSchedule: ScheduleWithRelations = {
    ...mockSchedule,
    status: 'published',
    publishedAt: new Date(),
    publishedBy: BigInt(1),
    version: 2,
    publishedByUser: {
      uid: 'user_test123',
      name: 'Test User',
      email: 'test@example.com',
    },
  };

  beforeEach(async () => {
    mockTransactionClient = {
      show: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
        findMany: jest.fn(),
      },
      showMC: {
        createMany: jest.fn(),
      },
      showPlatform: {
        createMany: jest.fn(),
      },
      schedule: {
        update: jest.fn(),
      },
      client: {
        findMany: jest.fn(),
      },
      studioRoom: {
        findMany: jest.fn(),
      },
      showType: {
        findMany: jest.fn(),
      },
      showStatus: {
        findMany: jest.fn(),
      },
      showStandard: {
        findMany: jest.fn(),
      },
      mC: {
        findMany: jest.fn(),
      },
      platform: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublishingService,
        {
          provide: ScheduleService,
          useValue: {
            getScheduleById: jest.fn(),
          },
        },
        {
          provide: ScheduleSnapshotService,
          useValue: {
            createScheduleSnapshot: jest.fn(),
          },
        },
        {
          provide: ShowService,
          useValue: {
            generateShowUid: jest.fn(),
          },
        },
        {
          provide: ShowMcService,
          useValue: {
            generateShowMcUid: jest.fn(),
          },
        },
        {
          provide: ShowPlatformService,
          useValue: {
            generateShowPlatformUid: jest.fn(),
          },
        },
        {
          provide: ValidationService,
          useValue: {
            validateSchedule: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            executeTransaction: jest.fn(
              async <T>(
                callback: (tx: TransactionClient) => Promise<T>,
                _options?: TransactionOptions,
              ): Promise<T> => {
                // Mock transaction client only implements subset needed for tests
                // The callback will only access the properties that exist on mockTransactionClient
                return await callback(
                  asTransactionClient(mockTransactionClient),
                );
              },
            ),
          },
        },
      ],
    }).compile();

    service = module.get<PublishingService>(PublishingService);
    scheduleService = module.get(ScheduleService);
    scheduleSnapshotService = module.get(ScheduleSnapshotService);
    showService = module.get(ShowService);
    showMcService = module.get(ShowMcService);
    showPlatformService = module.get(ShowPlatformService);
    validationService = module.get(ValidationService);
    prismaService = module.get(PrismaService);

    // Store mock functions to avoid unbound-method issues
    getScheduleByIdMock = scheduleService['getScheduleById'] as jest.Mock;
    validateScheduleMock = validationService['validateSchedule'] as jest.Mock;
    createScheduleSnapshotMock = scheduleSnapshotService[
      'createScheduleSnapshot'
    ] as jest.Mock;
    generateShowUidMock = showService['generateShowUid'] as jest.Mock;
    generateShowMcUidMock = showMcService['generateShowMcUid'] as jest.Mock;
    generateShowPlatformUidMock = showPlatformService[
      'generateShowPlatformUid'
    ] as jest.Mock;
    transactionMock = prismaService['executeTransaction'] as jest.Mock;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('publish', () => {
    const scheduleUid = 'schedule_test123';
    const version = 1;
    const userId = BigInt(1);

    beforeEach(() => {
      // Setup default mocks for successful publish
      getScheduleByIdMock.mockResolvedValue(mockSchedule);
      validateScheduleMock.mockResolvedValue({
        isValid: true,
        errors: [],
      });

      mockTransactionClient.show.deleteMany.mockResolvedValue({ count: 0 });
      mockTransactionClient.show.createMany.mockResolvedValue({ count: 2 });
      // Mock findMany to return created shows with IDs
      mockTransactionClient.show.findMany.mockResolvedValue([
        { id: BigInt(1), uid: 'show_test123' },
        { id: BigInt(2), uid: 'show_test456' },
      ]);
      mockTransactionClient.showMC.createMany.mockResolvedValue({ count: 1 });
      mockTransactionClient.showPlatform.createMany.mockResolvedValue({
        count: 1,
      });

      mockTransactionClient.schedule.update.mockResolvedValue(
        mockPublishedSchedule,
      );

      // Setup UID lookup maps
      mockTransactionClient.client.findMany.mockResolvedValue([
        { id: BigInt(1), uid: 'client_test123' },
      ]);
      mockTransactionClient.studioRoom.findMany.mockResolvedValue([
        { id: BigInt(1), uid: 'room_test123' },
      ]);
      mockTransactionClient.showType.findMany.mockResolvedValue([
        { id: BigInt(1), uid: 'sht_test123' },
      ]);
      mockTransactionClient.showStatus.findMany.mockResolvedValue([
        { id: BigInt(1), uid: 'shst_test123' },
      ]);
      mockTransactionClient.showStandard.findMany.mockResolvedValue([
        { id: BigInt(1), uid: 'shsd_test123' },
      ]);
      mockTransactionClient.mC.findMany.mockResolvedValue([
        { id: BigInt(1), uid: 'mc_test123' },
      ]);
      mockTransactionClient.platform.findMany.mockResolvedValue([
        { id: BigInt(1), uid: 'platform_test123' },
      ]);

      // Generate different UIDs for each show
      generateShowUidMock
        .mockReturnValueOnce('show_test123')
        .mockReturnValueOnce('show_test456');
      generateShowMcUidMock.mockReturnValue('showmc_test123');
      generateShowPlatformUidMock.mockReturnValue('showplatform_test123');
    });

    it('should successfully publish a schedule', async () => {
      const result = await service.publish(scheduleUid, version, userId);

      expect(getScheduleByIdMock).toHaveBeenCalledWith(scheduleUid, {
        client: true,
        createdByUser: true,
      });
      expect(validateScheduleMock).toHaveBeenCalledWith({
        id: mockSchedule.id,
        uid: mockSchedule.uid,
        startDate: mockSchedule.startDate,
        endDate: mockSchedule.endDate,
        planDocument: mockSchedule.planDocument,
        clientId: mockSchedule.clientId,
      });

      expect(createScheduleSnapshotMock).not.toHaveBeenCalled();
      expect(mockTransactionClient.show.deleteMany).toHaveBeenCalledWith({
        where: {
          scheduleId: mockSchedule.id,
          deletedAt: null,
        },
      });
      expect(result.schedule.status).toBe('published');
      expect(result.showsCreated).toBe(2);
      expect(result.showsDeleted).toBe(0);
    });

    it('should delete existing shows before creating new ones', async () => {
      mockTransactionClient.show.deleteMany.mockResolvedValue({ count: 3 });

      const result = await service.publish(scheduleUid, version, userId);

      expect(mockTransactionClient.show.deleteMany).toHaveBeenCalledWith({
        where: {
          scheduleId: mockSchedule.id,
          deletedAt: null,
        },
      });
      expect(result.showsDeleted).toBe(3);
      expect(result.showsCreated).toBe(2);
    });

    it('should create shows with MCs and Platforms', async () => {
      await service.publish(scheduleUid, version, userId);

      // Verify bulk show creation was called
      expect(mockTransactionClient.show.createMany).toHaveBeenCalledTimes(1);
      expect(mockTransactionClient.show.findMany).toHaveBeenCalledTimes(1);

      // Verify ShowMC bulk creation was called
      expect(mockTransactionClient.showMC.createMany).toHaveBeenCalledTimes(1);
      const showMCCall = mockTransactionClient.showMC.createMany.mock
        .calls[0] as unknown as [
        { data: Array<{ mcId: bigint; note: string }> },
      ];
      expect(showMCCall[0].data).toHaveLength(1);
      expect(showMCCall[0].data[0]?.mcId).toBe(BigInt(1));
      expect(showMCCall[0].data[0]?.note).toBe('MC Note 1');

      // Verify ShowPlatform bulk creation was called
      expect(
        mockTransactionClient.showPlatform.createMany,
      ).toHaveBeenCalledTimes(1);
      const showPlatformCall = mockTransactionClient.showPlatform.createMany
        .mock.calls[0] as unknown as [
        {
          data: Array<{ platformId: bigint; liveStreamLink: string }>;
        },
      ];
      expect(showPlatformCall[0].data).toHaveLength(1);
      expect(showPlatformCall[0].data[0]?.platformId).toBe(BigInt(1));
      expect(showPlatformCall[0].data[0]?.liveStreamLink).toBe(
        'https://example.com/stream1',
      );
    });

    it('should update schedule status to published', async () => {
      await service.publish(scheduleUid, version, userId);

      expect(mockTransactionClient.schedule.update).toHaveBeenCalledWith({
        where: { id: mockSchedule.id },
        data: {
          status: 'published',
          publishedAt: expect.any(Date) as Date,
          publishedBy: userId,
          version: mockSchedule.version + 1,
        },
        include: {
          client: true,
          createdByUser: true,
          publishedByUser: true,
        },
      });
    });

    it('should throw BadRequestException if schedule is already published', async () => {
      const publishedSchedule = {
        ...mockSchedule,
        status: 'published' as const,
      };
      getScheduleByIdMock.mockResolvedValue(publishedSchedule);

      await expect(
        service.publish(scheduleUid, version, userId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.publish(scheduleUid, version, userId),
      ).rejects.toThrow('Schedule is already published');

      expect(validateScheduleMock).not.toHaveBeenCalled();
      expect(transactionMock).not.toHaveBeenCalled();
    });

    it('should throw ConflictException on version mismatch', async () => {
      await expect(service.publish(scheduleUid, 2, userId)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.publish(scheduleUid, 2, userId)).rejects.toThrow(
        'Version mismatch. Expected 2, but schedule is at version 1',
      );

      expect(validateScheduleMock).not.toHaveBeenCalled();
      expect(transactionMock).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid plan document structure - missing planDocument', async () => {
      const invalidSchedule = {
        ...mockSchedule,
        planDocument: null,
      };
      getScheduleByIdMock.mockResolvedValue(invalidSchedule);

      await expect(
        service.publish(scheduleUid, version, userId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.publish(scheduleUid, version, userId),
      ).rejects.toThrow('Invalid plan document structure');
    });

    it('should throw BadRequestException for invalid plan document structure - missing shows', async () => {
      const invalidSchedule = {
        ...mockSchedule,
        planDocument: {
          metadata: mockPlanDocument.metadata,
        } as PlanDocument,
      };
      getScheduleByIdMock.mockResolvedValue(invalidSchedule);

      await expect(
        service.publish(scheduleUid, version, userId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.publish(scheduleUid, version, userId),
      ).rejects.toThrow('Invalid plan document structure');
    });

    it('should throw BadRequestException for invalid plan document structure - shows not array', async () => {
      const invalidSchedule = {
        ...mockSchedule,
        planDocument: {
          metadata: mockPlanDocument.metadata,
          shows: 'not-an-array',
        } as unknown as PlanDocument,
      };
      getScheduleByIdMock.mockResolvedValue(invalidSchedule);

      await expect(
        service.publish(scheduleUid, version, userId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.publish(scheduleUid, version, userId),
      ).rejects.toThrow('Invalid plan document structure');
    });

    it('should throw BadRequestException when validation fails', async () => {
      validateScheduleMock.mockResolvedValue({
        isValid: false,
        errors: [
          {
            type: 'room_conflict',
            message: 'Room conflict detected',
            showIndex: 0,
          },
        ],
      });

      await expect(
        service.publish(scheduleUid, version, userId),
      ).rejects.toThrow(BadRequestException);

      const error = (await service
        .publish(scheduleUid, version, userId)
        .catch((e: unknown) => e)) as BadRequestException;
      expect(error.message).toBe('Schedule validation failed');
      const response = error.getResponse() as {
        message: string;
        details?: { errors: unknown[] };
      };
      expect(response.details?.errors).toHaveLength(1);

      expect(transactionMock).not.toHaveBeenCalled();
    });

    it('should build UID lookup maps correctly', async () => {
      await service.publish(scheduleUid, version, userId);

      // Verify all entity lookups were called
      expect(mockTransactionClient.client.findMany).toHaveBeenCalledWith({
        where: {
          uid: { in: ['client_test123'] },
          deletedAt: null,
        },
        select: { id: true, uid: true },
      });
      expect(mockTransactionClient.studioRoom.findMany).toHaveBeenCalledWith({
        where: {
          uid: { in: ['room_test123'] },
          deletedAt: null,
        },
        select: { id: true, uid: true },
      });
      expect(mockTransactionClient.mC.findMany).toHaveBeenCalledWith({
        where: {
          uid: { in: ['mc_test123'] },
          deletedAt: null,
        },
        select: { id: true, uid: true },
      });
      expect(mockTransactionClient.platform.findMany).toHaveBeenCalledWith({
        where: {
          uid: { in: ['platform_test123'] },
          deletedAt: null,
        },
        select: { id: true, uid: true },
      });
    });

    it('should handle shows with no MCs or platforms', async () => {
      const scheduleWithoutRelations = {
        ...mockSchedule,
        planDocument: {
          ...mockPlanDocument,
          shows: [
            {
              ...mockPlanDocument.shows[0],
              mcs: [],
              platforms: [],
            },
          ],
        },
      };
      getScheduleByIdMock.mockResolvedValue(scheduleWithoutRelations);
      mockTransactionClient.show.findMany.mockResolvedValue([
        { id: BigInt(1), uid: 'show_test123' },
      ]);

      await service.publish(scheduleUid, version, userId);

      // Verify ShowMC and ShowPlatform createMany are not called when empty
      expect(mockTransactionClient.showMC.createMany).not.toHaveBeenCalled();
      expect(
        mockTransactionClient.showPlatform.createMany,
      ).not.toHaveBeenCalled();
    });

    it('should handle multiple MCs and platforms per show', async () => {
      const scheduleWithMultipleRelations = {
        ...mockSchedule,
        planDocument: {
          ...mockPlanDocument,
          shows: [
            {
              ...mockPlanDocument.shows[0],
              mcs: [
                { mcUid: 'mc_test123', note: 'MC 1' },
                { mcUid: 'mc_test456', note: 'MC 2' },
              ],
              platforms: [
                {
                  platformUid: 'platform_test123',
                  liveStreamLink: 'https://example.com/stream1',
                  platformShowId: 'platform_show_1',
                },
                {
                  platformUid: 'platform_test456',
                  liveStreamLink: 'https://example.com/stream2',
                  platformShowId: 'platform_show_2',
                },
              ],
            },
          ],
        },
      };
      getScheduleByIdMock.mockResolvedValue(scheduleWithMultipleRelations);

      mockTransactionClient.mC.findMany.mockResolvedValue([
        { id: BigInt(1), uid: 'mc_test123' },
        { id: BigInt(2), uid: 'mc_test456' },
      ]);
      mockTransactionClient.platform.findMany.mockResolvedValue([
        { id: BigInt(1), uid: 'platform_test123' },
        { id: BigInt(2), uid: 'platform_test456' },
      ]);
      mockTransactionClient.show.findMany.mockResolvedValue([
        { id: BigInt(1), uid: 'show_test123' },
      ]);

      await service.publish(scheduleUid, version, userId);

      // Verify ShowMC bulk creation with 2 items
      expect(mockTransactionClient.showMC.createMany).toHaveBeenCalledTimes(1);
      const showMCCall = mockTransactionClient.showMC.createMany.mock
        .calls[0] as unknown as [{ data: Array<unknown> }];
      expect(showMCCall[0].data).toHaveLength(2);

      // Verify ShowPlatform bulk creation with 2 items
      expect(
        mockTransactionClient.showPlatform.createMany,
      ).toHaveBeenCalledTimes(1);
      const showPlatformCall = mockTransactionClient.showPlatform.createMany
        .mock.calls[0] as unknown as [{ data: Array<unknown> }];
      expect(showPlatformCall[0].data).toHaveLength(2);
    });

    it('should preserve show metadata', async () => {
      await service.publish(scheduleUid, version, userId);

      const createManyCall = mockTransactionClient.show.createMany.mock
        .calls[0] as unknown as [
        { data: Array<{ metadata: Record<string, unknown> }> },
      ];
      expect(createManyCall[0].data[0]?.metadata).toEqual({ custom: 'data1' });
      expect(createManyCall[0].data[1]?.metadata).toEqual({});
    });

    it('should set default metadata to empty object when not provided', async () => {
      const scheduleWithoutMetadata = {
        ...mockSchedule,
        planDocument: {
          ...mockPlanDocument,
          shows: [
            {
              ...mockPlanDocument.shows[0],
              metadata: undefined,
            },
          ],
        },
      };
      getScheduleByIdMock.mockResolvedValue(scheduleWithoutMetadata);
      mockTransactionClient.show.findMany.mockResolvedValue([
        { id: BigInt(1), uid: 'show_test123' },
      ]);

      await service.publish(scheduleUid, version, userId);

      const createManyCall = mockTransactionClient.show.createMany.mock
        .calls[0] as unknown as [
        { data: Array<{ metadata: Record<string, unknown> }> },
      ];
      expect(createManyCall[0].data[0]?.metadata).toEqual({});
    });

    it('should execute all operations within a transaction', async () => {
      await service.publish(scheduleUid, version, userId);

      expect(transactionMock).toHaveBeenCalledTimes(1);
      expect(createScheduleSnapshotMock).not.toHaveBeenCalled();
      expect(mockTransactionClient.show.deleteMany).toHaveBeenCalled();
      expect(mockTransactionClient.show.createMany).toHaveBeenCalled();
      expect(mockTransactionClient.show.findMany).toHaveBeenCalled();
      expect(mockTransactionClient.showMC.createMany).toHaveBeenCalled();
      expect(mockTransactionClient.showPlatform.createMany).toHaveBeenCalled();
      expect(mockTransactionClient.schedule.update).toHaveBeenCalled();
    });

    it('should handle empty shows array', async () => {
      const scheduleWithNoShows = {
        ...mockSchedule,
        planDocument: {
          ...mockPlanDocument,
          shows: [],
        },
      };
      getScheduleByIdMock.mockResolvedValue(scheduleWithNoShows);
      mockTransactionClient.show.createMany.mockResolvedValue({ count: 0 });
      mockTransactionClient.show.findMany.mockResolvedValue([]);

      const result = await service.publish(scheduleUid, version, userId);

      // createMany is still called with empty array (Prisma handles it gracefully)
      expect(mockTransactionClient.show.createMany).toHaveBeenCalledWith({
        data: [],
      });
      expect(mockTransactionClient.show.findMany).toHaveBeenCalled();
      expect(mockTransactionClient.showMC.createMany).not.toHaveBeenCalled();
      expect(
        mockTransactionClient.showPlatform.createMany,
      ).not.toHaveBeenCalled();
      expect(result.showsCreated).toBe(0);
      expect(result.showsDeleted).toBe(0);
    });
  });
});
