import {
  createMockRepository,
  createMockUtilityService,
  createModelServiceTestModule,
  setupTestMocks,
} from '@/common/test-helpers/model-service-test.helper';
import { createMockUniqueConstraintError } from '@/common/test-helpers/prisma-error.helper';
import { UtilityService } from '@/utility/utility.service';

import {
  CreateShowPlatformDto,
  UpdateShowPlatformDto,
} from './schemas/show-platform.schema';
import { ShowPlatformRepository } from './show-platform.repository';
import { ShowPlatformService } from './show-platform.service';

jest.mock('nanoid', () => ({ nanoid: () => 'test_id' }));

describe('ShowPlatformService', () => {
  let service: ShowPlatformService;
  let showPlatformRepositoryMock: Partial<jest.Mocked<ShowPlatformRepository>>;
  let utilityMock: Partial<jest.Mocked<UtilityService>>;

  beforeEach(async () => {
    showPlatformRepositoryMock = createMockRepository<ShowPlatformRepository>({
      findActiveShowPlatforms: jest.fn(),
      findByShow: jest.fn(),
      findByPlatform: jest.fn(),
      findByShowAndPlatform: jest.fn(),
    });

    utilityMock = createMockUtilityService('show_plt_123');

    const module = await createModelServiceTestModule({
      serviceClass: ShowPlatformService,
      repositoryClass: ShowPlatformRepository,
      repositoryMock: showPlatformRepositoryMock,
      utilityMock: utilityMock,
    });

    service = module.get<ShowPlatformService>(ShowPlatformService);
  });

  beforeEach(() => {
    setupTestMocks();
  });

  describe('createShowPlatformFromDto', () => {
    it('returns created show platform', async () => {
      const dto: CreateShowPlatformDto = {
        showId: 'show_1',
        platformId: 'plt_1',
        liveStreamLink: 'https://example.com/stream',
        platformShowId: 'ext_123',
        viewerCount: 100,
        metadata: { quality: 'HD' },
      } as CreateShowPlatformDto;

      const created = {
        uid: 'show_plt_123',
        id: 1n,
        showId: 1n,
        platformId: 1n,
        liveStreamLink: dto.liveStreamLink,
        platformShowId: dto.platformShowId,
        viewerCount: dto.viewerCount,
        metadata: dto.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      (showPlatformRepositoryMock.create as jest.Mock).mockResolvedValue(
        created,
      );

      const result = await service.createShowPlatformFromDto(dto);

      expect(utilityMock.generateBrandedId).toHaveBeenCalledWith(
        'show_plt',
        undefined,
      );
      expect(showPlatformRepositoryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'show_plt_123',
          liveStreamLink: dto.liveStreamLink,
          platformShowId: dto.platformShowId,
          viewerCount: dto.viewerCount,
          metadata: dto.metadata,
          show: { connect: { uid: dto.showId } },
          platform: { connect: { uid: dto.platformId } },
        }),
        undefined,
      );
      expect(result).toEqual(created);
    });

    it('creates show platform with default viewer count when not provided', async () => {
      const dto: CreateShowPlatformDto = {
        showId: 'show_1',
        platformId: 'plt_1',
        liveStreamLink: 'https://example.com/stream',
        platformShowId: 'ext_123',
      } as CreateShowPlatformDto;

      const created = {
        uid: 'show_plt_123',
        id: 1n,
        showId: 1n,
        platformId: 1n,
        liveStreamLink: dto.liveStreamLink,
        platformShowId: dto.platformShowId,
        viewerCount: 0,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      (showPlatformRepositoryMock.create as jest.Mock).mockResolvedValue(
        created,
      );

      const result = await service.createShowPlatformFromDto(dto);

      expect(showPlatformRepositoryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          viewerCount: 0,
          metadata: {},
        }),
        undefined,
      );
      expect(result).toEqual(created);
    });

    it('maps P2002 to Conflict when duplicate show-platform combination', async () => {
      const dto: CreateShowPlatformDto = {
        showId: 'show_1',
        platformId: 'plt_1',
        liveStreamLink: 'https://example.com/stream',
        platformShowId: 'ext_123',
      } as CreateShowPlatformDto;

      const error = createMockUniqueConstraintError(['showId', 'platformId']);
      (showPlatformRepositoryMock.create as jest.Mock).mockRejectedValue(error);

      await expect(service.createShowPlatformFromDto(dto)).rejects.toThrow(
        error,
      );
    });
  });

  describe('getShowPlatformById', () => {
    it('returns show platform with includes', async () => {
      const showPlatform = {
        uid: 'show_plt_123',
        id: 1n,
        showId: 1n,
        platformId: 1n,
        liveStreamLink: 'https://example.com/stream',
        platformShowId: 'ext_123',
        viewerCount: 100,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      (showPlatformRepositoryMock.findByUid as jest.Mock).mockResolvedValue(
        showPlatform,
      );

      const result = await service.getShowPlatformById('show_plt_123');

      expect(showPlatformRepositoryMock.findByUid).toHaveBeenCalledWith(
        'show_plt_123',
        undefined,
      );
      expect(result).toEqual(showPlatform);
    });

    it('throws 404 when show platform not found', async () => {
      (showPlatformRepositoryMock.findByUid as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.getShowPlatformById('show_plt_999'),
      ).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe('updateShowPlatformFromDto', () => {
    it('updates show platform with partial data', async () => {
      const dto: UpdateShowPlatformDto = {
        viewerCount: 200,
        liveStreamLink: 'https://example.com/stream2',
      } as UpdateShowPlatformDto;

      const existing = {
        uid: 'show_plt_123',
        id: 1n,
        showId: 1n,
        platformId: 1n,
        liveStreamLink: 'https://example.com/stream',
        platformShowId: 'ext_123',
        viewerCount: 100,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const updated = { ...existing, ...dto };

      (showPlatformRepositoryMock.findByUid as jest.Mock).mockResolvedValue(
        existing,
      );
      (showPlatformRepositoryMock.update as jest.Mock).mockResolvedValue(
        updated,
      );

      const result = await service.updateShowPlatformFromDto(
        'show_plt_123',
        dto,
      );

      expect(showPlatformRepositoryMock.update).toHaveBeenCalledWith(
        { uid: 'show_plt_123' },
        expect.objectContaining({
          viewerCount: 200,
          liveStreamLink: 'https://example.com/stream2',
        }),
        undefined,
      );
      expect(result).toEqual(updated);
    });

    it('throws 404 when updating non-existent show platform', async () => {
      const dto: UpdateShowPlatformDto = {
        viewerCount: 200,
      } as UpdateShowPlatformDto;

      (showPlatformRepositoryMock.findByUid as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.updateShowPlatformFromDto('show_plt_999', dto),
      ).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe('deleteShowPlatform', () => {
    it('soft deletes show platform', async () => {
      const showPlatform = {
        uid: 'show_plt_123',
        id: 1n,
        showId: 1n,
        platformId: 1n,
        liveStreamLink: 'https://example.com/stream',
        platformShowId: 'ext_123',
        viewerCount: 100,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      (showPlatformRepositoryMock.findByUid as jest.Mock).mockResolvedValue(
        showPlatform,
      );
      (showPlatformRepositoryMock.softDelete as jest.Mock).mockResolvedValue({
        ...showPlatform,
        deletedAt: new Date(),
      });

      await service.deleteShowPlatform('show_plt_123');

      expect(showPlatformRepositoryMock.softDelete).toHaveBeenCalledWith({
        uid: 'show_plt_123',
      });
    });

    it('throws 404 when deleting non-existent show platform', async () => {
      (showPlatformRepositoryMock.findByUid as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.deleteShowPlatform('show_plt_999'),
      ).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe('getShowPlatformsByShow', () => {
    it('returns show platforms for a show', async () => {
      const showPlatforms = [
        {
          uid: 'show_plt_123',
          id: 1n,
          showId: 1n,
          platformId: 1n,
          liveStreamLink: 'https://example.com/stream',
          platformShowId: 'ext_123',
          viewerCount: 100,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ];

      (showPlatformRepositoryMock.findByShow as jest.Mock).mockResolvedValue(
        showPlatforms,
      );

      const result = await service.getShowPlatformsByShow(1n);

      expect(showPlatformRepositoryMock.findByShow).toHaveBeenCalledWith(
        1n,
        undefined,
      );
      expect(result).toEqual(showPlatforms);
    });
  });

  describe('getShowPlatformsByPlatform', () => {
    it('returns show platforms for a platform', async () => {
      const showPlatforms = [
        {
          uid: 'show_plt_123',
          id: 1n,
          showId: 1n,
          platformId: 1n,
          liveStreamLink: 'https://example.com/stream',
          platformShowId: 'ext_123',
          viewerCount: 100,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ];

      (
        showPlatformRepositoryMock.findByPlatform as jest.Mock
      ).mockResolvedValue(showPlatforms);

      const result = await service.getShowPlatformsByPlatform(1n);

      expect(showPlatformRepositoryMock.findByPlatform).toHaveBeenCalledWith(
        1n,
        undefined,
      );
      expect(result).toEqual(showPlatforms);
    });
  });

  describe('findShowPlatformByShowAndPlatform', () => {
    it('returns show platform when found', async () => {
      const showPlatform = {
        uid: 'show_plt_123',
        id: 1n,
        showId: 1n,
        platformId: 1n,
        liveStreamLink: 'https://example.com/stream',
        platformShowId: 'ext_123',
        viewerCount: 100,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      (
        showPlatformRepositoryMock.findByShowAndPlatform as jest.Mock
      ).mockResolvedValue(showPlatform);

      const result = await service.findShowPlatformByShowAndPlatform(1n, 1n);

      expect(
        showPlatformRepositoryMock.findByShowAndPlatform,
      ).toHaveBeenCalledWith(1n, 1n);
      expect(result).toEqual(showPlatform);
    });

    it('returns null when not found', async () => {
      (
        showPlatformRepositoryMock.findByShowAndPlatform as jest.Mock
      ).mockResolvedValue(null);

      const result = await service.findShowPlatformByShowAndPlatform(1n, 999n);

      expect(result).toBeNull();
    });
  });

  describe('countShowPlatforms', () => {
    it('returns count of show platforms', async () => {
      (showPlatformRepositoryMock.count as jest.Mock).mockResolvedValue(5);

      const result = await service.countShowPlatforms();

      expect(showPlatformRepositoryMock.count).toHaveBeenCalledWith({});
      expect(result).toBe(5);
    });
  });

  describe('getActiveShowPlatforms', () => {
    it('returns active show platforms', async () => {
      const showPlatforms = [
        {
          uid: 'show_plt_123',
          id: 1n,
          showId: 1n,
          platformId: 1n,
          liveStreamLink: 'https://example.com/stream',
          platformShowId: 'ext_123',
          viewerCount: 100,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ];

      (
        showPlatformRepositoryMock.findActiveShowPlatforms as jest.Mock
      ).mockResolvedValue(showPlatforms);

      const result = await service.getActiveShowPlatforms({});

      expect(
        showPlatformRepositoryMock.findActiveShowPlatforms,
      ).toHaveBeenCalledWith({});
      expect(result).toEqual(showPlatforms);
    });
  });
});
