import type {
  CreateShowPlatformDto,
  UpdateShowPlatformDto,
} from './schemas/show-platform.schema';
import { ShowPlatformRepository } from './show-platform.repository';
import { ShowPlatformService } from './show-platform.service';

import {
  createMockRepository,
  createMockUtilityService,
  createModelServiceTestModule,
  setupTestMocks,
} from '@/testing/model-service-test.helper';
import { createMockUniqueConstraintError } from '@/testing/prisma-error.helper';
import type { UtilityService } from '@/utility/utility.service';

jest.mock('nanoid', () => ({ nanoid: () => 'test_id' }));

describe('showPlatformService', () => {
  let service: ShowPlatformService;
  let showPlatformRepositoryMock: Partial<jest.Mocked<ShowPlatformRepository>>;
  let utilityMock: Partial<jest.Mocked<UtilityService>>;

  beforeEach(async () => {
    showPlatformRepositoryMock = createMockRepository<ShowPlatformRepository>({
      findPaginated: jest.fn(),
      findByShowAndPlatform: jest.fn(),
      softDelete: jest.fn(),
    });

    utilityMock = createMockUtilityService('show_plt_123');

    const module = await createModelServiceTestModule({
      serviceClass: ShowPlatformService,
      repositoryClass: ShowPlatformRepository,
      repositoryMock: showPlatformRepositoryMock,
      utilityMock,
    });

    service = module.get<ShowPlatformService>(ShowPlatformService);
  });

  beforeEach(() => {
    setupTestMocks();
  });

  describe('create', () => {
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

      const result = await service.create(dto);

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

      const result = await service.create(dto);

      expect(showPlatformRepositoryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          viewerCount: 0,
          metadata: {},
        }),
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

      await expect(service.create(dto)).rejects.toThrow(
        error,
      );
    });
  });

  describe('findOne', () => {
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

      const result = await service.findOne('show_plt_123');

      expect(showPlatformRepositoryMock.findByUid).toHaveBeenCalledWith(
        'show_plt_123',
      );
      expect(result).toEqual(showPlatform);
    });
  });

  describe('update', () => {
    it('updates show platform with partial data', async () => {
      const dto: UpdateShowPlatformDto = {
        viewerCount: 200,
        liveStreamLink: 'https://example.com/stream2',
      } as UpdateShowPlatformDto;

      const updated = {
        uid: 'show_plt_123',
        id: 1n,
        showId: 1n,
        platformId: 1n,
        liveStreamLink: 'https://example.com/stream2',
        platformShowId: 'ext_123',
        viewerCount: 200,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      (showPlatformRepositoryMock.update as jest.Mock).mockResolvedValue(
        updated,
      );

      const result = await service.update(
        'show_plt_123',
        dto,
      );

      expect(showPlatformRepositoryMock.update).toHaveBeenCalledWith(
        { uid: 'show_plt_123' },
        expect.objectContaining({
          viewerCount: 200,
          liveStreamLink: 'https://example.com/stream2',
        }),
      );
      expect(result).toEqual(updated);
    });
  });

  describe('softDelete', () => {
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

      (showPlatformRepositoryMock.softDelete as jest.Mock).mockResolvedValue({
        ...showPlatform,
        deletedAt: new Date(),
      });

      await service.softDelete('show_plt_123');

      expect(showPlatformRepositoryMock.softDelete).toHaveBeenCalledWith({
        uid: 'show_plt_123',
      });
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

  describe('getShowPlatforms (paginated)', () => {
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
        showPlatformRepositoryMock.findPaginated as jest.Mock
      ).mockResolvedValue({ data: showPlatforms, total: 1 });

      const result = await service.getShowPlatforms({});

      expect(
        showPlatformRepositoryMock.findPaginated,
      ).toHaveBeenCalledWith({});
      expect(result).toEqual({ data: showPlatforms, total: 1 });
    });
  });
});
