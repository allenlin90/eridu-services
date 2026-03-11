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
      createMc: jest.fn(),
      updateByUid: jest.fn(),
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

  it('createMc returns created mc', async () => {
    const payload = {
      name: 'MC A',
      aliasName: 'A',
      metadata: {},
      userId: null,
    };
    const created = { uid: 'creator_123', ...payload } as const;
    (mcRepositoryMock.createMc as jest.Mock).mockResolvedValue(created);

    const result = await service.createMc(payload);

    expect(utilityMock.generateBrandedId).toHaveBeenCalledWith('creator', undefined);
    expect(mcRepositoryMock.createMc).toHaveBeenCalledWith({
      ...payload,
      uid: 'creator_123',
    });
    expect(result).toEqual(created);
  });

  it('createMc maps P2002 to Conflict', async () => {
    const payload = {
      name: 'MC A',
      aliasName: 'A',
      metadata: {},
      userId: null,
    };
    const error = createMockUniqueConstraintError(['uid']);
    (mcRepositoryMock.createMc as jest.Mock).mockRejectedValue(error);

    await expect(service.createMc(payload)).rejects.toThrow(error);
  });

  it('createMc throws when user already has an MC', async () => {
    const payload = {
      name: 'MC A',
      aliasName: 'A',
      userId: 'user_123',
    };
    (mcRepositoryMock.findByUserUid as jest.Mock).mockResolvedValue({
      uid: 'mc_existing',
    });

    await expect(service.createMc(payload)).rejects.toThrow(
      'user is already a mc',
    );
  });

  it('getMcById returns null if not found', async () => {
    (mcRepositoryMock.findByUid as jest.Mock).mockResolvedValue(null);

    const result = await service.getMcById('mc_404');
    expect(result).toBeNull();
  });

  it('updateMc calls repository updateByUid', async () => {
    const payload = {
      name: 'MC A',
      aliasName: 'mc-a',
      userId: null as string | null,
      isBanned: false,
      metadata: {},
    };
    const updated = { uid: 'mc_1', ...payload };
    (mcRepositoryMock.updateByUid as jest.Mock).mockResolvedValue(updated);

    const result = await service.updateMc('mc_1', payload);

    expect(mcRepositoryMock.updateByUid).toHaveBeenCalledWith('mc_1', payload);
    expect(result).toEqual(updated);
  });

  it('updateMc throws when user already assigned to another MC', async () => {
    const payload = {
      name: 'MC A',
      userId: 'user_123',
    };
    (mcRepositoryMock.findByUserUid as jest.Mock).mockResolvedValue({
      uid: 'mc_other',
    });

    await expect(service.updateMc('mc_1', payload)).rejects.toThrow(
      'user is already a mc',
    );
  });

  it('updateMc allows same user for same MC', async () => {
    const payload = {
      name: 'MC A',
      userId: 'user_123',
    };
    (mcRepositoryMock.findByUserUid as jest.Mock).mockResolvedValue({
      uid: 'mc_1',
    });
    const updated = { uid: 'mc_1', ...payload };
    (mcRepositoryMock.updateByUid as jest.Mock).mockResolvedValue(updated);

    const result = await service.updateMc('mc_1', payload);
    expect(result).toEqual(updated);
  });

  it('updateMc allows legacy/current prefix pair for same MC', async () => {
    const payload = {
      name: 'MC A',
      userId: 'user_123',
    };
    (mcRepositoryMock.findByUserUid as jest.Mock).mockResolvedValue({
      uid: 'creator_1',
    });
    const updated = { uid: 'creator_1', ...payload };
    (mcRepositoryMock.updateByUid as jest.Mock).mockResolvedValue(updated);

    const result = await service.updateMc('mc_1', payload);
    expect(result).toEqual(updated);
  });

  it('deleteMc soft deletes', async () => {
    const deleted = { uid: 'mc_1', deletedAt: new Date() };
    (mcRepositoryMock.findByUid as jest.Mock).mockResolvedValue({ uid: 'creator_1' });
    (mcRepositoryMock.softDelete as jest.Mock).mockResolvedValue(deleted);

    const result = await service.deleteMc('mc_1');

    expect(mcRepositoryMock.softDelete).toHaveBeenCalledWith({ uid: 'creator_1' });
    expect(result).toEqual(deleted);
  });
});
