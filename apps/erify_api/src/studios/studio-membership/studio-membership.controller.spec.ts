import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { StudioMembershipController } from './studio-membership.controller';

import type { ListStudioMembershipsQueryDto } from '@/models/membership/schemas/studio-membership.schema';
import { StudioMembershipService } from '@/models/membership/studio-membership.service';
import { UserService } from '@/models/user/user.service';

describe('studioMembershipController', () => {
  let controller: StudioMembershipController;
  let studioMembershipService: jest.Mocked<StudioMembershipService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudioMembershipController],
      providers: [
        {
          provide: StudioMembershipService,
          useValue: {
            listStudioMemberships: jest.fn(),
            toggleTaskHelperStatus: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: {
            listUsers: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<StudioMembershipController>(StudioMembershipController);
    studioMembershipService = module.get(StudioMembershipService);
  });

  it('should list memberships scoped by route studioId', async () => {
    const studioId = 'std_00000000000000000001';
    const query = {
      page: 1,
      limit: 100,
      take: 100,
      skip: 0,
      sort: 'desc',
      name: undefined,
      include_deleted: false,
      uid: undefined,
      studioId: 'std_other_should_be_ignored',
    } as ListStudioMembershipsQueryDto;

    studioMembershipService.listStudioMemberships.mockResolvedValue({
      data: [],
      total: 0,
    });

    await controller.index(studioId, query);

    expect(studioMembershipService.listStudioMemberships).toHaveBeenCalledWith(
      expect.objectContaining({
        studioId,
        page: 1,
        limit: 100,
        take: 100,
        skip: 0,
        sort: 'desc',
      }),
      { user: true, studio: true },
    );
  });

  it('should toggle helper status for membership in studio scope', async () => {
    const studioId = 'std_00000000000000000001';
    const membershipId = 'smb_00000000000000000001';
    const dto = { isHelper: true } as any;
    const membership = {
      uid: membershipId,
      metadata: { existing: 'value' },
      user: { uid: 'usr_1' },
      studio: { uid: studioId },
    };

    studioMembershipService.toggleTaskHelperStatus.mockResolvedValue({
      ...membership,
      metadata: { existing: 'value', task_helper_enabled: true },
    } as any);

    await controller.updateHelperStatus(studioId, membershipId, dto);

    expect(studioMembershipService.toggleTaskHelperStatus).toHaveBeenCalledWith(
      studioId,
      membershipId,
      true,
    );
  });
});
