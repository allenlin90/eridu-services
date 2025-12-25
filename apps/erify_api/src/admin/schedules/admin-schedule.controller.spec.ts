import { ConfigService } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { Prisma, Schedule } from '@prisma/client';

import { AdminScheduleController } from './admin-schedule.controller';

import { GoogleSheetsApiKeyGuard } from '@/lib/guards/google-sheets-api-key.guard';
import { ScheduleService } from '@/models/schedule/schedule.service';
import type {
  BulkCreateScheduleDto,
  BulkUpdateScheduleDto,
  CreateScheduleDto,
  ListSchedulesQueryDto,
  MonthlyOverviewQueryDto,
  UpdateScheduleDto,
} from '@/models/schedule/schemas/schedule.schema';
import { ListSnapshotsQueryDto } from '@/models/schedule-snapshot/schemas/schedule-snapshot.schema';
import { UserService } from '@/models/user/user.service';
import { SchedulePlanningService } from '@/schedule-planning/schedule-planning.service';
import type { PublishScheduleDto } from '@/schedule-planning/schemas/schedule-planning.schema';

type ScheduleWithRelations = Prisma.ScheduleGetPayload<{
  include: {
    client: true;
    createdByUser: true;
    publishedByUser: true;
  };
}>;

describe('adminScheduleController', () => {
  let controller: AdminScheduleController;

  const mockScheduleService = {
    createScheduleFromDto: jest.fn(),
    getPaginatedSchedules: jest.fn(),
    getScheduleById: jest.fn(),
    updateScheduleFromDto: jest.fn(),
    deleteSchedule: jest.fn(),
    duplicateSchedule: jest.fn(),
    bulkCreateSchedules: jest.fn(),
    bulkUpdateSchedules: jest.fn(),
    getMonthlyOverview: jest.fn(),
  };

  const mockSchedulePlanningService = {
    validateSchedule: jest.fn(),
    publishSchedule: jest.fn(),
    createManualSnapshot: jest.fn(),
    getSnapshotsBySchedule: jest.fn(),
  };

  const mockUserService = {
    getUserById: jest.fn(),
  };

  const mockClient = {
    id: BigInt(1),
    uid: 'client_123',
    name: 'Test Client',
    contactPerson: 'Test Person',
    contactEmail: 'test@example.com',
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockUser = {
    id: BigInt(1),
    uid: 'user_123',
    email: 'test@example.com',
    name: 'Test User',
    extId: 'ext_123',
    isBanned: false,
    isSystemAdmin: false,
    profileUrl: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'GOOGLE_SHEETS_API_KEY')
          return undefined;
        if (key === 'NODE_ENV')
          return 'development';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminScheduleController],
      providers: [
        { provide: ScheduleService, useValue: mockScheduleService },
        {
          provide: SchedulePlanningService,
          useValue: mockSchedulePlanningService,
        },
        { provide: UserService, useValue: mockUserService },
        { provide: ConfigService, useValue: mockConfigService },
        GoogleSheetsApiKeyGuard,
      ],
    }).compile();

    controller = module.get<AdminScheduleController>(AdminScheduleController);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSchedule', () => {
    it('should create a schedule', async () => {
      const createDto: CreateScheduleDto = {
        name: 'Test Schedule',
        client: { connect: { uid: 'client_123' } },
        createdByUser: { connect: { uid: 'user_123' } },
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        status: 'draft',
        planDocument: { shows: [] },
        version: 1,
        metadata: {},
      };
      const createdSchedule: ScheduleWithRelations = {
        id: BigInt(1),
        uid: 'schedule_123',
        name: createDto.name,
        startDate: createDto.startDate,
        endDate: createDto.endDate,
        status: createDto.status as any, // Cast to any for the enum type if needed, but the object itself is typed
        version: createDto.version,
        planDocument: createDto.planDocument as Prisma.JsonObject,
        metadata: createDto.metadata as Prisma.JsonObject,
        clientId: mockClient.id,
        createdBy: mockUser.id,
        publishedBy: null,
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        client: mockClient,
        createdByUser: mockUser,
        publishedByUser: null,
      };

      mockScheduleService.createScheduleFromDto.mockResolvedValue(
        createdSchedule,
      );

      const result = await controller.createSchedule(createDto);
      expect(mockScheduleService.createScheduleFromDto).toHaveBeenCalledWith(
        createDto,
        {
          client: true,
          createdByUser: true,
          publishedByUser: true,
        },
      );
      expect(result).toEqual(createdSchedule);
    });
  });

  describe('getSchedules', () => {
    it('should return paginated list of schedules', async () => {
      const query: ListSchedulesQueryDto = {
        page: 1,
        limit: 10,
        skip: 0,
        take: 10,
        include_plan_document: false,
      } as ListSchedulesQueryDto;
      const schedules = [
        { uid: 'schedule_1', name: 'Schedule 1' },
        { uid: 'schedule_2', name: 'Schedule 2' },
      ];
      const total = 2;
      const paginationMeta = {
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      };

      mockScheduleService.getPaginatedSchedules.mockResolvedValue({
        schedules,
        total,
      });

      const result = await controller.getSchedules(query);
      expect(mockScheduleService.getPaginatedSchedules).toHaveBeenCalledWith(
        query,
      );
      expect(result).toEqual({
        data: schedules.map((s) => ({ ...s, planDocument: undefined })),
        meta: paginationMeta,
      });
    });

    it('should include plan document when requested', async () => {
      const query: ListSchedulesQueryDto = {
        page: 1,
        limit: 10,
        skip: 0,
        take: 10,
        include_plan_document: true,
      } as ListSchedulesQueryDto;
      const schedules = [
        {
          uid: 'schedule_1',
          name: 'Schedule 1',
          planDocument: { shows: [] },
        },
      ];
      const total = 1;

      mockScheduleService.getPaginatedSchedules.mockResolvedValue({
        schedules,
        total,
      });

      const result = await controller.getSchedules(query);
      expect(result.data[0].planDocument).toEqual({ shows: [] });
    });
  });

  describe('getSchedule', () => {
    it('should return a schedule by id', async () => {
      const scheduleId = 'schedule_123';
      const schedule: ScheduleWithRelations = {
        id: BigInt(1),
        uid: scheduleId,
        name: 'Test Schedule',
        startDate: new Date(),
        endDate: new Date(),
        status: 'draft',
        version: 1,
        planDocument: { shows: [] },
        metadata: {},
        clientId: mockClient.id,
        createdBy: mockUser.id,
        publishedBy: null,
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        client: mockClient,
        createdByUser: mockUser,
        publishedByUser: null,
      };

      mockScheduleService.getScheduleById.mockResolvedValue(schedule);

      const result = await controller.getSchedule(scheduleId);
      expect(mockScheduleService.getScheduleById).toHaveBeenCalledWith(
        scheduleId,
        {
          client: true,
          createdByUser: true,
          publishedByUser: true,
        },
      );
      expect(result).toEqual(schedule);
    });
  });

  describe('updateSchedule', () => {
    it('should update a schedule without plan document', async () => {
      const scheduleId = 'schedule_123';
      const updateDto: UpdateScheduleDto = {
        name: 'Updated Schedule',
        startDate: undefined,
        endDate: undefined,
        status: undefined,
        planDocument: undefined,
        version: 1,
        metadata: undefined,
        publishedByUser: undefined,
      };
      const currentSchedule: Partial<ScheduleWithRelations> = {
        uid: scheduleId,
        createdBy: mockUser.id,
      };
      const updatedSchedule: ScheduleWithRelations = {
        id: BigInt(1),
        uid: scheduleId,
        name: updateDto.name || 'Updated',
        startDate: new Date(),
        endDate: new Date(),
        status: 'draft',
        version: updateDto.version || 2,
        planDocument: (updateDto.planDocument as Prisma.JsonObject) || { shows: [] },
        metadata: (updateDto.metadata as Prisma.JsonObject) || {},
        clientId: mockClient.id,
        createdBy: mockUser.id,
        publishedBy: null,
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        client: mockClient,
        createdByUser: mockUser,
        publishedByUser: null,
      };

      mockScheduleService.getScheduleById.mockResolvedValue(
        currentSchedule as any,
      );
      mockScheduleService.updateScheduleFromDto.mockResolvedValue(
        updatedSchedule,
      );

      const result = await controller.updateSchedule(scheduleId, updateDto);
      expect(mockScheduleService.getScheduleById).toHaveBeenCalledWith(
        scheduleId,
      );
      expect(mockScheduleService.updateScheduleFromDto).toHaveBeenCalledWith(
        scheduleId,
        updateDto,
        {
          client: true,
          createdByUser: true,
          publishedByUser: true,
        },
      );
      expect(result).toEqual(updatedSchedule);
    });

    it('should create snapshot when plan document is updated', async () => {
      const scheduleId = 'schedule_123';
      const updateDto: UpdateScheduleDto = {
        planDocument: { shows: [] },
        name: undefined,
        startDate: undefined,
        endDate: undefined,
        status: undefined,
        version: 1,
        metadata: undefined,
        publishedByUser: undefined,
      };
      const currentSchedule: Partial<ScheduleWithRelations> = {
        uid: scheduleId,
        createdBy: mockUser.id,
      };
      const updatedSchedule: ScheduleWithRelations = {
        id: BigInt(1),
        uid: scheduleId,
        name: 'Snapshot Schedule',
        startDate: new Date(),
        endDate: new Date(),
        status: 'draft',
        version: 2,
        planDocument: updateDto.planDocument as Prisma.JsonObject,
        metadata: {},
        clientId: mockClient.id,
        createdBy: mockUser.id,
        publishedBy: null,
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        client: mockClient,
        createdByUser: mockUser,
        publishedByUser: null,
      };

      mockScheduleService.getScheduleById.mockResolvedValue(
        currentSchedule as any,
      );
      mockSchedulePlanningService.createManualSnapshot.mockResolvedValue(
        undefined,
      );
      mockScheduleService.updateScheduleFromDto.mockResolvedValue(
        updatedSchedule,
      );

      const result = await controller.updateSchedule(scheduleId, updateDto);
      expect(
        mockSchedulePlanningService.createManualSnapshot,
      ).toHaveBeenCalledWith(
        scheduleId,
        'auto_save',
        currentSchedule.createdBy,
      );
      expect(result).toEqual(updatedSchedule);
    });
  });

  describe('deleteSchedule', () => {
    it('should delete a schedule', async () => {
      const scheduleId = 'schedule_123';

      mockScheduleService.deleteSchedule.mockResolvedValue(undefined);

      await controller.deleteSchedule(scheduleId);
      expect(mockScheduleService.deleteSchedule).toHaveBeenCalledWith(
        scheduleId,
      );
    });
  });

  describe('validateSchedule', () => {
    it('should validate a schedule', async () => {
      const scheduleId = 'schedule_123';
      const validationResult = {
        isValid: true,
        errors: [],
        warnings: [],
      };

      mockSchedulePlanningService.validateSchedule.mockResolvedValue(
        validationResult as any,
      );

      const result = await controller.validateSchedule(scheduleId);
      expect(mockSchedulePlanningService.validateSchedule).toHaveBeenCalledWith(
        scheduleId,
      );
      expect(result).toEqual(validationResult);
    });
  });

  describe('publishSchedule', () => {
    it('should publish a schedule', async () => {
      const scheduleId = 'schedule_123';
      const publishDto: PublishScheduleDto = { version: 1 };
      const schedule: Partial<ScheduleWithRelations> = {
        uid: scheduleId,
        createdBy: mockUser.id,
        createdByUser: mockUser,
      };
      const publishResult = {
        schedule: {
          uid: scheduleId,
          name: 'Published Schedule',
        },
        showsCreated: 5,
        showsDeleted: 0,
      };
      const publishedSchedule: ScheduleWithRelations = {
        id: BigInt(1),
        uid: scheduleId,
        name: 'Published Schedule',
        startDate: new Date(),
        endDate: new Date(),
        status: 'published',
        version: 1,
        planDocument: { shows: [] },
        metadata: {},
        clientId: mockClient.id,
        createdBy: mockUser.id,
        publishedBy: mockUser.id,
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        client: mockClient,
        createdByUser: mockUser,
        publishedByUser: mockUser,
      };

      mockScheduleService.getScheduleById.mockResolvedValue(schedule as any);
      mockSchedulePlanningService.publishSchedule.mockResolvedValue(
        publishResult as any,
      );
      mockScheduleService.getScheduleById
        .mockResolvedValueOnce(schedule as any)
        .mockResolvedValueOnce(publishedSchedule);

      const result = await controller.publishSchedule(scheduleId, publishDto);
      expect(mockSchedulePlanningService.publishSchedule).toHaveBeenCalledWith(
        scheduleId,
        publishDto.version,
        schedule.createdBy,
      );
      expect(mockScheduleService.getScheduleById).toHaveBeenCalledWith(
        scheduleId,
        {
          client: true,
          createdByUser: true,
          publishedByUser: true,
        },
      );
      expect(result).toEqual(publishedSchedule);
    });
  });

  describe('duplicateSchedule', () => {
    it('should duplicate a schedule', async () => {
      const scheduleId = 'schedule_123';
      const duplicateDto = {
        name: 'Duplicated Schedule',
        created_by: 'user_123',
      };
      const user = { ...mockUser, id: BigInt(1) };
      const duplicatedSchedule = {
        uid: 'schedule_456',
        name: 'Duplicated Schedule',
      };
      const scheduleWithRelations: ScheduleWithRelations = {
        id: BigInt(2),
        uid: 'schedule_456',
        name: 'Duplicated Schedule',
        startDate: new Date(),
        endDate: new Date(),
        status: 'draft',
        version: 1,
        planDocument: { shows: [] },
        metadata: {},
        clientId: mockClient.id,
        createdBy: user.id,
        publishedBy: null,
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        client: mockClient,
        createdByUser: user,
        publishedByUser: null,
      };

      mockUserService.getUserById.mockResolvedValue(user);
      mockScheduleService.duplicateSchedule.mockResolvedValue(
        duplicatedSchedule as any,
      );
      mockScheduleService.getScheduleById.mockResolvedValue(
        scheduleWithRelations,
      );

      const result = await controller.duplicateSchedule(
        scheduleId,
        duplicateDto,
      );
      expect(mockUserService.getUserById).toHaveBeenCalledWith(
        duplicateDto.created_by,
      );
      expect(mockScheduleService.duplicateSchedule).toHaveBeenCalledWith(
        scheduleId,
        duplicateDto.name,
        user.id,
      );
      expect(mockScheduleService.getScheduleById).toHaveBeenCalledWith(
        duplicatedSchedule.uid,
        {
          client: true,
          createdByUser: true,
          publishedByUser: true,
        },
      );
      expect(result).toEqual(scheduleWithRelations);
    });
  });

  describe('getScheduleSnapshots', () => {
    it('should return schedule snapshots', async () => {
      const scheduleId = 'schedule_123';
      const query = new ListSnapshotsQueryDto();
      query.limit = 10;
      const snapshots = [
        { uid: 'snapshot_1', scheduleId, createdAt: new Date() },
        { uid: 'snapshot_2', scheduleId, createdAt: new Date() },
      ];

      mockSchedulePlanningService.getSnapshotsBySchedule.mockResolvedValue(
        snapshots as any,
      );

      const result = await controller.getScheduleSnapshots(scheduleId, query);
      expect(
        mockSchedulePlanningService.getSnapshotsBySchedule,
      ).toHaveBeenCalledWith(scheduleId, {
        limit: query.limit,
        orderBy: 'desc',
      });
      expect(result).toEqual(snapshots);
    });

    it('should return snapshots without limit', async () => {
      const scheduleId = 'schedule_123';
      const query = new ListSnapshotsQueryDto();
      const snapshots = [{ uid: 'snapshot_1', scheduleId }];

      mockSchedulePlanningService.getSnapshotsBySchedule.mockResolvedValue(
        snapshots as any,
      );

      const result = await controller.getScheduleSnapshots(scheduleId, query);
      expect(
        mockSchedulePlanningService.getSnapshotsBySchedule,
      ).toHaveBeenCalledWith(scheduleId, {
        limit: undefined,
        orderBy: 'desc',
      });
      expect(result).toEqual(snapshots);
    });
  });

  describe('bulkCreateSchedules', () => {
    it('should bulk create schedules', async () => {
      const bulkDto: BulkCreateScheduleDto = {
        schedules: [
          {
            name: 'Schedule 1',
            client: { connect: { uid: 'client_123' } },
            createdByUser: { connect: { uid: 'user_123' } },
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-01-31'),
            status: 'draft',
            planDocument: { shows: [] },
            version: 1,
            metadata: {},
          },
        ],
      };
      const bulkResult = {
        total: 1,
        successful: 1,
        failed: 0,
        results: [],
        successfulSchedules: [{ uid: 'schedule_1' }] as Schedule[],
      };

      mockScheduleService.bulkCreateSchedules.mockResolvedValue(
        bulkResult,
      );

      const result = await controller.bulkCreateSchedules(bulkDto);
      expect(mockScheduleService.bulkCreateSchedules).toHaveBeenCalledWith(
        bulkDto,
        {
          client: true,
          createdByUser: true,
          publishedByUser: true,
        },
      );
      expect(result).toEqual({
        total: bulkResult.total,
        successful: bulkResult.successful,
        failed: bulkResult.failed,
        results: bulkResult.results,
        successful_schedules: bulkResult.successfulSchedules,
      });
    });
  });

  describe('bulkUpdateSchedules', () => {
    it('should bulk update schedules', async () => {
      const bulkDto: BulkUpdateScheduleDto = {
        schedules: [
          {
            scheduleId: 'schedule_123',
            name: 'Updated Schedule',
            startDate: undefined,
            endDate: undefined,
            status: undefined,
            planDocument: undefined,
            version: 1,
            metadata: undefined,
            publishedByUser: undefined,
          },
        ],
      };
      const bulkResult = {
        total: 1,
        successful: 1,
        failed: 0,
        results: [],
        successfulSchedules: [{ uid: 'schedule_123' }] as Schedule[],
      };

      mockScheduleService.bulkUpdateSchedules.mockResolvedValue(
        bulkResult,
      );

      const result = await controller.bulkUpdateSchedules(bulkDto);
      expect(mockScheduleService.bulkUpdateSchedules).toHaveBeenCalledWith(
        bulkDto,
        {
          client: true,
          createdByUser: true,
          publishedByUser: true,
        },
      );
      expect(result).toEqual({
        total: bulkResult.total,
        successful: bulkResult.successful,
        failed: bulkResult.failed,
        results: bulkResult.results,
        successful_schedules: bulkResult.successfulSchedules,
      });
    });
  });

  describe('getMonthlyOverview', () => {
    it('should return monthly overview', async () => {
      const query: MonthlyOverviewQueryDto = {
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      } as MonthlyOverviewQueryDto;
      const overviewResult = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        totalSchedules: 10,
        schedulesByClient: {
          client_123: {
            clientId: 'client_123',
            clientName: 'Client 1',
            count: 5,
            schedules: [] as Schedule[],
          },
        },
        schedulesByStatus: {},
        schedules: [] as Schedule[],
      };

      mockScheduleService.getMonthlyOverview.mockResolvedValue(
        overviewResult,
      );

      const result = await controller.getMonthlyOverview(query);
      expect(mockScheduleService.getMonthlyOverview).toHaveBeenCalledWith(
        {
          startDate: new Date(query.start_date),
          endDate: new Date(query.end_date),
          clientIds: query.client_ids,
          status: query.status,
          includeDeleted: query.include_deleted,
        },
        {
          client: true,
          createdByUser: true,
          publishedByUser: true,
        },
      );
      expect(result.start_date).toBe(overviewResult.startDate.toISOString());
      expect(result.end_date).toBe(overviewResult.endDate.toISOString());
      expect(result.total_schedules).toBe(overviewResult.totalSchedules);
    });
  });
});
