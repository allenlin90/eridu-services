import { McRepository } from './mc.repository';
import { McService } from './mc.service';

import {
  createMockRepository,
  createMockUtilityService,
  createModelServiceTestModule,
  setupTestMocks,
} from '@/testing/model-service-test.helper';
import { createMockUniqueConstraintError } from '@/testing/prisma-error.helper';
import type { UtilityService } from '@/utility/utility.service';

jest.mock('nanoid', () => ({ nanoid: () => 'test_id' }));

describe('mcService', () => {
  let service: McService;
  let mcRepositoryMock: Partial<jest.Mocked<McRepository>>;
  let utilityMock: Partial<jest.Mocked<UtilityService>>;

  beforeEach(async () => {
    mcRepositoryMock = createMockRepository<McRepository>({
      findByUserUid: jest.fn(),
      findByUserIdentifier: jest.fn(),
      findByUid: jest.fn(),
      createCreator: jest.fn(),
      updateCreatorByUid: jest.fn(),
      findPaginated: jest.fn(),
    });
    utilityMock = createMockUtilityService('creator_123');

    const module = await createModelServiceTestModule({
      serviceClass: McService,
      repositoryClass: McRepository,
      repositoryMock: mcRepositoryMock,
      utilityMock,
    });

    service = module.get<McService>(McService);
  });

  beforeEach(() => {
    setupTestMocks();
  });

  it('createCreator returns created creator', async () => {
    const payload = {
      name: 'MC A',
      aliasName: 'A',
      metadata: {},
      userId: null,
    };
    const created = { uid: 'creator_123', ...payload } as const;
    (mcRepositoryMock.createCreator as jest.Mock).mockResolvedValue(created);

    const result = await service.createCreator(payload);

    expect(utilityMock.generateBrandedId).toHaveBeenCalledWith('creator', undefined);
    expect(mcRepositoryMock.createCreator).toHaveBeenCalledWith({
      ...payload,
      uid: 'creator_123',
    });
    expect(result).toEqual(created);
  });

  it('createCreator maps P2002 to Conflict', async () => {
    const payload = {
      name: 'MC A',
      aliasName: 'A',
      metadata: {},
      userId: null,
    };
    const error = createMockUniqueConstraintError(['uid']);
    (mcRepositoryMock.createCreator as jest.Mock).mockRejectedValue(error);

    await expect(service.createCreator(payload)).rejects.toThrow(error);
  });

  it('createCreator throws when user already has a creator', async () => {
    const payload = {
      name: 'MC A',
      aliasName: 'A',
      userId: 'user_123',
    };
    (mcRepositoryMock.findByUserUid as jest.Mock).mockResolvedValue({
      uid: 'mc_existing',
    });

    await expect(service.createCreator(payload)).rejects.toThrow(
      'user is already a creator',
    );
  });

  it('getCreatorById returns null if not found', async () => {
    (mcRepositoryMock.findByUid as jest.Mock).mockResolvedValue(null);

    const result = await service.getCreatorById('mc_404');
    expect(result).toBeNull();
  });

  it('updateCreator calls repository updateCreatorByUid', async () => {
    const payload = {
      name: 'MC A',
      aliasName: 'mc-a',
      userId: null as string | null,
      isBanned: false,
      metadata: {},
    };
    const updated = { uid: 'mc_1', ...payload };
    (mcRepositoryMock.findByUid as jest.Mock).mockResolvedValue({ uid: 'mc_1' });
    (mcRepositoryMock.updateCreatorByUid as jest.Mock).mockResolvedValue(updated);

    const result = await service.updateCreator('mc_1', payload);

    expect(mcRepositoryMock.updateCreatorByUid).toHaveBeenCalledWith('mc_1', payload);
    expect(result).toEqual(updated);
  });

  it('updateCreator throws when user already assigned to another creator', async () => {
    const payload = {
      name: 'MC A',
      userId: 'user_123',
    };
    (mcRepositoryMock.findByUserUid as jest.Mock).mockResolvedValue({
      uid: 'mc_other',
    });

    await expect(service.updateCreator('mc_1', payload)).rejects.toThrow(
      'user is already a creator',
    );
  });

  it('updateCreator allows same user for same creator', async () => {
    const payload = {
      name: 'MC A',
      userId: 'user_123',
    };
    (mcRepositoryMock.findByUserUid as jest.Mock).mockResolvedValue({
      uid: 'mc_1',
    });
    const updated = { uid: 'mc_1', ...payload };
    (mcRepositoryMock.findByUid as jest.Mock).mockResolvedValue({ uid: 'mc_1' });
    (mcRepositoryMock.updateCreatorByUid as jest.Mock).mockResolvedValue(updated);

    const result = await service.updateCreator('mc_1', payload);
    expect(result).toEqual(updated);
  });

  it('deleteCreator soft deletes', async () => {
    const deleted = { uid: 'mc_1', deletedAt: new Date() };
    (mcRepositoryMock.findByUid as jest.Mock).mockResolvedValue({ uid: 'mc_1' });
    (mcRepositoryMock.softDelete as jest.Mock).mockResolvedValue(deleted);

    const result = await service.deleteCreator('mc_1');

    expect(mcRepositoryMock.softDelete).toHaveBeenCalledWith({ uid: 'mc_1' });
    expect(result).toEqual(deleted);
  });
});
