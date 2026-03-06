import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { MeShiftsService } from './shifts.service';

import { StudioShiftService } from '@/models/studio-shift/studio-shift.service';
import { UserService } from '@/models/user/user.service';

describe('meShiftsService', () => {
  let service: MeShiftsService;
  let userService: jest.Mocked<UserService>;
  let studioShiftService: jest.Mocked<StudioShiftService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeShiftsService,
        {
          provide: UserService,
          useValue: {
            getUserByExtId: jest.fn(),
          },
        },
        {
          provide: StudioShiftService,
          useValue: {
            listUserShifts: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(MeShiftsService);
    userService = module.get(UserService);
    studioShiftService = module.get(StudioShiftService);
  });

  it('should list shifts for current user scoped by studio', async () => {
    userService.getUserByExtId.mockResolvedValue({ uid: 'user_1' } as never);
    studioShiftService.listUserShifts.mockResolvedValue({ data: [], total: 0 } as never);

    const query = {
      studioId: 'std_1',
      sort: 'desc',
      skip: 0,
      take: 20,
      uid: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      status: undefined,
      isDutyManager: undefined,
      includeDeleted: false,
      include_deleted: false,
      page: 1,
      limit: 20,
    };

    await service.listMyShifts('ext_1', query);

    expect(userService.getUserByExtId).toHaveBeenCalledWith('ext_1');
    expect(studioShiftService.listUserShifts).toHaveBeenCalledWith('user_1', query);
  });
});
