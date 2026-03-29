import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import type { StudioCreatorAvailabilityQueryDto } from './schemas/studio-creator-availability.schema';
import type { StudioCreatorCatalogQueryDto } from './schemas/studio-creator-catalog.schema';
import type { OnboardStudioCreatorDto } from './schemas/studio-creator-onboard.schema';
import type { StudioCreatorOnboardingUserSearchQueryDto } from './schemas/studio-creator-onboarding-user-search.schema';
import type { ListStudioCreatorRosterQueryDto } from './schemas/studio-creator-roster-list.schema';
import type {
  CreateStudioCreatorRosterDto,
  UpdateStudioCreatorRosterDto,
} from './schemas/studio-creator-roster-write.schema';
import { StudioCreatorController } from './studio-creator.controller';

import { StudioCreatorService } from '@/models/studio-creator/studio-creator.service';

describe('studioCreatorController', () => {
  let controller: StudioCreatorController;
  let studioCreatorService: jest.Mocked<StudioCreatorService>;

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
          },
        },
      ],
    }).compile();

    controller = module.get<StudioCreatorController>(StudioCreatorController);
    studioCreatorService = module.get(StudioCreatorService);
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
      },
    ]);

    const result = await controller.availability(studioId, query);

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
      includeRostered: false,
      limit: 10,
    } as StudioCreatorCatalogQueryDto;

    studioCreatorService.listCatalog.mockResolvedValue([
      {
        uid: 'creator_00000000000000000001',
        name: 'Ann',
        aliasName: 'Ann',
        isRostered: false,
        rosterState: 'NONE',
      },
    ]);

    const result = await controller.catalog(studioId, query);

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

    const result = await controller.listRoster(studioId, query);

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
      defaultRate: 500,
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
      defaultRate: 500,
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

  it('should update a creator roster entry', async () => {
    const studioId = 'std_00000000000000000001';
    const creatorId = 'creator_00000000000000000001';
    const dto = {
      version: 2,
      defaultRate: 650,
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
      defaultRate: 650,
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
        defaultRate: 550,
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
        defaultRate: 550,
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
});
