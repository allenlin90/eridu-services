import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { ShiftCalendarController } from './shift-calendar.controller';

import { ShiftAlignmentService } from '@/orchestration/shift-alignment/shift-alignment.service';
import { ShiftCalendarService } from '@/orchestration/shift-calendar/shift-calendar.service';

describe('shiftCalendarController', () => {
  let controller: ShiftCalendarController;
  let shiftCalendarService: jest.Mocked<ShiftCalendarService>;
  let shiftAlignmentService: jest.Mocked<ShiftAlignmentService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShiftCalendarController],
      providers: [
        {
          provide: ShiftCalendarService,
          useValue: {
            getCalendar: jest.fn(),
          },
        },
        {
          provide: ShiftAlignmentService,
          useValue: {
            getAlignment: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ShiftCalendarController>(ShiftCalendarController);
    shiftCalendarService = module.get(ShiftCalendarService);
    shiftAlignmentService = module.get(ShiftAlignmentService);
  });

  it('should return studio shift calendar for requested window', async () => {
    shiftCalendarService.getCalendar.mockResolvedValue({
      period: {
        date_from: '2026-03-05T00:00:00.000Z',
        date_to: '2026-03-11T23:59:59.999Z',
      },
      summary: {
        shift_count: 1,
        block_count: 1,
        total_hours: 8,
        total_projected_cost: '160.00',
        total_calculated_cost: '0.00',
      },
      timeline: [],
    });

    const query = {
      dateFrom: new Date('2026-03-05'),
      dateTo: new Date('2026-03-11'),
      includeCancelled: true,
    };
    const result = await controller.showCalendar('std_1', query as never);

    expect(shiftCalendarService.getCalendar).toHaveBeenCalledWith('std_1', query);
    expect(result.summary.shift_count).toBe(1);
  });

  it('should return studio shift alignment warnings for requested window', async () => {
    shiftAlignmentService.getAlignment.mockResolvedValue({
      period: {
        date_from: '2026-03-05T00:00:00.000Z',
        date_to: '2026-03-11T23:59:59.999Z',
      },
      summary: {
        shows_checked: 1,
        assigned_members_checked: 1,
        idle_segments_count: 0,
        missing_shift_count: 1,
      },
      idle_segments: [],
      missing_shift_assignments: [
        {
          show_id: 'show_1',
          show_name: 'Morning Show',
          user_id: 'user_1',
          user_name: 'Alice',
          show_start: '2026-03-05T10:00:00.000Z',
          show_end: '2026-03-05T12:00:00.000Z',
        },
      ],
    });

    const query = {
      dateFrom: new Date('2026-03-05'),
      dateTo: new Date('2026-03-11'),
      includeCancelled: false,
    };
    const result = await controller.showAlignment('std_1', query as never);

    expect(shiftAlignmentService.getAlignment).toHaveBeenCalledWith('std_1', query);
    expect(result.summary.missing_shift_count).toBe(1);
  });
});
