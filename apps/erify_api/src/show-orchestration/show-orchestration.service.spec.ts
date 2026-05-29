/* eslint-disable */
import { BadRequestException, Module } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Prisma, Show } from '@prisma/client';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ClsModule } from 'nestjs-cls';

import { STUDIO_CREATOR_ROSTER_ERROR } from '@eridu/api-types/studio-creators';

import { CreatorRepository } from '@/models/creator/creator.repository';
import { PlatformRepository } from '@/models/platform/platform.repository';
import { ShowRepository } from '@/models/show/show.repository';
import { ShowService } from '@/models/show/show.service';
import { CompensationLineItemService } from '@/models/compensation-line-item/compensation-line-item.service';
import { ShowCreatorRepository } from '@/models/show-creator/show-creator.repository';
import { ShowCreatorService } from '@/models/show-creator/show-creator.service';
import { ShowPlatformRepository } from '@/models/show-platform/show-platform.repository';
import { ShowPlatformService } from '@/models/show-platform/show-platform.service';
import { StudioCreatorRepository } from '@/models/studio-creator/studio-creator.repository';
import { TaskService } from '@/models/task/task.service';
import { TaskTargetService } from '@/models/task-target/task-target.service';
import { HttpError } from '@/lib/errors/http-error.util';
import { StudioService } from '@/models/studio/studio.service';
import { AuditService } from '@/models/audit/audit.service';
import { UserService } from '@/models/user/user.service';
import { PrismaService } from '@/prisma/prisma.service';
import type {
  CreateShowWithAssignmentsDto,
  UpdateShowWithAssignmentsDto,
} from '@/show-orchestration/schemas/show-orchestration.schema';
import { showWithAssignmentsInclude } from '@/show-orchestration/schemas/show-orchestration.schema';
import { ShowOrchestrationService } from '@/show-orchestration/show-orchestration.service';
import { createMockUniqueConstraintError } from '@/testing/prisma-error.helper';

// Mock PrismaService module for ClsPluginTransactional (must be exported from a @Module to satisfy useExisting)
const mockPrismaForCls = {
  $transaction: jest.fn(async (callback: any) => await callback({})),
};

@Module({
  providers: [{ provide: PrismaService, useValue: mockPrismaForCls }],
  exports: [PrismaService],
})
class MockPrismaModule {}

describe('showOrchestrationService', () => {
  let service: ShowOrchestrationService;
  let showService: jest.Mocked<ShowService>;
  let compensationLineItemService: jest.Mocked<CompensationLineItemService>;
  let showCreatorService: jest.Mocked<ShowCreatorService>;
  let showPlatformService: jest.Mocked<ShowPlatformService>;
  let showRepository: jest.Mocked<ShowRepository>;
  let showCreatorRepository: jest.Mocked<ShowCreatorRepository>;
  let creatorRepository: jest.Mocked<CreatorRepository>;
  let showPlatformRepository: jest.Mocked<ShowPlatformRepository>;
  let platformRepository: jest.Mocked<PlatformRepository>;
  let studioCreatorRepository: jest.Mocked<StudioCreatorRepository>;
  let taskService: jest.Mocked<TaskService>;
  let taskTargetService: jest.Mocked<TaskTargetService>;
  let studioService: jest.Mocked<StudioService>;
  let auditService: jest.Mocked<AuditService>;
  let userService: jest.Mocked<UserService>;

  const mockShow: Show = {
    id: BigInt(1),
    uid: 'show_test123',
    externalId: null,
    clientId: BigInt(1),
    studioId: null,
    studioRoomId: BigInt(1),
    showTypeId: BigInt(1),
    showStatusId: BigInt(1),
    showStandardId: BigInt(1),
    scheduleId: null,
    name: 'Test Show',
    startTime: new Date('2024-01-01T10:00:00Z'),
    endTime: new Date('2024-01-01T12:00:00Z'),
    actualStartTime: null,
    actualEndTime: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
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
        ShowOrchestrationService,
        {
          provide: ShowService,
          useValue: {
            createShowFromDto: jest.fn(),
            createShow: jest.fn(),
            getShowById: jest.fn(),
            getActiveShows: jest.fn(),
            countShows: jest.fn(),
            getPaginatedShows: jest.fn(),
            updateShowFromDto: jest.fn(),
            deleteShow: jest.fn(),
            generateShowUid: jest.fn(),
            buildUpdatePayload: jest.fn(),
            ensureValidActualTimeRange: jest.fn(),
            getShowsForReview: jest.fn(),
          },
        },
        {
          provide: CompensationLineItemService,
          useValue: {
            createStudioLineItem: jest.fn(),
            listStudioLineItems: jest.fn(),
            sumActiveAmountsByShowCreatorUids: jest.fn(),
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
          provide: ShowRepository,
          useValue: {
            update: jest.fn(),
            findByUid: jest.fn(),
            softDelete: jest.fn(),
          },
        },
        {
          provide: ShowCreatorRepository,
          useValue: {
            findMany: jest.fn(),
            findCompensationReviewRows: jest.fn(),
            createAssignment: jest.fn(),
            restoreAndUpdateAssignment: jest.fn(),
            softDelete: jest.fn(),
            softDeleteAllByShowId: jest.fn(),
            softDeleteByCreatorIds: jest.fn(),
          },
        },
        {
          provide: CreatorRepository,
          useValue: {
            findByUids: jest.fn(),
          },
        },
        {
          provide: ShowPlatformRepository,
          useValue: {
            findMany: jest.fn(),
            createAssignment: jest.fn(),
            restoreAndUpdateAssignment: jest.fn(),
            softDelete: jest.fn(),
            softDeleteAllByShowId: jest.fn(),
            softDeleteByPlatformIds: jest.fn(),
          },
        },
        {
          provide: PlatformRepository,
          useValue: {
            findByUids: jest.fn(),
          },
        },
        {
          provide: StudioCreatorRepository,
          useValue: {
            findByStudioUidAndCreatorUid: jest.fn(),
            findByStudioUidAndCreatorUids: jest.fn(),
          },
        },
        {
          provide: TaskService,
          useValue: {
            hardDeleteByIds: jest.fn(),
          },
        },
        {
          provide: TaskTargetService,
          useValue: {
            findByShowId: jest.fn(),
            findAllByShowId: jest.fn(),
            findByTaskIds: jest.fn(),
            hardDeleteByShowId: jest.fn(),
          },
        },
        {
          provide: StudioService,
          useValue: {
            getStudioById: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            create: jest.fn(),
            findSignOff: jest.fn(),
            lockSignOffRange: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: {
            getUserByExtId: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ShowOrchestrationService>(ShowOrchestrationService);
    showService = module.get<ShowService>(ShowService) as jest.Mocked<ShowService>;
    compensationLineItemService = module.get<CompensationLineItemService>(CompensationLineItemService) as jest.Mocked<CompensationLineItemService>;
    showCreatorService = module.get<ShowCreatorService>(ShowCreatorService) as jest.Mocked<ShowCreatorService>;
    showPlatformService = module.get<ShowPlatformService>(ShowPlatformService) as jest.Mocked<ShowPlatformService>;
    showRepository = module.get<ShowRepository>(ShowRepository) as jest.Mocked<ShowRepository>;
    showCreatorRepository = module.get<ShowCreatorRepository>(ShowCreatorRepository) as jest.Mocked<ShowCreatorRepository>;
    creatorRepository = module.get<CreatorRepository>(CreatorRepository) as jest.Mocked<CreatorRepository>;
    showPlatformRepository = module.get<ShowPlatformRepository>(ShowPlatformRepository) as jest.Mocked<ShowPlatformRepository>;
    platformRepository = module.get<PlatformRepository>(PlatformRepository) as jest.Mocked<PlatformRepository>;
    studioCreatorRepository = module.get<StudioCreatorRepository>(StudioCreatorRepository) as jest.Mocked<StudioCreatorRepository>;
    taskService = module.get<TaskService>(TaskService) as jest.Mocked<TaskService>;
    taskTargetService = module.get<TaskTargetService>(TaskTargetService) as jest.Mocked<TaskTargetService>;
    studioService = module.get<StudioService>(StudioService) as jest.Mocked<StudioService>;
    auditService = module.get<AuditService>(AuditService) as jest.Mocked<AuditService>;
    userService = module.get<UserService>(UserService) as jest.Mocked<UserService>;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createShowWithAssignments', () => {
    it('should create a simple show without assignments', async () => {
      const dto: CreateShowWithAssignmentsDto = {
        clientId: 'client_test123',
        studioId: undefined,
        studioRoomId: 'room_test123',
        showTypeId: 'sht_test123',
        showStatusId: 'shst_test123',
        showStandardId: 'shsd_test123',
        name: 'Test Show',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T12:00:00Z'),
        actualStartTime: null,
        actualEndTime: null,
        metadata: {},
        creators: undefined,
        platforms: undefined,
      };

      showService.generateShowUid.mockReturnValue('show_test123');
      showService.createShow.mockResolvedValue(mockShow);

      const result = await service.createShowWithAssignments(dto);

      expect(showService.generateShowUid).toHaveBeenCalled();
      expect(showService.createShow).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'show_test123',
          name: 'Test Show',
          startTime: dto.startTime,
          endTime: dto.endTime,
          metadata: dto.metadata,
          client: { connect: { uid: dto.clientId } },
          studioRoom: { connect: { uid: dto.studioRoomId } },
          showType: { connect: { uid: dto.showTypeId } },
          showStatus: { connect: { uid: dto.showStatusId } },
          showStandard: { connect: { uid: dto.showStandardId } },
        }),
        expect.any(Object),
      );
      expect(result).toEqual(mockShow);
    });
  });

  describe('getShowsWithRelations', () => {
    it('should retrieve shows with all relations', async () => {
      const params = {
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' as const },
      };

      const mockShows: Show[] = [mockShow];
      showService.getActiveShows.mockResolvedValue(mockShows);

      const result = await service.getShowsWithRelations(params);

      expect(showService.getActiveShows).toHaveBeenCalledWith({
        ...params,
        include: showWithAssignmentsInclude,
      });
      expect(result).toEqual(mockShows);
    });
  });

  describe('updateShowWithAssignments', () => {
    it('should update a show without assignments', async () => {
      const uid = 'show_test123';
      const dto: UpdateShowWithAssignmentsDto = {
        name: 'Updated Show Name',
        showCreators: undefined,
        showPlatforms: undefined,
      } as UpdateShowWithAssignmentsDto;

      const updatePayload = { name: 'Updated Show Name' };
      showService.getShowById.mockResolvedValue(mockShow);
      showService.buildUpdatePayload.mockReturnValue(updatePayload);
      showRepository.update.mockResolvedValue(mockShow);
      showRepository.findByUid.mockResolvedValue(mockShow);

      const result = await service.updateShowWithAssignments(uid, dto, 'actor_123');

      expect(showService.getShowById).toHaveBeenCalledWith(uid);
      expect(showRepository.update).toHaveBeenCalledWith(
        { uid },
        updatePayload,
      );
      // Sync methods NOT called since showCreators/showPlatforms are undefined
      expect(creatorRepository.findByUids).not.toHaveBeenCalled();
      expect(platformRepository.findByUids).not.toHaveBeenCalled();
      expect(showRepository.findByUid).toHaveBeenCalledWith(
        uid,
        expect.any(Object),
      );
      expect(result).toEqual(mockShow);
    });

    it('should update a show with Creator and platform assignments', async () => {
      const uid = 'show_test123';
      const dto: UpdateShowWithAssignmentsDto = {
        name: 'Updated Show Name',
        showCreators: [
          {
            creatorId: 'creator_test123',
            note: 'Updated note',
            agreedRate: '120.00',
            compensationType: 'FIXED',
            commissionRate: '5.00',
            metadata: {},
          },
        ],
        showPlatforms: [
          {
            platformId: 'plt_test123',
            liveStreamLink: 'https://example.com/updated-stream',
            platformShowId: 'platform_show_updated',
            viewerCount: 200,
            metadata: {},
          },
        ],
      } as UpdateShowWithAssignmentsDto;

      const mockMc = { id: BigInt(1), uid: 'creator_test123', deletedAt: null };
      const mockPlatform = { id: BigInt(1), uid: 'plt_test123', deletedAt: null };
      const updatePayload = { name: 'Updated Show Name' };

      showService.getShowById.mockResolvedValue(mockShow);
      showService.buildUpdatePayload.mockReturnValue(updatePayload);
      showRepository.update.mockResolvedValue(mockShow);
      showRepository.findByUid.mockResolvedValue(mockShow);
      creatorRepository.findByUids.mockResolvedValue([mockMc] as any);
      showCreatorRepository.findMany.mockResolvedValue([]);
      showCreatorRepository.createAssignment.mockResolvedValue({} as any);
      showCreatorService.generateShowCreatorUid.mockReturnValue('show_mc_new');
      platformRepository.findByUids.mockResolvedValue([mockPlatform] as any);
      showPlatformRepository.findMany.mockResolvedValue([]);
      showPlatformRepository.createAssignment.mockResolvedValue({} as any);
      showPlatformService.generateShowPlatformUid.mockReturnValue('show_plt_new');

      const result = await service.updateShowWithAssignments(uid, dto, 'actor_123');

      expect(showService.getShowById).toHaveBeenCalledWith(uid);
      expect(showRepository.update).toHaveBeenCalledWith(
        { uid },
        updatePayload,
      );
      expect(creatorRepository.findByUids).toHaveBeenCalledWith(['creator_test123']);
      expect(showCreatorRepository.createAssignment).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'show_mc_new',
          showId: mockShow.id,
          creatorId: BigInt(1),
          note: 'Updated note',
          agreedRate: '120.00',
          compensationType: 'FIXED',
          commissionRate: '5.00',
          metadata: expect.objectContaining({
            flags: { agreement_snapshot_missing: false },
          }),
        }),
      );
      expect(platformRepository.findByUids).toHaveBeenCalledWith(['plt_test123']);
      expect(showPlatformRepository.createAssignment).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'show_plt_new',
          showId: mockShow.id,
          platformId: BigInt(1),
        }),
      );
      expect(result).toEqual(mockShow);
    });

    it('should throw BadRequestException when endTime is before or equal to startTime', async () => {
      const uid = 'show_test123';
      const dto: UpdateShowWithAssignmentsDto = {
        startTime: new Date('2024-01-01T12:00:00Z'),
        endTime: new Date('2024-01-01T10:00:00Z'),
        showCreators: undefined,
        showPlatforms: undefined,
      } as UpdateShowWithAssignmentsDto;

      showService.getShowById.mockResolvedValue(mockShow);
      showService.buildUpdatePayload.mockImplementation(() => {
        throw new BadRequestException('End time must be after start time');
      });

      await expect(service.updateShowWithAssignments(uid, dto, 'actor_123')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.updateShowWithAssignments(uid, dto, 'actor_123')).rejects.toThrow(
        'End time must be after start time',
      );
    });

    it('should validate actuals against the existing show on update', async () => {
      const uid = 'show_test123';
      const dto = {
        actualEndTime: new Date('2024-01-01T09:00:00Z'),
      } as UpdateShowWithAssignmentsDto;

      showService.getShowById.mockResolvedValue({
        ...mockShow,
        actualStartTime: new Date('2024-01-01T10:00:00Z'),
        actualEndTime: null,
      });
      showService.ensureValidActualTimeRange.mockImplementation(() => {
        throw new BadRequestException('Actual end time must be after actual start time');
      });

      await expect(
        service.updateShowWithAssignments(uid, dto, 'actor_123'),
      ).rejects.toThrow('Actual end time must be after actual start time');

      expect(showService.ensureValidActualTimeRange).toHaveBeenCalledWith(
        new Date('2024-01-01T10:00:00Z'),
        null,
        { actualStartTime: undefined, actualEndTime: dto.actualEndTime },
      );
    });
  });

  describe('deleteShow', () => {
    it('should soft-delete show and purge dependent task state', async () => {
      const uid = 'show_test123';
      showService.getShowById.mockResolvedValue(mockShow);
      taskTargetService.findAllByShowId.mockResolvedValue([
        { taskId: BigInt(10) },
        { taskId: BigInt(10) },
        { taskId: BigInt(11) },
      ] as any);
      taskTargetService.findByTaskIds.mockResolvedValue([] as any);
      taskTargetService.hardDeleteByShowId.mockResolvedValue({ count: 3 } as any);
      taskService.hardDeleteByIds.mockResolvedValue({ count: 2 } as any);
      showRepository.softDelete.mockResolvedValue(mockShow);
      showCreatorRepository.softDeleteAllByShowId.mockResolvedValue(undefined as any);
      showPlatformRepository.softDeleteAllByShowId.mockResolvedValue(undefined as any);

      await service.deleteShow(uid);

      expect(showService.getShowById).toHaveBeenCalledWith(uid);
      expect(taskTargetService.findAllByShowId).toHaveBeenCalledWith(mockShow.id);
      expect(taskTargetService.hardDeleteByShowId).toHaveBeenCalledWith(mockShow.id);
      expect(taskTargetService.findByTaskIds).toHaveBeenCalledWith([BigInt(10), BigInt(11)]);
      expect(taskService.hardDeleteByIds).toHaveBeenCalledWith([BigInt(10), BigInt(11)]);
      expect(showCreatorRepository.softDeleteAllByShowId).toHaveBeenCalledWith(mockShow.id);
      expect(showPlatformRepository.softDeleteAllByShowId).toHaveBeenCalledWith(mockShow.id);
      expect(showRepository.softDelete).toHaveBeenCalledWith({ uid });
    });

    it('should include soft-deleted task targets when collecting taskIds to purge', async () => {
      const uid = 'show_test123';
      showService.getShowById.mockResolvedValue(mockShow);
      // Mix of active and soft-deleted targets referencing distinct tasks
      taskTargetService.findAllByShowId.mockResolvedValue([
        { taskId: BigInt(10), deletedAt: null },
        { taskId: BigInt(11), deletedAt: new Date('2026-03-01') },
      ] as any);
      taskTargetService.findByTaskIds.mockResolvedValue([] as any);
      taskTargetService.hardDeleteByShowId.mockResolvedValue({ count: 2 } as any);
      taskService.hardDeleteByIds.mockResolvedValue({ count: 2 } as any);
      showRepository.softDelete.mockResolvedValue(mockShow);
      showCreatorRepository.softDeleteAllByShowId.mockResolvedValue(undefined as any);
      showPlatformRepository.softDeleteAllByShowId.mockResolvedValue(undefined as any);

      await service.deleteShow(uid);

      // Both taskIds must be included — soft-deleted target's task must not be orphaned
      expect(taskService.hardDeleteByIds).toHaveBeenCalledWith([BigInt(10), BigInt(11)]);
    });

    it('should preserve tasks that still have active targets on other shows', async () => {
      const uid = 'show_test123';
      showService.getShowById.mockResolvedValue(mockShow);
      taskTargetService.findAllByShowId.mockResolvedValue([
        { taskId: BigInt(10), deletedAt: null },
        { taskId: BigInt(11), deletedAt: null },
      ] as any);
      taskTargetService.findByTaskIds.mockResolvedValue([
        { taskId: BigInt(11), deletedAt: null },
      ] as any);
      taskTargetService.hardDeleteByShowId.mockResolvedValue({ count: 2 } as any);
      taskService.hardDeleteByIds.mockResolvedValue({ count: 1 } as any);
      showRepository.softDelete.mockResolvedValue(mockShow);
      showCreatorRepository.softDeleteAllByShowId.mockResolvedValue(undefined as any);
      showPlatformRepository.softDeleteAllByShowId.mockResolvedValue(undefined as any);

      await service.deleteShow(uid);

      expect(taskTargetService.findByTaskIds).toHaveBeenCalledWith([BigInt(10), BigInt(11)]);
      expect(taskService.hardDeleteByIds).toHaveBeenCalledWith([BigInt(10)]);
    });
  });

  describe('removePlatformsFromShow', () => {
    it('should remove platforms from show', async () => {
      const uid = 'show_test123';
      const platformIds = ['plt_1', 'plt_2'];
      const mockPlt1 = { id: BigInt(1), uid: 'plt_1' };
      const mockPlt2 = { id: BigInt(2), uid: 'plt_2' };

      showService.getShowById.mockResolvedValue(mockShow);
      platformRepository.findByUids.mockResolvedValue([mockPlt1, mockPlt2] as any);
      showPlatformRepository.softDeleteByPlatformIds.mockResolvedValue(undefined as any);

      await service.removePlatformsFromShow(uid, platformIds);

      expect(platformRepository.findByUids).toHaveBeenCalledWith(platformIds);
      expect(showPlatformRepository.softDeleteByPlatformIds).toHaveBeenCalledWith(
        mockShow.id,
        [BigInt(1), BigInt(2)],
      );
    });
  });

  describe('removeCreatorsFromShow', () => {
    it('should remove creators from show', async () => {
      const uid = 'show_test123';
      const creatorIds = ['creator_1', 'creator_2'];
      const mockCreator1 = { id: BigInt(1), uid: 'creator_1' };
      const mockCreator2 = { id: BigInt(2), uid: 'creator_2' };

      showService.getShowById.mockResolvedValue(mockShow);
      creatorRepository.findByUids.mockResolvedValue([mockCreator1, mockCreator2] as any);
      showCreatorRepository.softDeleteByCreatorIds.mockResolvedValue(undefined as any);

      await service.removeCreatorsFromShow(uid, creatorIds);

      expect(showService.getShowById).toHaveBeenCalledWith(uid);
      expect(creatorRepository.findByUids).toHaveBeenCalledWith(creatorIds);
      expect(showCreatorRepository.softDeleteByCreatorIds).toHaveBeenCalledWith(
        mockShow.id,
        [BigInt(1), BigInt(2)],
      );
    });
  });

  describe('bulkAssignCreatorsToShow', () => {
    it('should create, restore, skip, and report failures', async () => {
      const uid = 'show_test123';
      const creators = [
        {
          creatorId: 'creator_new',
          note: 'New creator',
          agreedRate: '120.00',
          compensationType: 'FIXED',
          commissionRate: '5.00',
          metadata: { source: 'bulk' },
        },
        {
          creatorId: 'creator_active',
          note: null,
          metadata: {},
        },
        {
          creatorId: 'creator_deleted',
          note: 'Restore creator',
          compensationType: 'COMMISSION',
          commissionRate: '10.00',
          metadata: { source: 'restore' },
        },
        {
          creatorId: 'creator_missing',
          note: null,
          metadata: {},
        },
        {
          creatorId: 'creator_new',
          note: 'duplicate',
          metadata: {},
        },
      ];

      showService.getShowById.mockResolvedValue(mockShow);
      creatorRepository.findByUids.mockResolvedValue([
        { id: BigInt(1), uid: 'creator_new' },
        { id: BigInt(2), uid: 'creator_active' },
        { id: BigInt(3), uid: 'creator_deleted' },
      ] as any);
      studioCreatorRepository.findByStudioUidAndCreatorUids.mockResolvedValue([
        {
          creator: {
            uid: 'creator_new',
            name: 'New Creator',
            aliasName: 'New Creator',
          },
          isActive: true,
        },
        {
          creator: {
            uid: 'creator_active',
            name: 'Active Creator',
            aliasName: 'Active Creator',
          },
          isActive: true,
        },
        {
          creator: {
            uid: 'creator_deleted',
            name: 'Deleted Creator',
            aliasName: 'Deleted Creator',
          },
          isActive: true,
        },
      ] as any);
      showCreatorRepository.findMany.mockResolvedValue([
        { id: BigInt(22), showId: mockShow.id, creatorId: BigInt(2), deletedAt: null, metadata: {} },
        { id: BigInt(33), showId: mockShow.id, creatorId: BigInt(3), deletedAt: new Date(), metadata: {} },
      ] as any);
      showCreatorService.generateShowCreatorUid.mockReturnValue('show_mc_new_bulk');
      showCreatorRepository.createAssignment.mockResolvedValue({} as any);
      showCreatorRepository.restoreAndUpdateAssignment.mockResolvedValue({} as any);

      const result = await service.bulkAssignCreatorsToShow('std_test123', uid, creators as any, 'actor_123');

      expect(showCreatorRepository.createAssignment).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'show_mc_new_bulk',
          showId: mockShow.id,
          creatorId: BigInt(1),
          note: 'New creator',
          agreedRate: '120.00',
          compensationType: 'FIXED',
          commissionRate: '5.00',
          metadata: expect.objectContaining({
            source: 'bulk',
            flags: { agreement_snapshot_missing: false },
          }),
        }),
      );
      expect(showCreatorRepository.restoreAndUpdateAssignment).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          note: 'Restore creator',
          agreedRate: null,
          compensationType: 'COMMISSION',
          commissionRate: '10.00',
          metadata: expect.objectContaining({ source: 'restore' }),
        }),
      );
      expect(result).toEqual({
        assigned: 2,
        skipped: 1,
        failed: [
          { creatorId: 'creator_missing', reason: 'Creator not found' },
          { creatorId: 'creator_new', reason: 'Duplicate creator_id in request' },
        ],
      });
    });

    it('should return zero summary for empty payload', async () => {
      const uid = 'show_test123';
      showService.getShowById.mockResolvedValue(mockShow);

      const result = await service.bulkAssignCreatorsToShow('std_test123', uid, [], 'actor_123');
      expect(result).toEqual({ assigned: 0, skipped: 0, failed: [] });
      expect(creatorRepository.findByUids).not.toHaveBeenCalled();
      expect(showCreatorRepository.createAssignment).not.toHaveBeenCalled();
    });

    it('should resolve new assignment snapshots from roster defaults', async () => {
      const uid = 'show_test123';
      showService.getShowById.mockResolvedValue(mockShow);
      creatorRepository.findByUids.mockResolvedValue([
        { id: BigInt(1), uid: 'creator_new' },
      ] as any);
      studioCreatorRepository.findByStudioUidAndCreatorUids.mockResolvedValue([
        {
          creator: { uid: 'creator_new', name: 'New Creator', aliasName: 'New' },
          isActive: true,
          defaultRate: { toString: () => '500.00' },
          defaultRateType: 'FIXED',
          defaultCommissionRate: null,
        },
      ] as any);
      showCreatorRepository.findMany.mockResolvedValue([]);
      showCreatorService.generateShowCreatorUid.mockReturnValue('show_mc_new_bulk');
      showCreatorRepository.createAssignment.mockResolvedValue({} as any);

      await service.bulkAssignCreatorsToShow('std_test123', uid, [
        { creatorId: 'creator_new', note: null, metadata: {} },
      ] as any, 'actor_123');

      expect(showCreatorRepository.createAssignment).toHaveBeenCalledWith(
        expect.objectContaining({
          agreedRate: '500.00',
          compensationType: 'FIXED',
          commissionRate: null,
          metadata: expect.objectContaining({
            flags: { agreement_snapshot_missing: false },
          }),
        }),
      );
    });

    it('should mark new assignment metadata unresolved when roster defaults are incomplete', async () => {
      const uid = 'show_test123';
      showService.getShowById.mockResolvedValue(mockShow);
      creatorRepository.findByUids.mockResolvedValue([
        { id: BigInt(1), uid: 'creator_new' },
      ] as any);
      studioCreatorRepository.findByStudioUidAndCreatorUids.mockResolvedValue([
        {
          creator: { uid: 'creator_new', name: 'New Creator', aliasName: 'New' },
          isActive: true,
          defaultRate: null,
          defaultRateType: null,
          defaultCommissionRate: null,
        },
      ] as any);
      showCreatorRepository.findMany.mockResolvedValue([]);
      showCreatorService.generateShowCreatorUid.mockReturnValue('show_mc_new_bulk');
      showCreatorRepository.createAssignment.mockResolvedValue({} as any);

      await service.bulkAssignCreatorsToShow('std_test123', uid, [
        { creatorId: 'creator_new', note: null, metadata: {} },
      ] as any, 'actor_123');

      expect(showCreatorRepository.createAssignment).toHaveBeenCalledWith(
        expect.objectContaining({
          agreedRate: null,
          compensationType: null,
          commissionRate: null,
          metadata: expect.objectContaining({
            flags: { agreement_snapshot_missing: true },
          }),
        }),
      );
    });

    it('should convert create-assignment failures into failed summary rows', async () => {
      const uid = 'show_test123';
      const creators = [
        {
          creatorId: 'creator_new',
          note: null,
          metadata: {},
        },
      ];

      showService.getShowById.mockResolvedValue(mockShow);
      creatorRepository.findByUids.mockResolvedValue([
        { id: BigInt(1), uid: 'creator_new' },
      ] as any);
      studioCreatorRepository.findByStudioUidAndCreatorUids.mockResolvedValue([
        {
          creator: {
            uid: 'creator_new',
            name: 'New Creator',
            aliasName: 'New Creator',
          },
          isActive: true,
        },
      ] as any);
      showCreatorRepository.findMany.mockResolvedValue([]);
      showCreatorService.generateShowCreatorUid.mockReturnValue('show_mc_new_bulk');
      showCreatorRepository.createAssignment.mockRejectedValue(new Error('insert failed'));

      const result = await service.bulkAssignCreatorsToShow('std_test123', uid, creators as any, 'actor_123');

      expect(result).toEqual({
        assigned: 0,
        skipped: 0,
        failed: [
          { creatorId: 'creator_new', reason: 'Failed to assign creator' },
        ],
      });
    });

    it('should treat unique conflict during create as skipped', async () => {
      const uid = 'show_test123';
      const creators = [
        {
          creatorId: 'creator_new',
          note: null,
          metadata: {},
        },
      ];

      showService.getShowById.mockResolvedValue(mockShow);
      creatorRepository.findByUids.mockResolvedValue([
        { id: BigInt(1), uid: 'creator_new' },
      ] as any);
      studioCreatorRepository.findByStudioUidAndCreatorUids.mockResolvedValue([
        {
          creator: {
            uid: 'creator_new',
            name: 'New Creator',
            aliasName: 'New Creator',
          },
          isActive: true,
        },
      ] as any);
      showCreatorRepository.findMany.mockResolvedValue([]);
      showCreatorService.generateShowCreatorUid.mockReturnValue('show_mc_new_bulk');
      showCreatorRepository.createAssignment.mockRejectedValue(
        createMockUniqueConstraintError(['showId', 'creatorId'], 'ShowCreator'),
      );

      const result = await service.bulkAssignCreatorsToShow('std_test123', uid, creators as any, 'actor_123');

      expect(result).toEqual({
        assigned: 0,
        skipped: 1,
        failed: [],
      });
    });

    it('should reject creators that are inactive in the studio roster', async () => {
      const uid = 'show_test123';
      const creators = [
        {
          creatorId: 'creator_inactive',
          note: null,
          metadata: {},
        },
      ];

      showService.getShowById.mockResolvedValue(mockShow);
      creatorRepository.findByUids.mockResolvedValue([
        { id: BigInt(9), uid: 'creator_inactive' },
      ] as any);
      studioCreatorRepository.findByStudioUidAndCreatorUids.mockResolvedValue([
        {
          creator: {
            uid: 'creator_inactive',
            name: 'Inactive Creator',
            aliasName: 'Inactive Creator',
          },
          isActive: false,
        },
      ] as any);
      showCreatorRepository.findMany.mockResolvedValue([]);

      const result = await service.bulkAssignCreatorsToShow('std_test123', uid, creators as any, 'actor_123');

      expect(result).toEqual({
        assigned: 0,
        skipped: 0,
        failed: [
          { creatorId: 'creator_inactive', reason: STUDIO_CREATOR_ROSTER_ERROR.CREATOR_INACTIVE_IN_ROSTER },
        ],
      });
      expect(showCreatorRepository.createAssignment).not.toHaveBeenCalled();
    });

    it('should reject creators that are not in the studio roster', async () => {
      const uid = 'show_test123';
      const creators = [
        {
          creatorId: 'creator_off_roster',
          note: null,
          metadata: {},
        },
      ];

      showService.getShowById.mockResolvedValue(mockShow);
      creatorRepository.findByUids.mockResolvedValue([
        { id: BigInt(11), uid: 'creator_off_roster' },
      ] as any);
      studioCreatorRepository.findByStudioUidAndCreatorUids.mockResolvedValue([]);
      showCreatorRepository.findMany.mockResolvedValue([]);

      const result = await service.bulkAssignCreatorsToShow('std_test123', uid, creators as any, 'actor_123');

      expect(result).toEqual({
        assigned: 0,
        skipped: 0,
        failed: [
          { creatorId: 'creator_off_roster', reason: STUDIO_CREATOR_ROSTER_ERROR.CREATOR_NOT_IN_ROSTER },
        ],
      });
      expect(showCreatorRepository.createAssignment).not.toHaveBeenCalled();
    });

    it('should keep already-assigned creators idempotent even when roster is missing or inactive', async () => {
      const uid = 'show_test123';
      const creators = [
        {
          creatorId: 'creator_off_roster',
          note: null,
          metadata: {},
        },
        {
          creatorId: 'creator_inactive',
          note: null,
          metadata: {},
        },
      ];

      showService.getShowById.mockResolvedValue(mockShow);
      creatorRepository.findByUids.mockResolvedValue([
        { id: BigInt(11), uid: 'creator_off_roster' },
        { id: BigInt(12), uid: 'creator_inactive' },
      ] as any);
      studioCreatorRepository.findByStudioUidAndCreatorUids.mockResolvedValue([
        {
          creator: {
            uid: 'creator_inactive',
            name: 'Inactive Creator',
            aliasName: 'Inactive Creator',
          },
          isActive: false,
        },
      ] as any);
      showCreatorRepository.findMany.mockResolvedValue([
        { id: BigInt(21), showId: mockShow.id, creatorId: BigInt(11), deletedAt: null, metadata: {} },
        { id: BigInt(22), showId: mockShow.id, creatorId: BigInt(12), deletedAt: null, metadata: {} },
      ] as any);

      const result = await service.bulkAssignCreatorsToShow('std_test123', uid, creators as any, 'actor_123');

      expect(result).toEqual({
        assigned: 0,
        skipped: 2,
        failed: [],
      });
      expect(showCreatorRepository.createAssignment).not.toHaveBeenCalled();
      expect(showCreatorRepository.restoreAndUpdateAssignment).not.toHaveBeenCalled();
    });
  });

  describe('replaceCreatorsForShow', () => {
    it('should replace creators for a show', async () => {
      const uid = 'show_test123';
      const creators = [
        {
          creatorId: 'creator_test123',
          note: 'Creator note',
          agreedRate: '150.00',
          compensationType: 'HYBRID',
          commissionRate: '12.50',
          metadata: {},
        },
      ];
      const mockCreator = {
        id: BigInt(1),
        uid: 'creator_test123',
        deletedAt: null,
      };

      showService.getShowById.mockResolvedValue(mockShow);
      showCreatorService.generateShowCreatorUid.mockReturnValue('show_mc_new');
      creatorRepository.findByUids.mockResolvedValue([mockCreator] as any);
      showCreatorRepository.findMany.mockResolvedValue([]);
      showCreatorRepository.createAssignment.mockResolvedValue({} as any);
      showRepository.findByUid.mockResolvedValue(mockShow);

      const result = await service.replaceCreatorsForShow(uid, creators, 'actor_123');

      expect(showService.getShowById).toHaveBeenCalledWith(uid);
      expect(creatorRepository.findByUids).toHaveBeenCalledWith(['creator_test123']);
      expect(showCreatorRepository.createAssignment).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'show_mc_new',
          showId: mockShow.id,
          creatorId: BigInt(1),
          note: 'Creator note',
          agreedRate: '150.00',
          compensationType: 'HYBRID',
          commissionRate: '12.50',
          metadata: expect.objectContaining({
            flags: { agreement_snapshot_missing: false },
          }),
        }),
      );
      expect(showRepository.findByUid).toHaveBeenCalledWith(
        uid,
        expect.any(Object),
      );
      expect(result).toEqual(mockShow);
    });

    it('should return creator-labeled not-found error for creator replacement', async () => {
      const uid = 'show_test123';
      const creators = [
        {
          creatorId: 'creator_missing',
          note: null,
          metadata: {},
        },
      ];

      showService.getShowById.mockResolvedValue(mockShow);
      creatorRepository.findByUids.mockResolvedValue([]);

      await expect(service.replaceCreatorsForShow(uid, creators, 'actor_123')).rejects.toThrow(
        'Creators not found: creator_missing',
      );
    });

    it('should restore existing creator assignment with compensation fields', async () => {
      const uid = 'show_test123';
      const creators = [
        {
          creatorId: 'creator_test123',
          note: 'Restored note',
          agreedRate: '180.00',
          compensationType: 'COMMISSION',
          commissionRate: '20.00',
          metadata: { source: 'sync' },
        },
      ];
      const mockCreator = {
        id: BigInt(1),
        uid: 'creator_test123',
        deletedAt: null,
      };
      const existingAssignment = {
        id: BigInt(99),
        showId: mockShow.id,
        creatorId: BigInt(1),
        note: null,
        agreedRate: null,
        compensationType: null,
        commissionRate: null,
        metadata: {},
        deletedAt: new Date(),
      };

      showService.getShowById.mockResolvedValue(mockShow);
      creatorRepository.findByUids.mockResolvedValue([mockCreator] as any);
      showCreatorRepository.findMany.mockResolvedValue([existingAssignment] as any);
      showCreatorRepository.restoreAndUpdateAssignment.mockResolvedValue({} as any);
      showRepository.findByUid.mockResolvedValue(mockShow);

      await service.replaceCreatorsForShow(uid, creators, 'actor_123');

      expect(showCreatorRepository.restoreAndUpdateAssignment).toHaveBeenCalledWith(
        99n,
        expect.objectContaining({
          note: 'Restored note',
          agreedRate: '180.00',
          compensationType: 'COMMISSION',
          commissionRate: '20.00',
          metadata: expect.objectContaining({ source: 'sync' }),
        }),
      );
      expect(showCreatorRepository.createAssignment).not.toHaveBeenCalled();
    });

    it('should append snapshot override reason when replacing assignment compensation', async () => {
      const uid = 'show_test123';
      const creators = [
        {
          creatorId: 'creator_test123',
          note: null,
          agreedRate: '180.00',
          compensationType: 'COMMISSION',
          commissionRate: '20.00',
          overrideReason: 'Back-office correction',
          metadata: {},
        },
      ];
      const mockCreator = { id: BigInt(1), uid: 'creator_test123', deletedAt: null };
      const existingAssignment = {
        id: BigInt(99),
        showId: mockShow.id,
        creatorId: BigInt(1),
        note: null,
        agreedRate: '150.00',
        compensationType: 'FIXED',
        commissionRate: null,
        metadata: {},
        deletedAt: null,
      };

      showService.getShowById.mockResolvedValue(mockShow);
      creatorRepository.findByUids.mockResolvedValue([mockCreator] as any);
      showCreatorRepository.findMany.mockResolvedValue([existingAssignment] as any);
      showCreatorRepository.restoreAndUpdateAssignment.mockResolvedValue({} as any);
      showRepository.findByUid.mockResolvedValue(mockShow);

      await service.replaceCreatorsForShow(uid, creators, 'actor_123');

      expect(showCreatorRepository.restoreAndUpdateAssignment).toHaveBeenCalledWith(
        99n,
        expect.objectContaining({
          metadata: expect.objectContaining({
            audit: expect.objectContaining({
              snapshot_overrides: expect.arrayContaining([
                expect.objectContaining({
                  field: 'agreed_rate',
                  reason: 'Back-office correction',
                  actor_ext_id: 'actor_123',
                }),
              ]),
            }),
          }),
        }),
      );
    });
  });

  describe('replacePlatformsForShow', () => {
    it('should replace all platforms for a show', async () => {
      const uid = 'show_test123';
      const platforms = [
        {
          platformId: 'plt_test123',
          liveStreamLink: 'https://example.com/stream',
          platformShowId: 'platform_show_123',
          viewerCount: 100,
          metadata: {},
        },
      ];
      const mockPlatform = { id: BigInt(1), uid: 'plt_test123', deletedAt: null };

      showService.getShowById.mockResolvedValue(mockShow);
      showPlatformService.generateShowPlatformUid.mockReturnValue('show_plt_new');
      platformRepository.findByUids.mockResolvedValue([mockPlatform] as any);
      showPlatformRepository.findMany.mockResolvedValue([]);
      showPlatformRepository.createAssignment.mockResolvedValue({} as any);
      showRepository.findByUid.mockResolvedValue(mockShow);

      const result = await service.replacePlatformsForShow(uid, platforms);

      expect(showService.getShowById).toHaveBeenCalledWith(uid);
      expect(platformRepository.findByUids).toHaveBeenCalledWith(['plt_test123']);
      expect(showPlatformRepository.createAssignment).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'show_plt_new',
          showId: mockShow.id,
          platformId: BigInt(1),
        }),
      );
      expect(showRepository.findByUid).toHaveBeenCalledWith(
        uid,
        expect.any(Object),
      );
      expect(result).toEqual(mockShow);
    });
  });

  describe('listCreatorsForShow', () => {
    it('should return creator list for show assignments', async () => {
      showService.getShowById.mockResolvedValue({
        ...mockShow,
        showCreators: [
          {
            id: 1n,
            uid: 'show_mc_1',
            note: 'Primary',
            agreedRate: '100.00',
            compensationType: 'FIXED',
            commissionRate: null,
            metadata: { source: 'manual' },
            showId: mockShow.id,
            creatorId: 2n,
            createdAt: new Date('2026-03-13T10:00:00.000Z'),
            updatedAt: new Date('2026-03-13T10:00:00.000Z'),
            deletedAt: null,
            creator: {
              uid: 'creator_1',
              name: 'Alice',
              aliasName: 'Ali',
            },
          },
        ],
      } as unknown as Show);

      const result = await service.listCreatorsForShow(mockShow.uid);

      expect(showService.getShowById).toHaveBeenCalledWith(
        mockShow.uid,
        expect.objectContaining({
          showCreators: expect.any(Object),
        }),
      );
      expect(result).toEqual([
        expect.objectContaining({
          id: 'show_mc_1',
          creatorId: 'creator_1',
          creatorName: 'Alice',
          creatorAliasName: 'Ali',
          note: 'Primary',
        }),
      ]);
    });
  });

  describe('updateCreatorForShow', () => {
    it('updates per-show creator compensation terms and appends snapshot audit metadata', async () => {
      showService.getShowById.mockResolvedValue({
        ...mockShow,
        showCreators: [
          {
            id: 11n,
            uid: 'show_mc_1',
            note: 'Old note',
            agreedRate: new Prisma.Decimal('100.00'),
            compensationType: 'FIXED',
            commissionRate: null,
            metadata: { flags: { agreement_snapshot_missing: false } },
            creator: {
              uid: 'creator_1',
              name: 'Alice',
              aliasName: 'Ali',
            },
          },
        ],
      } as any);
      showCreatorRepository.restoreAndUpdateAssignment.mockResolvedValue({
        uid: 'show_mc_1',
        note: 'Updated note',
        agreedRate: new Prisma.Decimal('175.00'),
        compensationType: 'FIXED',
        commissionRate: null,
        metadata: {
          flags: { agreement_snapshot_missing: false },
          audit: { snapshot_overrides: [] },
        },
      } as any);

      const result = await service.updateCreatorForShow(
        mockShow.uid,
        'show_mc_1',
        {
          note: 'Updated note',
          agreedRate: '175.00',
          compensationType: 'FIXED',
          commissionRate: null,
          overrideReason: 'Negotiated for show',
        },
        'actor_123',
      );

      expect(showService.getShowById).toHaveBeenCalledWith(
        mockShow.uid,
        expect.objectContaining({
          showCreators: expect.objectContaining({
            where: expect.objectContaining({ uid: 'show_mc_1' }),
          }),
        }),
      );
      expect(showCreatorRepository.restoreAndUpdateAssignment).toHaveBeenCalledWith(
        11n,
        expect.objectContaining({
          note: 'Updated note',
          agreedRate: '175.00',
          compensationType: 'FIXED',
          commissionRate: null,
          metadata: expect.objectContaining({
            audit: expect.objectContaining({
              snapshot_overrides: expect.arrayContaining([
                expect.objectContaining({
                  field: 'agreed_rate',
                  old_value: '100',
                  new_value: '175.00',
                  actor_ext_id: 'actor_123',
                  reason: 'Negotiated for show',
                }),
              ]),
            }),
          }),
        }),
      );
      expect(result).toEqual(expect.objectContaining({
        id: 'show_mc_1',
        creatorId: 'creator_1',
        agreedRate: new Prisma.Decimal('175.00'),
      }));
    });

    it('rejects a partial update whose merged snapshot has FIXED with a leftover commission rate', async () => {
      showService.getShowById.mockResolvedValue({
        ...mockShow,
        showCreators: [
          {
            id: 11n,
            uid: 'show_mc_1',
            note: 'Old note',
            agreedRate: new Prisma.Decimal('100.00'),
            compensationType: 'COMMISSION',
            commissionRate: new Prisma.Decimal('25.00'),
            metadata: {},
            creator: {
              uid: 'creator_1',
              name: 'Alice',
              aliasName: 'Ali',
            },
          },
        ],
      } as any);

      await expect(
        service.updateCreatorForShow(
          mockShow.uid,
          'show_mc_1',
          {
            compensationType: 'FIXED',
          },
          'actor_123',
        ),
      ).rejects.toThrow(/commission_rate must be null when compensation_type is FIXED/);

      expect(showCreatorRepository.restoreAndUpdateAssignment).not.toHaveBeenCalled();
    });
  });

  describe('bulkAssignCreatorsToShow compensation item boundary', () => {
    it('does not create compensation line items from bulk assignment payloads', async () => {
      showService.getShowById.mockResolvedValue(mockShow);
      creatorRepository.findByUids.mockResolvedValue([
        { id: 2n, uid: 'creator_1' },
      ] as any);
      studioCreatorRepository.findByStudioUidAndCreatorUids.mockResolvedValue([
        {
          isActive: true,
          creator: { uid: 'creator_1' },
          defaultRate: '100.00',
          defaultRateType: 'FIXED',
          defaultCommissionRate: null,
        },
      ] as any);
      showCreatorRepository.findMany.mockResolvedValue([]);
      showCreatorService.generateShowCreatorUid.mockReturnValue('show_mc_1');
      showCreatorRepository.createAssignment.mockResolvedValue({
        id: 11n,
        uid: 'show_mc_1',
      } as any);

      const result = await service.bulkAssignCreatorsToShow(
        'std_123',
        mockShow.uid,
        [
          ({
            creatorId: 'creator_1',
            compensationType: 'FIXED',
            agreedRate: '100.00',
            commissionRate: null,
            // Bulk assignment is only for assignment membership. Compensation items
            // are managed from the target-specific compensation surface.
            compensationLineItems: [
              {
                amount: '25.00',
                itemType: 'BONUS',
                reason: 'Launch bonus',
                metadata: { source: 'bulk_mapping' },
              },
            ],
          } as any),
        ],
        'actor_123',
      );

      expect(result).toEqual({ assigned: 1, skipped: 0, failed: [] });
      expect(compensationLineItemService.createStudioLineItem).not.toHaveBeenCalled();
    });
  });

  describe('getCreatorCompensationSummaryForShow', () => {
    it('calculates fixed assignment totals from backend line items', async () => {
      showService.getShowById.mockResolvedValue({
        ...mockShow,
        showCreators: [
          {
            uid: 'show_mc_1',
            note: null,
            agreedRate: '100.00',
            compensationType: 'FIXED',
            commissionRate: null,
            metadata: {},
            creator: {
              uid: 'creator_1',
              name: 'Alice',
              aliasName: 'Ali',
            },
          },
        ],
      } as any);
      compensationLineItemService.sumActiveAmountsByShowCreatorUids.mockResolvedValue(
        new Map([['show_mc_1', new Prisma.Decimal('20.00')]]),
      );

      const result = await service.getCreatorCompensationSummaryForShow('std_123', mockShow.uid);

      expect(compensationLineItemService.sumActiveAmountsByShowCreatorUids).toHaveBeenCalledWith({
        studioId: 'std_123',
        showCreatorUids: ['show_mc_1'],
      });
      expect(result).toEqual({
        showId: mockShow.uid,
        creators: [
          expect.objectContaining({
            showCreatorId: 'show_mc_1',
            creatorId: 'creator_1',
            baseAmount: '100.00',
            adjustmentTotal: '20.00',
            totalAmount: '120.00',
            unresolvedReason: null,
          }),
        ],
        totalAmount: '120.00',
        unresolvedCount: 0,
      });
    });

    it('marks HYBRID rows unresolved because their total depends on commission revenue', async () => {
      showService.getShowById.mockResolvedValue({
        ...mockShow,
        showCreators: [
          {
            uid: 'show_mc_hybrid',
            note: null,
            agreedRate: '50.00',
            compensationType: 'HYBRID',
            commissionRate: '10.00',
            metadata: {},
            creator: {
              uid: 'creator_2',
              name: 'Bea',
              aliasName: 'Bea',
            },
          },
        ],
      } as any);
      compensationLineItemService.sumActiveAmountsByShowCreatorUids.mockResolvedValue(
        new Map([['show_mc_hybrid', new Prisma.Decimal('5.00')]]),
      );

      const result = await service.getCreatorCompensationSummaryForShow('std_123', mockShow.uid);

      expect(result).toEqual({
        showId: mockShow.uid,
        creators: [
          expect.objectContaining({
            showCreatorId: 'show_mc_hybrid',
            baseAmount: '50.00',
            adjustmentTotal: '5.00',
            totalAmount: null,
            unresolvedReason: 'COMMISSION_REVENUE_NOT_AVAILABLE',
          }),
        ],
        totalAmount: '0.00',
        unresolvedCount: 1,
      });
    });
  });

  describe('getCreatorCompensations', () => {
    it('aggregates creator compensation across show assignments in the date range', async () => {
      const dateFrom = new Date('2026-05-01T00:00:00.000Z');
      const dateTo = new Date('2026-05-31T23:59:59.999Z');
      studioCreatorRepository.findByStudioUidAndCreatorUid.mockResolvedValue({
        creator: {
          uid: 'creator_1',
          name: 'Alice',
          aliasName: 'Ali',
        },
      } as any);
      showCreatorRepository.findCompensationReviewRows.mockResolvedValue([
        {
          uid: 'show_mc_1',
          note: 'Existing note',
          agreedRate: new Prisma.Decimal('100.00'),
          compensationType: 'FIXED',
          commissionRate: null,
          show: {
            uid: 'show_1',
            name: 'May Show',
            startTime: new Date('2026-05-10T10:00:00.000Z'),
            endTime: new Date('2026-05-10T12:00:00.000Z'),
          },
          creator: {
            uid: 'creator_1',
            name: 'Alice',
            aliasName: 'Ali',
          },
        },
        {
          uid: 'show_mc_2',
          note: null,
          agreedRate: null,
          compensationType: null,
          commissionRate: null,
          show: {
            uid: 'show_2',
            name: 'Incomplete Show',
            startTime: new Date('2026-05-12T10:00:00.000Z'),
            endTime: new Date('2026-05-12T12:00:00.000Z'),
          },
          creator: {
            uid: 'creator_1',
            name: 'Alice',
            aliasName: 'Ali',
          },
        },
      ] as any);
      compensationLineItemService.sumActiveAmountsByShowCreatorUids.mockResolvedValue(
        new Map([
          ['show_mc_1', new Prisma.Decimal('25.00')],
          ['show_mc_2', new Prisma.Decimal('5.00')],
        ]),
      );

      const result = await service.getCreatorCompensations('std_123', 'creator_1', {
        dateFrom,
        dateTo,
      });

      expect(studioCreatorRepository.findByStudioUidAndCreatorUid)
        .toHaveBeenCalledWith('std_123', 'creator_1');
      expect(showCreatorRepository.findCompensationReviewRows).toHaveBeenCalledWith({
        studioUid: 'std_123',
        creatorUid: 'creator_1',
        dateFrom,
        dateTo,
      });
      expect(compensationLineItemService.sumActiveAmountsByShowCreatorUids).toHaveBeenCalledWith({
        studioId: 'std_123',
        showCreatorUids: ['show_mc_1', 'show_mc_2'],
      });
      expect(result).toEqual(expect.objectContaining({
        creatorId: 'creator_1',
        totalAmount: '125.00',
        unresolvedCount: 1,
        shows: [
          expect.objectContaining({
            showId: 'show_1',
            note: 'Existing note',
            totalAmount: '125.00',
          }),
          expect.objectContaining({
            showId: 'show_2',
            note: null,
            totalAmount: null,
            unresolvedReason: 'AGREEMENT_SNAPSHOT_MISSING',
          }),
        ],
      }));
    });
  });

  describe('getShowRunReviewSummary', () => {
    const studioUid = 'std_test123';
    const mockStudio = { id: BigInt(1), uid: studioUid, deletedAt: null };

    it('should throw NotFoundException if studio does not exist', async () => {
      studioService.getStudioById.mockRejectedValue(HttpError.notFound('Studio', studioUid));

      await expect(
        service.getShowRunReviewSummary(studioUid, {
          date_from: '2026-05-12T06:00:00.000Z',
          date_to: '2026-05-13T05:59:59.999Z',
        })
      ).rejects.toThrow('Studio not found with id std_test123');
    });

    it('should compile and return correct summary metrics', async () => {
      studioService.getStudioById.mockResolvedValue(mockStudio as any);

      const mockShows = [
        {
          id: BigInt(10),
          uid: 'show_10',
          name: 'Show 1',
          startTime: new Date('2026-05-12T10:00:00.000Z'),
          endTime: new Date('2026-05-12T12:00:00.000Z'),
          actualStartTime: new Date('2026-05-12T10:05:00.000Z'), // Complete
          actualEndTime: new Date('2026-05-12T12:05:00.000Z'),
          showCreators: [
            {
              uid: 'sc_1',
              attendanceMissing: false,
              actualStartTime: new Date('2026-05-12T10:15:00.000Z'), // Late by 15 mins
              attendanceReason: 'Traffic',
              creator: { uid: 'creator_alice', name: 'Alice', aliasName: 'Ali' },
            },
          ],
          showPlatforms: [
            {
              platform: { name: 'YouTube' },
              violations: [
                {
                  uid: 'v_1',
                  violationType: 'AUDIO_LAG',
                  severity: 'HIGH',
                  reason: 'Laggy audio',
                  observedAt: new Date('2026-05-12T10:30:00.000Z'),
                },
              ],
            },
          ],
          taskTargets: [
            {
              task: {
                uid: 'task_1',
                description: 'Pre-production sound check',
                status: 'IN_PROGRESS',
                type: 'PRE_PRODUCTION',
                deletedAt: null,
              },
            },
          ],
        },
        {
          id: BigInt(20),
          uid: 'show_20',
          name: 'Show 2',
          startTime: new Date('2026-05-12T13:00:00.000Z'),
          endTime: new Date('2026-05-12T15:00:00.000Z'),
          actualStartTime: null, // Incomplete
          actualEndTime: null,
          showCreators: [
            {
              uid: 'sc_2',
              attendanceMissing: true, // Missing
              actualStartTime: null,
              attendanceReason: 'SICK',
              creator: { uid: 'creator_bob', name: 'Bob', aliasName: null },
            },
          ],
          showPlatforms: [],
          taskTargets: [],
        },
        {
          id: BigInt(30),
          uid: 'show_30',
          name: 'Late-night Show',
          startTime: new Date('2026-05-13T02:00:00.000Z'), // Operational day May 12!
          endTime: new Date('2026-05-13T04:00:00.000Z'),
          actualStartTime: new Date('2026-05-13T02:00:00.000Z'), // Complete
          actualEndTime: new Date('2026-05-13T04:00:00.000Z'),
          showCreators: [],
          showPlatforms: [],
          taskTargets: [],
        },
      ];

      showService.getShowsForReview.mockResolvedValue(mockShows as any);

      const result = await service.getShowRunReviewSummary(studioUid, {
        date_from: '2026-05-12T06:00:00.000Z',
        date_to: '2026-05-13T05:59:59.999Z',
      });

      expect(studioService.getStudioById).toHaveBeenCalledWith(studioUid);
      expect(showService.getShowsForReview).toHaveBeenCalledWith(
        mockStudio.id,
        new Date('2026-05-12T06:00:00.000Z'),
        new Date('2026-05-13T05:59:59.999Z'),
      );

      expect(result.shows).toEqual({
        total_count: 3,
        started_count: 2,
        not_started_count: 1,
        late_start_count: 1,
        missing_duration_minutes: 5,
        end_recorded_count: 2,
      });

      expect(result.creators.total_count).toBe(2);
      expect(result.creators.late_count).toBe(1);
      expect(result.creators.missing_count).toBe(1);
      expect(result.creators.exceptions).toHaveLength(0);

      expect(result.platforms.active_violations_count).toBe(1);
      expect(result.platforms.violations).toHaveLength(0);

      expect(result.tasks.incomplete_phase_checks_count).toBe(1);
      expect(result.tasks.incomplete_tasks).toHaveLength(0);

      // Verify the new paginated sub-resource helper methods
      const creatorsRes = await service.getShowRunReviewCreators(studioUid, {
        date_from: '2026-05-12T06:00:00.000Z',
        date_to: '2026-05-13T05:59:59.999Z',
      });
      expect(creatorsRes.total).toBe(2);
      expect(creatorsRes.items).toHaveLength(2);
      expect(creatorsRes.items).toContainEqual(
        expect.objectContaining({
          show_creator_uid: 'sc_1',
          creator_name: 'Ali',
          status: 'LATE',
          late_minutes: 15,
          reason: 'Traffic',
        })
      );
      expect(creatorsRes.items).toContainEqual(
        expect.objectContaining({
          show_creator_uid: 'sc_2',
          creator_name: 'Bob',
          status: 'MISSING',
          late_minutes: 0,
          reason: 'SICK',
        })
      );

      const violationsRes = await service.getShowRunReviewViolations(studioUid, {
        date_from: '2026-05-12T06:00:00.000Z',
        date_to: '2026-05-13T05:59:59.999Z',
      });
      expect(violationsRes.total).toBe(1);
      expect(violationsRes.items).toHaveLength(1);
      expect(violationsRes.items[0]).toEqual(
        expect.objectContaining({
          violation_uid: 'v_1',
          platform_name: 'YouTube',
          violation_type: 'AUDIO_LAG',
          severity: 'HIGH',
          reason: 'Laggy audio',
        })
      );

      const tasksRes = await service.getShowRunReviewTasks(studioUid, {
        date_from: '2026-05-12T06:00:00.000Z',
        date_to: '2026-05-13T05:59:59.999Z',
      });
      expect(tasksRes.total).toBe(1);
      expect(tasksRes.items).toHaveLength(1);
      expect(tasksRes.items[0]).toEqual(
        expect.objectContaining({
          task_uid: 'task_1',
          description: 'Pre-production sound check',
          status: 'IN_PROGRESS',
          type: 'PRE_PRODUCTION',
          show_name: 'Show 1',
        })
      );

      const showsRes = await service.getShowRunReviewShows(studioUid, {
        date_from: '2026-05-12T06:00:00.000Z',
        date_to: '2026-05-13T05:59:59.999Z',
      });
      expect(showsRes.total).toBe(1);
      expect(showsRes.items).toHaveLength(1);
      expect(showsRes.items[0]).toEqual(
        expect.objectContaining({
          id: 'shows-range-summary',
          status: 'MISSING STARTS',
        })
      );
    });

    it('should attach sign-off details if sign-off exists', async () => {
      studioService.getStudioById.mockResolvedValue(mockStudio as any);
      showService.getShowsForReview.mockResolvedValue([]);
      
      const mockSignOffDate = new Date();
      auditService.findSignOff.mockResolvedValue({
        uid: 'audit_sign_off_123',
        action: 'SIGN_OFF',
        createdAt: mockSignOffDate,
        reason: 'Everything checked',
        actor: {
          uid: 'usr_actor123',
          name: 'Manager Bob',
        },
        metadata: {
          unresolved_exceptions: {
            late_creators: 1,
            missing_creators: 0,
            platform_violations: 2,
            incomplete_tasks: 3,
          },
        },
      } as any);

      const result = await service.getShowRunReviewSummary(studioUid, {
        date_from: '2026-05-12T06:00:00.000Z',
        date_to: '2026-05-13T05:59:59.999Z',
      });

      expect(auditService.findSignOff).toHaveBeenCalledWith(
        studioUid,
        '2026-05-12T06:00:00.000Z',
        '2026-05-13T05:59:59.999Z',
      );
      expect(result.sign_off).toEqual({
        id: 'audit_sign_off_123',
        actor_uid: 'usr_actor123',
        actor_name: 'Manager Bob',
        signed_at: mockSignOffDate.toISOString(),
        reason: 'Everything checked',
        unresolved_exceptions: {
          late_creators: 1,
          missing_creators: 0,
          platform_violations: 2,
          incomplete_tasks: 3,
        },
      });
    });
  });

  describe('signOffShowRunReview', () => {
    const studioUid = 'std_test123';
    const mockStudio = { id: BigInt(1), uid: studioUid, deletedAt: null };
    const actorExtId = 'usr_actor_ext_123';
    const mockUser = { id: BigInt(5), uid: 'usr_actor_123', extId: actorExtId };

    it('should throw NotFoundException if studio does not exist', async () => {
      studioService.getStudioById.mockRejectedValue(HttpError.notFound('Studio', studioUid));

      await expect(
        service.signOffShowRunReview(studioUid, actorExtId, {
          date_from: '2026-05-12T06:00:00.000Z',
          date_to: '2026-05-13T05:59:59.999Z',
          reason: 'Looks good',
        }),
      ).rejects.toThrow('Studio not found with id std_test123');
    });

    it('should throw NotFoundException if user does not exist', async () => {
      studioService.getStudioById.mockResolvedValue(mockStudio as any);
      auditService.findSignOff.mockResolvedValue(null);
      userService.getUserByExtId.mockResolvedValue(null);

      await expect(
        service.signOffShowRunReview(studioUid, actorExtId, {
          date_from: '2026-05-12T06:00:00.000Z',
          date_to: '2026-05-13T05:59:59.999Z',
          reason: 'Looks good',
        }),
      ).rejects.toThrow('User not found with id usr_actor_ext_123');
    });

    it('should throw Conflict if range is already signed off', async () => {
      studioService.getStudioById.mockResolvedValue(mockStudio as any);
      auditService.findSignOff.mockResolvedValue({ uid: 'existing_audit' } as any);

      await expect(
        service.signOffShowRunReview(studioUid, actorExtId, {
          date_from: '2026-05-12T06:00:00.000Z',
          date_to: '2026-05-13T05:59:59.999Z',
          reason: 'Looks good',
        }),
      ).rejects.toThrow('This range (2026-05-12T06:00:00.000Z to 2026-05-13T05:59:59.999Z) is already signed off.');
    });

    it('should successfully capture sign-off with exception snapshots', async () => {
      studioService.getStudioById.mockResolvedValue(mockStudio as any);
      auditService.findSignOff.mockResolvedValue(null);
      userService.getUserByExtId.mockResolvedValue(mockUser as any);
      showService.getShowsForReview.mockResolvedValue([
        {
          id: BigInt(10),
          uid: 'show_10',
          name: 'Show 1',
          startTime: new Date('2026-05-12T10:00:00.000Z'),
          endTime: new Date('2026-05-12T12:00:00.000Z'),
          actualStartTime: new Date('2026-05-12T10:05:00.000Z'),
          actualEndTime: new Date('2026-05-12T12:05:00.000Z'),
          showCreators: [
            {
              uid: 'sc_1',
              attendanceMissing: false,
              actualStartTime: new Date('2026-05-12T10:15:00.000Z'), // 1 late
              attendanceReason: 'Traffic',
              creator: { uid: 'creator_alice', name: 'Alice', aliasName: 'Ali' },
            },
          ],
          showPlatforms: [
            {
              platform: { name: 'YouTube' },
              violations: [
                {
                  uid: 'v_1',
                  violationType: 'AUDIO_LAG',
                  severity: 'HIGH',
                  reason: 'Laggy audio',
                  observedAt: new Date('2026-05-12T10:30:00.000Z'), // 1 violation
                },
              ],
            },
          ],
          taskTargets: [
            {
              task: {
                uid: 'task_1',
                description: 'Pre-production sound check',
                status: 'IN_PROGRESS', // 1 incomplete task
                type: 'PRE_PRODUCTION',
                deletedAt: null,
              },
            },
          ],
        },
      ] as any);

      const mockAuditResult = { uid: 'new_sign_off_audit_uid', action: 'SIGN_OFF' };
      auditService.create.mockResolvedValue(mockAuditResult as any);

      const result = await service.signOffShowRunReview(studioUid, actorExtId, {
        date_from: '2026-05-12T06:00:00.000Z',
        date_to: '2026-05-13T05:59:59.999Z',
        reason: 'Everything checked and verified',
      });

      expect(auditService.create).toHaveBeenCalledWith({
        action: 'SIGN_OFF',
        actorId: mockUser.id,
        reason: 'Everything checked and verified',
        metadata: {
          studio_uid: studioUid,
          date_from: '2026-05-12T06:00:00.000Z',
          date_to: '2026-05-13T05:59:59.999Z',
          unresolved_exceptions: {
            late_creators: 1,
            missing_creators: 0,
            platform_violations: 1,
            incomplete_tasks: 1,
          },
          shows_total: 1,
        },
        targets: [],
      });
      expect(result).toEqual(mockAuditResult);

      expect(auditService.lockSignOffRange).toHaveBeenCalledWith(
        studioUid,
        '2026-05-12T06:00:00.000Z',
        '2026-05-13T05:59:59.999Z',
      );
      // The advisory lock must be acquired before the existence check and insert.
      const lockOrder = auditService.lockSignOffRange.mock.invocationCallOrder[0];
      const checkOrder = auditService.findSignOff.mock.invocationCallOrder[0];
      const createOrder = auditService.create.mock.invocationCallOrder[0];
      expect(lockOrder).toBeLessThan(checkOrder);
      expect(lockOrder).toBeLessThan(createOrder);
    });
  });
});

