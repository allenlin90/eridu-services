import { BadRequestException, ConflictException, Module } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import type { Schedule } from '@prisma/client';
import { ClsModule } from 'nestjs-cls';

import type { PlanDocument } from './schemas/schedule-planning.schema';
import { PublishingService } from './publishing.service';
import type { ScheduleWithRelations } from './publishing.types';
import { PublishingRelationSyncService } from './publishing-relation-sync.service';
import { ValidationService } from './validation.service';

import { AuditService } from '@/models/audit/audit.service';
import { ScheduleService } from '@/models/schedule/schedule.service';
import { ScheduleConflictService } from '@/models/schedule-conflict/schedule-conflict.service';
import { ScheduleSnapshotService } from '@/models/schedule-snapshot/schedule-snapshot.service';
import { ShowService } from '@/models/show/show.service';
import { ShowCreatorService } from '@/models/show-creator/show-creator.service';
import { ShowPlatformService } from '@/models/show-platform/show-platform.service';
import { TaskService } from '@/models/task/task.service';
import { TaskTargetService } from '@/models/task-target/task-target.service';
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
  let taskService: jest.Mocked<TaskService>;
  let auditService: jest.Mocked<AuditService>;
  let scheduleConflictService: jest.Mocked<ScheduleConflictService>;
  let taskTargetService: jest.Mocked<TaskTargetService>;
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
        PublishingRelationSyncService,
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
        {
          provide: TaskService,
          useValue: {
            reconcileTaskDueDates: jest.fn().mockResolvedValue(0),
          },
        },
        {
          provide: AuditService,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: ScheduleConflictService,
          useValue: {
            reconcileShowConflict: jest.fn().mockResolvedValue({ recorded: false }),
          },
        },
        {
          provide: TaskTargetService,
          useValue: {
            countActiveByShowId: jest.fn().mockResolvedValue(0),
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
    taskService = module.get(TaskService);
    auditService = module.get(AuditService);
    scheduleConflictService = module.get(ScheduleConflictService);
    taskTargetService = module.get(TaskTargetService);

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
    jest.useFakeTimers().setSystemTime(new Date('2023-12-31T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
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
        .mockResolvedValueOnce([]) // current schedule shows
        .mockResolvedValueOnce([]) // matching shows by external identity
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
        .mockResolvedValueOnce([]) // current schedule shows
        .mockResolvedValueOnce([]) // matching shows by external identity
        .mockResolvedValueOnce([
          { id: BigInt(1), clientId: BigInt(1), externalId: 'show_temp_1' },
          { id: BigInt(2), clientId: BigInt(1), externalId: 'show_temp_2' },
        ]);

      const result = await service.publish(scheduleUid, version, userId);

      expect(mockTransactionClient.show.createMany).toHaveBeenCalledTimes(1);
      expect(result.publishSummary.shows_cancelled).toBe(0);
      expect(result.publishSummary.shows_created).toBe(2);
    });

    it('should restore and adopt a matching deleted show instead of creating a duplicate', async () => {
      const deletedExistingShow = {
        id: BigInt(77),
        uid: 'show_deleted',
        externalId: 'show_temp_1',
        clientId: BigInt(1),
        scheduleId: null,
        studioId: null,
        studioRoomId: BigInt(1),
        showTypeId: BigInt(1),
        showStatusId: BigInt(1),
        showStandardId: BigInt(1),
        name: 'Old Name',
        startTime: new Date('2024-01-01T08:00:00Z'),
        endTime: new Date('2024-01-01T09:00:00Z'),
        metadata: { stale: true },
        deletedAt: new Date('2024-01-01T07:00:00Z'),
        actualStartTime: null,
        actualEndTime: null,
        showStatus: {
          systemKey: null,
        },
      };

      const singleShowSchedule = {
        ...mockSchedule,
        planDocument: {
          ...mockPlanDocument,
          shows: [mockPlanDocument.shows[0]!],
        },
      };

      getScheduleByIdMock.mockResolvedValue(singleShowSchedule);
      mockTransactionClient.show.findMany
        .mockReset()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([deletedExistingShow]);
      mockTransactionClient.show.update.mockResolvedValue({});

      const result = await service.publish(scheduleUid, version, userId);

      expect(mockTransactionClient.show.createMany).not.toHaveBeenCalled();
      expect(mockTransactionClient.show.update).toHaveBeenCalledWith({
        where: { id: BigInt(77) },
        data: expect.objectContaining({
          scheduleId: BigInt(1),
          deletedAt: null,
          name: 'Test Show 1',
        }),
      });
      expect(result.publishSummary.shows_restored).toBe(1);
      expect(result.publishSummary.shows_created).toBe(0);
    });

    it('should match by external_id only and not fall back to show name', async () => {
      const sameNameDifferentExternalId = {
        id: BigInt(77),
        uid: 'show_existing',
        externalId: 'different_external_id',
        clientId: BigInt(1),
        scheduleId: mockSchedule.id,
        studioId: null,
        studioRoomId: BigInt(1),
        showTypeId: BigInt(1),
        showStatusId: BigInt(1),
        showStandardId: BigInt(1),
        name: 'Test Show 1',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T12:00:00Z'),
        metadata: {},
        deletedAt: null,
        actualStartTime: null,
        actualEndTime: null,
        showStatus: {
          systemKey: null,
        },
      };

      const singleShowSchedule = {
        ...mockSchedule,
        planDocument: {
          ...mockPlanDocument,
          shows: [mockPlanDocument.shows[0]!],
        },
      };

      getScheduleByIdMock.mockResolvedValue(singleShowSchedule);
      mockTransactionClient.show.findMany
        .mockReset()
        .mockResolvedValueOnce([sameNameDifferentExternalId])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { id: BigInt(1), clientId: BigInt(1), externalId: 'show_temp_1' },
        ]);

      const result = await service.publish(scheduleUid, version, userId);

      expect(mockTransactionClient.show.createMany).toHaveBeenCalledTimes(1);
      expect(mockTransactionClient.show.update).toHaveBeenCalledWith({
        where: { id: BigInt(77) },
        data: {
          showStatusId: BigInt(9001),
        },
      });
      expect(result.publishSummary.shows_created).toBe(1);
      expect(result.publishSummary.shows_cancelled).toBe(1);
    });

    it('updates payload rows before the publish date when no actuals are recorded, and relation sync runs (date alone no longer preserves)', async () => {
      jest.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
      const pastExistingShow = {
        id: BigInt(88),
        uid: 'show_past',
        externalId: 'show_temp_1',
        clientId: BigInt(1),
        scheduleId: mockSchedule.id,
        studioId: null,
        studioRoomId: BigInt(1),
        showTypeId: BigInt(1),
        showStatusId: BigInt(1),
        showStandardId: BigInt(1),
        name: 'Old Past Show',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T12:00:00Z'),
        metadata: {},
        deletedAt: null,
        actualStartTime: null,
        actualEndTime: null,
        showStatus: {
          systemKey: null,
        },
      };
      const singleShowSchedule = {
        ...mockSchedule,
        planDocument: {
          ...mockPlanDocument,
          shows: [mockPlanDocument.shows[0]!],
        },
      };

      getScheduleByIdMock.mockResolvedValue(singleShowSchedule);
      mockTransactionClient.show.findMany
        .mockReset()
        .mockResolvedValueOnce([pastExistingShow])
        .mockResolvedValueOnce([pastExistingShow]);

      const result = await service.publish(scheduleUid, version, userId);

      expect(mockTransactionClient.show.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: BigInt(88) },
        data: expect.objectContaining({ name: 'Test Show 1' }),
      }));
      expect(mockTransactionClient.showCreator.findMany).toHaveBeenCalled();
      expect(mockTransactionClient.showPlatform.findMany).toHaveBeenCalled();
      expect(result.publishSummary.shows_preserved).toBe(0);
      expect(result.publishSummary.shows_updated).toBe(1);
    });

    it('should skip (not preserve) a brand-new payload row with a past start time and never existed before', async () => {
      jest.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
      const singleShowSchedule = {
        ...mockSchedule,
        planDocument: {
          ...mockPlanDocument,
          shows: [mockPlanDocument.shows[0]!],
        },
      };

      getScheduleByIdMock.mockResolvedValue(singleShowSchedule);
      mockTransactionClient.show.findMany
        .mockReset()
        .mockResolvedValueOnce([]) // current schedule shows
        .mockResolvedValueOnce([]); // matching shows by external identity

      const result = await service.publish(scheduleUid, version, userId);

      expect(mockTransactionClient.show.createMany).not.toHaveBeenCalled();
      expect(result.publishSummary.shows_created).toBe(0);
      expect(result.publishSummary.shows_preserved).toBe(0);
      expect(result.publishSummary.shows_skipped).toBe(1);
    });

    it('updates overnight shows before the operational-day cutoff on publish day when no actuals are recorded, without a publish impact (not confirmed-future)', async () => {
      jest.setSystemTime(new Date('2024-01-02T05:00:00.000Z')); // 12:00 Asia/Bangkok
      const overnightExistingShow = {
        id: BigInt(89),
        uid: 'show_overnight',
        externalId: 'show_overnight',
        clientId: BigInt(1),
        scheduleId: mockSchedule.id,
        studioId: null,
        studioRoomId: BigInt(1),
        showTypeId: BigInt(1),
        showStatusId: BigInt(1),
        showStandardId: BigInt(1),
        name: 'Old Overnight Show',
        startTime: new Date('2024-01-01T22:00:00Z'), // 05:00 Asia/Bangkok on Jan 2
        endTime: new Date('2024-01-02T00:00:00Z'),
        metadata: {},
        deletedAt: null,
        actualStartTime: null,
        actualEndTime: null,
        showStatus: {
          systemKey: 'CONFIRMED',
        },
      };
      const overnightSchedule = {
        ...mockSchedule,
        planDocument: {
          ...mockPlanDocument,
          shows: [{
            ...mockPlanDocument.shows[0]!,
            externalId: 'show_overnight',
            name: 'Updated Overnight Show',
            startTime: '2024-01-01T22:00:00Z',
            endTime: '2024-01-02T00:00:00Z',
          }],
        },
      };

      getScheduleByIdMock.mockResolvedValue(overnightSchedule);
      mockTransactionClient.show.findMany
        .mockReset()
        .mockResolvedValueOnce([overnightExistingShow])
        .mockResolvedValueOnce([overnightExistingShow]);

      const result = await service.publish(scheduleUid, version, userId);

      expect(mockTransactionClient.show.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: BigInt(89) },
        data: expect.objectContaining({ name: 'Updated Overnight Show' }),
      }));
      expect(auditService.create).not.toHaveBeenCalled();
      expect(result.publishSummary.shows_preserved).toBe(0);
      expect(result.publishSummary.shows_updated).toBe(1);
      expect(result.publishSummary.publish_impacts_recorded).toBe(0);
    });

    it('applies a field diff on a past DRAFT show with no recorded actuals (bug-fix regression)', async () => {
      jest.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
      const pastShowNoActuals = {
        id: BigInt(110),
        uid: 'show_past_no_actuals',
        externalId: 'show_temp_1',
        clientId: BigInt(1),
        scheduleId: mockSchedule.id,
        studioId: null,
        studioRoomId: BigInt(1),
        showTypeId: BigInt(1),
        showStatusId: BigInt(1),
        showStandardId: BigInt(1),
        name: 'Old Name',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T12:00:00Z'),
        metadata: {},
        deletedAt: null,
        actualStartTime: null,
        actualEndTime: null,
        showStatus: { systemKey: 'DRAFT' },
      };
      const singleShowSchedule = {
        ...mockSchedule,
        planDocument: { ...mockPlanDocument, shows: [mockPlanDocument.shows[0]!] },
      };

      getScheduleByIdMock.mockResolvedValue(singleShowSchedule);
      mockTransactionClient.show.findMany
        .mockReset()
        .mockResolvedValueOnce([pastShowNoActuals])
        .mockResolvedValueOnce([pastShowNoActuals]);

      const result = await service.publish(scheduleUid, version, userId);

      expect(mockTransactionClient.show.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: BigInt(110) },
        data: expect.objectContaining({ name: 'Test Show 1' }),
      }));
      expect(result.publishSummary.shows_updated).toBe(1);
      expect(result.publishSummary.shows_preserved).toBe(0);
    });

    it('holds back a field diff on a past DRAFT show with recorded actuals instead of writing it', async () => {
      jest.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
      const pastShowWithActuals = {
        id: BigInt(111),
        uid: 'show_past_with_actuals',
        externalId: 'show_temp_1',
        clientId: BigInt(1),
        scheduleId: mockSchedule.id,
        studioId: null,
        studioRoomId: BigInt(1),
        showTypeId: BigInt(1),
        showStatusId: BigInt(1),
        showStandardId: BigInt(1),
        name: 'Old Name',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T12:00:00Z'),
        metadata: {},
        deletedAt: null,
        actualStartTime: new Date('2024-01-01T10:05:00Z'),
        actualEndTime: new Date('2024-01-01T12:00:00Z'),
        showStatus: { systemKey: 'DRAFT' },
      };
      const singleShowSchedule = {
        ...mockSchedule,
        planDocument: { ...mockPlanDocument, shows: [mockPlanDocument.shows[0]!] },
      };

      getScheduleByIdMock.mockResolvedValue(singleShowSchedule);
      mockTransactionClient.show.findMany
        .mockReset()
        .mockResolvedValueOnce([pastShowWithActuals])
        .mockResolvedValueOnce([pastShowWithActuals]);

      await service.publish(scheduleUid, version, userId);

      expect(mockTransactionClient.show.update).not.toHaveBeenCalledWith(expect.objectContaining({
        where: { id: BigInt(111) },
      }));
      expect(scheduleConflictService.reconcileShowConflict).toHaveBeenCalledWith(expect.objectContaining({
        showId: BigInt(111),
        conflictType: 'update_held_back',
        heldBack: expect.objectContaining({
          showFields: expect.objectContaining({ changedFields: expect.arrayContaining(['name']) }),
        }),
      }));
      // Relation sync must still run for a held-back show — incomingByShowId.set() runs
      // before the actuals gate, so per-row relation gating (Task 4) still sees this show.
      expect(mockTransactionClient.showCreator.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { showId: { in: [BigInt(111)] } },
      }));
      expect(mockTransactionClient.showPlatform.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { showId: { in: [BigInt(111)] } },
      }));
    });

    it('should update a future confirmed show and write a publish impact audit', async () => {
      const confirmedShow = {
        id: BigInt(99),
        uid: 'show_confirmed',
        externalId: 'show_temp_1',
        clientId: BigInt(1),
        scheduleId: mockSchedule.id,
        studioId: null,
        studioRoomId: BigInt(1),
        showTypeId: BigInt(1),
        showStatusId: BigInt(1),
        showStandardId: BigInt(1),
        name: 'Old Confirmed Show',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T12:00:00Z'),
        metadata: {},
        deletedAt: null,
        actualStartTime: null,
        actualEndTime: null,
        showStatus: {
          systemKey: 'CONFIRMED',
        },
      };
      const singleShowSchedule = {
        ...mockSchedule,
        planDocument: {
          ...mockPlanDocument,
          shows: [mockPlanDocument.shows[0]!],
        },
      };

      getScheduleByIdMock.mockResolvedValue(singleShowSchedule);
      mockTransactionClient.show.findMany
        .mockReset()
        .mockResolvedValueOnce([confirmedShow])
        .mockResolvedValueOnce([confirmedShow]);

      const result = await service.publish(scheduleUid, version, userId);

      expect(mockTransactionClient.show.update).toHaveBeenCalledWith({
        where: { id: BigInt(99) },
        data: expect.objectContaining({
          name: 'Test Show 1',
        }),
      });
      expect(auditService.create).toHaveBeenCalledWith(expect.objectContaining({
        action: 'UPDATE',
        actorId: userId,
        metadata: expect.objectContaining({
          event: 'schedule_publish_impact',
          schedule_uid: mockSchedule.uid,
          external_id: 'show_temp_1',
          impact_kind: 'confirmed_future_updated',
          changed_fields: expect.arrayContaining(['name']),
        }),
        targets: [{ targetType: 'SHOW', targetId: BigInt(99) }],
      }));
      expect(result.publishSummary.confirmed_shows_updated).toBe(1);
      expect(result.publishSummary.publish_impacts_recorded).toBe(1);
    });

    it('should move a missing future confirmed show to pending resolution and write an impact audit', async () => {
      const confirmedShow = {
        id: BigInt(101),
        uid: 'show_confirmed_missing',
        externalId: 'show_missing',
        clientId: BigInt(1),
        scheduleId: mockSchedule.id,
        studioId: null,
        studioRoomId: BigInt(1),
        showTypeId: BigInt(1),
        showStatusId: BigInt(1),
        showStandardId: BigInt(1),
        name: 'Missing Confirmed Show',
        startTime: new Date('2024-01-03T10:00:00Z'),
        endTime: new Date('2024-01-03T12:00:00Z'),
        metadata: {},
        deletedAt: null,
        showStatus: {
          systemKey: 'CONFIRMED',
        },
      };

      getScheduleByIdMock.mockResolvedValue({
        ...mockSchedule,
        planDocument: {
          ...mockPlanDocument,
          shows: [],
        },
      });
      mockTransactionClient.show.findMany
        .mockReset()
        .mockResolvedValueOnce([confirmedShow]);

      const result = await service.publish(scheduleUid, version, userId);

      expect(mockTransactionClient.taskTarget.findFirst).not.toHaveBeenCalled();
      expect(mockTransactionClient.show.update).toHaveBeenCalledWith({
        where: { id: BigInt(101) },
        data: {
          showStatusId: BigInt(9002),
        },
      });
      expect(auditService.create).toHaveBeenCalledWith(expect.objectContaining({
        metadata: expect.objectContaining({
          impact_kind: 'confirmed_future_pending_resolution',
          changed_fields: ['show_status_id'],
        }),
        targets: [{ targetType: 'SHOW', targetId: BigInt(101) }],
      }));
      expect(result.publishSummary.shows_pending_resolution).toBe(1);
      expect(result.publishSummary.confirmed_shows_pending_resolution).toBe(1);
      expect(result.publishSummary.publish_impacts_recorded).toBe(1);
    });

    it('should preserve live shows that are missing from the payload', async () => {
      const liveShow = {
        id: BigInt(102),
        uid: 'show_live_missing',
        externalId: 'show_live_missing',
        clientId: BigInt(1),
        scheduleId: mockSchedule.id,
        studioId: null,
        studioRoomId: BigInt(1),
        showTypeId: BigInt(1),
        showStatusId: BigInt(1),
        showStandardId: BigInt(1),
        name: 'Live Show',
        startTime: new Date('2024-01-03T10:00:00Z'),
        endTime: new Date('2024-01-03T12:00:00Z'),
        metadata: {},
        deletedAt: null,
        showStatus: {
          systemKey: 'LIVE',
        },
      };

      getScheduleByIdMock.mockResolvedValue({
        ...mockSchedule,
        planDocument: {
          ...mockPlanDocument,
          shows: [],
        },
      });
      mockTransactionClient.show.findMany
        .mockReset()
        .mockResolvedValueOnce([liveShow]);

      const result = await service.publish(scheduleUid, version, userId);

      expect(mockTransactionClient.show.update).not.toHaveBeenCalledWith(expect.objectContaining({
        where: { id: BigInt(102) },
      }));
      expect(result.publishSummary.shows_preserved).toBe(1);
      expect(result.publishSummary.shows_cancelled).toBe(0);
      expect(result.publishSummary.shows_pending_resolution).toBe(0);
    });

    it('should reject adopting a deleted show from a different studio', async () => {
      const deletedOtherStudioShow = {
        id: BigInt(77),
        uid: 'show_deleted_other_studio',
        externalId: 'show_temp_1',
        clientId: BigInt(1),
        scheduleId: null,
        studioId: BigInt(2),
        studioRoomId: BigInt(1),
        showTypeId: BigInt(1),
        showStatusId: BigInt(1),
        showStandardId: BigInt(1),
        name: 'Old Name',
        startTime: new Date('2024-01-01T08:00:00Z'),
        endTime: new Date('2024-01-01T09:00:00Z'),
        metadata: { stale: true },
        deletedAt: new Date('2024-01-01T07:00:00Z'),
        showStatus: {
          systemKey: null,
        },
      };

      const studioScopedSchedule = {
        ...mockSchedule,
        studioId: BigInt(1),
        planDocument: {
          ...mockPlanDocument,
          shows: [mockPlanDocument.shows[0]!],
        },
      };

      getScheduleByIdMock.mockResolvedValue(studioScopedSchedule);
      mockTransactionClient.show.findMany
        .mockReset()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([deletedOtherStudioShow]);

      await expect(service.publish(scheduleUid, version, userId)).rejects.toThrow(
        ConflictException,
      );
      expect(mockTransactionClient.show.createMany).not.toHaveBeenCalled();
      expect(mockTransactionClient.show.update).not.toHaveBeenCalled();
    });

    it('should resume soft-deleted tasks before reconciling due dates for a cancelled show that is republished with a new time', async () => {
      const cancelledShow = {
        id: BigInt(77),
        uid: 'show_cancelled',
        externalId: 'show_temp_1',
        clientId: BigInt(1),
        scheduleId: null,
        studioId: null,
        studioRoomId: BigInt(1),
        showTypeId: BigInt(1),
        showStatusId: BigInt(9001),
        showStandardId: BigInt(1),
        name: 'Test Show 1',
        startTime: new Date('2024-01-01T08:00:00Z'),
        endTime: new Date('2024-01-01T09:00:00Z'),
        metadata: {},
        deletedAt: null,
        actualStartTime: null,
        actualEndTime: null,
        showStatus: {
          systemKey: 'CANCELLED',
        },
      };

      const singleShowSchedule = {
        ...mockSchedule,
        planDocument: {
          ...mockPlanDocument,
          shows: [mockPlanDocument.shows[0]!],
        },
      };

      getScheduleByIdMock.mockResolvedValue(singleShowSchedule);
      mockTransactionClient.show.findMany
        .mockReset()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([cancelledShow]);
      mockTransactionClient.taskTarget.findMany.mockResolvedValue([
        { taskId: BigInt(500) },
      ]);

      const callOrder: string[] = [];
      mockTransactionClient.taskTarget.updateMany.mockImplementation(async () => {
        callOrder.push('resume');
        return { count: 1 };
      });
      (taskService.reconcileTaskDueDates as jest.Mock).mockImplementation(async () => {
        callOrder.push('reconcile');
        return 0;
      });

      await service.publish(scheduleUid, version, userId);

      expect(callOrder).toEqual(['resume', 'reconcile']);
      expect(taskService.reconcileTaskDueDates).toHaveBeenCalledWith(
        BigInt(77),
        { startTime: cancelledShow.startTime, endTime: cancelledShow.endTime },
        { startTime: new Date('2024-01-01T10:00:00Z'), endTime: new Date('2024-01-01T12:00:00Z') },
      );
    });

    it('should restore a show with CANCELLED_PENDING_RESOLUTION status when it is republished', async () => {
      const pendingResolutionShow = {
        id: BigInt(78),
        uid: 'show_pending_res',
        externalId: 'show_temp_1',
        clientId: BigInt(1),
        scheduleId: null,
        studioId: null,
        studioRoomId: BigInt(1),
        showTypeId: BigInt(1),
        showStatusId: BigInt(9002),
        showStandardId: BigInt(1),
        name: 'Test Show 1',
        startTime: new Date('2024-01-01T08:00:00Z'),
        endTime: new Date('2024-01-01T09:00:00Z'),
        metadata: {},
        deletedAt: null,
        actualStartTime: null,
        actualEndTime: null,
        showStatus: {
          systemKey: 'CANCELLED_PENDING_RESOLUTION',
        },
      };

      const singleShowSchedule = {
        ...mockSchedule,
        planDocument: {
          ...mockPlanDocument,
          shows: [mockPlanDocument.shows[0]!],
        },
      };

      getScheduleByIdMock.mockResolvedValue(singleShowSchedule);
      mockTransactionClient.show.findMany
        .mockReset()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([pendingResolutionShow]);
      mockTransactionClient.taskTarget.findMany.mockResolvedValue([
        { taskId: BigInt(501) },
      ]);
      mockTransactionClient.show.update.mockResolvedValue({});

      const result = await service.publish(scheduleUid, version, userId);

      expect(mockTransactionClient.show.update).toHaveBeenCalledWith({
        where: { id: BigInt(78) },
        data: expect.objectContaining({
          scheduleId: BigInt(1),
          showStatusId: BigInt(1), // restored to statusIds.shst_test123 from incoming payload
        }),
      });
      expect(result.publishSummary.shows_restored).toBe(1);
      expect(result.publishSummary.shows_preserved).toBe(0);
    });

    it('should create shows with MCs and Platforms', async () => {
      await service.publish(scheduleUid, version, userId);

      // Verify bulk show creation was called
      expect(mockTransactionClient.show.createMany).toHaveBeenCalledTimes(1);
      expect(mockTransactionClient.show.findMany).toHaveBeenCalledTimes(3);

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
          version: { increment: 1 },
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
      mockTransactionClient.show.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
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

    it('auto-resolves a stale conflict via the terminal-status finalize pass for a matched LIVE show', async () => {
      jest.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
      const liveMatchedShow = {
        id: BigInt(112),
        uid: 'show_live_matched',
        externalId: 'show_temp_1',
        clientId: BigInt(1),
        scheduleId: mockSchedule.id,
        studioId: null,
        studioRoomId: BigInt(1),
        showTypeId: BigInt(1),
        showStatusId: BigInt(1),
        showStandardId: BigInt(1),
        name: 'Old Name',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T12:00:00Z'),
        metadata: {},
        deletedAt: null,
        actualStartTime: new Date('2024-01-01T10:05:00Z'),
        actualEndTime: new Date('2024-01-01T12:00:00Z'),
        showStatus: {
          systemKey: 'LIVE',
        },
      };
      const singleShowSchedule = {
        ...mockSchedule,
        planDocument: { ...mockPlanDocument, shows: [mockPlanDocument.shows[0]!] },
      };

      getScheduleByIdMock.mockResolvedValue(singleShowSchedule);
      mockTransactionClient.show.findMany
        .mockReset()
        .mockResolvedValueOnce([liveMatchedShow])
        .mockResolvedValueOnce([liveMatchedShow]);

      const result = await service.publish(scheduleUid, version, userId);

      expect(result.publishSummary.shows_preserved).toBe(1);
      expect(mockTransactionClient.show.update).not.toHaveBeenCalledWith(expect.objectContaining({
        where: { id: BigInt(112) },
      }));
      expect(scheduleConflictService.reconcileShowConflict).toHaveBeenCalledWith(expect.objectContaining({
        showId: BigInt(112),
        conflictType: 'update_held_back',
        heldBack: null,
      }));
    });

    it('holds back a creator removal when the row has no actuals but the parent Show does', async () => {
      jest.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
      const showWithActuals = {
        id: BigInt(112),
        uid: 'show_past_relation',
        externalId: 'show_temp_2',
        clientId: BigInt(1),
        scheduleId: mockSchedule.id,
        studioId: null,
        studioRoomId: BigInt(1),
        showTypeId: BigInt(1),
        showStatusId: BigInt(1),
        showStandardId: BigInt(1),
        name: 'Test Show 2',
        startTime: new Date('2024-01-02T10:00:00Z'),
        endTime: new Date('2024-01-02T12:00:00Z'),
        metadata: {},
        deletedAt: null,
        actualStartTime: new Date('2024-01-02T10:05:00Z'),
        actualEndTime: new Date('2024-01-02T12:00:00Z'),
        showStatus: { systemKey: 'DRAFT' },
      };
      const singleShowSchedule = {
        ...mockSchedule,
        planDocument: { ...mockPlanDocument, shows: [mockPlanDocument.shows[1]!] },
      };

      getScheduleByIdMock.mockResolvedValue(singleShowSchedule);
      mockTransactionClient.show.findMany
        .mockReset()
        .mockResolvedValueOnce([showWithActuals])
        .mockResolvedValueOnce([showWithActuals]);
      mockTransactionClient.showCreator.findMany.mockReset().mockResolvedValueOnce([
        { id: BigInt(200), showId: BigInt(112), creatorId: BigInt(1), note: 'Backup host', metadata: {}, deletedAt: null, actualStartTime: null, actualEndTime: null },
      ]);

      await service.publish(scheduleUid, version, userId);

      expect(mockTransactionClient.showCreator.updateMany).not.toHaveBeenCalled();
      expect(scheduleConflictService.reconcileShowConflict).toHaveBeenCalledWith(expect.objectContaining({
        showId: BigInt(112),
        conflictType: 'update_held_back',
        heldBack: expect.objectContaining({
          showCreators: expect.arrayContaining([
            expect.objectContaining({ action: 'remove' }),
          ]),
        }),
      }));
    });

    it('holds back only the creator with its own recorded actuals, while a sibling creator with no actuals still syncs, on a show with no actuals of its own', async () => {
      jest.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
      const showWithoutActuals = {
        id: BigInt(115),
        uid: 'show_no_actuals',
        externalId: 'show_temp_2',
        clientId: BigInt(1),
        scheduleId: mockSchedule.id,
        studioId: null,
        studioRoomId: BigInt(1),
        showTypeId: BigInt(1),
        showStatusId: BigInt(1),
        showStandardId: BigInt(1),
        name: 'Test Show 2',
        startTime: new Date('2024-01-02T10:00:00Z'),
        endTime: new Date('2024-01-02T12:00:00Z'),
        metadata: {},
        deletedAt: null,
        actualStartTime: null,
        actualEndTime: null,
        showStatus: { systemKey: 'DRAFT' },
      };
      const singleShowSchedule = {
        ...mockSchedule,
        planDocument: {
          ...mockPlanDocument,
          shows: [
            {
              ...mockPlanDocument.shows[1]!,
              creators: [
                { creatorId: 'creator_test123', note: 'New Note A' },
                { creatorId: 'creator_test456', note: 'New Note B' },
              ],
            },
          ],
        },
      };

      getScheduleByIdMock.mockResolvedValue(singleShowSchedule);
      mockTransactionClient.show.findMany
        .mockReset()
        .mockResolvedValueOnce([showWithoutActuals])
        .mockResolvedValueOnce([showWithoutActuals]);
      mockTransactionClient.showCreator.findMany.mockReset().mockResolvedValueOnce([
        { id: BigInt(200), showId: BigInt(115), creatorId: BigInt(1), note: 'Old Note A', metadata: {}, deletedAt: null, actualStartTime: new Date('2024-01-02T10:05:00Z'), actualEndTime: new Date('2024-01-02T12:00:00Z') },
        { id: BigInt(201), showId: BigInt(115), creatorId: BigInt(2), note: 'Old Note B', metadata: {}, deletedAt: null, actualStartTime: null, actualEndTime: null },
      ]);
      mockTransactionClient.creator.findMany.mockResolvedValue([
        { id: BigInt(1), uid: 'creator_test123' },
        { id: BigInt(2), uid: 'creator_test456' },
      ]);

      await service.publish(scheduleUid, version, userId);

      // The sibling creator with no actuals of its own syncs normally, even though
      // the parent Show also has no actuals populated.
      expect(mockTransactionClient.showCreator.update).toHaveBeenCalledWith({
        where: { id: BigInt(201) },
        data: { note: 'New Note B' },
      });
      // The creator with its own recorded actuals is held back, gated purely on its
      // own row-level actuals (not a show-level fallback, since the show has none).
      expect(mockTransactionClient.showCreator.update).not.toHaveBeenCalledWith(expect.objectContaining({
        where: { id: BigInt(200) },
      }));
      expect(scheduleConflictService.reconcileShowConflict).toHaveBeenCalledWith(expect.objectContaining({
        showId: BigInt(115),
        conflictType: 'update_held_back',
        heldBack: expect.objectContaining({
          showCreators: [
            expect.objectContaining({
              creatorUid: 'creator_test123',
              action: 'update',
              oldNote: 'Old Note A',
              newNote: 'New Note A',
            }),
          ],
          showPlatforms: [],
        }),
      }));
    });

    it('does not treat a show with only COMPLETED/CLOSED tasks as having active work on removal', async () => {
      const removedDraftShow = {
        id: BigInt(113),
        uid: 'show_removed_draft',
        externalId: 'show_missing_draft',
        clientId: BigInt(1),
        scheduleId: mockSchedule.id,
        studioId: null,
        studioRoomId: BigInt(1),
        showTypeId: BigInt(1),
        showStatusId: BigInt(1),
        showStandardId: BigInt(1),
        name: 'Removed Draft Show',
        startTime: new Date('2024-06-01T10:00:00Z'),
        endTime: new Date('2024-06-01T12:00:00Z'),
        metadata: {},
        deletedAt: null,
        actualStartTime: null,
        actualEndTime: null,
        showStatus: { systemKey: 'DRAFT' },
      };

      getScheduleByIdMock.mockResolvedValue({
        ...mockSchedule,
        planDocument: { ...mockPlanDocument, shows: [] },
      });
      mockTransactionClient.show.findMany
        .mockReset()
        .mockResolvedValueOnce([removedDraftShow]);
      taskTargetService.countActiveByShowId.mockResolvedValueOnce(0);

      const result = await service.publish(scheduleUid, version, userId);

      expect(taskTargetService.countActiveByShowId).toHaveBeenCalledWith(BigInt(113));
      expect(mockTransactionClient.show.update).toHaveBeenCalledWith({
        where: { id: BigInt(113) },
        data: { showStatusId: BigInt(9001) },
      });
      expect(result.publishSummary.shows_cancelled).toBe(1);
      expect(result.publishSummary.shows_pending_resolution).toBe(0);
    });

    it('holds back a past DRAFT show removal instead of cancelling it when actuals are recorded', async () => {
      const removedShowWithActuals = {
        id: BigInt(114),
        uid: 'show_removed_with_actuals',
        externalId: 'show_missing_with_actuals',
        clientId: BigInt(1),
        scheduleId: mockSchedule.id,
        studioId: null,
        studioRoomId: BigInt(1),
        showTypeId: BigInt(1),
        showStatusId: BigInt(1),
        showStandardId: BigInt(1),
        name: 'Removed Show With Actuals',
        startTime: new Date('2023-12-01T10:00:00Z'),
        endTime: new Date('2023-12-01T12:00:00Z'),
        metadata: {},
        deletedAt: null,
        actualStartTime: new Date('2023-12-01T10:05:00Z'),
        actualEndTime: new Date('2023-12-01T12:00:00Z'),
        showStatus: { systemKey: 'DRAFT' },
      };

      getScheduleByIdMock.mockResolvedValue({
        ...mockSchedule,
        planDocument: { ...mockPlanDocument, shows: [] },
      });
      mockTransactionClient.show.findMany
        .mockReset()
        .mockResolvedValueOnce([removedShowWithActuals]);

      const result = await service.publish(scheduleUid, version, userId);

      // Cancellation is held back — not applied.
      expect(mockTransactionClient.show.update).not.toHaveBeenCalled();
      expect(scheduleConflictService.reconcileShowConflict).toHaveBeenCalledWith(expect.objectContaining({
        showId: BigInt(114),
        conflictType: 'removal_held_back',
        heldBack: expect.objectContaining({
          showFields: null,
          showCreators: [],
          showPlatforms: [],
          proposedStatusTransition: { from: 'DRAFT', to: 'CANCELLED' },
        }),
      }));
      expect(result.publishSummary.shows_cancelled).toBe(0);
      expect(result.publishSummary.shows_pending_resolution).toBe(0);
    });
  });
});
