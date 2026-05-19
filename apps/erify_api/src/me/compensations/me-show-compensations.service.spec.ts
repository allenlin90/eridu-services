import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { MeShowCompensationsService } from './me-show-compensations.service';

import { CreatorService } from '@/models/creator/creator.service';
import { UserService } from '@/models/user/user.service';
import { ShowOrchestrationService } from '@/show-orchestration/show-orchestration.service';

describe('meShowCompensationsService', () => {
  let service: MeShowCompensationsService;
  let userService: jest.Mocked<UserService>;
  let creatorService: jest.Mocked<CreatorService>;
  let showOrchestrationService: jest.Mocked<ShowOrchestrationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeShowCompensationsService,
        {
          provide: UserService,
          useValue: {
            getUserByExtId: jest.fn(),
          },
        },
        {
          provide: CreatorService,
          useValue: {
            findByUserUid: jest.fn(),
          },
        },
        {
          provide: ShowOrchestrationService,
          useValue: {
            getCreatorCompensations: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(MeShowCompensationsService);
    userService = module.get(UserService);
    creatorService = module.get(CreatorService);
    showOrchestrationService = module.get(ShowOrchestrationService);
  });

  const params = {
    studioId: 'std_1',
    dateFrom: new Date('2026-05-01T00:00:00.000Z'),
    dateTo: new Date('2026-05-31T23:59:59.999Z'),
  };

  it('throws 401 when the auth context does not resolve to a user', async () => {
    userService.getUserByExtId.mockResolvedValue(null);

    await expect(service.listSelfShowCompensations('ext_1', params)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws 404 when the caller has no Creator record', async () => {
    userService.getUserByExtId.mockResolvedValue({ uid: 'user_1' } as never);
    creatorService.findByUserUid.mockResolvedValue(null);

    await expect(service.listSelfShowCompensations('ext_1', params)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('delegates to ShowOrchestrationService.getCreatorCompensations with the resolved creator uid', async () => {
    userService.getUserByExtId.mockResolvedValue({ uid: 'user_1' } as never);
    creatorService.findByUserUid.mockResolvedValue({ uid: 'creator_1' } as never);
    showOrchestrationService.getCreatorCompensations.mockResolvedValue({ creatorId: 'creator_1' } as never);

    const result = await service.listSelfShowCompensations('ext_1', params);

    expect(creatorService.findByUserUid).toHaveBeenCalledWith('user_1');
    expect(showOrchestrationService.getCreatorCompensations).toHaveBeenCalledWith('std_1', 'creator_1', {
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    });
    expect(result).toEqual({ creatorId: 'creator_1' });
  });
});
