import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';

import type { StudioCreatorAvailabilityQueryDto } from './schemas/studio-creator-availability.schema';
import type { StudioCreatorCatalogQueryDto } from './schemas/studio-creator-catalog.schema';
import type { StudioCreatorCompensationQueryDto } from './schemas/studio-creator-compensation.schema';
import type { OnboardStudioCreatorDto } from './schemas/studio-creator-onboard.schema';
import type { StudioCreatorOnboardingUserSearchQueryDto } from './schemas/studio-creator-onboarding-user-search.schema';
import type { ListStudioCreatorRosterQueryDto } from './schemas/studio-creator-roster-list.schema';
import type {
  CreateStudioCreatorRosterDto,
  UpdateStudioCreatorRosterDto,
} from './schemas/studio-creator-roster-write.schema';
import { StudioCreatorController } from './studio-creator.controller';

import { STUDIO_ROLES_KEY } from '@/lib/decorators/studio-protected.decorator';
import { StudioCreatorService } from '@/models/studio-creator/studio-creator.service';
import { CreatorCompensationService } from '@/show-orchestration/creator-compensation.service';

describe('studioCreatorController', () => {
  let controller: StudioCreatorController;
  let studioCreatorService: jest.Mocked<StudioCreatorService>;
  let creatorCompensationService: jest.Mocked<CreatorCompensationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudioCreatorController],
      providers: [
        {
          provide: StudioCreatorService,
          useValue: {
            listAvailable: jest.fn(),
            listCatalog: jest.fn(),
            listRoster: jest.fn(),
            addCreatorToRoster: jest.fn(),
            onboardCreator: jest.fn(),
            searchOnboardingUsers: jest.fn(),
            updateRosterEntry: jest.fn(),
            findRosterEntry: jest.fn(),
          },
        },
        {
          provide: CreatorCompensationService,
          useValue: {
            getCreatorCompensations: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<StudioCreatorController>(StudioCreatorController);
    studioCreatorService = module.get(StudioCreatorService);
    creatorCompensationService = module.get(CreatorCompensationService);
  });

  it('should list available creators by studio and date window', async () => {
    const studioId = 'std_00000000000000000001';
    const query = {
      date_from: '2026-03-13T10:00:00.000Z',
      date_to: '2026-03-13T12:00:00.000Z',
      dateFrom: new Date('2026-03-13T10:00:00.000Z'),
      dateTo: new Date('2026-03-13T12:00:00.000Z'),
      search: 'ann',
      limit: 25,
    } as StudioCreatorAvailabilityQueryDto;

    studioCreatorService.listAvailable.mockResolvedValue([
      {
        uid: 'creator_00000000000000000001',
        name: 'Ann',
        aliasName: 'Ann',
        defaultRate: '150.00',
        defaultRateType: 'FIXED',
        defaultCommissionRate: null,
      },
    ]);

    const result = await controller.availability(studioId, query, { studioMembership: { role: 'admin' } } as any);

    expect(studioCreatorService.listAvailable).toHaveBeenCalledWith(studioId, query);
    expect(result).toEqual([
      expect.objectContaining({
        id: 'creator_00000000000000000001',
        name: 'Ann',
        alias_name: 'Ann',
      }),
    ]);
  });

  it('should list creator catalog scoped by route studioId', async () => {
    const studioId = 'std_00000000000000000001';
    const query = {
      search: 'ann',
      includeRostered: true,
      excludeActiveRostered: true,
      limit: 10,
    } as StudioCreatorCatalogQueryDto;

    studioCreatorService.listCatalog.mockResolvedValue([
      {
        uid: 'creator_00000000000000000001',
        name: 'Ann',
        aliasName: 'Ann',
        isRostered: false,
        rosterState: 'NONE',
        defaultRate: '150.00',
        defaultRateType: 'FIXED',
        defaultCommissionRate: null,
      },
    ]);

    const result = await controller.catalog(studioId, query, { studioMembership: { role: 'admin' } } as any);

    expect(studioCreatorService.listCatalog).toHaveBeenCalledWith(studioId, query);
    expect(result).toEqual([
      expect.objectContaining({
        id: 'creator_00000000000000000001',
        is_rostered: false,
        roster_state: 'NONE',
      }),
    ]);
  });

  it('should list roster scoped by route studioId', async () => {
    const studioId = 'std_00000000000000000001';
    const query = {
      page: 1,
      limit: 20,
      take: 20,
      skip: 0,
      sort: 'desc',
      search: undefined,
      is_active: true,
      default_rate_type: 'FIXED',
      isActive: true,
      defaultRateType: 'FIXED',
    } as ListStudioCreatorRosterQueryDto;

    studioCreatorService.listRoster.mockResolvedValue({
      data: [{
        id: 1n,
        uid: 'smc_00000000000000000001',
        studioId: 1n,
        creatorId: 1n,
        defaultRate: null,
        defaultRateType: 'FIXED',
        defaultCommissionRate: null,
        isActive: true,
        version: 1,
        metadata: {},
        createdAt: new Date('2026-03-11T00:00:00.000Z'),
        updatedAt: new Date('2026-03-11T00:00:00.000Z'),
        deletedAt: null,
        creator: {
          uid: 'creator_00000000000000000001',
          name: 'Ann',
          aliasName: 'Ann',
        },
      }],
      total: 1,
    });

    const result = await controller.listRoster(studioId, query, { studioMembership: { role: 'admin' } } as any);

    expect(studioCreatorService.listRoster).toHaveBeenCalledWith(studioId, query);
    expect(result).toEqual({
      data: [
        expect.objectContaining({
          id: 'smc_00000000000000000001',
          creator_id: 'creator_00000000000000000001',
          default_rate_type: 'FIXED',
          is_active: true,
        }),
      ],
      meta: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });
  });

  it('should add a creator to the roster', async () => {
    const studioId = 'std_00000000000000000001';
    const dto = {
      creatorId: 'creator_00000000000000000001',
      defaultRate: '500.00',
      defaultRateType: 'FIXED',
      defaultCommissionRate: null,
      metadata: {},
    } as CreateStudioCreatorRosterDto;

    studioCreatorService.addCreatorToRoster.mockResolvedValue({
      id: 1n,
      uid: 'smc_00000000000000000001',
      studioId: 1n,
      creatorId: 1n,
      defaultRate: '500.00',
      defaultRateType: 'FIXED',
      defaultCommissionRate: null,
      isActive: true,
      version: 1,
      metadata: {},
      createdAt: new Date('2026-03-11T00:00:00.000Z'),
      updatedAt: new Date('2026-03-11T00:00:00.000Z'),
      deletedAt: null,
      creator: {
        uid: 'creator_00000000000000000001',
        name: 'Ann',
        aliasName: 'Ann',
      },
    } as any);

    const result = await controller.addCreator(studioId, dto);

    expect(studioCreatorService.addCreatorToRoster).toHaveBeenCalledWith(studioId, {
      creatorId: 'creator_00000000000000000001',
      defaultRate: '500.00',
      defaultRateType: 'FIXED',
      defaultCommissionRate: null,
      metadata: {},
    });
    expect(result).toEqual(expect.objectContaining({
      id: 'smc_00000000000000000001',
      creator_id: 'creator_00000000000000000001',
      default_rate: '500.00',
    }));
  });

  it('should allow talent managers to manage creator roster intake routes', () => {
    expect(Reflect.getMetadata(STUDIO_ROLES_KEY, StudioCreatorController.prototype.addCreator)).toEqual([
      STUDIO_ROLE.ADMIN,
      STUDIO_ROLE.MANAGER,
      STUDIO_ROLE.TALENT_MANAGER,
    ]);
    expect(Reflect.getMetadata(STUDIO_ROLES_KEY, StudioCreatorController.prototype.onboardCreator)).toEqual([
      STUDIO_ROLE.ADMIN,
      STUDIO_ROLE.MANAGER,
      STUDIO_ROLE.TALENT_MANAGER,
    ]);
    expect(Reflect.getMetadata(STUDIO_ROLES_KEY, StudioCreatorController.prototype.onboardingUsers)).toEqual([
      STUDIO_ROLE.ADMIN,
      STUDIO_ROLE.MANAGER,
      STUDIO_ROLE.TALENT_MANAGER,
    ]);
  });

  it('should update a creator roster entry', async () => {
    const studioId = 'std_00000000000000000001';
    const creatorId = 'creator_00000000000000000001';
    const dto = {
      version: 2,
      defaultRate: '650.00',
      defaultRateType: 'FIXED',
      defaultCommissionRate: null,
      isActive: false,
      metadata: { note: 'inactive' },
    } as unknown as UpdateStudioCreatorRosterDto;

    studioCreatorService.updateRosterEntry.mockResolvedValue({
      id: 1n,
      uid: 'smc_00000000000000000001',
      studioId: 1n,
      creatorId: 1n,
      defaultRate: '650.00',
      defaultRateType: 'FIXED',
      defaultCommissionRate: null,
      isActive: false,
      version: 3,
      metadata: { note: 'inactive' },
      createdAt: new Date('2026-03-11T00:00:00.000Z'),
      updatedAt: new Date('2026-03-12T00:00:00.000Z'),
      deletedAt: null,
      creator: {
        uid: creatorId,
        name: 'Ann',
        aliasName: 'Ann',
      },
    } as any);

    const result = await controller.updateCreator(studioId, creatorId, dto);

    expect(studioCreatorService.updateRosterEntry).toHaveBeenCalledWith(studioId, creatorId, {
      version: 2,
      defaultRate: '650.00',
      defaultRateType: 'FIXED',
      defaultCommissionRate: null,
      isActive: false,
      metadata: { note: 'inactive' },
    });
    expect(result).toEqual(expect.objectContaining({
      id: 'smc_00000000000000000001',
      default_rate: '650.00',
      is_active: false,
      version: 3,
    }));
  });

  it('should return creator compensations scoped by studio and date range', async () => {
    const studioId = 'std_00000000000000000001';
    const creatorId = 'creator_00000000000000000001';
    const query = {
      dateFrom: new Date('2026-05-01T00:00:00.000Z'),
      dateTo: new Date('2026-05-31T23:59:59.999Z'),
    } as StudioCreatorCompensationQueryDto;

    creatorCompensationService.getCreatorCompensations.mockResolvedValue({
      creatorId,
      creatorName: 'Ann',
      creatorAliasName: 'Ann',
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      totalAmount: '125.00',
      unresolvedCount: 0,
      shows: [
        {
          showId: 'show_00000000000000000001',
          showName: 'May Show',
          showStartTime: new Date('2026-05-10T10:00:00.000Z'),
          showEndTime: new Date('2026-05-10T12:00:00.000Z'),
          showCreatorId: 'show_mc_00000000000000000001',
          creatorId,
          creatorName: 'Ann',
          creatorAliasName: 'Ann',
          note: 'Existing note',
          compensationType: 'FIXED',
          agreedRate: '100.00',
          commissionRate: null,
          baseAmount: '100.00',
          adjustmentTotal: '25.00',
          totalAmount: '125.00',
          unresolvedReason: null,
        },
      ],
    });

    const result = await controller.listCreatorCompensations(studioId, creatorId, query);

    expect(creatorCompensationService.getCreatorCompensations).toHaveBeenCalledWith(
      studioId,
      creatorId,
      {
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
      },
    );
    expect(result).toEqual(expect.objectContaining({
      creator_id: creatorId,
      total_amount: '125.00',
      unresolved_count: 0,
      shows: [
        expect.objectContaining({
          show_id: 'show_00000000000000000001',
          show_creator_id: 'show_mc_00000000000000000001',
          note: 'Existing note',
        }),
      ],
    }));
  });

  it('should onboard a brand-new creator into roster', async () => {
    const studioId = 'std_00000000000000000001';
    const dto = {
      creator: {
        name: 'Alice Example',
        aliasName: 'Alice',
        userId: 'user_00000000000000000001',
        metadata: { source: 'onboard' },
      },
      roster: {
        defaultRate: '550.00',
        defaultRateType: 'FIXED',
        defaultCommissionRate: null,
        metadata: { source: 'ui' },
      },
    } as OnboardStudioCreatorDto;

    studioCreatorService.onboardCreator.mockResolvedValue({
      id: 2n,
      uid: 'smc_00000000000000000002',
      studioId: 1n,
      creatorId: 2n,
      defaultRate: '550.00',
      defaultRateType: 'FIXED',
      defaultCommissionRate: null,
      isActive: true,
      version: 1,
      metadata: {},
      createdAt: new Date('2026-03-11T00:00:00.000Z'),
      updatedAt: new Date('2026-03-11T00:00:00.000Z'),
      deletedAt: null,
      creator: {
        uid: 'creator_00000000000000000002',
        name: 'Alice Example',
        aliasName: 'Alice',
      },
    } as any);

    const result = await controller.onboardCreator(studioId, dto);

    expect(studioCreatorService.onboardCreator).toHaveBeenCalledWith(studioId, {
      creator: {
        name: 'Alice Example',
        aliasName: 'Alice',
        userId: 'user_00000000000000000001',
        metadata: { source: 'onboard' },
      },
      roster: {
        defaultRate: '550.00',
        defaultRateType: 'FIXED',
        defaultCommissionRate: null,
        metadata: { source: 'ui' },
      },
    });
    expect(result).toEqual(expect.objectContaining({
      id: 'smc_00000000000000000002',
      creator_id: 'creator_00000000000000000002',
      creator_name: 'Alice Example',
    }));
  });

  it('should return studio-safe onboarding users', async () => {
    const studioId = 'std_00000000000000000001';
    const query = {
      search: 'alice',
      limit: 20,
    } as StudioCreatorOnboardingUserSearchQueryDto;

    studioCreatorService.searchOnboardingUsers.mockResolvedValue([
      {
        id: 1n,
        uid: 'user_00000000000000000001',
        extId: 'ext_alice',
        email: 'alice@example.com',
        name: 'Alice',
        profileUrl: null,
        metadata: {},
        isSystemAdmin: false,
        isBanned: false,
        createdAt: new Date('2026-03-11T00:00:00.000Z'),
        updatedAt: new Date('2026-03-11T00:00:00.000Z'),
        deletedAt: null,
      },
    ] as any);

    const result = await controller.onboardingUsers(studioId, query);

    expect(studioCreatorService.searchOnboardingUsers).toHaveBeenCalledWith(studioId, {
      search: 'alice',
      limit: 20,
    });
    expect(result).toEqual([
      expect.objectContaining({
        id: 'user_00000000000000000001',
        ext_id: 'ext_alice',
        email: 'alice@example.com',
        name: 'Alice',
      }),
    ]);
  });

  it('should return a single creator roster entry scoped by studio', async () => {
    const studioId = 'std_00000000000000000001';
    const creatorId = 'creator_00000000000000000001';

    studioCreatorService.findRosterEntry.mockResolvedValue({
      id: 1n,
      uid: 'smc_00000000000000000001',
      studioId: 1n,
      creatorId: 1n,
      defaultRate: '650.00',
      defaultRateType: 'FIXED',
      defaultCommissionRate: null,
      isActive: true,
      version: 4,
      metadata: {},
      createdAt: new Date('2026-03-11T00:00:00.000Z'),
      updatedAt: new Date('2026-03-12T00:00:00.000Z'),
      deletedAt: null,
      creator: {
        uid: creatorId,
        name: 'Ann',
        aliasName: 'Ann',
      },
    } as any);

    const result = await controller.getCreator(studioId, creatorId, { studioMembership: { role: 'admin' } } as any);

    expect(studioCreatorService.findRosterEntry).toHaveBeenCalledWith(studioId, creatorId);
    expect(result).toEqual(expect.objectContaining({
      id: 'smc_00000000000000000001',
      creator_id: creatorId,
      default_rate: '650.00',
      is_active: true,
      version: 4,
    }));
  });

  it('should throw not-found when the creator is not on the studio roster', async () => {
    const studioId = 'std_00000000000000000001';
    const creatorId = 'creator_00000000000000000009';

    studioCreatorService.findRosterEntry.mockResolvedValue(null);

    await expect(controller.getCreator(studioId, creatorId, { studioMembership: { role: 'admin' } } as any)).rejects.toThrow('Creator not found in studio roster');
  });

  it('should restrict creator read to admin, manager, talent manager, and account manager roles', () => {
    const roles = Reflect.getMetadata(STUDIO_ROLES_KEY, StudioCreatorController.prototype.getCreator);
    expect(roles).toEqual([
      STUDIO_ROLE.ADMIN,
      STUDIO_ROLE.MANAGER,
      STUDIO_ROLE.TALENT_MANAGER,
      STUDIO_ROLE.ACCOUNT_MANAGER,
    ]);
  });

  it('should redact default rate and commission for ACCOUNT_MANAGER role', async () => {
    const studioId = 'std_00000000000000000001';
    const creatorId = 'creator_00000000000000000009';
    const mockAMRequest = {
      studioMembership: {
        role: 'account_manager',
      },
    } as any;

    const mockCreator = {
      id: 123n,
      uid: 'smc_001',
      defaultRate: '150.00',
      defaultRateType: 'FIXED',
      defaultCommissionRate: '10.00',
      isActive: true,
      version: 1,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      creator: {
        uid: creatorId,
        name: 'Alice',
        aliasName: 'Ali',
      },
    } as any;

    studioCreatorService.findRosterEntry.mockResolvedValue(mockCreator);

    const result = await controller.getCreator(studioId, creatorId, mockAMRequest);
    expect(result.default_rate).toBeNull();
    expect(result.default_rate_type).toBeNull();
    expect(result.default_commission_rate).toBeNull();
  });

  it('should allow admins, managers, and talent managers to edit creator defaults', () => {
    const roles = Reflect.getMetadata(STUDIO_ROLES_KEY, StudioCreatorController.prototype.updateCreator);
    expect(roles).toEqual([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER, STUDIO_ROLE.TALENT_MANAGER]);
  });
});
