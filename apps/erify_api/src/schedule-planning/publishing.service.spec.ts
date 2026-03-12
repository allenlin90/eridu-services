import { BadRequestException, ConflictException, Module } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import type { Schedule } from '@prisma/client';
import { ClsModule } from 'nestjs-cls';

import type { PlanDocument } from './schemas/schedule-planning.schema';
import type { ScheduleWithRelations } from './publishing.service';
import { PublishingService } from './publishing.service';
import { ValidationService } from './validation.service';

import { ScheduleService } from '@/models/schedule/schedule.service';
import { ScheduleSnapshotService } from '@/models/schedule-snapshot/schedule-snapshot.service';
import { ShowService } from '@/models/show/show.service';
import { ShowCreatorService } from '@/models/show-creator/show-creator.service';
import { ShowPlatformService } from '@/models/show-platform/show-platform.service';
import { PrismaService } from '@/prisma/prisma.service';
import { UtilityService } from '@/utility/utility.service';

// File-scope mock transaction client (reassigned per test in beforeEach)
let mockTransactionClient: {
  $executeRaw: jest.Mock;
  show: { createMany: jest.Mock; findMany: jest.Mock; update: jest.Mock };
  showCreator: { findMany: jest.Mock; create: jest.Mock; update: jest.Mock; updateMany: jest.Mock };
  showPlatform: { findMany: jest.Mock; create: jest.Mock; update: jest.Mock; updateMany: jest.Mock };
  taskTarget: { findFirst: jest.Mock; findMany: jest.Mock; updateMany: jest.Mock };
  task: { updateMany: jest.Mock };
  schedule: { update: jest.Mock };
  client: { findMany: jest.Mock };
  studio: { findMany: jest.Mock };
  studioRoom: { findMany: jest.Mock };
  showType: { findMany: jest.Mock };
  showStatus: { findMany: jest.Mock; upsert: jest.Mock };
  showStandard: { findMany: jest.Mock };
  creator: { findMany: jest.Mock };
  platform: { findMany: jest.Mock };
};

// File-scope mock PrismaService used by ClsPluginTransactional (closes over mockTransactionClient)
const mockPrismaForCls = {
  $transaction: jest.fn(async (callback: any, _options?: any) => {
    return await callback(mockTransactionClient);
  }),
};

// @Module-decorated class so ClsPluginTransactional.imports can resolve PrismaService via useExisting
@Module({
  providers: [{ provide: PrismaService, useValue: mockPrismaForCls }],
  exports: [PrismaService],
})
class MockPrismaModule {}

describe('publishingService', () => {
  let service: PublishingService;
  let scheduleService: jest.Mocked<ScheduleService>;
  let scheduleSnapshotService: jest.Mocked<ScheduleSnapshotService>;
  let showService: jest.Mocked<ShowService>;
  let showCreatorService: jest.Mocked<ShowCreatorService>;
  let showPlatformService: jest.Mocked<ShowPlatformService>;
  let validationService: jest.Mocked<ValidationService>;
  let getScheduleByIdMock: jest.Mock;
  let validateScheduleMock: jest.Mock;
  let createScheduleSnapshotMock: jest.Mock;
  let generateShowUidMock: jest.Mock;
  let generateShowCreatorUidMock: jest.Mock;
  let generateShowPlatformUidMock: jest.Mock;
  // mockTransactionClient is declared at file scope (above) — reassigned per test in beforeEach

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
        externalId: 'show_temp_1',
        name: 'Test Show 1',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T12:00:00Z',
        clientId: 'client_test123',
        studioRoomId: 'room_test123',
        showTypeId: 'sht_test123',
        showStatusId: 'shst_test123',
        showStandardId: 'shsd_test123',
        creators: [
          {
            creatorId: 'creator_test123',
            note: 'Creator Note 1',
          },
        ],
        platforms: [
          {
            platformId: 'platform_test123',
            liveStreamLink: 'https://example.com/stream1',
            platformShowId: 'platform_show_1',
          },
        ],
        metadata: { custom: 'data1' },
      },
      {
        tempId: 'temp_2',
        externalId: 'show_temp_2',
        name: 'Test Show 2',
        startTime: '2024-01-02T10:00:00Z',
        endTime: '2024-01-02T12:00:00Z',
        clientId: 'client_test123',
        studioRoomId: 'room_test123',
        showTypeId: 'sht_test123',
        showStatusId: 'shst_test123',
        showStandardId: 'shsd_test123',
        creators: [],
        platforms: [],
      },
    ],
  };

  const mockSchedule: Schedule & {
    client: { uid: string; name: string } | null;
    studio: { uid: string; name: string } | null;
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
    studioId: null,
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
    studio: null,
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
    version: 1,
    publishedByUser: {
      uid: 'user_test123',
      name: 'Test User',
      email: 'test@example.com',
    },
  };

  beforeEach(async () => {
    mockTransactionClient = {
      $executeRaw: jest.fn(),
      show: {
        createMany: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      showCreator: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      showPlatform: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      taskTarget: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
      task: {
        updateMany: jest.fn(),
      },
      schedule: {
        update: jest.fn(),
      },
      client: {
        findMany: jest.fn(),
      },
      studio: {
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
        upsert: jest.fn(),
      },
      showStandard: {
        findMany: jest.fn(),
      },
      creator: {
        findMany: jest.fn(),
      },
      platform: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ClsModule.forRoot({
          global: true,
          middleware: { mount: false },
          plugins: [
            new ClsPluginTransactional({
              imports: [MockPrismaModule],
              adapter: new TransactionalAdapterPrisma({
                prismaInjectionToken: PrismaService,
              }),
            }),
          ],
        }),
      ],
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
          provide: ShowCreatorService,
          useValue: {
            generateShowCreatorUid: jest.fn(),
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
          provide: UtilityService,
          useValue: {
            generateBrandedId: jest.fn().mockReturnValue('shst_generated'),
          },
        },
      ],
    }).compile();

    service = module.get<PublishingService>(PublishingService);
    scheduleService = module.get(ScheduleService);
    scheduleSnapshotService = module.get(ScheduleSnapshotService);
    showService = module.get(ShowService);
    showCreatorService = module.get(ShowCreatorService);
    showPlatformService = module.get(ShowPlatformService);
    validationService = module.get(ValidationService);

    // Store mock functions to avoid unbound-method issues
    getScheduleByIdMock = scheduleService.getScheduleById as jest.Mock;
    validateScheduleMock = validationService.validateSchedule as jest.Mock;
    createScheduleSnapshotMock = scheduleSnapshotService.createScheduleSnapshot as jest.Mock;
    generateShowUidMock = showService.generateShowUid as jest.Mock;
    generateShowCreatorUidMock = showCreatorService.generateShowCreatorUid as jest.Mock;
    generateShowPlatformUidMock = showPlatformService.generateShowPlatformUid as jest.Mock;
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

      mockTransactionClient.show.createMany.mockResolvedValue({ count: 2 });
      mockTransactionClient.show.findMany
        .mockResolvedValueOnce([]) // existing shows
        .mockResolvedValueOnce([ // created shows lookup
          { id: BigInt(1), clientId: BigInt(1), externalId: 'show_temp_1' },
          { id: BigInt(2), clientId: BigInt(1), externalId: 'show_temp_2' },
        ]);
      mockTransactionClient.showCreator.findMany.mockResolvedValue([]);
      mockTransactionClient.showPlatform.findMany.mockResolvedValue([]);
      mockTransactionClient.taskTarget.findFirst.mockResolvedValue(null);
      mockTransactionClient.taskTarget.findMany.mockResolvedValue([]);
      mockTransactionClient.taskTarget.updateMany.mockResolvedValue({ count: 0 });
      mockTransactionClient.task.updateMany.mockResolvedValue({ count: 0 });
      mockTransactionClient.show.update.mockResolvedValue({});
      mockTransactionClient.showCreator.create.mockResolvedValue({});
      mockTransactionClient.showCreator.update.mockResolvedValue({});
      mockTransactionClient.showCreator.updateMany.mockResolvedValue({ count: 0 });
      mockTransactionClient.showPlatform.create.mockResolvedValue({});
      mockTransactionClient.showPlatform.update.mockResolvedValue({});
      mockTransactionClient.showPlatform.updateMany.mockResolvedValue({ count: 0 });

      mockTransactionClient.schedule.update.mockResolvedValue(
        mockPublishedSchedule,
      );

      // Setup UID lookup maps
      mockTransactionClient.client.findMany.mockResolvedValue([
        { id: BigInt(1), uid: 'client_test123' },
      ]);
      mockTransactionClient.studio.findMany.mockResolvedValue([]);
      mockTransactionClient.studioRoom.findMany.mockResolvedValue([
        { id: BigInt(1), uid: 'room_test123' },
      ]);
      mockTransactionClient.showType.findMany.mockResolvedValue([
        { id: BigInt(1), uid: 'sht_test123' },
      ]);
      mockTransactionClient.showStatus.findMany.mockResolvedValue([
        { id: BigInt(1), uid: 'shst_test123' },
      ]);
      mockTransactionClient.showStatus.upsert.mockImplementation(
        async ({ where }: { where: { systemKey: string } }) => ({
          id: where.systemKey === 'CANCELLED'
            ? BigInt(9001)
            : BigInt(9002),
          systemKey: where.systemKey,
        }),
      );
      mockTransactionClient.showStandard.findMany.mockResolvedValue([
        { id: BigInt(1), uid: 'shsd_test123' },
      ]);
      mockTransactionClient.creator.findMany.mockResolvedValue([
        { id: BigInt(1), uid: 'creator_test123' },
      ]);
      mockTransactionClient.platform.findMany.mockResolvedValue([
        { id: BigInt(1), uid: 'platform_test123' },
      ]);

      // Generate different UIDs for each show
      generateShowUidMock
        .mockReturnValueOnce('show_test123')
        .mockReturnValueOnce('show_test456');
      generateShowCreatorUidMock.mockReturnValue('showmc_test123');
      generateShowPlatformUidMock.mockReturnValue('showplatform_test123');
    });

    it('should successfully publish a schedule', async () => {
      const result = await service.publish(scheduleUid, version, userId);

      expect(getScheduleByIdMock).toHaveBeenCalledWith(scheduleUid, {
        client: true,
        studio: true,
        createdByUser: true,
      });
      expect(validateScheduleMock).toHaveBeenCalledWith({
        id: mockSchedule.id,
        uid: mockSchedule.uid,
        startDate: mockSchedule.startDate,
        endDate: mockSchedule.endDate,
        planDocument: expect.objectContaining({
          metadata: expect.any(Object),
          shows: expect.arrayContaining([
            expect.objectContaining({
              externalId: 'show_temp_1',
              creators: expect.any(Array),
            }),
            expect.objectContaining({
              externalId: 'show_temp_2',
              creators: expect.any(Array),
            }),
          ]),
        }),
        clientId: mockSchedule.clientId,
      });

      expect(createScheduleSnapshotMock).not.toHaveBeenCalled();
      expect(result.schedule.status).toBe('published');
      expect(result.publishSummary.shows_created).toBe(2);
      expect(result.publishSummary.shows_cancelled).toBe(0);
    });

    it('should keep identity and not mark removals when payload matches existing scope', async () => {
      mockTransactionClient.show.findMany
        .mockReset()
        .mockResolvedValueOnce([]) // existing shows
        .mockResolvedValueOnce([
          { id: BigInt(1), clientId: BigInt(1), externalId: 'show_temp_1' },
          { id: BigInt(2), clientId: BigInt(1), externalId: 'show_temp_2' },
        ]);

      const result = await service.publish(scheduleUid, version, userId);

      expect(mockTransactionClient.show.createMany).toHaveBeenCalledTimes(1);
      expect(result.publishSummary.shows_cancelled).toBe(0);
      expect(result.publishSummary.shows_created).toBe(2);
    });

    it('should create shows with MCs and Platforms', async () => {
      await service.publish(scheduleUid, version, userId);

      // Verify bulk show creation was called
      expect(mockTransactionClient.show.createMany).toHaveBeenCalledTimes(1);
      expect(mockTransactionClient.show.findMany).toHaveBeenCalledTimes(2);

      // Verify ShowCreator creation was called
      expect(mockTransactionClient.showCreator.create).toHaveBeenCalledTimes(1);
      const showMCCall = mockTransactionClient.showCreator.create.mock
        .calls[0] as unknown as [
        { data: { creatorId: bigint; note: string } },
      ];
      expect(showMCCall[0].data.creatorId).toBe(BigInt(1));
      expect(showMCCall[0].data.note).toBe('Creator Note 1');

      // Verify ShowPlatform creation was called
      expect(
        mockTransactionClient.showPlatform.create,
      ).toHaveBeenCalledTimes(1);
      const showPlatformCall = mockTransactionClient.showPlatform.create
        .mock
        .calls[0] as unknown as [
        {
          data: { platformId: bigint; liveStreamLink: string };
        },
      ];
      expect(showPlatformCall[0].data.platformId).toBe(BigInt(1));
      expect(showPlatformCall[0].data.liveStreamLink).toBe(
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

        },
        include: {
          client: true,
          studio: true,
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
    });

    it('should throw ConflictException on version mismatch', async () => {
      await expect(service.publish(scheduleUid, 2, userId)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.publish(scheduleUid, 2, userId)).rejects.toThrow(
        'Version mismatch. Expected 2, but schedule is at version 1',
      );

      expect(validateScheduleMock).not.toHaveBeenCalled();
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
      expect(mockTransactionClient.creator.findMany).toHaveBeenCalledWith({
        where: {
          uid: { in: ['creator_test123'] },
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
              creators: [],
              platforms: [],
            },
          ],
        },
      };
      getScheduleByIdMock.mockResolvedValue(scheduleWithoutRelations);
      mockTransactionClient.show.findMany
        .mockReset()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { id: BigInt(1), clientId: BigInt(1), externalId: 'show_temp_1' },
        ]);

      await service.publish(scheduleUid, version, userId);

      // Verify ShowCreator and ShowPlatform create are not called when empty
      expect(mockTransactionClient.showCreator.create).not.toHaveBeenCalled();
      expect(
        mockTransactionClient.showPlatform.create,
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
              creators: [
                { creatorId: 'creator_test123', note: 'Creator 1' },
                { creatorId: 'creator_test456', note: 'Creator 2' },
              ],
              platforms: [
                {
                  platformId: 'platform_test123',
                  liveStreamLink: 'https://example.com/stream1',
                  platformShowId: 'platform_show_1',
                },
                {
                  platformId: 'platform_test456',
                  liveStreamLink: 'https://example.com/stream2',
                  platformShowId: 'platform_show_2',
                },
              ],
            },
          ],
        },
      };
      getScheduleByIdMock.mockResolvedValue(scheduleWithMultipleRelations);

      mockTransactionClient.creator.findMany.mockResolvedValue([
        { id: BigInt(1), uid: 'creator_test123' },
        { id: BigInt(2), uid: 'creator_test456' },
      ]);
      mockTransactionClient.platform.findMany.mockResolvedValue([
        { id: BigInt(1), uid: 'platform_test123' },
        { id: BigInt(2), uid: 'platform_test456' },
      ]);
      mockTransactionClient.show.findMany
        .mockReset()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { id: BigInt(1), clientId: BigInt(1), externalId: 'show_temp_1' },
        ]);

      await service.publish(scheduleUid, version, userId);

      // Verify ShowCreator creation with 2 items
      expect(mockTransactionClient.showCreator.create).toHaveBeenCalledTimes(2);

      // Verify ShowPlatform creation with 2 items
      expect(
        mockTransactionClient.showPlatform.create,
      ).toHaveBeenCalledTimes(2);
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

      expect(createScheduleSnapshotMock).not.toHaveBeenCalled();
      expect(mockTransactionClient.show.createMany).toHaveBeenCalled();
      expect(mockTransactionClient.show.findMany).toHaveBeenCalled();
      expect(mockTransactionClient.showCreator.create).toHaveBeenCalled();
      expect(mockTransactionClient.showPlatform.create).toHaveBeenCalled();
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

      expect(mockTransactionClient.show.createMany).not.toHaveBeenCalled();
      expect(mockTransactionClient.showCreator.create).not.toHaveBeenCalled();
      expect(
        mockTransactionClient.showPlatform.create,
      ).not.toHaveBeenCalled();
      expect(result.publishSummary.shows_created).toBe(0);
      expect(result.publishSummary.shows_cancelled).toBe(0);
    });

    it('should reject malformed plan payload before publish', async () => {
      const scheduleWithMissingUids = {
        ...mockSchedule,
        planDocument: {
          ...mockPlanDocument,
          shows: [
            {
              ...mockPlanDocument.shows[0],
              creators: [{ creatorId: undefined }, { creatorId: 'creator_test123' }] as any,
              studioRoomId: undefined,
            },
          ],
        },
      };

      getScheduleByIdMock.mockResolvedValue(scheduleWithMissingUids);

      await expect(
        service.publish(scheduleUid, version, userId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.publish(scheduleUid, version, userId),
      ).rejects.toThrow('Invalid plan document structure');
      expect(validateScheduleMock).not.toHaveBeenCalled();
    });
  });
});
