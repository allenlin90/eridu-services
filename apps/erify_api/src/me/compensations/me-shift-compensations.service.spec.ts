import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { MeShiftCompensationsService } from './me-shift-compensations.service';

import { StudioMembershipService } from '@/models/membership/studio-membership.service';
import { StudioShiftService } from '@/models/studio-shift/studio-shift.service';
import { UserService } from '@/models/user/user.service';

describe('meShiftCompensationsService', () => {
  let service: MeShiftCompensationsService;
  let userService: jest.Mocked<UserService>;
  let membershipService: jest.Mocked<StudioMembershipService>;
  let studioShiftService: jest.Mocked<StudioShiftService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeShiftCompensationsService,
        {
          provide: UserService,
          useValue: {
            getUserByExtId: jest.fn(),
          },
        },
        {
          provide: StudioMembershipService,
          useValue: {
            findStudioMemberByUserAndStudio: jest.fn(),
          },
        },
        {
          provide: StudioShiftService,
          useValue: {
            listMemberCompensationShifts: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(MeShiftCompensationsService);
    userService = module.get(UserService);
    membershipService = module.get(StudioMembershipService);
    studioShiftService = module.get(StudioShiftService);
  });

  const params = {
    studioId: 'std_1',
    dateFrom: new Date('2026-05-01T00:00:00.000Z'),
    dateTo: new Date('2026-05-31T23:59:59.999Z'),
  };

  it('throws 401 when the auth context does not resolve to a user', async () => {
    userService.getUserByExtId.mockResolvedValue(null);

    await expect(service.listSelfShiftCompensations('ext_1', params)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws 404 when the caller has no membership in the requested studio', async () => {
    userService.getUserByExtId.mockResolvedValue({ uid: 'user_1' } as never);
    membershipService.findStudioMemberByUserAndStudio.mockResolvedValue(null);

    await expect(service.listSelfShiftCompensations('ext_1', params)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns member + shifts when the membership exists', async () => {
    const member = { uid: 'smb_1', user: { uid: 'user_1', name: 'Jane', email: 'j@x.io' } };
    userService.getUserByExtId.mockResolvedValue({ uid: 'user_1' } as never);
    membershipService.findStudioMemberByUserAndStudio.mockResolvedValue(member as never);
    studioShiftService.listMemberCompensationShifts.mockResolvedValue([{ uid: 'ssh_1' }] as never);

    const result = await service.listSelfShiftCompensations('ext_1', params);

    expect(membershipService.findStudioMemberByUserAndStudio).toHaveBeenCalledWith('user_1', 'std_1');
    expect(studioShiftService.listMemberCompensationShifts).toHaveBeenCalledWith({
      studioId: 'std_1',
      userId: 'user_1',
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    });
    expect(result).toEqual({
      member,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      shifts: [{ uid: 'ssh_1' }],
    });
  });
});
