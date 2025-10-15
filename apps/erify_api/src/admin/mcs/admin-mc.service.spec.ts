import { Test, TestingModule } from '@nestjs/testing';

import { McService } from '../../mc/mc.service';
import { CreateMcDto } from '../../mc/schemas/mc.schema';
import { AdminMcService } from './admin-mc.service';

jest.mock('nanoid', () => ({ nanoid: () => 'test_id' }));

describe('AdminMcService', () => {
  let service: AdminMcService;

  const mcServiceMock: Partial<jest.Mocked<McService>> = {
    createMc: jest.fn(),
    getMcById: jest.fn(),
    updateMc: jest.fn(),
    deleteMc: jest.fn(),
    getMcs: jest.fn(),
    countMcs: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminMcService,
        { provide: McService, useValue: mcServiceMock },
      ],
    }).compile();

    service = module.get<AdminMcService>(AdminMcService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('createMc delegates to mcService', async () => {
    const dto = { name: 'MC A' } as CreateMcDto;
    const created = { uid: 'mc_1' } as const;
    (mcServiceMock.createMc as jest.Mock).mockResolvedValue(created);

    const result = await service.createMc(dto);

    expect(mcServiceMock.createMc as jest.Mock).toHaveBeenCalledWith(dto);
    expect(result).toEqual(created);
  });

  it('getMcs returns paginated with meta', async () => {
    (mcServiceMock.getMcs as jest.Mock).mockResolvedValue([{ uid: 'mc_1' }]);
    (mcServiceMock.countMcs as jest.Mock).mockResolvedValue(1);

    const result = await service.getMcs({
      page: 1,
      limit: 10,
      skip: 0,
      take: 10,
    });

    expect(result.data.length).toBe(1);
    expect(result.meta.total).toBe(1);
  });
});
