import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import type {
  CreateShowCreatorDto,
  UpdateShowCreatorDto,
} from './schemas/show-creator.schema';
import { ShowCreatorRepository } from './show-creator.repository';
import { ShowCreatorService } from './show-creator.service';

import { createMockUniqueConstraintError } from '@/testing/prisma-error.helper';
import { UtilityService } from '@/utility/utility.service';

jest.mock('nanoid', () => ({ nanoid: () => 'test_id' }));

describe('showCreatorService', () => {
  let service: ShowCreatorService;

  const showCreatorRepositoryMock: Partial<jest.Mocked<ShowCreatorRepository>> = {
    create: jest.fn(),
    findByUid: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    findPaginated: jest.fn(),
    findOne: jest.fn(),
  };

  const utilityMock: Partial<jest.Mocked<UtilityService>> = {
    generateBrandedId: jest.fn().mockReturnValue('show_mc_123'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShowCreatorService,
        { provide: ShowCreatorRepository, useValue: showCreatorRepositoryMock },
        { provide: UtilityService, useValue: utilityMock },
      ],
    }).compile();

    service = module.get<ShowCreatorService>(ShowCreatorService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('returns created show Creator', async () => {
      const dto: CreateShowCreatorDto = {
        showId: 'show_1',
        creatorId: 'creator_1',
        note: 'Main host',
        agreedRate: '150.00',
        compensationType: 'FIXED',
        commissionRate: '8.50',
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

      (showCreatorRepositoryMock.create as jest.Mock).mockResolvedValue(created);

      const result = await service.create(dto);

      expect(utilityMock.generateBrandedId).toHaveBeenCalledWith(
        'show_mc',
        undefined,
      );

      expect(showCreatorRepositoryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'show_mc_123',
          note: dto.note,
          agreedRate: dto.agreedRate,
          compensationType: dto.compensationType,
          commissionRate: dto.commissionRate,
          metadata: dto.metadata,
          show: { connect: { uid: dto.showId } },
          creator: { connect: { uid: dto.creatorId } },
        }),
      );
      expect(result).toEqual(created);
    });

    it('creates show Creator with null note when not provided', async () => {
      const dto: CreateShowCreatorDto = {
        showId: 'show_1',
        creatorId: 'creator_1',
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

      (showCreatorRepositoryMock.create as jest.Mock).mockResolvedValue(created);

      const result = await service.create(dto);

      expect(showCreatorRepositoryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          note: null,
          metadata: {},
        }),
      );
      expect(result).toEqual(created);
    });

    it('maps P2002 to Conflict when duplicate show-creator combination', async () => {
      const dto: CreateShowCreatorDto = {
        showId: 'show_1',
        creatorId: 'creator_1',
        note: 'Duplicate',
      } as CreateShowCreatorDto;

      const error = createMockUniqueConstraintError(['showId', 'creatorId']);
      (showCreatorRepositoryMock.create as jest.Mock).mockRejectedValue(error);

      await expect(service.create(dto)).rejects.toThrow(error);
    });
  });

  describe('findOne', () => {
    it('returns show Creator with includes', async () => {
      const showCreator = {
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
        creator: { uid: 'creator_1', name: 'John Doe', aliasName: 'Johnny' },
      };

      (showCreatorRepositoryMock.findByUid as jest.Mock).mockResolvedValue(showCreator);

      const result = await service.findOne('show_mc_123', {
        show: true,
        creator: true,
      });

      expect(showCreatorRepositoryMock.findByUid).toHaveBeenCalledWith(
        'show_mc_123',
        {
          show: true,
          creator: true,
        },
      );
      expect(result).toEqual(showCreator);
    });

    it('returns null when show Creator does not exist', async () => {
      (showCreatorRepositoryMock.findByUid as jest.Mock).mockResolvedValue(null);

      const result = await service.findOne('show_mc_404');
      expect(result).toBeNull();
    });
  });

  describe('findPaginated', () => {
    it('returns array of show creators', async () => {
      const showCreators = [
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

      (showCreatorRepositoryMock.findPaginated as jest.Mock).mockResolvedValue({
        data: showCreators,
        total: 1,
      });

      const result = await service.findPaginated({
        skip: 0,
        take: 10,
      });

      expect(showCreatorRepositoryMock.findPaginated).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
      });
      expect(result).toEqual({ data: showCreators, total: 1 });
    });
  });

  describe('update', () => {
    it('returns updated show Creator', async () => {
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
        agreedRate: '180.00',
        compensationType: 'COMMISSION',
        commissionRate: '12.00',
        metadata: { role: 'main_host' },
      } as unknown as UpdateShowCreatorDto;

      const updated = {
        ...existingShowMc,
        note: 'Updated note',
        metadata: { role: 'main_host' },
      };

      (showCreatorRepositoryMock.update as jest.Mock).mockResolvedValue(updated);

      const result = await service.update('show_mc_123', dto);

      expect(showCreatorRepositoryMock.update).toHaveBeenCalledWith(
        { uid: 'show_mc_123' },
        expect.objectContaining({
          note: 'Updated note',
          agreedRate: '180.00',
          compensationType: 'COMMISSION',
          commissionRate: '12.00',
          metadata: { role: 'main_host' },
        }),
      );
      expect(result).toEqual(updated);
    });

    it('updates show and Creator relationships', async () => {
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
        creatorId: 'creator_2',
      } as unknown as UpdateShowCreatorDto;

      const updated = {
        ...existingShowMc,
        showId: 2n,
        creatorId: 2n,
      };

      (showCreatorRepositoryMock.update as jest.Mock).mockResolvedValue(updated);

      const result = await service.update('show_mc_123', dto);

      expect(showCreatorRepositoryMock.update).toHaveBeenCalledWith(
        { uid: 'show_mc_123' },
        expect.objectContaining({
          show: { connect: { uid: 'show_2' } },
          creator: { connect: { uid: 'creator_2' } },
        }),
      );
      expect(result).toEqual(updated);
    });
  });

  describe('softDelete', () => {
    it('soft deletes show Creator', async () => {
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

      (showCreatorRepositoryMock.softDelete as jest.Mock).mockResolvedValue(
        deletedShowMc,
      );

      const result = await service.softDelete('show_mc_123');

      expect(showCreatorRepositoryMock.softDelete).toHaveBeenCalledWith({
        uid: 'show_mc_123',
      });
      expect(result).toEqual(deletedShowMc);
    });
  });
});
