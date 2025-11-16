import {
  createMockRepository,
  createMockUtilityService,
  createModelServiceTestModule,
  setupTestMocks,
} from '@/common/test-helpers/model-service-test.helper';
import { createMockUniqueConstraintError } from '@/common/test-helpers/prisma-error.helper';
import { UtilityService } from '@/utility/utility.service';

import { McRepository } from './mc.repository';
import { McService } from './mc.service';

jest.mock('nanoid', () => ({ nanoid: () => 'test_id' }));

describe('McService', () => {
  let service: McService;
  let mcRepositoryMock: Partial<jest.Mocked<McRepository>>;
  let utilityMock: Partial<jest.Mocked<UtilityService>>;

  beforeEach(async () => {
    mcRepositoryMock = createMockRepository<McRepository>();
    utilityMock = createMockUtilityService('mc_123');

    const module = await createModelServiceTestModule({
      serviceClass: McService,
      repositoryClass: McRepository,
      repositoryMock: mcRepositoryMock,
      utilityMock: utilityMock,
    });

    service = module.get<McService>(McService);
  });

  beforeEach(() => {
    setupTestMocks();
  });

  it('createMc returns created mc', async () => {
    const dto = {
      name: 'MC A',
      aliasName: 'A',
      metadata: {},
      userId: null,
    };
    const created = { uid: 'mc_123', ...dto } as const;
    (mcRepositoryMock.create as jest.Mock).mockResolvedValue(created);

    const result = await service.createMc(dto);

    expect(utilityMock.generateBrandedId).toHaveBeenCalledWith('mc', undefined);
    expect(mcRepositoryMock.create).toHaveBeenCalled();
    expect(result).toEqual(created);
  });

  it('createMc maps P2002 to Conflict', async () => {
    const dto = {
      name: 'MC A',
      aliasName: 'A',
      metadata: {},
      userId: null,
    };
    const error = createMockUniqueConstraintError(['uid']);
    (mcRepositoryMock.create as jest.Mock).mockRejectedValue(error);

    await expect(service.createMc(dto)).rejects.toThrow(error);
  });

  it('getMcById throws not found', async () => {
    (mcRepositoryMock.findByUid as jest.Mock).mockResolvedValue(null);

    await expect(service.getMcById('mc_404')).rejects.toMatchObject({
      status: 404,
    });
  });

  it('updateMc maps P2002 to Conflict', async () => {
    (mcRepositoryMock.findByUid as jest.Mock).mockResolvedValue({
      uid: 'mc_1',
      name: 'Old',
    });
    const error = createMockUniqueConstraintError(['name']);
    (mcRepositoryMock.update as jest.Mock).mockRejectedValue(error);

    await expect(
      service.updateMc('mc_1', {
        name: 'MC A',
        aliasName: 'mc-a',
        user: { disconnect: true },
        isBanned: false,
        metadata: {},
      }),
    ).rejects.toThrow(error);
  });
});
