import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { Prisma } from '@prisma/client';

import type { PlanDocument } from './schemas/schedule-planning.schema';
import { ValidationService } from './validation.service';

import { PrismaService } from '@/prisma/prisma.service';
import { UtilityService } from '@/utility/utility.service';

describe('validationService', () => {
  let service: ValidationService;
  let _prismaService: jest.Mocked<PrismaService>;
  let _utilityService: jest.Mocked<UtilityService>;

  // Mock transaction client
  let mockTransactionClient: {
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

  // Mock direct prisma client methods
  let mockPrismaClient: {
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

  // Test data
  const mockValidPlanDocument: PlanDocument = {
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
        studioRoomUid: undefined, // No room for show 2
        showTypeUid: 'sht_test123',
        showStatusUid: 'shst_test123',
        showStandardUid: 'shsd_test123',
        mcs: [],
        platforms: [],
      },
    ],
  };

  const mockScheduleData = {
    id: BigInt(1),
    uid: 'schedule_test123',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-31'),
    planDocument: mockValidPlanDocument,
    clientId: BigInt(1),
  };

  beforeEach(async () => {
    mockTransactionClient = {
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

    mockPrismaClient = {
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
        ValidationService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn(
              async (
                callback: (
                  tx: typeof mockTransactionClient,
                ) => Promise<unknown>,
              ) => await callback(mockTransactionClient),
            ),
            client: mockPrismaClient.client,
            studioRoom: mockPrismaClient.studioRoom,
            showType: mockPrismaClient.showType,
            showStatus: mockPrismaClient.showStatus,
            showStandard: mockPrismaClient.showStandard,
            mC: mockPrismaClient.mC,
            platform: mockPrismaClient.platform,
          },
        },
        {
          provide: UtilityService,
          useValue: {
            isTimeOverlapping: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ValidationService>(ValidationService);
    _prismaService = module.get(PrismaService);
    _utilityService = module.get(UtilityService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateSchedule', () => {
    beforeEach(() => {
      // Setup default mocks for successful validation
      const defaultClientMock = [{ id: BigInt(1), uid: 'client_test123' }];
      const defaultStudioRoomMock = [
        { id: BigInt(1), uid: 'room_test123' },
        { id: BigInt(2), uid: 'room_test456' },
      ];
      const defaultShowTypeMock = [{ id: BigInt(1), uid: 'sht_test123' }];
      const defaultShowStatusMock = [{ id: BigInt(1), uid: 'shst_test123' }];
      const defaultShowStandardMock = [{ id: BigInt(1), uid: 'shsd_test123' }];
      const defaultMcMock = [{ id: BigInt(1), uid: 'mc_test123' }];
      const defaultPlatformMock = [{ id: BigInt(1), uid: 'platform_test123' }];

      // Setup both transaction and direct prisma client mocks
      mockTransactionClient.client.findMany.mockResolvedValue(
        defaultClientMock,
      );
      mockTransactionClient.studioRoom.findMany.mockResolvedValue(
        defaultStudioRoomMock,
      );
      mockTransactionClient.showType.findMany.mockResolvedValue(
        defaultShowTypeMock,
      );
      mockTransactionClient.showStatus.findMany.mockResolvedValue(
        defaultShowStatusMock,
      );
      mockTransactionClient.showStandard.findMany.mockResolvedValue(
        defaultShowStandardMock,
      );
      mockTransactionClient.mC.findMany.mockResolvedValue(defaultMcMock);
      mockTransactionClient.platform.findMany.mockResolvedValue(
        defaultPlatformMock,
      );

      mockPrismaClient.client.findMany.mockResolvedValue(defaultClientMock);
      mockPrismaClient.studioRoom.findMany.mockResolvedValue(
        defaultStudioRoomMock,
      );
      mockPrismaClient.showType.findMany.mockResolvedValue(defaultShowTypeMock);
      mockPrismaClient.showStatus.findMany.mockResolvedValue(
        defaultShowStatusMock,
      );
      mockPrismaClient.showStandard.findMany.mockResolvedValue(
        defaultShowStandardMock,
      );
      mockPrismaClient.mC.findMany.mockResolvedValue(defaultMcMock);
      mockPrismaClient.platform.findMany.mockResolvedValue(defaultPlatformMock);
    });

    it('should validate a valid schedule successfully', async () => {
      const result = await service.validateSchedule(mockScheduleData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return validation errors for invalid plan document structure - missing shows array', async () => {
      const invalidSchedule = {
        ...mockScheduleData,
        planDocument: {
          metadata: mockValidPlanDocument.metadata,
        } as PlanDocument,
      };

      const result = await service.validateSchedule(invalidSchedule);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        type: 'reference_not_found',
        message: 'Plan document must contain a shows array',
      });
    });

    it('should return validation errors for invalid plan document structure - shows not array', async () => {
      const invalidSchedule = {
        ...mockScheduleData,
        planDocument: {
          metadata: mockValidPlanDocument.metadata,
          shows: 'not-an-array',
        } as unknown as PlanDocument,
      };

      const result = await service.validateSchedule(invalidSchedule);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        type: 'reference_not_found',
        message: 'Plan document must contain a shows array',
      });
    });

    it('should validate show time ranges within schedule bounds', async () => {
      const invalidSchedule = {
        ...mockScheduleData,
        planDocument: {
          ...mockValidPlanDocument,
          shows: [
            {
              ...mockValidPlanDocument.shows[0],
              startTime: '2023-12-31T23:00:00Z', // Before schedule start
            },
          ],
        },
      };

      const result = await service.validateSchedule(invalidSchedule);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'time_range',
          message: expect.stringContaining(
            'Show time range must be within schedule date range',
          ) as string,
          showIndex: 0,
          showTempId: 'temp_1',
        }),
      );
    });

    it('should validate show end time is after start time', async () => {
      const invalidSchedule = {
        ...mockScheduleData,
        planDocument: {
          ...mockValidPlanDocument,
          shows: [
            {
              ...mockValidPlanDocument.shows[0],
              startTime: '2024-01-01T12:00:00Z',
              endTime: '2024-01-01T10:00:00Z', // End before start
            },
          ],
        },
      };

      const result = await service.validateSchedule(invalidSchedule);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'time_range',
          message: 'Show end time must be after start time',
          showIndex: 0,
          showTempId: 'temp_1',
        }),
      );
    });

    it('should validate client reference existence', async () => {
      mockPrismaClient.client.findMany.mockResolvedValue([]);

      const result = await service.validateSchedule(mockScheduleData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'reference_not_found',
          message: 'Client with UID client_test123 not found',
          showIndex: 0,
          showTempId: 'temp_1',
        }),
      );
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'reference_not_found',
          message: 'Client with UID client_test123 not found',
          showIndex: 1,
          showTempId: 'temp_2',
        }),
      );
    });

    it('should validate studio room reference existence', async () => {
      mockPrismaClient.studioRoom.findMany.mockResolvedValue([]);

      const result = await service.validateSchedule(mockScheduleData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'reference_not_found',
          message: 'Studio room with UID room_test123 not found',
          showIndex: 0,
          showTempId: 'temp_1',
        }),
      );
    });

    it('should validate successfully when studioRoomUid is missing', async () => {
      const scheduleWithMissingRoom = {
        ...mockScheduleData,
        planDocument: {
          ...mockValidPlanDocument,
          shows: [
            {
              ...mockValidPlanDocument.shows[0],
              studioRoomUid: undefined,
            },
          ],
        },
      };

      const result = await service.validateSchedule(scheduleWithMissingRoom);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate show type reference existence', async () => {
      mockPrismaClient.showType.findMany.mockResolvedValue([]);

      const result = await service.validateSchedule(mockScheduleData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'reference_not_found',
          message: 'Show type with UID sht_test123 not found',
        }),
      );
    });

    it('should validate show status reference existence', async () => {
      mockPrismaClient.showStatus.findMany.mockResolvedValue([]);

      const result = await service.validateSchedule(mockScheduleData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'reference_not_found',
          message: 'Show status with UID shst_test123 not found',
        }),
      );
    });

    it('should validate show standard reference existence', async () => {
      mockPrismaClient.showStandard.findMany.mockResolvedValue([]);

      const result = await service.validateSchedule(mockScheduleData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'reference_not_found',
          message: 'Show standard with UID shsd_test123 not found',
        }),
      );
    });

    it('should validate MC reference existence', async () => {
      mockPrismaClient.mC.findMany.mockResolvedValue([]);

      const result = await service.validateSchedule(mockScheduleData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'reference_not_found',
          message: 'MC with UID mc_test123 not found',
          showIndex: 0,
          showTempId: 'temp_1',
        }),
      );
    });

    it('should validate platform reference existence', async () => {
      mockPrismaClient.platform.findMany.mockResolvedValue([]);

      const result = await service.validateSchedule(mockScheduleData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'reference_not_found',
          message: 'Platform with UID platform_test123 not found',
          showIndex: 0,
          showTempId: 'temp_1',
        }),
      );
    });

    it('should validate client consistency within schedule', async () => {
      // Mock different client IDs for the same client UID (shouldn't happen in real data)
      mockTransactionClient.client.findMany.mockResolvedValue([
        { id: BigInt(1), uid: 'client_test123' },
      ]);

      const inconsistentSchedule = {
        ...mockScheduleData,
        clientId: BigInt(2), // Different from the show client
      };

      const result = await service.validateSchedule(inconsistentSchedule);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2); // One for each show
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'reference_not_found',
          message: expect.stringContaining(
            'belongs to a different client than the schedule',
          ) as string,
        }),
      );
    });

    it('should detect room conflicts within schedule', async () => {
      // Mock isTimeOverlapping to return true for overlapping times
      _utilityService.isTimeOverlapping.mockReturnValue(true);

      const conflictingSchedule = {
        ...mockScheduleData,
        planDocument: {
          ...mockValidPlanDocument,
          shows: [
            {
              ...mockValidPlanDocument.shows[0],
              studioRoomUid: 'room_test123',
              startTime: '2024-01-01T10:00:00Z',
              endTime: '2024-01-01T12:00:00Z',
            },
            {
              ...mockValidPlanDocument.shows[1],
              studioRoomUid: 'room_test123', // Same room
              startTime: '2024-01-01T11:00:00Z', // Overlapping time
              endTime: '2024-01-01T13:00:00Z',
            },
          ],
        },
      };

      const result = await service.validateSchedule(conflictingSchedule);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'internal_conflict',
          message:
            'Room conflict: Shows "Test Show 1" and "Test Show 2" overlap in time',
          showIndex: 0,
          showTempId: 'temp_1',
        }),
      );
    });

    it('should NOT detect room conflicts when shows have no room assigned', async () => {
      // Mock isTimeOverlapping to return true for overlapping times
      _utilityService.isTimeOverlapping.mockReturnValue(true);

      const noRoomSchedule = {
        ...mockScheduleData,
        planDocument: {
          ...mockValidPlanDocument,
          shows: [
            {
              ...mockValidPlanDocument.shows[0],
              studioRoomUid: undefined, // No room
              startTime: '2024-01-01T10:00:00Z',
              endTime: '2024-01-01T12:00:00Z',
            },
            {
              ...mockValidPlanDocument.shows[1],
              studioRoomUid: undefined, // No room
              startTime: '2024-01-01T11:00:00Z', // Overlapping time
              endTime: '2024-01-01T13:00:00Z',
            },
          ],
        },
      };

      const result = await service.validateSchedule(noRoomSchedule);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect MC double-booking within schedule', async () => {
      // Mock isTimeOverlapping to return true for overlapping times
      _utilityService.isTimeOverlapping.mockReturnValue(true);

      const conflictingSchedule = {
        ...mockScheduleData,
        planDocument: {
          ...mockValidPlanDocument,
          shows: [
            {
              ...mockValidPlanDocument.shows[0],
              mcs: [{ mcUid: 'mc_test123', note: 'MC 1' }],
              startTime: '2024-01-01T10:00:00Z',
              endTime: '2024-01-01T12:00:00Z',
            },
            {
              ...mockValidPlanDocument.shows[1],
              mcs: [{ mcUid: 'mc_test123', note: 'MC 2' }], // Same MC
              startTime: '2024-01-01T11:00:00Z', // Overlapping time
              endTime: '2024-01-01T13:00:00Z',
            },
          ],
        },
      };

      // Mock MC lookup
      mockTransactionClient.mC.findMany.mockResolvedValue([
        { id: BigInt(1), uid: 'mc_test123' },
      ]);

      const result = await service.validateSchedule(conflictingSchedule);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'internal_conflict',
          message:
            'MC mc_test123 is assigned to overlapping shows "Test Show 1" and "Test Show 2"',
          showIndex: 0,
          showTempId: 'temp_1',
        }),
      );
    });

    it('should handle multiple validation errors', async () => {
      // Create a schedule with multiple issues
      const invalidSchedule = {
        ...mockScheduleData,
        planDocument: {
          ...mockValidPlanDocument,
          shows: [
            {
              ...mockValidPlanDocument.shows[0],
              startTime: '2024-01-01T12:00:00Z',
              endTime: '2024-01-01T10:00:00Z', // Invalid time range
              clientUid: 'nonexistent_client', // Invalid reference
            },
          ],
        },
      };

      mockTransactionClient.client.findMany.mockResolvedValue([]);

      const result = await service.validateSchedule(invalidSchedule);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('should handle empty shows array', async () => {
      const emptySchedule = {
        ...mockScheduleData,
        planDocument: {
          ...mockValidPlanDocument,
          shows: [],
        },
      };

      const result = await service.validateSchedule(emptySchedule);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle shows with no MCs or platforms', async () => {
      const minimalSchedule = {
        ...mockScheduleData,
        planDocument: {
          ...mockValidPlanDocument,
          shows: [
            {
              tempId: 'temp_minimal',
              name: 'Minimal Show',
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
        },
      };

      const result = await service.validateSchedule(minimalSchedule);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate with transaction context', async () => {
      const mockTx = mockTransactionClient;

      const result = await service.validateSchedule(
        mockScheduleData,
        mockTx as unknown as Prisma.TransactionClient,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);

      // Verify transaction client was used instead of prismaService
      expect(mockTx.client.findMany).toHaveBeenCalled();
      expect(mockTx.studioRoom.findMany).toHaveBeenCalled();
      expect(mockTx.showType.findMany).toHaveBeenCalled();
      expect(mockTx.showStatus.findMany).toHaveBeenCalled();
      expect(mockTx.showStandard.findMany).toHaveBeenCalled();
      expect(mockTx.mC.findMany).toHaveBeenCalled();
      expect(mockTx.platform.findMany).toHaveBeenCalled();
    });

    it('should build UID lookup maps correctly', async () => {
      await service.validateSchedule(mockScheduleData);

      // Verify all entity lookups were called with correct parameters
      expect(mockPrismaClient.client.findMany).toHaveBeenCalledWith({
        where: {
          uid: { in: ['client_test123'] },
          deletedAt: null,
        },
        select: { id: true, uid: true },
      });

      expect(mockPrismaClient.studioRoom.findMany).toHaveBeenCalledWith({
        where: {
          uid: { in: ['room_test123'] }, // room_test456 is gone
          deletedAt: null,
        },
        select: { id: true, uid: true },
      });

      expect(mockPrismaClient.mC.findMany).toHaveBeenCalledWith({
        where: {
          uid: { in: ['mc_test123'] },
          deletedAt: null,
        },
        select: { id: true, uid: true },
      });

      expect(mockPrismaClient.platform.findMany).toHaveBeenCalledWith({
        where: {
          uid: { in: ['platform_test123'] },
          deletedAt: null,
        },
        select: { id: true, uid: true },
      });
    });
  });

  describe('isTimeOverlapping', () => {
    it('should detect overlapping time ranges', () => {
      const baseDate = '2024-01-01T';

      // Complete overlap
      _utilityService.isTimeOverlapping.mockReturnValue(true);
      expect(
        service.utilityService.isTimeOverlapping(
          `${baseDate}10:00:00Z`,
          `${baseDate}12:00:00Z`,
          `${baseDate}10:00:00Z`,
          `${baseDate}12:00:00Z`,
        ),
      ).toBe(true);

      // Partial overlap - second starts during first
      expect(
        service.utilityService.isTimeOverlapping(
          `${baseDate}10:00:00Z`,
          `${baseDate}12:00:00Z`,
          `${baseDate}11:00:00Z`,
          `${baseDate}13:00:00Z`,
        ),
      ).toBe(true);

      // Partial overlap - first starts during second
      expect(
        service.utilityService.isTimeOverlapping(
          `${baseDate}11:00:00Z`,
          `${baseDate}13:00:00Z`,
          `${baseDate}10:00:00Z`,
          `${baseDate}12:00:00Z`,
        ),
      ).toBe(true);

      // Touching edges (no overlap)
      _utilityService.isTimeOverlapping.mockReturnValue(false);
      expect(
        service.utilityService.isTimeOverlapping(
          `${baseDate}10:00:00Z`,
          `${baseDate}12:00:00Z`,
          `${baseDate}12:00:00Z`,
          `${baseDate}14:00:00Z`,
        ),
      ).toBe(false);

      // No overlap - second starts after first ends
      expect(
        service.utilityService.isTimeOverlapping(
          `${baseDate}10:00:00Z`,
          `${baseDate}12:00:00Z`,
          `${baseDate}13:00:00Z`,
          `${baseDate}15:00:00Z`,
        ),
      ).toBe(false);

      // No overlap - first starts after second ends
      expect(
        service.utilityService.isTimeOverlapping(
          `${baseDate}13:00:00Z`,
          `${baseDate}15:00:00Z`,
          `${baseDate}10:00:00Z`,
          `${baseDate}12:00:00Z`,
        ),
      ).toBe(false);

      // One contains the other
      _utilityService.isTimeOverlapping.mockReturnValue(true);
      expect(
        service.utilityService.isTimeOverlapping(
          `${baseDate}10:00:00Z`,
          `${baseDate}14:00:00Z`,
          `${baseDate}11:00:00Z`,
          `${baseDate}13:00:00Z`,
        ),
      ).toBe(true);

      expect(
        service.utilityService.isTimeOverlapping(
          `${baseDate}11:00:00Z`,
          `${baseDate}13:00:00Z`,
          `${baseDate}10:00:00Z`,
          `${baseDate}14:00:00Z`,
        ),
      ).toBe(true);
    });

    it('should handle ISO date strings', () => {
      _utilityService.isTimeOverlapping.mockReturnValue(true);
      expect(
        service.utilityService.isTimeOverlapping(
          '2024-01-01T10:00:00Z',
          '2024-01-01T12:00:00Z',
          '2024-01-01T11:00:00Z',
          '2024-01-01T13:00:00Z',
        ),
      ).toBe(true);

      _utilityService.isTimeOverlapping.mockReturnValue(false);
      expect(
        service.utilityService.isTimeOverlapping(
          '2024-01-01T10:00:00Z',
          '2024-01-01T12:00:00Z',
          '2024-01-01T13:00:00Z',
          '2024-01-01T15:00:00Z',
        ),
      ).toBe(false);
    });
  });

  describe('edge cases and error handling', () => {
    beforeEach(() => {
      // Setup default mocks for edge case tests
      const defaultClientMock = [{ id: BigInt(1), uid: 'client_test123' }];
      const defaultStudioRoomMock = [
        { id: BigInt(1), uid: 'room_test123' },
        { id: BigInt(2), uid: 'room_test456' },
      ];
      const defaultShowTypeMock = [{ id: BigInt(1), uid: 'sht_test123' }];
      const defaultShowStatusMock = [{ id: BigInt(1), uid: 'shst_test123' }];
      const defaultShowStandardMock = [{ id: BigInt(1), uid: 'shsd_test123' }];
      const defaultMcMock = [{ id: BigInt(1), uid: 'mc_test123' }];
      const defaultPlatformMock = [{ id: BigInt(1), uid: 'platform_test123' }];

      // Setup both transaction and direct prisma client mocks
      mockTransactionClient.client.findMany.mockResolvedValue(
        defaultClientMock,
      );
      mockTransactionClient.studioRoom.findMany.mockResolvedValue(
        defaultStudioRoomMock,
      );
      mockTransactionClient.showType.findMany.mockResolvedValue(
        defaultShowTypeMock,
      );
      mockTransactionClient.showStatus.findMany.mockResolvedValue(
        defaultShowStatusMock,
      );
      mockTransactionClient.showStandard.findMany.mockResolvedValue(
        defaultShowStandardMock,
      );
      mockTransactionClient.mC.findMany.mockResolvedValue(defaultMcMock);
      mockTransactionClient.platform.findMany.mockResolvedValue(
        defaultPlatformMock,
      );

      mockPrismaClient.client.findMany.mockResolvedValue(defaultClientMock);
      mockPrismaClient.studioRoom.findMany.mockResolvedValue(
        defaultStudioRoomMock,
      );
      mockPrismaClient.showType.findMany.mockResolvedValue(defaultShowTypeMock);
      mockPrismaClient.showStatus.findMany.mockResolvedValue(
        defaultShowStatusMock,
      );
      mockPrismaClient.showStandard.findMany.mockResolvedValue(
        defaultShowStandardMock,
      );
      mockPrismaClient.mC.findMany.mockResolvedValue(defaultMcMock);
      mockPrismaClient.platform.findMany.mockResolvedValue(defaultPlatformMock);
    });

    it('should handle undefined MCs and platforms arrays', async () => {
      const scheduleWithUndefinedArrays = {
        ...mockScheduleData,
        planDocument: {
          ...mockValidPlanDocument,
          shows: [
            {
              ...mockValidPlanDocument.shows[0],
              mcs: undefined,
              platforms: undefined,
            } as any,
          ],
        },
      };

      const result = await service.validateSchedule(
        scheduleWithUndefinedArrays,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle shows at schedule boundaries', async () => {
      const boundarySchedule = {
        ...mockScheduleData,
        planDocument: {
          ...mockValidPlanDocument,
          shows: [
            {
              tempId: 'temp_boundary',
              name: 'Boundary Show',
              startTime: '2024-01-01T00:00:00Z', // Exactly at start
              endTime: '2024-01-31T00:00:00Z', // Exactly at schedule end boundary
              clientUid: 'client_test123',
              studioRoomUid: 'room_test123',
              showTypeUid: 'sht_test123',
              showStatusUid: 'shst_test123',
              showStandardUid: 'shsd_test123',
              mcs: [],
              platforms: [],
            },
          ],
        },
      };

      const result = await service.validateSchedule(boundarySchedule);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle multiple MCs on same show without conflict', async () => {
      const multiMcSchedule = {
        ...mockScheduleData,
        planDocument: {
          ...mockValidPlanDocument,
          shows: [
            {
              ...mockValidPlanDocument.shows[0],
              mcs: [
                { mcUid: 'mc_test123', note: 'MC 1' },
                { mcUid: 'mc_test456', note: 'MC 2' },
              ],
            },
          ],
        },
      };

      mockPrismaClient.mC.findMany.mockResolvedValue([
        { id: BigInt(1), uid: 'mc_test123' },
        { id: BigInt(2), uid: 'mc_test456' },
      ]);

      const result = await service.validateSchedule(multiMcSchedule);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect conflicts when multiple MCs have overlapping assignments', async () => {
      // Mock isTimeOverlapping to return true for overlapping times
      _utilityService.isTimeOverlapping.mockReturnValue(true);

      const multiMcConflictSchedule = {
        ...mockScheduleData,
        planDocument: {
          ...mockValidPlanDocument,
          shows: [
            {
              tempId: 'show_1',
              name: 'Show 1',
              startTime: '2024-01-01T10:00:00Z',
              endTime: '2024-01-01T12:00:00Z',
              clientUid: 'client_test123',
              studioRoomUid: 'room_test123',
              showTypeUid: 'sht_test123',
              showStatusUid: 'shst_test123',
              showStandardUid: 'shsd_test123',
              mcs: [{ mcUid: 'mc_test123', note: 'MC 1' }],
              platforms: [],
            },
            {
              tempId: 'show_2',
              name: 'Show 2',
              startTime: '2024-01-01T11:00:00Z',
              endTime: '2024-01-01T13:00:00Z',
              clientUid: 'client_test123',
              studioRoomUid: 'room_test456',
              showTypeUid: 'sht_test123',
              showStatusUid: 'shst_test123',
              showStandardUid: 'shsd_test123',
              mcs: [{ mcUid: 'mc_test123', note: 'MC 1' }], // Same MC
              platforms: [],
            },
          ],
        },
      };

      mockPrismaClient.mC.findMany.mockResolvedValue([
        { id: BigInt(1), uid: 'mc_test123' },
      ]);

      const result = await service.validateSchedule(multiMcConflictSchedule);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'internal_conflict',
          message:
            'MC mc_test123 is assigned to overlapping shows "Show 1" and "Show 2"',
        }),
      );
    });
  });
});
