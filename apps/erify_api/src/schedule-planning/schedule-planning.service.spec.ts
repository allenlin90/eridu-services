import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { Prisma, Schedule, ScheduleSnapshot } from '@prisma/client';

import type {
  PlanDocument,
  ValidationResult,
} from './schemas/schedule-planning.schema';
import { PublishingService } from './publishing.service';
import { SchedulePlanningService } from './schedule-planning.service';
import { ValidationService } from './validation.service';

import { ScheduleService } from '@/models/schedule/schedule.service';
import { ScheduleSnapshotService } from '@/models/schedule-snapshot/schedule-snapshot.service';
import type { TransactionClient } from '@/prisma/prisma.service';
import { PrismaService } from '@/prisma/prisma.service';

// Test helper type for mock transaction clients
// This allows test mocks to only implement the properties they need
// The mock structure matches what's actually used in tests
type MockTransactionClientStructure = {
  schedule: {
    update: jest.Mock;
  };
};

// Helper function to convert mock transaction client to TransactionClient for tests
// This is safe because the callback only accesses properties that exist on the mock
// Using a type assertion that TypeScript accepts for test mocks
function asTransactionClient(
  mock: MockTransactionClientStructure,
): TransactionClient {
  // Type assertion is necessary here because test mocks don't implement full TransactionClient
  // The callback will only access properties that exist on the mock
  return mock as MockTransactionClientStructure & TransactionClient;
}

describe('schedulePlanningService', () => {
  let service: SchedulePlanningService;
  let scheduleService: jest.Mocked<ScheduleService>;
  let scheduleSnapshotService: jest.Mocked<ScheduleSnapshotService>;
  let validationService: jest.Mocked<ValidationService>;
  let publishingService: jest.Mocked<PublishingService>;
  let prismaService: jest.Mocked<PrismaService>;
  let mockTransactionClient: {
    schedule: {
      update: jest.Mock;
    };
  };
  let getScheduleByIdMock: jest.Mock;
  let validateScheduleMock: jest.Mock;
  let getScheduleSnapshotByIdMock: jest.Mock;
  let getScheduleSnapshotsMock: jest.Mock;
  let createScheduleSnapshotMock: jest.Mock;
  let publishMock: jest.Mock;
  let executeTransactionMock: jest.Mock;

  const mockSchedule = {
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
    planDocument: {
      metadata: {
        lastEditedBy: 'user_test123',
        lastEditedAt: '2024-01-01T00:00:00Z',
        totalShows: 1,
        clientName: 'Test Client',
        dateRange: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-01-31T23:59:59Z',
        },
      },
      shows: [
        {
          tempId: 'temp_1',
          name: 'Test Show',
          startTime: '2024-01-01T10:00:00Z',
          endTime: '2024-01-01T12:00:00Z',
          clientUid: 'client_test123',
          studioRoomUid: 'room_test123',
          showTypeUid: 'sht_test123',
          showStatusUid: 'shst_test123',
          showStandardUid: 'shsd_test123',
          mcs: [],
          platforms: [],
        },
      ],
    } as PlanDocument,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockSnapshot = {
    id: BigInt(1),
    uid: 'snapshot_test123',
    scheduleId: BigInt(1),
    planDocument: {
      metadata: {
        lastEditedBy: 'user_test123',
        lastEditedAt: '2024-01-01T00:00:00Z',
        totalShows: 1,
        clientName: 'Test Client',
        dateRange: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-01-31T23:59:59Z',
        },
      },
      shows: [
        {
          tempId: 'temp_1',
          name: 'Snapshot Show',
          startTime: '2024-01-01T10:00:00Z',
          endTime: '2024-01-01T12:00:00Z',
          clientUid: 'client_test123',
          studioRoomUid: 'room_test123',
          showTypeUid: 'sht_test123',
          showStatusUid: 'shst_test123',
          showStandardUid: 'shsd_test123',
        },
      ],
    },
    version: 1,
    status: 'draft',
    snapshotReason: 'manual',
    metadata: {},
    createdBy: BigInt(1),
    createdAt: new Date(),
    schedule: {
      ...mockSchedule,
    },
    user: {
      id: BigInt(1),
      uid: 'user_test123',
      name: 'Test User',
      email: 'test@example.com',
    },
  };

  beforeEach(async () => {
    mockTransactionClient = {
      schedule: {
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulePlanningService,
        {
          provide: ScheduleService,
          useValue: {
            getScheduleById: jest.fn(),
          },
        },
        {
          provide: ScheduleSnapshotService,
          useValue: {
            getScheduleSnapshotById: jest.fn(),
            getSnapshotsByScheduleId: jest.fn(),
            getScheduleSnapshots: jest.fn(),
            createScheduleSnapshot: jest.fn(),
          },
        },
        {
          provide: ValidationService,
          useValue: {
            validateSchedule: jest.fn(),
          },
        },
        {
          provide: PublishingService,
          useValue: {
            publish: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            executeTransaction: jest.fn(
              async <T>(
                callback: (tx: TransactionClient) => Promise<T>,
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

    service = module.get<SchedulePlanningService>(SchedulePlanningService);
    scheduleService = module.get(ScheduleService);
    scheduleSnapshotService = module.get(ScheduleSnapshotService);
    validationService = module.get(ValidationService);
    publishingService = module.get(PublishingService);
    prismaService = module.get(PrismaService);

    // Store mock function references to avoid unbound method errors
    getScheduleByIdMock = scheduleService.getScheduleById as jest.Mock;
    validateScheduleMock = validationService.validateSchedule as jest.Mock;
    getScheduleSnapshotByIdMock = scheduleSnapshotService.getScheduleSnapshotById as jest.Mock;
    getScheduleSnapshotsMock = scheduleSnapshotService.getScheduleSnapshots as jest.Mock;
    createScheduleSnapshotMock = scheduleSnapshotService.createScheduleSnapshot as jest.Mock;
    publishMock = publishingService.publish as jest.Mock;
    executeTransactionMock = prismaService.executeTransaction as jest.Mock;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateSchedule', () => {
    it('should validate a schedule successfully', async () => {
      const scheduleUid = 'schedule_test123';
      const validationResult: ValidationResult = {
        isValid: true,
        errors: [],
      };

      scheduleService.getScheduleById.mockResolvedValue({
        ...mockSchedule,
        client: {
          uid: 'client_test123',
          name: 'Test Client',
        },
      } as unknown as Schedule & { client: { uid: string; name: string } });
      validationService.validateSchedule.mockResolvedValue(validationResult);

      const result = await service.validateSchedule(scheduleUid);

      expect(getScheduleByIdMock).toHaveBeenCalledWith(scheduleUid, {
        client: true,
      });
      expect(validateScheduleMock).toHaveBeenCalledWith({
        id: mockSchedule.id,
        uid: mockSchedule.uid,
        startDate: mockSchedule.startDate,
        endDate: mockSchedule.endDate,
        planDocument: mockSchedule.planDocument,
        clientId: mockSchedule.clientId,
      });
      expect(result).toEqual(validationResult);
    });

    it('should throw NotFoundException when schedule is not found', async () => {
      const scheduleUid = 'schedule_notfound';

      scheduleService.getScheduleById.mockResolvedValue(
        null as unknown as Schedule,
      );

      await expect(service.validateSchedule(scheduleUid)).rejects.toThrow(
        NotFoundException,
      );
      expect(getScheduleByIdMock).toHaveBeenCalledWith(scheduleUid, {
        client: true,
      });
      expect(validateScheduleMock).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when plan document is invalid', async () => {
      const scheduleUid = 'schedule_test123';

      scheduleService.getScheduleById.mockResolvedValue({
        ...mockSchedule,
        planDocument: null,
      } as unknown as Schedule);

      await expect(service.validateSchedule(scheduleUid)).rejects.toThrow(
        BadRequestException,
      );
      expect(validateScheduleMock).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when plan document has no shows', async () => {
      const scheduleUid = 'schedule_test123';

      scheduleService.getScheduleById.mockResolvedValue({
        ...mockSchedule,
        planDocument: {},
      } as unknown as Schedule);

      await expect(service.validateSchedule(scheduleUid)).rejects.toThrow(
        BadRequestException,
      );
      expect(validateScheduleMock).not.toHaveBeenCalled();
    });

    it('should return validation errors when schedule is invalid', async () => {
      const scheduleUid = 'schedule_test123';
      const validationResult: ValidationResult = {
        isValid: false,
        errors: [
          {
            type: 'reference_not_found',
            message: 'Client with UID client_test123 not found',
            showIndex: 0,
            showTempId: 'temp_1',
          },
        ],
      };

      scheduleService.getScheduleById.mockResolvedValue({
        ...mockSchedule,
        client: {
          uid: 'client_test123',
          name: 'Test Client',
        },
      } as unknown as Schedule & { client: { uid: string; name: string } });
      validationService.validateSchedule.mockResolvedValue(validationResult);

      const result = await service.validateSchedule(scheduleUid);

      expect(result).toEqual(validationResult);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('publishSchedule', () => {
    it('should publish a schedule successfully', async () => {
      const scheduleUid = 'schedule_test123';
      const version = 1;
      const userId = BigInt(1);
      const publishedResult = {
        schedule: {
          ...mockSchedule,
          status: 'published',
          publishedAt: new Date(),
          publishedBy: userId,
          createdBy: BigInt(1),
          client: {
            uid: 'client_test123',
            name: 'Test Client',
          },
          createdByUser: {
            uid: 'user_test123',
            name: 'Test User',
            email: 'test@example.com',
          },
          publishedByUser: {
            uid: 'user_test123',
            name: 'Test User',
            email: 'test@example.com',
          },
        },
        showsCreated: 1,
        showsDeleted: 0,
      };

      publishingService.publish.mockResolvedValue(publishedResult);

      const result = await service.publishSchedule(
        scheduleUid,
        version,
        userId,
      );

      expect(publishMock).toHaveBeenCalledWith(scheduleUid, version, userId);
      expect(result).toEqual(publishedResult);
    });
  });

  describe('restoreFromSnapshot', () => {
    it('should restore a schedule from snapshot successfully', async () => {
      const snapshotUid = 'snapshot_test123';
      const userId = BigInt(1);
      const restoredSchedule = {
        ...mockSchedule,
        planDocument: mockSnapshot.planDocument,
        version: 2,
        updatedAt: new Date(),
        client: {
          uid: 'client_test123',
          name: 'Test Client',
        },
        createdByUser: {
          uid: 'user_test123',
          name: 'Test User',
        },
        publishedByUser: null,
      };

      scheduleSnapshotService.getScheduleSnapshotById.mockResolvedValue(
        mockSnapshot as unknown as ScheduleSnapshot & {
          schedule: Schedule & {
            client: { uid: string; name: string } | null;
            createdByUser: { uid: string; name: string } | null;
          };
          user: { id: bigint; uid: string; name: string; email: string };
        },
      );
      createScheduleSnapshotMock.mockResolvedValue({
        id: BigInt(2),
        uid: 'snapshot_backup123',
      } as unknown as ScheduleSnapshot);
      mockTransactionClient.schedule.update.mockResolvedValue(restoredSchedule);

      const result = await service.restoreFromSnapshot(snapshotUid, userId);

      expect(getScheduleSnapshotByIdMock).toHaveBeenCalledWith(snapshotUid, {
        schedule: {
          include: {
            client: true,
            createdByUser: true,
          },
        },
        user: true,
      });
      expect(executeTransactionMock).toHaveBeenCalled();
      expect(createScheduleSnapshotMock).toHaveBeenCalledWith({
        schedule: { connect: { id: mockSchedule.id } },
        planDocument: mockSchedule.planDocument as Prisma.InputJsonValue,
        version: mockSchedule.version,
        status: mockSchedule.status,
        snapshotReason: 'before_restore',
        user: { connect: { id: userId } },
      });
      expect(mockTransactionClient.schedule.update).toHaveBeenCalledWith({
        where: { id: mockSchedule.id },
        data: {
          planDocument: mockSnapshot.planDocument as Prisma.InputJsonValue,
          version: mockSchedule.version + 1,
          updatedAt: expect.any(Date) as unknown as Date,
        },
        include: {
          client: true,
          createdByUser: true,
          publishedByUser: true,
        },
      });
      expect(result).toEqual(restoredSchedule);
    });

    it('should throw NotFoundException when snapshot is not found', async () => {
      const snapshotUid = 'snapshot_notfound';
      const userId = BigInt(1);

      scheduleSnapshotService.getScheduleSnapshotById.mockResolvedValue(
        null as unknown as ScheduleSnapshot,
      );

      await expect(
        service.restoreFromSnapshot(snapshotUid, userId),
      ).rejects.toThrow(NotFoundException);
      expect(getScheduleSnapshotByIdMock).toHaveBeenCalledWith(snapshotUid, {
        schedule: {
          include: {
            client: true,
            createdByUser: true,
          },
        },
        user: true,
      });
      expect(executeTransactionMock).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when schedule is not found in snapshot', async () => {
      const snapshotUid = 'snapshot_test123';
      const userId = BigInt(1);

      scheduleSnapshotService.getScheduleSnapshotById.mockResolvedValue({
        ...mockSnapshot,
        schedule: null,
      } as unknown as ScheduleSnapshot & { schedule: null });

      await expect(
        service.restoreFromSnapshot(snapshotUid, userId),
      ).rejects.toThrow(NotFoundException);
      expect(executeTransactionMock).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when trying to restore published schedule', async () => {
      const snapshotUid = 'snapshot_test123';
      const userId = BigInt(1);

      scheduleSnapshotService.getScheduleSnapshotById.mockResolvedValue({
        ...mockSnapshot,
        schedule: {
          ...mockSchedule,
          status: 'published',
        },
      } as unknown as ScheduleSnapshot & {
        schedule: Schedule & { status: string };
      });

      await expect(
        service.restoreFromSnapshot(snapshotUid, userId),
      ).rejects.toThrow(BadRequestException);
      expect(executeTransactionMock).not.toHaveBeenCalled();
    });
  });

  describe('getSnapshotsBySchedule', () => {
    it('should get all snapshots for a schedule', async () => {
      const scheduleUid = 'schedule_test123';
      const mockSnapshots = [
        {
          id: BigInt(1),
          uid: 'snapshot_1',
          createdAt: new Date('2024-01-01'),
          user: {
            uid: 'user_test123',
            name: 'Test User',
            email: 'test@example.com',
          },
        },
        {
          id: BigInt(2),
          uid: 'snapshot_2',
          createdAt: new Date('2024-01-02'),
          user: {
            uid: 'user_test123',
            name: 'Test User',
            email: 'test@example.com',
          },
        },
      ];

      scheduleService.getScheduleById.mockResolvedValue(
        mockSchedule as unknown as Schedule,
      );
      scheduleSnapshotService.getScheduleSnapshots.mockResolvedValue(
        mockSnapshots as unknown as Array<
          ScheduleSnapshot & {
            user: { uid: string; name: string; email: string };
          }
        >,
      );

      const result = await service.getSnapshotsBySchedule(scheduleUid);

      expect(getScheduleByIdMock).toHaveBeenCalledWith(scheduleUid);
      expect(getScheduleSnapshotsMock).toHaveBeenCalledWith({
        where: { scheduleId: mockSchedule.id },
        orderBy: { createdAt: 'desc' },
        take: undefined,
        include: {
          user: {
            select: {
              uid: true,
              name: true,
              email: true,
            },
          },
          schedule: {
            select: {
              uid: true,
              name: true,
            },
          },
        },
      });
      expect(result).toEqual(mockSnapshots);
      expect(result).toHaveLength(2);
    });

    it('should sort snapshots by createdAt ascending when specified', async () => {
      const scheduleUid = 'schedule_test123';
      // Mock returns snapshots sorted ascending (oldest first)
      const mockSnapshots = [
        {
          id: BigInt(1),
          uid: 'snapshot_1',
          createdAt: new Date('2024-01-01'),
          user: {
            uid: 'user_test123',
            name: 'Test User',
            email: 'test@example.com',
          },
        },
        {
          id: BigInt(2),
          uid: 'snapshot_2',
          createdAt: new Date('2024-01-02'),
          user: {
            uid: 'user_test123',
            name: 'Test User',
            email: 'test@example.com',
          },
        },
      ];

      scheduleService.getScheduleById.mockResolvedValue(
        mockSchedule as unknown as Schedule,
      );
      scheduleSnapshotService.getScheduleSnapshots.mockResolvedValue(
        mockSnapshots as unknown as Array<
          ScheduleSnapshot & {
            user: { uid: string; name: string; email: string };
          }
        >,
      );

      const result = await service.getSnapshotsBySchedule(scheduleUid, {
        orderBy: 'asc',
      });

      expect(getScheduleSnapshotsMock).toHaveBeenCalledWith({
        where: { scheduleId: mockSchedule.id },
        orderBy: { createdAt: 'asc' },
        take: undefined,
        include: {
          user: {
            select: {
              uid: true,
              name: true,
              email: true,
            },
          },
          schedule: {
            select: {
              uid: true,
              name: true,
            },
          },
        },
      });
      expect(result[0].uid).toBe('snapshot_1');
      expect(result[1].uid).toBe('snapshot_2');
    });

    it('should sort snapshots by createdAt descending when specified', async () => {
      const scheduleUid = 'schedule_test123';
      // Mock returns snapshots sorted descending (newest first)
      const mockSnapshots = [
        {
          id: BigInt(2),
          uid: 'snapshot_2',
          createdAt: new Date('2024-01-02'),
          user: {
            uid: 'user_test123',
            name: 'Test User',
            email: 'test@example.com',
          },
        },
        {
          id: BigInt(1),
          uid: 'snapshot_1',
          createdAt: new Date('2024-01-01'),
          user: {
            uid: 'user_test123',
            name: 'Test User',
            email: 'test@example.com',
          },
        },
      ];

      scheduleService.getScheduleById.mockResolvedValue(
        mockSchedule as unknown as Schedule,
      );
      scheduleSnapshotService.getScheduleSnapshots.mockResolvedValue(
        mockSnapshots as unknown as Array<
          ScheduleSnapshot & {
            user: { uid: string; name: string; email: string };
          }
        >,
      );

      const result = await service.getSnapshotsBySchedule(scheduleUid, {
        orderBy: 'desc',
      });

      expect(getScheduleSnapshotsMock).toHaveBeenCalledWith({
        where: { scheduleId: mockSchedule.id },
        orderBy: { createdAt: 'desc' },
        take: undefined,
        include: {
          user: {
            select: {
              uid: true,
              name: true,
              email: true,
            },
          },
          schedule: {
            select: {
              uid: true,
              name: true,
            },
          },
        },
      });
      expect(result[0].uid).toBe('snapshot_2');
      expect(result[1].uid).toBe('snapshot_1');
    });

    it('should limit snapshots when limit is specified', async () => {
      const scheduleUid = 'schedule_test123';
      const mockSnapshots = [
        {
          id: BigInt(1),
          uid: 'snapshot_1',
          createdAt: new Date('2024-01-01'),
          user: {
            uid: 'user_test123',
            name: 'Test User',
            email: 'test@example.com',
          },
        },
        {
          id: BigInt(2),
          uid: 'snapshot_2',
          createdAt: new Date('2024-01-02'),
          user: {
            uid: 'user_test123',
            name: 'Test User',
            email: 'test@example.com',
          },
        },
        {
          id: BigInt(3),
          uid: 'snapshot_3',
          createdAt: new Date('2024-01-03'),
          user: {
            uid: 'user_test123',
            name: 'Test User',
            email: 'test@example.com',
          },
        },
      ];

      scheduleService.getScheduleById.mockResolvedValue(
        mockSchedule as unknown as Schedule,
      );
      // Mock returns limited snapshots (first 2)
      const limitedSnapshots = mockSnapshots.slice(0, 2);
      scheduleSnapshotService.getScheduleSnapshots.mockResolvedValue(
        limitedSnapshots as unknown as Array<
          ScheduleSnapshot & {
            user: { uid: string; name: string; email: string };
          }
        >,
      );

      const result = await service.getSnapshotsBySchedule(scheduleUid, {
        limit: 2,
      });

      expect(getScheduleSnapshotsMock).toHaveBeenCalledWith({
        where: { scheduleId: mockSchedule.id },
        orderBy: { createdAt: 'desc' },
        take: 2,
        include: {
          user: {
            select: {
              uid: true,
              name: true,
              email: true,
            },
          },
          schedule: {
            select: {
              uid: true,
              name: true,
            },
          },
        },
      });
      expect(result).toHaveLength(2);
      expect(result[0].uid).toBe('snapshot_1');
      expect(result[1].uid).toBe('snapshot_2');
    });
  });

  describe('createManualSnapshot', () => {
    it('should create a manual snapshot successfully', async () => {
      const scheduleUid = 'schedule_test123';
      const reason = 'Backup before major changes';
      const userId = BigInt(1);
      const createdSnapshot = {
        id: BigInt(1),
        uid: 'snapshot_test123',
        scheduleId: mockSchedule.id,
        planDocument: mockSchedule.planDocument,
        version: mockSchedule.version,
        status: mockSchedule.status,
        snapshotReason: reason,
        createdAt: new Date(),
        userId,
      };

      scheduleService.getScheduleById.mockResolvedValue(
        mockSchedule as unknown as Schedule,
      );
      scheduleSnapshotService.createScheduleSnapshot.mockResolvedValue(
        createdSnapshot as unknown as ScheduleSnapshot,
      );

      const result = await service.createManualSnapshot(
        scheduleUid,
        reason,
        userId,
      );

      expect(getScheduleByIdMock).toHaveBeenCalledWith(scheduleUid);
      expect(createScheduleSnapshotMock).toHaveBeenCalledWith({
        schedule: { connect: { id: mockSchedule.id } },
        planDocument: mockSchedule.planDocument as Prisma.InputJsonValue,
        version: mockSchedule.version,
        status: mockSchedule.status,
        snapshotReason: reason,
        user: { connect: { id: userId } },
      });
      expect(result).toEqual(createdSnapshot);
    });

    it('should create a manual snapshot with default reason when reason is empty', async () => {
      const scheduleUid = 'schedule_test123';
      const reason = '';
      const userId = BigInt(1);
      const createdSnapshot = {
        id: BigInt(1),
        uid: 'snapshot_test123',
        snapshotReason: 'manual',
        createdAt: new Date(),
      };

      scheduleService.getScheduleById.mockResolvedValue(
        mockSchedule as unknown as Schedule,
      );
      scheduleSnapshotService.createScheduleSnapshot.mockResolvedValue(
        createdSnapshot as unknown as ScheduleSnapshot,
      );

      const result = await service.createManualSnapshot(
        scheduleUid,
        reason,
        userId,
      );

      expect(createScheduleSnapshotMock).toHaveBeenCalledWith(
        expect.objectContaining({
          snapshotReason: 'manual',
        }),
      );
      expect(result).toEqual(createdSnapshot);
    });
  });
});
