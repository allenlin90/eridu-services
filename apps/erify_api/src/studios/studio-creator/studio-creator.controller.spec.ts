import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import type { StudioCreatorAvailabilityQueryDto } from './schemas/studio-creator-availability.schema';
import type { StudioCreatorCatalogQueryDto } from './schemas/studio-creator-catalog.schema';
import type { ListStudioCreatorRosterQueryDto } from './schemas/studio-creator-roster-list.schema';
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
      },
    ]);

    const result = await controller.catalog(studioId, query);

    expect(studioCreatorService.listCatalog).toHaveBeenCalledWith(studioId, query);
    expect(result).toEqual([
      expect.objectContaining({
        id: 'creator_00000000000000000001',
        is_rostered: false,
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

    const result = await controller.roster(studioId, query);

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
});
