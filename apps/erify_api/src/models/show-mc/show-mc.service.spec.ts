import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import type {
  CreateShowCreatorDto,
  UpdateShowCreatorDto,
} from './schemas/show-mc.schema';
import { ShowMcRepository } from './show-mc.repository';
import { ShowMcService } from './show-mc.service';

import { CreatorRepository } from '@/models/creator/creator.repository';
import { createMockUniqueConstraintError } from '@/testing/prisma-error.helper';
import { UtilityService } from '@/utility/utility.service';

jest.mock('nanoid', () => ({ nanoid: () => 'test_id' }));

describe('showMcService', () => {
  let service: ShowMcService;

  const showMcRepositoryMock: Partial<jest.Mocked<ShowMcRepository>> = {
    create: jest.fn(),
    createByUids: jest.fn(),
    findByUid: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    findPaginated: jest.fn(),
    findOne: jest.fn(),
  };

  const creatorRepositoryMock: Partial<jest.Mocked<CreatorRepository>> = {
    findByUid: jest.fn(),
  };

  const utilityMock: Partial<jest.Mocked<UtilityService>> = {
    generateBrandedId: jest.fn().mockReturnValue('show_mc_123'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShowMcService,
        { provide: ShowMcRepository, useValue: showMcRepositoryMock },
        { provide: CreatorRepository, useValue: creatorRepositoryMock },
        { provide: UtilityService, useValue: utilityMock },
      ],
    }).compile();

    service = module.get<ShowMcService>(ShowMcService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('returns created show MC', async () => {
      const dto: CreateShowCreatorDto = {
        showId: 'show_1',
        creatorId: 'mc_1',
        note: 'Main host',
        agreedRate: undefined,
        compensationType: undefined,
        commissionRate: undefined,
        metadata: { role: 'host' },
      } as CreateShowCreatorDto;

      const created = {
        uid: 'show_mc_123',
        id: 1n,
        showId: 1n,
        creatorId: 1n,
        note: dto.note,
        metadata: dto.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      (showMcRepositoryMock.createByUids as jest.Mock).mockResolvedValue(created);

      const result = await service.create(dto);

      expect(utilityMock.generateBrandedId).toHaveBeenCalledWith(
        'show_mc',
        undefined,
      );

      expect(showMcRepositoryMock.createByUids).toHaveBeenCalledWith(
        'show_mc_123',
        expect.objectContaining({
          showUid: dto.showId,
          mcUid: dto.creatorId,
          note: dto.note,
          metadata: dto.metadata,
        }),
      );
      expect(result).toEqual(created);
    });

    it('creates show MC with null note when not provided', async () => {
      const dto: CreateShowCreatorDto = {
        showId: 'show_1',
        creatorId: 'mc_1',
        agreedRate: undefined,
        compensationType: undefined,
        commissionRate: undefined,
      } as CreateShowCreatorDto;

      const created = {
        uid: 'show_mc_123',
        id: 1n,
        showId: 1n,
        creatorId: 1n,
        note: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      (showMcRepositoryMock.createByUids as jest.Mock).mockResolvedValue(created);

      const result = await service.create(dto);

      expect(showMcRepositoryMock.createByUids).toHaveBeenCalledWith(
        'show_mc_123',
        expect.objectContaining({
          note: undefined,
          metadata: undefined,
        }),
      );
      expect(result).toEqual(created);
    });

    it('maps P2002 to Conflict when duplicate show-creator combination', async () => {
      const dto: CreateShowCreatorDto = {
        showId: 'show_1',
        creatorId: 'mc_1',
        note: 'Duplicate',
        agreedRate: undefined,
        compensationType: undefined,
        commissionRate: undefined,
      } as CreateShowCreatorDto;

      const error = createMockUniqueConstraintError(['showId', 'creatorId']);
      (showMcRepositoryMock.createByUids as jest.Mock).mockRejectedValue(error);

      await expect(service.create(dto)).rejects.toThrow(error);
    });
  });

  describe('findOne', () => {
    it('returns show MC with includes', async () => {
      const showMc = {
        uid: 'show_mc_123',
        id: 1n,
        showId: 1n,
        creatorId: 1n,
        note: 'Main host',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        show: { uid: 'show_1', name: 'Morning Show' },
        mc: { uid: 'mc_1', name: 'John Doe', aliasName: 'Johnny' },
      };

      (showMcRepositoryMock.findByUid as jest.Mock).mockResolvedValue(showMc);

      const result = await service.findOne('show_mc_123', {
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

    it('returns null when show MC does not exist', async () => {
      (showMcRepositoryMock.findByUid as jest.Mock).mockResolvedValue(null);

      const result = await service.findOne('show_mc_404');
      expect(result).toBeNull();
    });
  });

  describe('findPaginated', () => {
    it('returns array of show MCs', async () => {
      const showMcs = [
        {
          uid: 'show_mc_1',
          id: 1n,
          showId: 1n,
          creatorId: 1n,
          note: 'Host',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ];

      (showMcRepositoryMock.findPaginated as jest.Mock).mockResolvedValue({
        data: showMcs,
        total: 1,
      });

      const result = await service.findPaginated({
        skip: 0,
        take: 10,
      });

      expect(showMcRepositoryMock.findPaginated).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
      });
      expect(result).toEqual({ data: showMcs, total: 1 });
    });
  });

  describe('update', () => {
    it('returns updated show MC', async () => {
      const existingShowMc = {
        uid: 'show_mc_123',
        id: 1n,
        showId: 1n,
        creatorId: 1n,
        note: 'Old note',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const dto = {
        note: 'Updated note',
        metadata: { role: 'main_host' },
      } as unknown as UpdateShowCreatorDto;

      const updated = {
        ...existingShowMc,
        note: 'Updated note',
        metadata: { role: 'main_host' },
      };

      (showMcRepositoryMock.update as jest.Mock).mockResolvedValue(updated);

      const result = await service.update('show_mc_123', dto);

      expect(showMcRepositoryMock.update).toHaveBeenCalledWith(
        { uid: 'show_mc_123' },
        expect.objectContaining({
          note: 'Updated note',
          metadata: { role: 'main_host' },
        }),
      );
      expect(result).toEqual(updated);
    });

    it('updates show and MC relationships', async () => {
      const existingShowMc = {
        uid: 'show_mc_123',
        id: 1n,
        showId: 1n,
        creatorId: 1n,
        note: 'Note',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const dto = {
        showId: 'show_2',
        creatorId: 'mc_2',
      } as unknown as UpdateShowCreatorDto;

      const updated = {
        ...existingShowMc,
        showId: 2n,
        creatorId: 2n,
      };

      (showMcRepositoryMock.update as jest.Mock).mockResolvedValue(updated);

      const result = await service.update('show_mc_123', dto);

      expect(showMcRepositoryMock.update).toHaveBeenCalledWith(
        { uid: 'show_mc_123' },
        expect.objectContaining({
          show: { connect: { uid: 'show_2' } },
          mc: { connect: { uid: 'mc_2' } },
        }),
      );
      expect(result).toEqual(updated);
    });
  });

  describe('softDelete', () => {
    it('soft deletes show MC', async () => {
      const existingShowMc = {
        uid: 'show_mc_123',
        id: 1n,
        showId: 1n,
        creatorId: 1n,
        note: 'To be deleted',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const deletedShowMc = { ...existingShowMc, deletedAt: new Date() };

      (showMcRepositoryMock.softDelete as jest.Mock).mockResolvedValue(
        deletedShowMc,
      );

      const result = await service.softDelete('show_mc_123');

      expect(showMcRepositoryMock.softDelete).toHaveBeenCalledWith({
        uid: 'show_mc_123',
      });
      expect(result).toEqual(deletedShowMc);
    });
  });
});
