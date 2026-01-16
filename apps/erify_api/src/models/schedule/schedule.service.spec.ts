/* eslint-disable  */
import { BadRequestException, ConflictException } from '@nestjs/common';
import type { Prisma, Schedule } from '@prisma/client';

import {
  type BulkCreateScheduleDto,
  bulkCreateScheduleSchema,
  type BulkUpdateScheduleDto,
  bulkUpdateScheduleSchema,
} from './schemas/schedule.schema';
import { ScheduleService } from './schedule.service';

import { ScheduleRepository } from '@/models/schedule/schedule.repository';
import { PrismaService } from '@/prisma/prisma.service';
import {
  createMockRepository,
  createMockUtilityService,
  createModelServiceTestModule,
} from '@/testing/model-service-test.helper';

type ScheduleWithRelations = Prisma.ScheduleGetPayload<{
  include: {
    client: true;
    createdByUser: true;
    publishedByUser: true;
  };
}>;

describe('scheduleService', () => {
  let service: ScheduleService;
  let scheduleRepository: jest.Mocked<ScheduleRepository>;

  const mockClient1 = {
    id: BigInt(1),
    uid: 'client_client001',
    name: 'Client A',
    contactPerson: 'John Doe',
    contactEmail: 'john@clienta.com',
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockClient2 = {
    id: BigInt(2),
    uid: 'client_client002',
    name: 'Client B',
    contactPerson: 'Jane Smith',
    contactEmail: 'jane@clientb.com',
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockUser = {
    id: BigInt(1),
    uid: 'user_user001',
    email: 'admin@example.com',
    name: 'Admin User',
    extId: null,
    isBanned: false,
    isSystemAdmin: false,
    profileUrl: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockSchedule1: ScheduleWithRelations = {
    id: BigInt(1),
    uid: 'schedule_schedule001',
    name: 'January 2025 - Client A',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-01-31'),
    status: 'draft',
    version: 1,
    clientId: mockClient1.id,
    createdBy: mockUser.id,
    publishedBy: null,
    publishedAt: null,
    planDocument: { shows: [] },
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    client: mockClient1,
    createdByUser: mockUser,
    publishedByUser: null,
  } as ScheduleWithRelations;

  const mockSchedule2: ScheduleWithRelations = {
    id: BigInt(2),
    uid: 'schedule_schedule002',
    name: 'January 2025 - Client B',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-01-31'),
    status: 'draft',
    version: 1,
    clientId: mockClient2.id,
    createdBy: mockUser.id,
    publishedBy: null,
    publishedAt: null,
    planDocument: { shows: [] },
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    client: mockClient2,
    createdByUser: mockUser,
    publishedByUser: null,
  } as ScheduleWithRelations;

  beforeEach(async () => {
    const scheduleRepositoryMock = createMockRepository<ScheduleRepository>({
      findOne: jest.fn(),
    });

    const utilityMock = createMockUtilityService();
    // Override generateBrandedId to use generateUid pattern for schedule
    utilityMock.generateBrandedId = jest.fn((prefix: string) => {
      const random = Math.random().toString(36).substring(2, 8);
      return `${prefix}_${random}`;
    }) as jest.Mock;

    const module = await createModelServiceTestModule({
      serviceClass: ScheduleService,
      repositoryClass: ScheduleRepository,
      repositoryMock: scheduleRepositoryMock,
      utilityMock,
      additionalProviders: [
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    });

    service = module.get<ScheduleService>(ScheduleService);
    scheduleRepository = module.get(ScheduleRepository);

    // Setup default mock for createScheduleFromDto
    jest
      .spyOn(service, 'createScheduleFromDto')
      .mockImplementation(
        (
          dto,
          _include?: Prisma.ScheduleInclude,
        ): Promise<Schedule | ScheduleWithRelations> => {
          const randomId = Math.random().toString(36).substring(2, 8);
          const schedule: ScheduleWithRelations = {
            ...mockSchedule1,
            uid: `schedule_${randomId}`,
            name: dto.name,
            startDate: dto.startDate,
            endDate: dto.endDate,
            clientId:
              dto.client?.connect?.uid === mockClient1.uid
                ? mockClient1.id
                : mockClient2.id,
            client:
              dto.client?.connect?.uid === mockClient1.uid
                ? mockClient1
                : mockClient2,
          };
          return Promise.resolve(schedule);
        },
      );
  });

  describe('bulkCreateSchedules', () => {
    it('should create multiple schedules for different clients successfully', async () => {
      // Parse through schema to get transformed DTO
      const bulkDto = bulkCreateScheduleSchema.parse({
        schedules: [
          {
            name: 'January 2025 - Client A',
            start_date: '2025-01-01T00:00:00Z',
            end_date: '2025-01-31T23:59:59Z',
            client_id: mockClient1.uid,
            created_by: mockUser.uid,
            plan_document: { shows: [] },
          },
          {
            name: 'January 2025 - Client B',
            start_date: '2025-01-01T00:00:00Z',
            end_date: '2025-01-31T23:59:59Z',
            client_id: mockClient2.uid,
            created_by: mockUser.uid,
            plan_document: { shows: [] },
          },
        ],
      }) as BulkCreateScheduleDto;

      const result = await service.bulkCreateSchedules(bulkDto, {
        client: true,
        createdByUser: true,
      });

      expect(result.total).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(true);
      expect(result.results[0].client_id).toBe(mockClient1.uid);
      expect(result.results[1].client_id).toBe(mockClient2.uid);
      expect(result.successfulSchedules).toBeDefined();
      expect(result.successfulSchedules).toHaveLength(2);
    });

    it('should handle partial success when some schedules fail', async () => {
      jest
        .spyOn(service, 'createScheduleFromDto')
        .mockImplementationOnce(
          (): Promise<Schedule | ScheduleWithRelations> =>
            Promise.resolve(mockSchedule1),
        )
        .mockImplementationOnce(() => {
          return Promise.reject(new BadRequestException('Invalid date range'));
        });

      const bulkDto = bulkCreateScheduleSchema.parse({
        schedules: [
          {
            name: 'January 2025 - Client A',
            start_date: '2025-01-01T00:00:00Z',
            end_date: '2025-01-31T23:59:59Z',
            client_id: mockClient1.uid,
            created_by: mockUser.uid,
            plan_document: { shows: [] },
          },
          {
            name: 'January 2025 - Client B',
            start_date: '2025-01-31T00:00:00Z',
            end_date: '2025-01-31T23:59:59Z',
            client_id: mockClient2.uid,
            created_by: mockUser.uid,
            plan_document: { shows: [] },
          },
        ],
      }) as BulkCreateScheduleDto;

      const result = await service.bulkCreateSchedules(bulkDto, {
        client: true,
        createdByUser: true,
      });

      expect(result.total).toBe(2);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toBeDefined();
      expect(result.results[1].error_code).toBe('BAD_REQUEST');
      expect(result.successfulSchedules).toBeDefined();
      expect(result.successfulSchedules).toHaveLength(1);
    });

    it('should handle all schedules failing', async () => {
      jest
        .spyOn(service, 'createScheduleFromDto')
        .mockRejectedValue(new BadRequestException('Invalid client ID'));

      const bulkDto = bulkCreateScheduleSchema.parse({
        schedules: [
          {
            name: 'January 2025 - Client A',
            start_date: '2025-01-01T00:00:00Z',
            end_date: '2025-01-31T23:59:59Z',
            client_id: 'client_invalid',
            created_by: mockUser.uid,
            plan_document: { shows: [] },
          },
          {
            name: 'January 2025 - Client B',
            start_date: '2025-01-01T00:00:00Z',
            end_date: '2025-01-31T23:59:59Z',
            client_id: 'client_invalid',
            created_by: mockUser.uid,
            plan_document: { shows: [] },
          },
        ],
      }) as BulkCreateScheduleDto;

      const result = await service.bulkCreateSchedules(bulkDto);

      expect(result.total).toBe(2);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(2);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].success).toBe(false);
      expect(result.results[1].success).toBe(false);
      expect(result.successfulSchedules).toBeUndefined();
    });

    it('should handle ConflictException errors correctly', async () => {
      jest
        .spyOn(service, 'createScheduleFromDto')
        .mockRejectedValue(new ConflictException('Schedule already exists'));

      const bulkDto = bulkCreateScheduleSchema.parse({
        schedules: [
          {
            name: 'January 2025 - Client A',
            start_date: '2025-01-01T00:00:00Z',
            end_date: '2025-01-31T23:59:59Z',
            client_id: mockClient1.uid,
            created_by: mockUser.uid,
            plan_document: { shows: [] },
          },
        ],
      }) as BulkCreateScheduleDto;

      const result = await service.bulkCreateSchedules(bulkDto);

      expect(result.failed).toBe(1);
      expect(result.results[0].error_code).toBe('CONFLICT');
      expect(result.results[0].error).toContain('already exists');
    });

    it('should preserve index mapping for error tracking', async () => {
      jest
        .spyOn(service, 'createScheduleFromDto')
        .mockImplementationOnce(
          (): Promise<Schedule | ScheduleWithRelations> =>
            Promise.resolve(mockSchedule1),
        )
        .mockImplementationOnce(() => {
          return Promise.reject(new BadRequestException('Error'));
        })
        .mockImplementationOnce(
          (): Promise<Schedule | ScheduleWithRelations> =>
            Promise.resolve(mockSchedule2),
        );

      const bulkDto = bulkCreateScheduleSchema.parse({
        schedules: [
          {
            name: 'Schedule 1',
            start_date: '2025-01-01T00:00:00Z',
            end_date: '2025-01-31T23:59:59Z',
            client_id: mockClient1.uid,
            created_by: mockUser.uid,
            plan_document: { shows: [] },
          },
          {
            name: 'Schedule 2',
            start_date: '2025-01-01T00:00:00Z',
            end_date: '2025-01-31T23:59:59Z',
            client_id: mockClient2.uid,
            created_by: mockUser.uid,
            plan_document: { shows: [] },
          },
          {
            name: 'Schedule 3',
            start_date: '2025-01-01T00:00:00Z',
            end_date: '2025-01-31T23:59:59Z',
            client_id: mockClient2.uid,
            created_by: mockUser.uid,
            plan_document: { shows: [] },
          },
        ],
      }) as BulkCreateScheduleDto;

      const result = await service.bulkCreateSchedules(bulkDto);

      expect(result.results[0].index).toBe(0);
      expect(result.results[1].index).toBe(1);
      expect(result.results[2].index).toBe(2);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
      expect(result.results[2].success).toBe(true);
    });
  });

  describe('bulkUpdateSchedules', () => {
    it('should update multiple schedules successfully', async () => {
      jest
        .spyOn(service, 'getScheduleById')
        .mockResolvedValueOnce(
          mockSchedule1 as Schedule | ScheduleWithRelations,
        )
        .mockResolvedValueOnce(
          mockSchedule2 as Schedule | ScheduleWithRelations,
        );
      jest
        .spyOn(service, 'updateSchedule')
        .mockResolvedValueOnce(
          mockSchedule1 as Schedule | ScheduleWithRelations,
        )
        .mockResolvedValueOnce(
          mockSchedule2 as Schedule | ScheduleWithRelations,
        );

      const bulkDto = bulkUpdateScheduleSchema.parse({
        schedules: [
          {
            schedule_id: mockSchedule1.uid,
            name: 'Updated Schedule 1',
            version: 1,
          },
          {
            schedule_id: mockSchedule2.uid,
            name: 'Updated Schedule 2',
            version: 1,
          },
        ],
      }) as BulkUpdateScheduleDto;

      const result = await service.bulkUpdateSchedules(bulkDto, {
        client: true,
      });

      expect(result.total).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(true);
    });

    it('should handle partial success in bulk updates', async () => {
      jest
        .spyOn(service, 'getScheduleById')
        .mockResolvedValueOnce(
          mockSchedule1 as Schedule | ScheduleWithRelations,
        )
        .mockResolvedValueOnce(
          mockSchedule1 as Schedule | ScheduleWithRelations,
        );
      jest
        .spyOn(service, 'updateSchedule')
        .mockResolvedValueOnce(
          mockSchedule1 as Schedule | ScheduleWithRelations,
        )
        .mockRejectedValueOnce(new ConflictException('Version mismatch'));

      const bulkDto = bulkUpdateScheduleSchema.parse({
        schedules: [
          {
            schedule_id: mockSchedule1.uid,
            name: 'Updated Schedule 1',
            version: 1,
          },
          {
            schedule_id: mockSchedule1.uid,
            name: 'Updated Schedule 2',
            version: 2,
          },
        ],
      }) as BulkUpdateScheduleDto;

      const result = await service.bulkUpdateSchedules(bulkDto);

      expect(result.total).toBe(2);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.results[1].error_code).toBe('CONFLICT');
    });
  });

  describe('getMonthlyOverview', () => {
    beforeEach(() => {
      scheduleRepository.findMany = jest.fn().mockResolvedValue([
        {
          ...mockSchedule1,
          client: mockClient1,
        },
        {
          ...mockSchedule2,
          client: mockClient2,
        },
      ]);
    });

    it('should return schedules grouped by client for a date range', async () => {
      const result = await service.getMonthlyOverview(
        {
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-31'),
        },
        {
          client: true,
        },
      );

      expect(result.totalSchedules).toBe(2);
      expect(result.schedules).toHaveLength(2);
      expect(Object.keys(result.schedulesByClient)).toHaveLength(2);
      expect(result.schedulesByClient[mockClient1.uid]).toBeDefined();
      expect(result.schedulesByClient[mockClient1.uid].count).toBe(1);
      expect(result.schedulesByClient[mockClient2.uid]).toBeDefined();
      expect(result.schedulesByClient[mockClient2.uid].count).toBe(1);
    });

    it('should filter by client IDs when provided', async () => {
      scheduleRepository.findMany = jest.fn().mockResolvedValue([
        {
          ...mockSchedule1,
          client: mockClient1,
        },
      ]);

      const result = await service.getMonthlyOverview(
        {
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-31'),
          clientIds: [mockClient1.uid],
        },
        {
          client: true,
        },
      );

      expect(result.totalSchedules).toBe(1);
      expect(Object.keys(result.schedulesByClient)).toHaveLength(1);
      expect(result.schedulesByClient[mockClient1.uid]).toBeDefined();
    });

    it('should group schedules by status', async () => {
      const draftSchedule = { ...mockSchedule1, status: 'draft' };
      const publishedSchedule = { ...mockSchedule2, status: 'published' };

      scheduleRepository.findMany = jest.fn().mockResolvedValue([
        { ...draftSchedule, client: mockClient1 },
        { ...publishedSchedule, client: mockClient2 },
      ]);

      const result = await service.getMonthlyOverview(
        {
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-31'),
        },
        {
          client: true,
        },
      );

      expect(result.schedulesByStatus.draft).toBe(1);
      expect(result.schedulesByStatus.published).toBe(1);
    });

    it('should filter by status when provided', async () => {
      scheduleRepository.findMany = jest
        .fn()
        .mockResolvedValue([
          { ...mockSchedule1, status: 'draft', client: mockClient1 },
        ]);

      const result = await service.getMonthlyOverview(
        {
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-31'),
          status: 'draft',
        },
        {
          client: true,
        },
      );

      expect(result.totalSchedules).toBe(1);
      expect(result.schedules[0].status).toBe('draft');
    });
  });

  describe('getPaginatedSchedules', () => {
    beforeEach(() => {
      scheduleRepository.findMany = jest
        .fn()
        .mockResolvedValue([mockSchedule1]);
      scheduleRepository.count = jest.fn().mockResolvedValue(1);
    });

    it('should return paginated schedules with default filtering', async () => {
      const query = {
        skip: 0,
        take: 10,
        page: 1,
        limit: 10,
        client_id: undefined,
        status: undefined,
        created_by: undefined,
        published_by: undefined,
        start_date_from: undefined,
        start_date_to: undefined,
        end_date_from: undefined,
        end_date_to: undefined,
        name: undefined,
        order_by: 'created_at' as const,
        order_direction: 'desc' as const,
        include_plan_document: false,
        include_deleted: false,
        uid: undefined,
      };

      const result = await service.getPaginatedSchedules(query);

      expect(result.schedules).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(scheduleRepository.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        where: {
          deletedAt: null,
        },
        include: {
          client: true,
          createdByUser: true,
          publishedByUser: true,
        },
      });
      expect(scheduleRepository.count).toHaveBeenCalledWith({
        deletedAt: null,
      });
    });

    it('should apply client filtering', async () => {
      const query = {
        skip: 0,
        take: 10,
        page: 1,
        limit: 10,
        client_id: mockClient1.uid,
        status: undefined,
        created_by: undefined,
        published_by: undefined,
        start_date_from: undefined,
        start_date_to: undefined,
        end_date_from: undefined,
        end_date_to: undefined,
        name: undefined,
        order_by: 'created_at' as const,
        order_direction: 'desc' as const,
        include_plan_document: false,
        include_deleted: false,
        uid: undefined,
      };

      await service.getPaginatedSchedules(query);

      expect(scheduleRepository.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        where: {
          deletedAt: null,
          client: {
            uid: {
              in: [mockClient1.uid],
            },
            deletedAt: null,
          },
        },
        include: {
          client: true,
          createdByUser: true,
          publishedByUser: true,
        },
      });
    });

    it('should apply status filtering', async () => {
      const query = {
        skip: 0,
        take: 10,
        page: 1,
        limit: 10,
        client_id: undefined,
        status: 'draft',
        created_by: undefined,
        published_by: undefined,
        start_date_from: undefined,
        start_date_to: undefined,
        end_date_from: undefined,
        end_date_to: undefined,
        name: undefined,
        order_by: 'created_at' as const,
        order_direction: 'desc' as const,
        include_plan_document: false,
        include_deleted: false,
        uid: undefined,
      };

      await service.getPaginatedSchedules(query);

      expect(scheduleRepository.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        where: {
          deletedAt: null,
          status: { in: ['draft'] },
        },
        include: {
          client: true,
          createdByUser: true,
          publishedByUser: true,
        },
      });
    });

    it('should apply date range filtering', async () => {
      const query = {
        skip: 0,
        take: 10,
        page: 1,
        limit: 10,
        client_id: undefined,
        status: undefined,
        created_by: undefined,
        published_by: undefined,
        start_date_from: '2025-01-01T00:00:00Z',
        start_date_to: '2025-01-31T23:59:59Z',
        end_date_from: undefined,
        end_date_to: undefined,
        name: undefined,
        order_by: 'created_at' as const,
        order_direction: 'desc' as const,
        include_plan_document: false,
        include_deleted: false,
        uid: undefined,
      };

      await service.getPaginatedSchedules(query);

      expect(scheduleRepository.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        where: {
          deletedAt: null,
          startDate: {
            gte: new Date('2025-01-01T00:00:00Z'),
            lte: new Date('2025-01-31T23:59:59Z'),
          },
        },
        include: {
          client: true,
          createdByUser: true,
          publishedByUser: true,
        },
      });
    });

    it('should apply name search filtering', async () => {
      const query = {
        skip: 0,
        take: 10,
        page: 1,
        limit: 10,
        client_id: undefined,
        status: undefined,
        created_by: undefined,
        published_by: undefined,
        start_date_from: undefined,
        start_date_to: undefined,
        end_date_from: undefined,
        end_date_to: undefined,
        name: 'January',
        order_by: 'created_at' as const,
        order_direction: 'desc' as const,
        include_plan_document: false,
        include_deleted: false,
        uid: undefined,
      };

      await service.getPaginatedSchedules(query);

      expect(scheduleRepository.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        where: {
          deletedAt: null,
          name: {
            contains: 'January',
            mode: 'insensitive',
          },
        },
        include: {
          client: true,
          createdByUser: true,
          publishedByUser: true,
        },
      });
    });

    it('should apply custom ordering', async () => {
      const query = {
        skip: 0,
        take: 10,
        page: 1,
        limit: 10,
        client_id: undefined,
        status: undefined,
        created_by: undefined,
        published_by: undefined,
        start_date_from: undefined,
        start_date_to: undefined,
        end_date_from: undefined,
        end_date_to: undefined,
        name: undefined,
        order_by: 'start_date' as const,
        order_direction: 'asc' as const,
        include_plan_document: false,
        include_deleted: false,
        uid: undefined,
      };

      await service.getPaginatedSchedules(query);

      expect(scheduleRepository.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { startDate: 'asc' },
        where: {
          deletedAt: null,
        },
        include: {
          client: true,
          createdByUser: true,
          publishedByUser: true,
        },
      });
    });

    it('should include deleted records when include_deleted is true', async () => {
      const query = {
        skip: 0,
        take: 10,
        page: 1,
        limit: 10,
        client_id: undefined,
        status: undefined,
        created_by: undefined,
        published_by: undefined,
        start_date_from: undefined,
        start_date_to: undefined,
        end_date_from: undefined,
        end_date_to: undefined,
        name: undefined,
        order_by: 'created_at' as const,
        order_direction: 'desc' as const,
        include_plan_document: false,
        include_deleted: true,
        uid: undefined,
      };

      await service.getPaginatedSchedules(query);

      expect(scheduleRepository.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        where: {}, // No deletedAt filter
        include: {
          client: true,
          createdByUser: true,
          publishedByUser: true,
        },
      });
    });

    it('should handle multiple filters combined', async () => {
      const query = {
        skip: 0,
        take: 10,
        page: 1,
        limit: 10,
        client_id: [mockClient1.uid, mockClient2.uid],
        status: ['draft', 'review'],
        created_by: mockUser.uid,
        published_by: undefined,
        start_date_from: '2025-01-01T00:00:00Z',
        start_date_to: undefined,
        end_date_from: undefined,
        end_date_to: '2025-12-31T23:59:59Z',
        name: 'planning',
        order_by: 'updated_at' as const,
        order_direction: 'asc' as const,
        include_plan_document: false,
        include_deleted: false,
        uid: undefined,
      };

      await service.getPaginatedSchedules(query);

      expect(scheduleRepository.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { updatedAt: 'asc' },
        where: {
          deletedAt: null,
          client: {
            uid: { in: [mockClient1.uid, mockClient2.uid] },
            deletedAt: null,
          },
          status: { in: ['draft', 'review'] },
          createdByUser: {
            uid: { in: [mockUser.uid] },
            deletedAt: null,
          },
          startDate: {
            gte: new Date('2025-01-01T00:00:00Z'),
          },
          endDate: {
            lte: new Date('2025-12-31T23:59:59Z'),
          },
          name: {
            contains: 'planning',
            mode: 'insensitive',
          },
        },
        include: {
          client: true,
          createdByUser: true,
          publishedByUser: true,
        },
      });
    });
  });

  describe('appendShows', () => {
    const mockScheduleWithUploadProgress = {
      ...mockSchedule1,
      planDocument: {
        metadata: {
          lastEditedBy: mockUser.uid,
          lastEditedAt: new Date().toISOString(),
          totalShows: 0,
          clientName: 'Test Client',
          dateRange: {
            start: '2025-01-01T00:00:00Z',
            end: '2025-01-31T23:59:59Z',
          },
          uploadProgress: {
            expectedChunks: 10,
            receivedChunks: 0,
            lastChunkIndex: undefined,
            isComplete: false,
          },
        },
        shows: [],
      },
    };

    const mockShows = [
      {
        tempId: 'temp_1',
        name: 'Test Show 1',
        startTime: '2025-01-01T10:00:00Z',
        endTime: '2025-01-01T12:00:00Z',
        clientUid: mockClient1.uid,
        studioRoomUid: 'srm_001',
        showTypeUid: 'sht_001',
        showStatusUid: 'shst_001',
        showStandardUid: 'shsd_001',
        mcs: [],
        platforms: [],
        metadata: {},
      },
    ];

    beforeEach(() => {
      scheduleRepository.findByUid = jest
        .fn()
        .mockResolvedValue(mockScheduleWithUploadProgress);
      scheduleRepository.update = jest.fn().mockResolvedValue({
        ...mockScheduleWithUploadProgress,
        version: 2,
      });
    });

    it('should append shows successfully for first chunk', async () => {
      const result = await service.appendShows(
        mockSchedule1.uid,
        mockShows,
        1,
        1
      );

      expect(scheduleRepository.findByUid).toHaveBeenCalledWith(
        mockSchedule1.uid,
        undefined,
      );
      expect(scheduleRepository.update).toHaveBeenCalled();
      expect(result.version).toBe(2);
    });

    it('should validate sequential chunks', async () => {
      const scheduleWithChunk1 = {
        ...mockScheduleWithUploadProgress,
        planDocument: {
          ...mockScheduleWithUploadProgress.planDocument,
          metadata: {
            ...mockScheduleWithUploadProgress.planDocument.metadata,
            uploadProgress: {
              expectedChunks: 10,
              receivedChunks: 1,
              lastChunkIndex: 1,
              isComplete: false,
            },
          },
          shows: mockShows,
        },
        version: 2,
      };

      scheduleRepository.findByUid = jest
        .fn()
        .mockResolvedValue(scheduleWithChunk1);

      // Try to upload chunk 3 (should fail, expecting chunk 2)
      await expect(
        service.appendShows(mockSchedule1.uid, mockShows, 3, 2),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject append if upload is already complete', async () => {
      const scheduleComplete = {
        ...mockScheduleWithUploadProgress,
        planDocument: {
          ...mockScheduleWithUploadProgress.planDocument,
          metadata: {
            ...mockScheduleWithUploadProgress.planDocument.metadata,
            uploadProgress: {
              expectedChunks: 10,
              receivedChunks: 10,
              lastChunkIndex: 10,
              isComplete: true,
            },
          },
        },
      };

      scheduleRepository.findByUid = jest
        .fn()
        .mockResolvedValue(scheduleComplete);

      await expect(
        service.appendShows(mockSchedule1.uid, mockShows, 1, 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject append if schedule is not in draft status', async () => {
      const publishedSchedule = {
        ...mockScheduleWithUploadProgress,
        status: 'published',
      };

      scheduleRepository.findByUid = jest
        .fn()
        .mockResolvedValue(publishedSchedule);

      const result = await service.appendShows(mockSchedule1.uid, mockShows, 1, 1);
      
      // Should have been called twice: 1. Status transition, 2. Data update
      expect(scheduleRepository.update).toHaveBeenCalledTimes(2);
      expect(scheduleRepository.update).toHaveBeenNthCalledWith(
        1,
        { uid: mockSchedule1.uid },
        { status: 'draft' },
      );
      expect(result.status).toBe('draft');
    });

    it('should transition to draft on updateSchedule if published', async () => {
      const publishedSchedule = {
        ...mockSchedule1,
        status: 'published',
      };
      scheduleRepository.findByUid = jest.fn().mockResolvedValue(publishedSchedule);
      scheduleRepository.update = jest.fn().mockResolvedValue({
        ...publishedSchedule,
        status: 'draft',
      });

      const result = await service.updateSchedule(
        mockSchedule1.uid,
        { name: 'Updated Name' },
        1
      );

      expect(scheduleRepository.update).toHaveBeenCalledWith(
        { uid: mockSchedule1.uid },
        expect.objectContaining({ name: 'Updated Name', status: 'draft' }),
        undefined
      );
      expect(result.status).toBe('draft');
    });

    it('should reject append if version mismatch', async () => {
      await expect(
        service.appendShows(mockSchedule1.uid, mockShows, 1, 999),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject append if schedule has no uploadProgress', async () => {
      const scheduleWithoutProgress = {
        ...mockSchedule1,
        planDocument: {
          metadata: {
            lastEditedBy: mockUser.uid,
            lastEditedAt: new Date().toISOString(),
            totalShows: 0,
            clientName: 'Test Client',
            dateRange: {
              start: '2025-01-01T00:00:00Z',
              end: '2025-01-31T23:59:59Z',
            },
          },
          shows: [],
        },
      };

      scheduleRepository.findByUid = jest
        .fn()
        .mockResolvedValue(scheduleWithoutProgress);

      await expect(
        service.appendShows(mockSchedule1.uid, mockShows, 1, 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid chunk index', async () => {
      await expect(
        service.appendShows(
          mockSchedule1.uid,
          mockShows,
          11, // > expectedChunks (10)
          1
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.appendShows(
          mockSchedule1.uid,
          mockShows,
          0, // < 1
          1,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update uploadProgress correctly', async () => {
      await service.appendShows(
        mockSchedule1.uid,
        mockShows,
        1,
        1
      );

      expect(scheduleRepository.update).toHaveBeenCalledWith(
        { uid: mockSchedule1.uid },
        expect.objectContaining({
           
          planDocument: expect.any(Object),
          version: 2,
        }) as Prisma.ScheduleUpdateInput,
        undefined,
      );
      // Verify the nested structure separately
       
      const updateCall = (scheduleRepository.update as jest.Mock).mock.calls[0];
       
      expect(updateCall[1]).toMatchObject({
        planDocument: {
          metadata: {
            uploadProgress: {
              expectedChunks: 10,
              receivedChunks: 1,
              lastChunkIndex: 1,
              isComplete: false,
            },
          },
        },
        version: 2,
      });
    });

    it('should mark upload as complete when last chunk is received', async () => {
      const scheduleWithChunk9 = {
        ...mockScheduleWithUploadProgress,
        planDocument: {
          ...mockScheduleWithUploadProgress.planDocument,
          metadata: {
            ...mockScheduleWithUploadProgress.planDocument.metadata,
            uploadProgress: {
              expectedChunks: 10,
              receivedChunks: 9,
              lastChunkIndex: 9,
              isComplete: false,
            },
          },
          shows: mockShows,
        },
        version: 10,
      };

      scheduleRepository.findByUid = jest
        .fn()
        .mockResolvedValue(scheduleWithChunk9);

      await service.appendShows(
        mockSchedule1.uid,
        mockShows,
        10, // Last chunk
        10,
      );

      expect(scheduleRepository.update).toHaveBeenCalledWith(
        { uid: mockSchedule1.uid },
        expect.objectContaining({
          planDocument: expect.any(Object),
        }),
        undefined,
      );
      // Verify the nested structure separately
       
      const updateCall = (scheduleRepository.update as jest.Mock).mock.calls[0];
       
      expect(updateCall[1]).toMatchObject({
        planDocument: {
          metadata: {
            uploadProgress: {
              isComplete: true,
            },
          },
        },
      });
    });
  });
});
