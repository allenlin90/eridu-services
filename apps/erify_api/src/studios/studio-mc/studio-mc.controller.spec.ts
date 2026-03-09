import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { StudioMcController } from './studio-mc.controller';

import { McRepository } from '@/models/mc/mc.repository';
import { StudioMcService } from '@/models/studio-mc/studio-mc.service';
import type { ListStudioMcRosterQueryDto } from '@/studios/studio-mc/schemas/studio-mc-roster-list.schema';

describe('studioMcController', () => {
  let controller: StudioMcController;
  let mcRepository: jest.Mocked<McRepository>;
  let studioMcService: jest.Mocked<StudioMcService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudioMcController],
      providers: [
        {
          provide: McRepository,
          useValue: {
            findAvailableMcs: jest.fn(),
          },
        },
        {
          provide: StudioMcService,
          useValue: {
            listCatalog: jest.fn(),
            listRoster: jest.fn(),
            addToRoster: jest.fn(),
            updateRoster: jest.fn(),
            removeFromRoster: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(StudioMcController);
    mcRepository = module.get(McRepository);
    studioMcService = module.get(StudioMcService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listRoster', () => {
    it('returns paginated roster response', async () => {
      const studioId = 'std_123';
      const query: ListStudioMcRosterQueryDto = {
        page: 2,
        limit: 5,
        skip: 5,
        take: 5,
        search: 'mc 1',
        isActive: true,
        defaultRateType: 'FIXED',
      } as ListStudioMcRosterQueryDto;

      const rosterRows = [
        {
          uid: 'smc_1',
          mc: { uid: 'mc_1', name: 'MC 1', aliasName: 'MC1' },
          defaultRateType: 'FIXED',
          defaultRate: '1000',
          defaultCommissionRate: null,
          isActive: true,
          metadata: {},
          createdAt: new Date('2026-03-01T00:00:00.000Z'),
          updatedAt: new Date('2026-03-01T00:00:00.000Z'),
        },
      ];

      studioMcService.listRoster.mockResolvedValue({
        data: rosterRows as any,
        total: 11,
      });

      const result = await controller.listRoster(studioId, query);

      expect(studioMcService.listRoster).toHaveBeenCalledWith(studioId, query);
      expect(result).toEqual({
        data: rosterRows,
        meta: {
          page: 2,
          limit: 5,
          total: 11,
          totalPages: 3,
          hasNextPage: true,
          hasPreviousPage: true,
        },
      });
    });
  });

  describe('catalog', () => {
    it('forwards search params to service', async () => {
      const studioId = 'std_123';
      const response = [{ uid: 'mc_1' }];
      studioMcService.listCatalog.mockResolvedValue(response as any);

      const result = await controller.catalog(studioId, {
        search: 'MC 1',
        include_rostered: false,
        limit: 50,
      } as any);

      expect(studioMcService.listCatalog).toHaveBeenCalledWith(studioId, {
        search: 'MC 1',
        includeRostered: false,
        limit: 50,
      });
      expect(result).toEqual(response);
    });
  });

  describe('availability', () => {
    it('forwards window query to repository with studio scope', async () => {
      const studioId = 'std_123';
      const dateFrom = new Date('2026-03-01T10:00:00.000Z');
      const dateTo = new Date('2026-03-01T12:00:00.000Z');
      const response = [{ uid: 'mc_1' }];
      mcRepository.findAvailableMcs.mockResolvedValue(response as any);

      const result = await controller.availability(studioId, {
        date_from: dateFrom,
        date_to: dateTo,
      } as any);

      expect(mcRepository.findAvailableMcs).toHaveBeenCalledWith(dateFrom, dateTo, studioId);
      expect(result).toEqual(response);
    });
  });
});
