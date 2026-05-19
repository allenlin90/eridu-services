import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { MeShowCompensationsController } from './me-show-compensations.controller';
import { MeShowCompensationsService } from './me-show-compensations.service';

describe('meShowCompensationsController', () => {
  let controller: MeShowCompensationsController;
  let service: jest.Mocked<MeShowCompensationsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MeShowCompensationsController],
      providers: [
        {
          provide: MeShowCompensationsService,
          useValue: {
            listSelfShowCompensations: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(MeShowCompensationsController);
    service = module.get(MeShowCompensationsService);
  });

  it('parses the service result through the studio creator compensation DTO', async () => {
    service.listSelfShowCompensations.mockResolvedValue({
      creatorId: 'creator_1',
      creatorName: 'Ann',
      creatorAliasName: 'Ann',
      dateFrom: new Date('2026-05-01T00:00:00.000Z'),
      dateTo: new Date('2026-05-31T23:59:59.999Z'),
      totalAmount: '0.00',
      unresolvedCount: 0,
      shows: [],
    } as never);

    const result = await controller.listSelfShowCompensations(
      { ext_id: 'ext_1', id: 'ext_1' } as never,
      {
        studioId: 'std_1',
        dateFrom: new Date('2026-05-01T00:00:00.000Z'),
        dateTo: new Date('2026-05-31T23:59:59.999Z'),
      } as never,
    );

    expect(service.listSelfShowCompensations).toHaveBeenCalledWith('ext_1', {
      studioId: 'std_1',
      dateFrom: new Date('2026-05-01T00:00:00.000Z'),
      dateTo: new Date('2026-05-31T23:59:59.999Z'),
    });
    expect(result).toEqual(expect.objectContaining({
      creator_id: 'creator_1',
      total_amount: '0.00',
      unresolved_count: 0,
      shows: [],
    }));
  });
});
