import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { MeShiftCompensationsController } from './me-shift-compensations.controller';
import { MeShiftCompensationsService } from './me-shift-compensations.service';

describe('meShiftCompensationsController', () => {
  let controller: MeShiftCompensationsController;
  let service: jest.Mocked<MeShiftCompensationsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MeShiftCompensationsController],
      providers: [
        {
          provide: MeShiftCompensationsService,
          useValue: {
            listSelfShiftCompensations: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(MeShiftCompensationsController);
    service = module.get(MeShiftCompensationsService);
  });

  it('parses the service result through the studio member compensation DTO', async () => {
    service.listSelfShiftCompensations.mockResolvedValue({
      member: {
        id: 1n,
        uid: 'smb_00000000000000000001',
        userId: 1n,
        studioId: 1n,
        role: 'member',
        baseHourlyRate: null,
        metadata: {},
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        updatedAt: new Date('2026-05-01T00:00:00.000Z'),
        deletedAt: null,
        user: { uid: 'user_1', name: 'Jane', email: 'jane@example.com' },
      },
      dateFrom: new Date('2026-05-01T00:00:00.000Z'),
      dateTo: new Date('2026-05-31T23:59:59.999Z'),
      shifts: [],
    } as never);

    const result = await controller.listSelfShiftCompensations(
      { ext_id: 'ext_1', id: 'ext_1' } as never,
      {
        studioId: 'std_1',
        dateFrom: new Date('2026-05-01T00:00:00.000Z'),
        dateTo: new Date('2026-05-31T23:59:59.999Z'),
      } as never,
    );

    expect(service.listSelfShiftCompensations).toHaveBeenCalledWith('ext_1', {
      studioId: 'std_1',
      dateFrom: new Date('2026-05-01T00:00:00.000Z'),
      dateTo: new Date('2026-05-31T23:59:59.999Z'),
    });
    expect(result).toEqual(expect.objectContaining({
      membership_id: 'smb_00000000000000000001',
      user_id: 'user_1',
      user_name: 'Jane',
      user_email: 'jane@example.com',
      date_from: '2026-05-01',
      date_to: '2026-05-31',
      shifts: [],
    }));
  });
});
