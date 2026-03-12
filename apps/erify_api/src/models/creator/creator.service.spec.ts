import { CreatorRepository } from './creator.repository';
import { CreatorService } from './creator.service';

import {
  createMockRepository,
  createMockUtilityService,
  createModelServiceTestModule,
  setupTestMocks,
} from '@/testing/model-service-test.helper';
import { createMockUniqueConstraintError } from '@/testing/prisma-error.helper';
import type { UtilityService } from '@/utility/utility.service';

jest.mock('nanoid', () => ({ nanoid: () => 'test_id' }));

describe('creatorService', () => {
  let service: CreatorService;
  let creatorRepositoryMock: Partial<jest.Mocked<CreatorRepository>>;
  let utilityMock: Partial<jest.Mocked<UtilityService>>;

  beforeEach(async () => {
    creatorRepositoryMock = createMockRepository<CreatorRepository>({
      findByUserUid: jest.fn(),
      findByUserIdentifier: jest.fn(),
      findByUid: jest.fn(),
      createCreator: jest.fn(),
      updateByUid: jest.fn(),
      findPaginated: jest.fn(),
    });
    utilityMock = createMockUtilityService('creator_123');

    const module = await createModelServiceTestModule({
      serviceClass: CreatorService,
      repositoryClass: CreatorRepository,
      repositoryMock: creatorRepositoryMock,
      utilityMock,
    });

    service = module.get<CreatorService>(CreatorService);
  });

  beforeEach(() => {
    setupTestMocks();
  });

  it('createCreator returns created creator', async () => {
    const payload = {
      name: 'Creator A',
      aliasName: 'A',
      metadata: {},
      userId: null,
    };
    const created = { uid: 'creator_123', ...payload } as const;
    (creatorRepositoryMock.createCreator as jest.Mock).mockResolvedValue(created);

    const result = await service.createCreator(payload);

    expect(utilityMock.generateBrandedId).toHaveBeenCalledWith('creator', undefined);
    expect(creatorRepositoryMock.createCreator).toHaveBeenCalledWith({
      ...payload,
      uid: 'creator_123',
    });
    expect(result).toEqual(created);
  });

  it('createCreator maps P2002 to Conflict', async () => {
    const payload = {
      name: 'Creator A',
      aliasName: 'A',
      metadata: {},
      userId: null,
    };
    const error = createMockUniqueConstraintError(['uid']);
    (creatorRepositoryMock.createCreator as jest.Mock).mockRejectedValue(error);

    await expect(service.createCreator(payload)).rejects.toThrow(error);
  });

  it('createCreator throws when user already has an Creator', async () => {
    const payload = {
      name: 'Creator A',
      aliasName: 'A',
      userId: 'user_123',
    };
    (creatorRepositoryMock.findByUserUid as jest.Mock).mockResolvedValue({
      uid: 'creator_existing',
    });

    await expect(service.createCreator(payload)).rejects.toThrow(
      'user is already assigned to a creator',
    );
  });

  it('getCreatorById returns null if not found', async () => {
    (creatorRepositoryMock.findByUid as jest.Mock).mockResolvedValue(null);

    const result = await service.getCreatorById('creator_404');
    expect(result).toBeNull();
  });

  it('updateCreator calls repository updateByUid', async () => {
    const payload = {
      name: 'Creator A',
      aliasName: 'creator-a',
      userId: null as string | null,
      isBanned: false,
      metadata: {},
    };
    const updated = { uid: 'creator_1', ...payload };
    (creatorRepositoryMock.updateByUid as jest.Mock).mockResolvedValue(updated);

    const result = await service.updateCreator('creator_1', payload);

    expect(creatorRepositoryMock.updateByUid).toHaveBeenCalledWith('creator_1', payload);
    expect(result).toEqual(updated);
  });

  it('updateCreator throws when user already assigned to another Creator', async () => {
    const payload = {
      name: 'Creator A',
      userId: 'user_123',
    };
    (creatorRepositoryMock.findByUserUid as jest.Mock).mockResolvedValue({
      uid: 'creator_other',
    });

    await expect(service.updateCreator('creator_1', payload)).rejects.toThrow(
      'user is already assigned to a creator',
    );
  });

  it('updateCreator allows same user for same Creator', async () => {
    const payload = {
      name: 'Creator A',
      userId: 'user_123',
    };
    (creatorRepositoryMock.findByUserUid as jest.Mock).mockResolvedValue({
      uid: 'creator_1',
    });
    const updated = { uid: 'creator_1', ...payload };
    (creatorRepositoryMock.updateByUid as jest.Mock).mockResolvedValue(updated);

    const result = await service.updateCreator('creator_1', payload);
    expect(result).toEqual(updated);
  });

  it('deleteCreator soft deletes', async () => {
    const deleted = { uid: 'creator_1', deletedAt: new Date() };
    (creatorRepositoryMock.findByUid as jest.Mock).mockResolvedValue({ uid: 'creator_1' });
    (creatorRepositoryMock.softDelete as jest.Mock).mockResolvedValue(deleted);

    const result = await service.deleteCreator('creator_1');

    expect(creatorRepositoryMock.softDelete).toHaveBeenCalledWith({ uid: 'creator_1' });
    expect(result).toEqual(deleted);
  });
});
