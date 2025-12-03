import { ConfigService } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

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
        clientId: 'client_123',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      } as CreateScheduleDto;
      const createdSchedule = {
        uid: 'schedule_123',
        ...createDto,
        client: { uid: 'client_123' },
        createdByUser: { uid: 'user_123' },
        publishedByUser: null,
      };

      mockScheduleService.createScheduleFromDto.mockResolvedValue(
        createdSchedule as any,
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
      const schedule = {
        uid: scheduleId,
        name: 'Test Schedule',
        client: { uid: 'client_123' },
        createdByUser: { uid: 'user_123' },
        publishedByUser: null,
      };

      mockScheduleService.getScheduleById.mockResolvedValue(schedule as any);

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
      const updateDto: UpdateScheduleDto = { name: 'Updated Schedule' };
      const currentSchedule = {
        uid: scheduleId,
        createdBy: BigInt(1),
      };
      const updatedSchedule = {
        uid: scheduleId,
        ...updateDto,
        client: { uid: 'client_123' },
        createdByUser: { uid: 'user_123' },
        publishedByUser: null,
      };

      mockScheduleService.getScheduleById.mockResolvedValue(
        currentSchedule as any,
      );
      mockScheduleService.updateScheduleFromDto.mockResolvedValue(
        updatedSchedule as any,
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
      };
      const currentSchedule = {
        uid: scheduleId,
        createdBy: BigInt(1),
      };
      const updatedSchedule = {
        uid: scheduleId,
        ...updateDto,
        client: { uid: 'client_123' },
        createdByUser: { uid: 'user_123' },
        publishedByUser: null,
      };

      mockScheduleService.getScheduleById.mockResolvedValue(
        currentSchedule as any,
      );
      mockSchedulePlanningService.createManualSnapshot.mockResolvedValue(
        undefined,
      );
      mockScheduleService.updateScheduleFromDto.mockResolvedValue(
        updatedSchedule as any,
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
      const schedule = {
        uid: scheduleId,
        createdBy: BigInt(1),
        createdByUser: { uid: 'user_123' },
      };
      const publishResult = {
        schedule: {
          uid: scheduleId,
          name: 'Published Schedule',
        },
        showsCreated: 5,
        showsDeleted: 0,
      };
      const publishedSchedule = {
        uid: scheduleId,
        name: 'Published Schedule',
        client: { uid: 'client_123' },
        createdByUser: { uid: 'user_123' },
        publishedByUser: { uid: 'user_123' },
      };

      mockScheduleService.getScheduleById.mockResolvedValue(schedule as any);
      mockSchedulePlanningService.publishSchedule.mockResolvedValue(
        publishResult as any,
      );
      mockScheduleService.getScheduleById
        .mockResolvedValueOnce(schedule as any)
        .mockResolvedValueOnce(publishedSchedule as any);

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
      const user = { uid: 'user_123', id: BigInt(1) };
      const duplicatedSchedule = {
        uid: 'schedule_456',
        name: 'Duplicated Schedule',
      };
      const scheduleWithRelations = {
        ...duplicatedSchedule,
        client: { uid: 'client_123' },
        createdByUser: { uid: 'user_123' },
        publishedByUser: null,
      };

      mockUserService.getUserById.mockResolvedValue(user as any);
      mockScheduleService.duplicateSchedule.mockResolvedValue(
        duplicatedSchedule as any,
      );
      mockScheduleService.getScheduleById.mockResolvedValue(
        scheduleWithRelations as any,
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
            clientId: 'client_123',
            startDate: '2024-01-01',
            endDate: '2024-01-31',
          },
        ],
      };
      const bulkResult = {
        total: 1,
        successful: 1,
        failed: 0,
        results: [],
        successfulSchedules: [{ uid: 'schedule_1' }],
      };

      mockScheduleService.bulkCreateSchedules.mockResolvedValue(
        bulkResult as any,
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
            id: 'schedule_123',
            name: 'Updated Schedule',
          },
        ],
      };
      const bulkResult = {
        total: 1,
        successful: 1,
        failed: 0,
        results: [],
        successfulSchedules: [{ uid: 'schedule_123' }],
      };

      mockScheduleService.bulkUpdateSchedules.mockResolvedValue(
        bulkResult as any,
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
            schedules: [],
          },
        },
        schedulesByStatus: {},
        schedules: [],
      };

      mockScheduleService.getMonthlyOverview.mockResolvedValue(
        overviewResult as any,
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
