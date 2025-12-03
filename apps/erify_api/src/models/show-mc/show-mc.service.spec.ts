import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import type { CreateShowMcDto, UpdateShowMcDto } from './schemas/show-mc.schema';
import { ShowMcRepository } from './show-mc.repository';
import { ShowMcService } from './show-mc.service';

import { createMockUniqueConstraintError } from '@/testing/prisma-error.helper';
import { UtilityService } from '@/utility/utility.service';

jest.mock('nanoid', () => ({ nanoid: () => 'test_id' }));

describe('showMcService', () => {
  let service: ShowMcService;

  const showMcRepositoryMock: Partial<jest.Mocked<ShowMcRepository>> = {
    create: jest.fn(),
    findByUid: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findActiveShowMcs: jest.fn(),
    findByShow: jest.fn(),
    findByMc: jest.fn(),
    findByShowAndMc: jest.fn(),
  };

  const utilityMock: Partial<jest.Mocked<UtilityService>> = {
    generateBrandedId: jest.fn().mockReturnValue('show_mc_123'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShowMcService,
        { provide: ShowMcRepository, useValue: showMcRepositoryMock },
        { provide: UtilityService, useValue: utilityMock },
      ],
    }).compile();

    service = module.get<ShowMcService>(ShowMcService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createShowMcFromDto', () => {
    it('returns created show MC', async () => {
      const dto: CreateShowMcDto = {
        showId: 'show_1',
        mcId: 'mc_1',
        note: 'Main host',
        metadata: { role: 'host' },
      } as CreateShowMcDto;

      const created = {
        uid: 'show_mc_123',
        id: 1n,
        showId: 1n,
        mcId: 1n,
        note: dto.note,
        metadata: dto.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      (showMcRepositoryMock.create as jest.Mock).mockResolvedValue(created);

      const result = await service.createShowMcFromDto(dto);

      expect(utilityMock.generateBrandedId).toHaveBeenCalledWith(
        'show_mc',
        undefined,
      );
      expect(showMcRepositoryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'show_mc_123',
          note: dto.note,
          metadata: dto.metadata,
          show: { connect: { uid: dto.showId } },
          mc: { connect: { uid: dto.mcId } },
        }),
        undefined,
      );
      expect(result).toEqual(created);
    });

    it('creates show MC with null note when not provided', async () => {
      const dto: CreateShowMcDto = {
        showId: 'show_1',
        mcId: 'mc_1',
      } as CreateShowMcDto;

      const created = {
        uid: 'show_mc_123',
        id: 1n,
        showId: 1n,
        mcId: 1n,
        note: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      (showMcRepositoryMock.create as jest.Mock).mockResolvedValue(created);

      const result = await service.createShowMcFromDto(dto);

      expect(showMcRepositoryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          note: null,
          metadata: {},
        }),
        undefined,
      );
      expect(result).toEqual(created);
    });

    it('maps P2002 to Conflict when duplicate show-mc combination', async () => {
      const dto: CreateShowMcDto = {
        showId: 'show_1',
        mcId: 'mc_1',
        note: 'Duplicate',
      } as CreateShowMcDto;

      const error = createMockUniqueConstraintError(['showId', 'mcId']);
      (showMcRepositoryMock.create as jest.Mock).mockRejectedValue(error);

      await expect(service.createShowMcFromDto(dto)).rejects.toThrow(error);
    });
  });

  describe('getShowMcById', () => {
    it('returns show MC with includes', async () => {
      const showMc = {
        uid: 'show_mc_123',
        id: 1n,
        showId: 1n,
        mcId: 1n,
        note: 'Main host',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        show: { uid: 'show_1', name: 'Morning Show' },
        mc: { uid: 'mc_1', name: 'John Doe', aliasName: 'Johnny' },
      };

      (showMcRepositoryMock.findByUid as jest.Mock).mockResolvedValue(showMc);

      const result = await service.getShowMcById('show_mc_123', {
        show: true,
        mc: true,
      });

      expect(showMcRepositoryMock.findByUid).toHaveBeenCalledWith(
        'show_mc_123',
        {
          show: true,
          mc: true,
        },
      );
      expect(result).toEqual(showMc);
    });

    it('throws not found when show MC does not exist', async () => {
      (showMcRepositoryMock.findByUid as jest.Mock).mockResolvedValue(null);

      await expect(service.getShowMcById('show_mc_404')).rejects.toMatchObject({
        status: 404,
        message: expect.stringContaining('ShowMC') as string,
      });
    });
  });

  describe('getShowMcs', () => {
    it('returns array of show MCs', async () => {
      const showMcs = [
        {
          uid: 'show_mc_1',
          id: 1n,
          showId: 1n,
          mcId: 1n,
          note: 'Host',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
        {
          uid: 'show_mc_2',
          id: 2n,
          showId: 1n,
          mcId: 2n,
          note: 'Co-host',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ];

      (showMcRepositoryMock.findMany as jest.Mock).mockResolvedValue(showMcs);

      const result = await service.getShowMcs({
        skip: 0,
        take: 10,
      });

      expect(showMcRepositoryMock.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        include: undefined,
      });
      expect(result).toEqual(showMcs);
    });

    it('returns show MCs with where filter', async () => {
      const showMcs = [
        {
          uid: 'show_mc_1',
          id: 1n,
          showId: 1n,
          mcId: 1n,
          note: 'Host',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ];

      (showMcRepositoryMock.findMany as jest.Mock).mockResolvedValue(showMcs);

      const result = await service.getShowMcs({
        where: { showId: 1n },
        skip: 0,
        take: 10,
      });

      expect(showMcRepositoryMock.findMany).toHaveBeenCalledWith({
        where: { showId: 1n },
        skip: 0,
        take: 10,
        include: undefined,
      });
      expect(result).toEqual(showMcs);
    });
  });

  describe('getActiveShowMcs', () => {
    it('returns active show MCs', async () => {
      const showMcs = [
        {
          uid: 'show_mc_1',
          id: 1n,
          showId: 1n,
          mcId: 1n,
          note: 'Host',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ];

      (showMcRepositoryMock.findActiveShowMcs as jest.Mock).mockResolvedValue(
        showMcs,
      );

      const result = await service.getActiveShowMcs({
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });

      expect(showMcRepositoryMock.findActiveShowMcs).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(showMcs);
    });
  });

  describe('getShowMcsByShow', () => {
    it('returns all MCs for a show', async () => {
      const showMcs = [
        {
          uid: 'show_mc_1',
          id: 1n,
          showId: 1n,
          mcId: 1n,
          note: 'Main host',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
        {
          uid: 'show_mc_2',
          id: 2n,
          showId: 1n,
          mcId: 2n,
          note: 'Co-host',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ];

      (showMcRepositoryMock.findByShow as jest.Mock).mockResolvedValue(showMcs);

      const result = await service.getShowMcsByShow(1n, {
        skip: 0,
        take: 10,
        include: { mc: true },
      });

      expect(showMcRepositoryMock.findByShow).toHaveBeenCalledWith(1n, {
        skip: 0,
        take: 10,
        include: { mc: true },
      });
      expect(result).toEqual(showMcs);
    });
  });

  describe('getShowMcsByMc', () => {
    it('returns all shows for an MC', async () => {
      const showMcs = [
        {
          uid: 'show_mc_1',
          id: 1n,
          showId: 1n,
          mcId: 1n,
          note: 'Morning show',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
        {
          uid: 'show_mc_2',
          id: 2n,
          showId: 2n,
          mcId: 1n,
          note: 'Evening show',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ];

      (showMcRepositoryMock.findByMc as jest.Mock).mockResolvedValue(showMcs);

      const result = await service.getShowMcsByMc(1n, {
        skip: 0,
        take: 10,
        include: { show: true },
      });

      expect(showMcRepositoryMock.findByMc).toHaveBeenCalledWith(1n, {
        skip: 0,
        take: 10,
        include: { show: true },
      });
      expect(result).toEqual(showMcs);
    });
  });

  describe('findShowMcByShowAndMc', () => {
    it('returns show MC for specific show and MC combination', async () => {
      const showMc = {
        uid: 'show_mc_1',
        id: 1n,
        showId: 1n,
        mcId: 1n,
        note: 'Main host',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      (showMcRepositoryMock.findByShowAndMc as jest.Mock).mockResolvedValue(
        showMc,
      );

      const result = await service.findShowMcByShowAndMc(1n, 1n);

      expect(showMcRepositoryMock.findByShowAndMc).toHaveBeenCalledWith(1n, 1n);
      expect(result).toEqual(showMc);
    });

    it('returns null when combination does not exist', async () => {
      (showMcRepositoryMock.findByShowAndMc as jest.Mock).mockResolvedValue(
        null,
      );

      const result = await service.findShowMcByShowAndMc(1n, 999n);

      expect(result).toBeNull();
    });
  });

  describe('countShowMcs', () => {
    it('returns count of show MCs', async () => {
      (showMcRepositoryMock.count as jest.Mock).mockResolvedValue(25);

      const result = await service.countShowMcs();

      expect(showMcRepositoryMock.count).toHaveBeenCalledWith({});
      expect(result).toBe(25);
    });

    it('returns count with where filter', async () => {
      (showMcRepositoryMock.count as jest.Mock).mockResolvedValue(5);

      const result = await service.countShowMcs({ showId: 1n });

      expect(showMcRepositoryMock.count).toHaveBeenCalledWith({ showId: 1n });
      expect(result).toBe(5);
    });
  });

  describe('updateShowMcFromDto', () => {
    it('returns updated show MC', async () => {
      const existingShowMc = {
        uid: 'show_mc_123',
        id: 1n,
        showId: 1n,
        mcId: 1n,
        note: 'Old note',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const dto = {
        note: 'Updated note',
        metadata: { role: 'main_host' },
      } as unknown as UpdateShowMcDto;

      const updated = {
        ...existingShowMc,
        note: 'Updated note',
        metadata: { role: 'main_host' },
      };

      (showMcRepositoryMock.findByUid as jest.Mock).mockResolvedValue(
        existingShowMc,
      );
      (showMcRepositoryMock.update as jest.Mock).mockResolvedValue(updated);

      const result = await service.updateShowMcFromDto('show_mc_123', dto);

      expect(showMcRepositoryMock.findByUid).toHaveBeenCalledWith(
        'show_mc_123',
        undefined,
      );
      expect(showMcRepositoryMock.update).toHaveBeenCalledWith(
        { uid: 'show_mc_123' },
        expect.objectContaining({
          note: 'Updated note',
          metadata: { role: 'main_host' },
        }),
        undefined,
      );
      expect(result).toEqual(updated);
    });

    it('updates show and MC relationships', async () => {
      const existingShowMc = {
        uid: 'show_mc_123',
        id: 1n,
        showId: 1n,
        mcId: 1n,
        note: 'Note',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const dto = {
        showId: 'show_2',
        mcId: 'mc_2',
      } as unknown as UpdateShowMcDto;

      const updated = {
        ...existingShowMc,
        showId: 2n,
        mcId: 2n,
      };

      (showMcRepositoryMock.findByUid as jest.Mock).mockResolvedValue(
        existingShowMc,
      );
      (showMcRepositoryMock.update as jest.Mock).mockResolvedValue(updated);

      const result = await service.updateShowMcFromDto('show_mc_123', dto);

      expect(showMcRepositoryMock.update).toHaveBeenCalledWith(
        { uid: 'show_mc_123' },
        expect.objectContaining({
          show: { connect: { uid: 'show_2' } },
          mc: { connect: { uid: 'mc_2' } },
        }),
        undefined,
      );
      expect(result).toEqual(updated);
    });

    it('throws not found when show MC does not exist', async () => {
      const dto = {
        note: 'New note',
      } as unknown as UpdateShowMcDto;

      (showMcRepositoryMock.findByUid as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateShowMcFromDto('show_mc_404', dto),
      ).rejects.toMatchObject({
        status: 404,
      });
    });

    it('maps P2002 to Conflict when updating to duplicate combination', async () => {
      const existingShowMc = {
        uid: 'show_mc_123',
        id: 1n,
        showId: 1n,
        mcId: 1n,
        note: 'Note',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const dto = {
        showId: 'show_2',
        mcId: 'mc_2',
      } as unknown as UpdateShowMcDto;

      (showMcRepositoryMock.findByUid as jest.Mock).mockResolvedValue(
        existingShowMc,
      );

      const error = createMockUniqueConstraintError(['showId', 'mcId']);
      (showMcRepositoryMock.update as jest.Mock).mockRejectedValue(error);

      await expect(
        service.updateShowMcFromDto('show_mc_123', dto),
      ).rejects.toThrow(error);
    });
  });

  describe('deleteShowMc', () => {
    it('soft deletes show MC', async () => {
      const existingShowMc = {
        uid: 'show_mc_123',
        id: 1n,
        showId: 1n,
        mcId: 1n,
        note: 'To be deleted',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const deletedShowMc = { ...existingShowMc, deletedAt: new Date() };

      (showMcRepositoryMock.findByUid as jest.Mock).mockResolvedValue(
        existingShowMc,
      );
      (showMcRepositoryMock.softDelete as jest.Mock).mockResolvedValue(
        deletedShowMc,
      );

      const result = await service.deleteShowMc('show_mc_123');

      expect(showMcRepositoryMock.findByUid).toHaveBeenCalledWith(
        'show_mc_123',
        undefined,
      );
      expect(showMcRepositoryMock.softDelete).toHaveBeenCalledWith({
        uid: 'show_mc_123',
      });
      expect(result).toEqual(deletedShowMc);
    });

    it('throws not found when show MC does not exist', async () => {
      (showMcRepositoryMock.findByUid as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteShowMc('show_mc_404')).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe('createShowMc', () => {
    it('creates show MC with raw Prisma data', async () => {
      const data = {
        note: 'Host',
        metadata: { role: 'main' },
        show: { connect: { uid: 'show_1' } },
        mc: { connect: { uid: 'mc_1' } },
      };

      const created = {
        uid: 'show_mc_123',
        id: 1n,
        showId: 1n,
        mcId: 1n,
        note: 'Host',
        metadata: { role: 'main' },
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      (showMcRepositoryMock.create as jest.Mock).mockResolvedValue(created);

      const result = await service.createShowMc(data);

      expect(showMcRepositoryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'show_mc_123',
          ...data,
        }),
        undefined,
      );
      expect(result).toEqual(created);
    });
  });

  describe('updateShowMc', () => {
    it('updates show MC with raw Prisma data', async () => {
      const existingShowMc = {
        uid: 'show_mc_123',
        id: 1n,
        showId: 1n,
        mcId: 1n,
        note: 'Old',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const data = {
        note: 'Updated',
        metadata: { updated: true },
      };

      const updated = { ...existingShowMc, ...data };

      (showMcRepositoryMock.findByUid as jest.Mock).mockResolvedValue(
        existingShowMc,
      );
      (showMcRepositoryMock.update as jest.Mock).mockResolvedValue(updated);

      const result = await service.updateShowMc('show_mc_123', data);

      expect(showMcRepositoryMock.update).toHaveBeenCalledWith(
        { uid: 'show_mc_123' },
        data,
        undefined,
      );
      expect(result).toEqual(updated);
    });
  });
});
