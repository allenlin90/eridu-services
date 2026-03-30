import { Module } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ClsModule } from 'nestjs-cls';

import { STUDIO_CREATOR_ROSTER_ERROR } from '@eridu/api-types/studio-creators';

import { VersionConflictError } from '@/lib/errors/version-conflict.error';
import { CreatorRepository } from '@/models/creator/creator.repository';
import { CreatorService } from '@/models/creator/creator.service';
import { StudioCreatorRepository, type StudioCreatorRosterRecord } from '@/models/studio-creator/studio-creator.repository';
import { StudioCreatorService } from '@/models/studio-creator/studio-creator.service';
import { UserService } from '@/models/user/user.service';
import { PrismaService } from '@/prisma/prisma.service';
import { UtilityService } from '@/utility/utility.service';

const mockPrismaForCls = {
  $transaction: jest.fn(async (callback: any) => await callback({})),
};

@Module({
  providers: [{ provide: PrismaService, useValue: mockPrismaForCls }],
  exports: [PrismaService],
})
class MockPrismaModule {}

function buildRosterRecord(overrides: Partial<Record<keyof StudioCreatorRosterRecord, unknown>> = {}) {
  return {
    id: 1n,
    uid: 'smc_00000000000000000001',
    studioId: 1n,
    creatorId: 1n,
    defaultRate: null,
    defaultRateType: null,
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
    ...overrides,
  };
}

describe('studioCreatorService', () => {
  let service: StudioCreatorService;
  let studioCreatorRepository: jest.Mocked<StudioCreatorRepository>;
  let creatorRepository: jest.Mocked<CreatorRepository>;
  let creatorService: jest.Mocked<CreatorService>;
  let userService: jest.Mocked<UserService>;
  let utilityService: jest.Mocked<UtilityService>;

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
        StudioCreatorService,
        {
          provide: StudioCreatorRepository,
          useValue: {
            findByStudioUidPaginated: jest.fn(),
            findByStudioUidAndCreatorUid: jest.fn(),
            createRosterEntry: jest.fn(),
            reactivateRosterEntry: jest.fn(),
            updateWithVersionCheck: jest.fn(),
          },
        },
        {
          provide: CreatorRepository,
          useValue: {
            findByUid: jest.fn(),
            findCatalogForStudio: jest.fn(),
            findAvailableForStudioWindow: jest.fn(),
          },
        },
        {
          provide: CreatorService,
          useValue: {
            createCreator: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: {
            getUserById: jest.fn(),
            searchUsersForCreatorOnboarding: jest.fn(),
          },
        },
        {
          provide: UtilityService,
          useValue: {
            generateBrandedId: jest.fn().mockReturnValue('smc_generated'),
          },
        },
      ],
    }).compile();

    service = module.get(StudioCreatorService);
    studioCreatorRepository = module.get(StudioCreatorRepository);
    creatorRepository = module.get(CreatorRepository);
    creatorService = module.get(CreatorService);
    userService = module.get(UserService);
    utilityService = module.get(UtilityService);
  });

  it('defaults roster listing to active creators', async () => {
    studioCreatorRepository.findByStudioUidPaginated.mockResolvedValue({ data: [], total: 0 });

    await service.listRoster('std_1', {
      skip: 0,
      take: 20,
    });

    expect(studioCreatorRepository.findByStudioUidPaginated).toHaveBeenCalledWith('std_1', {
      skip: 0,
      take: 20,
      isActive: true,
    });
  });

  it('passes studio scope into availability discovery', async () => {
    creatorRepository.findAvailableForStudioWindow.mockResolvedValue([]);

    await service.listAvailable('std_1', {
      dateFrom: new Date('2026-03-15T10:00:00.000Z'),
      dateTo: new Date('2026-03-15T12:00:00.000Z'),
      search: 'ann',
      limit: 25,
    });

    expect(creatorRepository.findAvailableForStudioWindow).toHaveBeenCalledWith({
      studioUid: 'std_1',
      dateFrom: new Date('2026-03-15T10:00:00.000Z'),
      dateTo: new Date('2026-03-15T12:00:00.000Z'),
      search: 'ann',
      limit: 25,
    });
  });

  it('creates a new roster entry for a catalog creator', async () => {
    creatorRepository.findByUid.mockResolvedValue({ uid: 'creator_1' } as any);
    studioCreatorRepository.findByStudioUidAndCreatorUid.mockResolvedValue(null);
    studioCreatorRepository.createRosterEntry.mockResolvedValue(buildRosterRecord() as any);

    const result = await service.addCreatorToRoster('std_1', {
      creatorId: 'creator_1',
      defaultRate: 500,
      defaultRateType: 'FIXED',
      defaultCommissionRate: null,
      metadata: { source: 'ui' },
    });

    expect(utilityService.generateBrandedId).toHaveBeenCalledWith('smc', undefined);
    expect(studioCreatorRepository.createRosterEntry).toHaveBeenCalledWith({
      uid: 'smc_generated',
      studioUid: 'std_1',
      creatorUid: 'creator_1',
      defaultRate: '500.00',
      defaultRateType: 'FIXED',
      defaultCommissionRate: null,
      metadata: { source: 'ui' },
    });
    expect(result).toEqual(expect.objectContaining({ uid: 'smc_00000000000000000001' }));
  });

  it('reactivates an inactive roster entry instead of duplicating it', async () => {
    creatorRepository.findByUid.mockResolvedValue({ uid: 'creator_1' } as any);
    studioCreatorRepository.findByStudioUidAndCreatorUid.mockResolvedValue(
      buildRosterRecord({
        uid: 'smc_existing',
        isActive: false,
        metadata: { preserved: true },
      }) as any,
    );
    studioCreatorRepository.reactivateRosterEntry.mockResolvedValue(
      buildRosterRecord({ uid: 'smc_existing', isActive: true }) as any,
    );

    await service.addCreatorToRoster('std_1', {
      creatorId: 'creator_1',
      defaultRate: 600,
      defaultRateType: 'FIXED',
      defaultCommissionRate: null,
    });

    expect(studioCreatorRepository.reactivateRosterEntry).toHaveBeenCalledWith({
      uid: 'smc_existing',
      defaultRate: '600.00',
      defaultRateType: 'FIXED',
      defaultCommissionRate: null,
      metadata: { preserved: true },
    });
    expect(studioCreatorRepository.createRosterEntry).not.toHaveBeenCalled();
  });

  it('throws CREATOR_ALREADY_IN_ROSTER for duplicate active add', async () => {
    creatorRepository.findByUid.mockResolvedValue({ uid: 'creator_1' } as any);
    studioCreatorRepository.findByStudioUidAndCreatorUid.mockResolvedValue(
      buildRosterRecord({ isActive: true }) as any,
    );

    await expect(service.addCreatorToRoster('std_1', {
      creatorId: 'creator_1',
      defaultRateType: 'FIXED',
      defaultCommissionRate: null,
    })).rejects.toMatchObject({
      response: expect.objectContaining({
        message: expect.stringContaining(STUDIO_CREATOR_ROSTER_ERROR.CREATOR_ALREADY_IN_ROSTER),
      }),
    });
  });

  it('throws CREATOR_NOT_FOUND when creator is missing from the catalog', async () => {
    creatorRepository.findByUid.mockResolvedValue(null);

    await expect(service.addCreatorToRoster('std_1', {
      creatorId: 'creator_404',
      defaultRateType: 'FIXED',
      defaultCommissionRate: null,
    })).rejects.toMatchObject({
      response: expect.objectContaining({
        message: expect.stringContaining(STUDIO_CREATOR_ROSTER_ERROR.CREATOR_NOT_FOUND),
      }),
    });
  });

  it('onboards a brand-new creator into an active studio roster row', async () => {
    userService.getUserById.mockResolvedValue({
      uid: 'user_1',
      email: 'creator@example.com',
    } as any);
    creatorService.createCreator.mockResolvedValue({
      uid: 'creator_new',
      name: 'Alice Example',
      aliasName: 'Alice',
    } as any);
    studioCreatorRepository.createRosterEntry.mockResolvedValue(
      buildRosterRecord({
        uid: 'smc_new',
        creator: {
          uid: 'creator_new',
          name: 'Alice Example',
          aliasName: 'Alice',
        },
      }) as any,
    );

    const result = await service.onboardCreator('std_1', {
      creator: {
        name: 'Alice Example',
        aliasName: 'Alice',
        userId: 'user_1',
        metadata: { source: 'onboard' },
      },
      roster: {
        defaultRate: 500,
        defaultRateType: 'FIXED',
        defaultCommissionRate: null,
        metadata: { team: 'studio' },
      },
    });

    expect(userService.getUserById).toHaveBeenCalledWith('user_1');
    expect(creatorService.createCreator).toHaveBeenCalledWith({
      name: 'Alice Example',
      aliasName: 'Alice',
      userId: 'user_1',
      metadata: { source: 'onboard' },
    });
    expect(studioCreatorRepository.createRosterEntry).toHaveBeenCalledWith({
      uid: 'smc_generated',
      studioUid: 'std_1',
      creatorUid: 'creator_new',
      defaultRate: '500.00',
      defaultRateType: 'FIXED',
      defaultCommissionRate: null,
      metadata: { team: 'studio' },
    });
    expect(result).toEqual(expect.objectContaining({ uid: 'smc_new' }));
  });

  it('returns 404 when onboarding references a missing user', async () => {
    userService.getUserById.mockResolvedValue(null);

    await expect(service.onboardCreator('std_1', {
      creator: {
        name: 'Alice Example',
        aliasName: 'Alice',
        userId: 'user_missing',
      },
      roster: {
        defaultRateType: 'FIXED',
        defaultCommissionRate: null,
      },
    })).rejects.toMatchObject({
      response: expect.objectContaining({
        message: expect.stringContaining('User not found'),
      }),
    });

    expect(creatorService.createCreator).not.toHaveBeenCalled();
    expect(studioCreatorRepository.createRosterEntry).not.toHaveBeenCalled();
  });

  it('delegates onboarding user search to user service', async () => {
    userService.searchUsersForCreatorOnboarding.mockResolvedValue([
      { uid: 'user_1', name: 'Alice', email: 'alice@example.com' },
    ] as any);

    const result = await service.searchOnboardingUsers('std_1', {
      search: 'alice',
      limit: 20,
    });

    expect(userService.searchUsersForCreatorOnboarding).toHaveBeenCalledWith({
      search: 'alice',
      limit: 20,
    });
    expect(result).toEqual([
      { uid: 'user_1', name: 'Alice', email: 'alice@example.com' },
    ]);
  });

  it('updates roster defaults and clears commission when switching to FIXED', async () => {
    studioCreatorRepository.findByStudioUidAndCreatorUid.mockResolvedValue(
      buildRosterRecord({
        defaultRateType: 'COMMISSION',
        defaultCommissionRate: '10.00',
      }) as any,
    );
    studioCreatorRepository.updateWithVersionCheck.mockResolvedValue(
      buildRosterRecord({
        defaultRateType: 'FIXED',
        defaultCommissionRate: null,
        version: 3,
      }) as any,
    );

    await service.updateRosterEntry('std_1', 'creator_1', {
      version: 2,
      defaultRateType: 'FIXED',
      isActive: false,
    });

    expect(studioCreatorRepository.updateWithVersionCheck).toHaveBeenCalledWith(
      'std_1',
      'creator_1',
      2,
      {
        defaultRate: undefined,
        defaultRateType: 'FIXED',
        defaultCommissionRate: null,
        isActive: false,
        metadata: undefined,
      },
    );
  });

  it('throws VERSION_CONFLICT when optimistic locking fails', async () => {
    studioCreatorRepository.findByStudioUidAndCreatorUid.mockResolvedValue(buildRosterRecord() as any);
    studioCreatorRepository.updateWithVersionCheck.mockRejectedValue(
      new VersionConflictError('stale', 2, 3),
    );

    await expect(service.updateRosterEntry('std_1', 'creator_1', {
      version: 2,
      defaultRate: 650,
    })).rejects.toMatchObject({
      response: expect.objectContaining({
        message: expect.stringContaining(STUDIO_CREATOR_ROSTER_ERROR.VERSION_CONFLICT),
      }),
    });
  });

  it('rejects commission updates that conflict with a FIXED creator type', async () => {
    studioCreatorRepository.findByStudioUidAndCreatorUid.mockResolvedValue(
      buildRosterRecord({
        defaultRateType: 'FIXED',
        defaultCommissionRate: null,
      }) as any,
    );

    await expect(service.updateRosterEntry('std_1', 'creator_1', {
      version: 2,
      defaultCommissionRate: 15,
    })).rejects.toMatchObject({
      response: expect.objectContaining({
        message: expect.stringContaining('default_commission_rate must be null'),
      }),
    });
  });
});
