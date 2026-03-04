import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { StudioShiftController } from './studio-shift.controller';

import { StudioShiftService } from '@/models/studio-shift/studio-shift.service';

describe('studioShiftController', () => {
  let controller: StudioShiftController;
  let service: jest.Mocked<StudioShiftService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudioShiftController],
      providers: [
        {
          provide: StudioShiftService,
          useValue: {
            listStudioShifts: jest.fn(),
            findActiveDutyManager: jest.fn(),
            findByUidInStudio: jest.fn(),
            createShift: jest.fn(),
            updateShift: jest.fn(),
            deleteShift: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<StudioShiftController>(StudioShiftController);
    service = module.get(StudioShiftService);
  });

  it('should list studio shifts with pagination response', async () => {
    service.listStudioShifts.mockResolvedValue({ data: [{ uid: 'ssh_1' }], total: 1 } as never);

    const result = await controller.index('std_1', {
      page: 1,
      limit: 10,
      take: 10,
      skip: 0,
    } as never);

    expect(service.listStudioShifts).toHaveBeenCalledWith('std_1', {
      page: 1,
      limit: 10,
      take: 10,
      skip: 0,
    });
    expect(result).toEqual({
      data: [{ uid: 'ssh_1' }],
      meta: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });
  });

  it('should assign duty manager through partial update', async () => {
    service.updateShift.mockResolvedValue({ uid: 'ssh_1', isDutyManager: true } as never);

    const result = await controller.assignDutyManager('std_1', 'ssh_1', {
      is_duty_manager: true,
    });

    expect(service.updateShift).toHaveBeenCalledWith('std_1', 'ssh_1', {
      isDutyManager: true,
    });
    expect(result).toEqual({ uid: 'ssh_1', isDutyManager: true });
  });

  it('should resolve duty manager by timestamp query', async () => {
    const activeTime = '2026-03-05T10:00:00.000Z';
    service.findActiveDutyManager.mockResolvedValue({ uid: 'ssh_1' } as never);

    await controller.getDutyManager('std_1', { time: activeTime } as never);

    expect(service.findActiveDutyManager).toHaveBeenCalledWith('std_1', new Date(activeTime));
  });
});
