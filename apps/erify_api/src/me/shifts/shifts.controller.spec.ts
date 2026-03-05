import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { MeShiftsController } from './shifts.controller';
import { MeShiftsService } from './shifts.service';

describe('meShiftsController', () => {
  let controller: MeShiftsController;
  let service: jest.Mocked<MeShiftsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MeShiftsController],
      providers: [
        {
          provide: MeShiftsService,
          useValue: {
            listMyShifts: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(MeShiftsController);
    service = module.get(MeShiftsService);
  });

  it('should return paginated shifts for current user', async () => {
    service.listMyShifts.mockResolvedValue({
      data: [{ uid: 'ssh_1' }],
      total: 1,
    } as never);

    const result = await controller.listShifts(
      { ext_id: 'ext_1', id: 'ext_1' } as never,
      {
        page: 1,
        limit: 20,
        skip: 0,
        take: 20,
        uid: undefined,
        studioId: 'std_1',
        dateFrom: undefined,
        dateTo: undefined,
        status: undefined,
        isDutyManager: undefined,
        includeDeleted: false,
      } as never,
    );

    expect(service.listMyShifts).toHaveBeenCalledWith('ext_1', expect.objectContaining({
      studioId: 'std_1',
      page: 1,
      limit: 20,
    }));
    expect(result.meta.total).toBe(1);
    expect(result.meta.page).toBe(1);
  });
});
