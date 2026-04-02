import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import type { ShowCreatorWithCreator, ShowWithGroupedRelations } from './economics.repository';
import { EconomicsRepository } from './economics.repository';
import { EconomicsService } from './economics.service';

// ============================================================================
// Test Data Factories
// ============================================================================

function makeCreator(overrides: Record<string, unknown> = {}) {
  return {
    id: BigInt(1),
    uid: 'creator_abc123',
    name: 'Test Creator',
    aliasName: 'TC',
    isBanned: false,
    defaultRate: null,
    defaultRateType: null,
    defaultCommissionRate: null,
    metadata: {},
    userId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

function makeShowCreator(overrides: Record<string, unknown> = {}): ShowCreatorWithCreator {
  const show = makeShow();
  return {
    id: BigInt(1),
    uid: 'show_mc_abc123',
    showId: BigInt(1),
    creatorId: BigInt(1),
    note: null,
    agreedRate: null,
    compensationType: null,
    commissionRate: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    creator: makeCreator(),
    show: {
      ...show,
      client: makeClient(),
    },
    ...overrides,
  } as unknown as ShowCreatorWithCreator;
}

function makeClient(overrides: Record<string, unknown> = {}) {
  return {
    id: BigInt(1),
    uid: 'client_abc123',
    name: 'Test Client',
    contactPerson: 'Contact',
    contactEmail: 'contact@example.com',
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

function makeShow(overrides: Record<string, unknown> = {}): ShowWithGroupedRelations {
  const now = new Date('2024-01-01T10:00:00Z');
  const end = new Date('2024-01-01T12:00:00Z');
  return {
    id: BigInt(1),
    uid: 'show_abc123',
    externalId: null,
    name: 'Test Show',
    startTime: now,
    endTime: end,
    metadata: {},
    clientId: BigInt(1),
    studioId: BigInt(1),
    studioRoomId: null,
    showTypeId: BigInt(1),
    showStatusId: BigInt(1),
    showStandardId: BigInt(1),
    scheduleId: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    client: makeClient(),
    Schedule: null,
    showCreators: [],
    ...overrides,
  } as unknown as ShowWithGroupedRelations;
}

function makeShiftBlock(startTime: Date, endTime: Date) {
  return {
    id: BigInt(1),
    uid: 'ssblk_abc123',
    shiftId: BigInt(1),
    startTime,
    endTime,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
}

function makeShift(blocks: ReturnType<typeof makeShiftBlock>[], overrides: Record<string, unknown> = {}) {
  return {
    id: BigInt(1),
    uid: 'shift_abc123',
    studioId: BigInt(1),
    userId: BigInt(1),
    date: new Date(),
    hourlyRate: '20.00',
    projectedCost: '40.00',
    calculatedCost: null,
    isApproved: false,
    isDutyManager: false,
    status: 'SCHEDULED',
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    blocks,
    studio: { uid: 'studio_abc123', name: 'Test Studio' },
    user: { uid: 'user_abc123', name: 'Test User' },
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('economicsService', () => {
  let service: EconomicsService;
  let repositoryMock: jest.Mocked<EconomicsRepository>;

  beforeEach(async () => {
    repositoryMock = {
      findShowCreatorsWithDefaults: jest.fn(),
      findOverlappingShifts: jest.fn(),
      findShowsForGroupedQuery: jest.fn(),
      findShowWithEconomicsRelations: jest.fn(),
    } as unknown as jest.Mocked<EconomicsRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EconomicsService,
        {
          provide: EconomicsRepository,
          useValue: repositoryMock,
        },
      ],
    }).compile();

    service = module.get<EconomicsService>(EconomicsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // getShowEconomics
  // ============================================================================

  describe('getShowEconomics', () => {
    it('should throw not found when show does not exist', async () => {
      repositoryMock.findShowWithEconomicsRelations.mockResolvedValue(null);
      repositoryMock.findOverlappingShifts.mockResolvedValue([]);

      await expect(
        service.getShowEconomics('studio_abc', 'show_abc123'),
      ).rejects.toThrow();
    });

    it('should return empty costs for a show with no creators and no shifts', async () => {
      const show = makeShow({ showCreators: [] });
      repositoryMock.findShowWithEconomicsRelations.mockResolvedValue(show);
      repositoryMock.findOverlappingShifts.mockResolvedValue([]);

      const result = await service.getShowEconomics('studio_abc', 'show_abc123');

      expect(result.creatorCosts).toHaveLength(0);
      expect(result.shiftCosts).toHaveLength(0);
      expect(result.totalCreatorCost).toBe('0.00');
      expect(result.totalShiftCost).toBe('0.00');
      expect(result.totalCost).toBe('0.00');
    });

    it('should resolve FIXED compensation type with agreed rate as computed cost', async () => {
      const creator = makeCreator({ defaultRateType: null, defaultRate: null });
      const showCreator = makeShowCreator({
        agreedRate: '500.00',
        compensationType: 'FIXED',
        creator,
      });
      const show = makeShow({ showCreators: [showCreator] });
      repositoryMock.findShowWithEconomicsRelations.mockResolvedValue(show);
      repositoryMock.findOverlappingShifts.mockResolvedValue([]);

      const result = await service.getShowEconomics('studio_abc', 'show_abc123');

      expect(result.creatorCosts).toHaveLength(1);
      const cost = result.creatorCosts[0];
      expect(cost.compensationType).toBe('FIXED');
      expect(cost.agreedRate).toBe('500.00');
      expect(cost.computedCost).toBe('500.00');
    });

    it('should fall back to creator default rate when showCreator agreedRate is null', async () => {
      const creator = makeCreator({ defaultRateType: 'FIXED', defaultRate: '300.00' });
      const showCreator = makeShowCreator({
        agreedRate: null,
        compensationType: null,
        creator,
      });
      const show = makeShow({ showCreators: [showCreator] });
      repositoryMock.findShowWithEconomicsRelations.mockResolvedValue(show);
      repositoryMock.findOverlappingShifts.mockResolvedValue([]);

      const result = await service.getShowEconomics('studio_abc', 'show_abc123');

      const cost = result.creatorCosts[0];
      expect(cost.compensationType).toBe('FIXED');
      expect(cost.agreedRate).toBe('300.00');
      expect(cost.computedCost).toBe('300.00');
    });

    it('should produce null computed cost for COMMISSION type', async () => {
      const creator = makeCreator();
      const showCreator = makeShowCreator({
        agreedRate: null,
        compensationType: 'COMMISSION',
        creator,
      });
      const show = makeShow({ showCreators: [showCreator] });
      repositoryMock.findShowWithEconomicsRelations.mockResolvedValue(show);
      repositoryMock.findOverlappingShifts.mockResolvedValue([]);

      const result = await service.getShowEconomics('studio_abc', 'show_abc123');

      const cost = result.creatorCosts[0];
      expect(cost.compensationType).toBe('COMMISSION');
      expect(cost.computedCost).toBeNull();
    });

    it('should produce null computed cost for HYBRID type', async () => {
      const creator = makeCreator();
      const showCreator = makeShowCreator({
        agreedRate: '200.00',
        compensationType: 'HYBRID',
        creator,
      });
      const show = makeShow({ showCreators: [showCreator] });
      repositoryMock.findShowWithEconomicsRelations.mockResolvedValue(show);
      repositoryMock.findOverlappingShifts.mockResolvedValue([]);

      const result = await service.getShowEconomics('studio_abc', 'show_abc123');

      const cost = result.creatorCosts[0];
      expect(cost.compensationType).toBe('HYBRID');
      expect(cost.computedCost).toBeNull();
    });

    it('should compute full shift cost when block is entirely within show window', async () => {
      // Show: 10:00–12:00
      const showStart = new Date('2024-01-01T10:00:00Z');
      const showEnd = new Date('2024-01-01T12:00:00Z');
      // Block: 10:00–12:00 (100% overlap)
      const block = makeShiftBlock(showStart, showEnd);
      const shift = makeShift([block], { projectedCost: '40.00', calculatedCost: null });

      const show = makeShow({ startTime: showStart, endTime: showEnd, showCreators: [] });
      repositoryMock.findShowWithEconomicsRelations.mockResolvedValue(show);
      repositoryMock.findOverlappingShifts.mockResolvedValue([shift] as any);

      const result = await service.getShowEconomics('studio_abc', 'show_abc123');

      expect(result.shiftCosts).toHaveLength(1);
      expect(result.shiftCosts[0].attributedCost).toBe('40.00');
      expect(result.shiftCosts[0].overlapMinutes).toBe(120);
    });

    it('should compute partial shift cost when block partially overlaps show window', async () => {
      // Show: 10:00–12:00
      const showStart = new Date('2024-01-01T10:00:00Z');
      const showEnd = new Date('2024-01-01T12:00:00Z');
      // Block: 09:00–11:00 (1 hour overlap out of 2 hours = 50%)
      const blockStart = new Date('2024-01-01T09:00:00Z');
      const blockEnd = new Date('2024-01-01T11:00:00Z');
      const block = makeShiftBlock(blockStart, blockEnd);
      const shift = makeShift([block], { projectedCost: '40.00', calculatedCost: null });

      const show = makeShow({ startTime: showStart, endTime: showEnd, showCreators: [] });
      repositoryMock.findShowWithEconomicsRelations.mockResolvedValue(show);
      repositoryMock.findOverlappingShifts.mockResolvedValue([shift] as any);

      const result = await service.getShowEconomics('studio_abc', 'show_abc123');

      expect(result.shiftCosts).toHaveLength(1);
      expect(result.shiftCosts[0].attributedCost).toBe('20.00');
      expect(result.shiftCosts[0].overlapMinutes).toBe(60);
    });

    it('should exclude shifts with no overlap with the show window', async () => {
      // Show: 10:00–12:00
      const showStart = new Date('2024-01-01T10:00:00Z');
      const showEnd = new Date('2024-01-01T12:00:00Z');
      // Block: 08:00–09:00 (no overlap)
      const blockStart = new Date('2024-01-01T08:00:00Z');
      const blockEnd = new Date('2024-01-01T09:00:00Z');
      const block = makeShiftBlock(blockStart, blockEnd);
      const shift = makeShift([block], { projectedCost: '20.00', calculatedCost: null });

      const show = makeShow({ startTime: showStart, endTime: showEnd, showCreators: [] });
      repositoryMock.findShowWithEconomicsRelations.mockResolvedValue(show);
      repositoryMock.findOverlappingShifts.mockResolvedValue([shift] as any);

      const result = await service.getShowEconomics('studio_abc', 'show_abc123');

      expect(result.shiftCosts).toHaveLength(0);
    });

    it('should handle a shift with multiple blocks, some overlapping', async () => {
      // Show: 10:00–12:00
      const showStart = new Date('2024-01-01T10:00:00Z');
      const showEnd = new Date('2024-01-01T12:00:00Z');

      // Block 1: 09:00–11:00 (1hr overlap) → blockMs=7200000, overlapMs=3600000
      // Block 2: 13:00–14:00 (0 overlap)   → blockMs=3600000, overlapMs=0
      // Total block: 3 hours; overlap: 1 hour; ratio = 1/3
      // projectedCost = 60 → attributed = 60 * (1/3) = 20
      const block1 = makeShiftBlock(
        new Date('2024-01-01T09:00:00Z'),
        new Date('2024-01-01T11:00:00Z'),
      );
      const block2 = makeShiftBlock(
        new Date('2024-01-01T13:00:00Z'),
        new Date('2024-01-01T14:00:00Z'),
      );
      const shift = makeShift([block1, block2], {
        uid: 'shift_multi',
        projectedCost: '60.00',
        calculatedCost: null,
      });

      const show = makeShow({ startTime: showStart, endTime: showEnd, showCreators: [] });
      repositoryMock.findShowWithEconomicsRelations.mockResolvedValue(show);
      repositoryMock.findOverlappingShifts.mockResolvedValue([shift] as any);

      const result = await service.getShowEconomics('studio_abc', 'show_abc123');

      expect(result.shiftCosts).toHaveLength(1);
      expect(result.shiftCosts[0].attributedCost).toBe('20.00');
    });

    it('should use calculatedCost over projectedCost when available', async () => {
      const showStart = new Date('2024-01-01T10:00:00Z');
      const showEnd = new Date('2024-01-01T12:00:00Z');
      const block = makeShiftBlock(showStart, showEnd);
      const shift = makeShift([block], { projectedCost: '40.00', calculatedCost: '50.00' });

      const show = makeShow({ startTime: showStart, endTime: showEnd, showCreators: [] });
      repositoryMock.findShowWithEconomicsRelations.mockResolvedValue(show);
      repositoryMock.findOverlappingShifts.mockResolvedValue([shift] as any);

      const result = await service.getShowEconomics('studio_abc', 'show_abc123');

      expect(result.shiftCosts[0].attributedCost).toBe('50.00');
    });
  });

  // ============================================================================
  // getGroupedEconomics
  // ============================================================================

  describe('getGroupedEconomics', () => {
    const baseFilters = {
      groupBy: 'client' as const,
      dateFrom: new Date('2024-01-01T00:00:00Z'),
      dateTo: new Date('2024-01-31T23:59:59Z'),
    };

    it('should return empty groups and zero summary when no shows match', async () => {
      repositoryMock.findShowsForGroupedQuery.mockResolvedValue([]);
      repositoryMock.findOverlappingShifts.mockResolvedValue([]);

      const result = await service.getGroupedEconomics('studio_abc', baseFilters);

      expect(result.groups).toHaveLength(0);
      expect(result.summary.showCount).toBe(0);
      expect(result.summary.totalCost).toBe('0.00');
    });

    it('should group shows by client and sum costs', async () => {
      const clientA = makeClient({ uid: 'client_aaa', name: 'Client A' });
      const clientB = makeClient({ uid: 'client_bbb', name: 'Client B' });

      const creator = makeCreator();
      const showCreatorA = makeShowCreator({
        agreedRate: '100.00',
        compensationType: 'FIXED',
        creator,
      });
      const showCreatorB = makeShowCreator({
        agreedRate: '200.00',
        compensationType: 'FIXED',
        creator,
      });

      const show1 = makeShow({
        uid: 'show_aaa',
        client: clientA,
        clientId: BigInt(1),
        showCreators: [showCreatorA],
      });
      const show2 = makeShow({
        uid: 'show_bbb',
        client: clientB,
        clientId: BigInt(2),
        showCreators: [showCreatorB],
      });

      repositoryMock.findShowsForGroupedQuery.mockResolvedValue([show1, show2] as any);
      repositoryMock.findOverlappingShifts.mockResolvedValue([]);

      const result = await service.getGroupedEconomics('studio_abc', {
        ...baseFilters,
        groupBy: 'client',
      });

      expect(result.groups).toHaveLength(2);
      const groupA = result.groups.find((g) => g.groupKey === 'client_aaa');
      const groupB = result.groups.find((g) => g.groupKey === 'client_bbb');

      expect(groupA).toBeDefined();
      expect(groupA!.totalCreatorCost).toBe('100.00');
      expect(groupA!.showCount).toBe(1);

      expect(groupB).toBeDefined();
      expect(groupB!.totalCreatorCost).toBe('200.00');

      expect(result.summary.totalCreatorCost).toBe('300.00');
    });

    it('should group shows by schedule and handle unscheduled shows', async () => {
      const schedule = { uid: 'schedule_xyz', name: 'Q1 Schedule' };

      const scheduledShow = makeShow({
        uid: 'show_sched',
        Schedule: schedule,
        scheduleId: BigInt(1),
        showCreators: [],
      });
      const unscheduledShow = makeShow({
        uid: 'show_unsched',
        Schedule: null,
        scheduleId: null,
        showCreators: [],
      });

      repositoryMock.findShowsForGroupedQuery.mockResolvedValue([
        scheduledShow,
        unscheduledShow,
      ] as any);
      repositoryMock.findOverlappingShifts.mockResolvedValue([]);

      const result = await service.getGroupedEconomics('studio_abc', {
        ...baseFilters,
        groupBy: 'schedule',
      });

      expect(result.groups).toHaveLength(2);
      const scheduledGroup = result.groups.find((g) => g.groupKey === 'schedule_xyz');
      const unscheduledGroup = result.groups.find((g) => g.groupKey === 'unscheduled');

      expect(scheduledGroup).toBeDefined();
      expect(scheduledGroup!.groupLabel).toBe('Q1 Schedule');
      expect(unscheduledGroup).toBeDefined();
      expect(unscheduledGroup!.groupLabel).toBe('Unscheduled');
      expect(result.summary.showCount).toBe(2);
    });
  });
});
