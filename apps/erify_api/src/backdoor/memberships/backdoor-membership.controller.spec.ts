import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { BackdoorApiKeyGuard } from '@/common/guards/backdoor-api-key.guard';
import { CreateStudioMembershipDto } from '@/models/membership/schemas/studio-membership.schema';
import { StudioMembershipService } from '@/models/membership/studio-membership.service';
import { UtilityService } from '@/utility/utility.service';

import { BackdoorMembershipController } from './backdoor-membership.controller';

describe('BackdoorMembershipController', () => {
  let controller: BackdoorMembershipController;

  const mockStudioMembershipService = {
    createStudioMembershipFromDto: jest.fn(),
  };

  const mockUtilityService = {
    createPaginationMeta: jest.fn(),
    generateBrandedId: jest.fn(),
    isTimeOverlapping: jest.fn(),
  };

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'BACKDOOR_API_KEY') return undefined;
        if (key === 'NODE_ENV') return 'development';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BackdoorMembershipController],
      providers: [
        {
          provide: StudioMembershipService,
          useValue: mockStudioMembershipService,
        },
        { provide: UtilityService, useValue: mockUtilityService },
        { provide: ConfigService, useValue: mockConfigService },
        BackdoorApiKeyGuard,
      ],
    }).compile();

    controller = module.get<BackdoorMembershipController>(
      BackdoorMembershipController,
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createStudioMembership', () => {
    it('should create a studio membership', async () => {
      const createDto: CreateStudioMembershipDto = {
        userId: 'user_123',
        studioId: 'studio_123',
        role: 'admin',
        metadata: {},
      } as CreateStudioMembershipDto;
      const createdMembership = {
        uid: 'membership_123',
        ...createDto,
        user: { uid: 'user_123', name: 'Test User' },
        studio: { uid: 'studio_123', name: 'Test Studio' },
      };

      mockStudioMembershipService.createStudioMembershipFromDto.mockResolvedValue(
        createdMembership as any,
      );

      const result = await controller.createStudioMembership(createDto);

      expect(
        mockStudioMembershipService.createStudioMembershipFromDto,
      ).toHaveBeenCalledWith(createDto, { user: true, studio: true });
      expect(result).toEqual(createdMembership);
    });

    it('should create a studio membership with manager role', async () => {
      const createDto: CreateStudioMembershipDto = {
        userId: 'user_456',
        studioId: 'studio_456',
        role: 'manager',
        metadata: { custom: 'data' },
      } as CreateStudioMembershipDto;
      const createdMembership = {
        uid: 'membership_456',
        ...createDto,
        user: { uid: 'user_456', name: 'Manager User' },
        studio: { uid: 'studio_456', name: 'Manager Studio' },
      };

      mockStudioMembershipService.createStudioMembershipFromDto.mockResolvedValue(
        createdMembership as any,
      );

      const result = await controller.createStudioMembership(createDto);

      expect(
        mockStudioMembershipService.createStudioMembershipFromDto,
      ).toHaveBeenCalledWith(createDto, { user: true, studio: true });
      expect(result).toEqual(createdMembership);
    });

    it('should create a studio membership with member role', async () => {
      const createDto: CreateStudioMembershipDto = {
        userId: 'user_789',
        studioId: 'studio_789',
        role: 'member',
        metadata: {},
      } as CreateStudioMembershipDto;
      const createdMembership = {
        uid: 'membership_789',
        ...createDto,
        user: { uid: 'user_789', name: 'Member User' },
        studio: { uid: 'studio_789', name: 'Member Studio' },
      };

      mockStudioMembershipService.createStudioMembershipFromDto.mockResolvedValue(
        createdMembership as any,
      );

      const result = await controller.createStudioMembership(createDto);

      expect(
        mockStudioMembershipService.createStudioMembershipFromDto,
      ).toHaveBeenCalledWith(createDto, { user: true, studio: true });
      expect(result).toEqual(createdMembership);
    });
  });
});
