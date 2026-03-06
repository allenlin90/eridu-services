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

  it('should return shift detail by id', async () => {
    service.findByUidInStudio.mockResolvedValue({ uid: 'ssh_1' } as never);

    const result = await controller.show('std_1', 'ssh_1');

    expect(service.findByUidInStudio).toHaveBeenCalledWith('std_1', 'ssh_1');
    expect(result).toEqual({ uid: 'ssh_1' });
  });

  it('should create shift', async () => {
    const payload = {
      userId: 'user_1',
      date: new Date('2026-03-05'),
      hourlyRate: '20.00',
      blocks: [
        {
          startTime: new Date('2026-03-05T09:00:00.000Z'),
          endTime: new Date('2026-03-05T12:00:00.000Z'),
          metadata: {},
        },
      ],
      status: 'SCHEDULED',
      isDutyManager: false,
      isApproved: false,
      calculatedCost: undefined,
      metadata: {},
    };
    service.createShift.mockResolvedValue({ uid: 'ssh_1' } as never);

    const result = await controller.create('std_1', payload as never);

    expect(service.createShift).toHaveBeenCalledWith('std_1', payload);
    expect(result).toEqual({ uid: 'ssh_1' });
  });

  it('should update shift', async () => {
    service.updateShift.mockResolvedValue({ uid: 'ssh_1', status: 'COMPLETED' } as never);

    const result = await controller.update('std_1', 'ssh_1', {
      status: 'COMPLETED',
    } as never);

    expect(service.updateShift).toHaveBeenCalledWith('std_1', 'ssh_1', {
      status: 'COMPLETED',
    });
    expect(result).toEqual({ uid: 'ssh_1', status: 'COMPLETED' });
  });

  it('should delete shift when found', async () => {
    service.deleteShift.mockResolvedValue({ uid: 'ssh_1' } as never);

    await expect(controller.delete('std_1', 'ssh_1')).resolves.toBeUndefined();

    expect(service.deleteShift).toHaveBeenCalledWith('std_1', 'ssh_1');
  });

  it('should throw not found when shift detail is missing', async () => {
    service.findByUidInStudio.mockResolvedValue(null);

    await expect(controller.show('std_1', 'ssh_missing')).rejects.toThrow(
      'Studio shift not found with id ssh_missing',
    );
  });

  it('should throw not found when update target is missing', async () => {
    service.updateShift.mockResolvedValue(null);

    await expect(
      controller.update('std_1', 'ssh_missing', { status: 'COMPLETED' } as never),
    ).rejects.toThrow('Studio shift not found with id ssh_missing');
  });

  it('should throw not found when delete target is missing', async () => {
    service.deleteShift.mockResolvedValue(null);

    await expect(controller.delete('std_1', 'ssh_missing')).rejects.toThrow(
      'Studio shift not found with id ssh_missing',
    );
  });

  it('should throw not found when assign duty manager target is missing', async () => {
    service.updateShift.mockResolvedValue(null);

    await expect(
      controller.assignDutyManager('std_1', 'ssh_missing', { is_duty_manager: true }),
    ).rejects.toThrow('Studio shift not found with id ssh_missing');
  });
});
