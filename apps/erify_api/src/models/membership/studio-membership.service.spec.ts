import { Test, TestingModule } from '@nestjs/testing';

import { UtilityService } from '@/utility/utility.service';

import { StudioMembershipRepository } from './studio-membership.repository';
import { StudioMembershipService } from './studio-membership.service';

describe('StudioMembershipService', () => {
  let service: StudioMembershipService;
  let findAdminMembershipByExtIdSpy: jest.Mock;

  const mockUtilityService = {
    generateBrandedId: jest.fn(),
  };

  beforeEach(async () => {
    findAdminMembershipByExtIdSpy = jest.fn();
    const mockRepository = {
      findAdminMembershipByExtId: findAdminMembershipByExtIdSpy,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudioMembershipService,
        {
          provide: StudioMembershipRepository,
          useValue: mockRepository,
        },
        {
          provide: UtilityService,
          useValue: mockUtilityService,
        },
      ],
    }).compile();

    service = module.get<StudioMembershipService>(StudioMembershipService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findAdminMembershipByExtId', () => {
    const extId = 'ext_user_123';

    it('should find admin membership by ext_id without include', async () => {
      const mockMembership = {
        id: BigInt(1),
        uid: 'smb_123',
        userId: BigInt(10),
        studioId: BigInt(20),
        role: 'admin',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      findAdminMembershipByExtIdSpy.mockResolvedValue(
        mockMembership as unknown,
      );

      const result = await service.findAdminMembershipByExtId(extId);

      expect(findAdminMembershipByExtIdSpy).toHaveBeenCalledWith(
        extId,
        undefined,
      );
      expect(result).toEqual(mockMembership);
    });

    it('should find admin membership by ext_id with include', async () => {
      const include = { user: true, studio: true };
      const mockMembership = {
        id: BigInt(1),
        uid: 'smb_123',
        userId: BigInt(10),
        studioId: BigInt(20),
        role: 'admin',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        user: {
          id: BigInt(10),
          uid: 'user_123',
          extId: extId,
          email: 'admin@example.com',
          name: 'Admin User',
        },
        studio: {
          id: BigInt(20),
          uid: 'studio_123',
          name: 'Test Studio',
        },
      };

      findAdminMembershipByExtIdSpy.mockResolvedValue(
        mockMembership as unknown,
      );

      const result = await service.findAdminMembershipByExtId(extId, include);

      expect(findAdminMembershipByExtIdSpy).toHaveBeenCalledWith(
        extId,
        include,
      );
      expect(result).toEqual(mockMembership);
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('studio');
    });

    it('should return null when user is not admin', async () => {
      findAdminMembershipByExtIdSpy.mockResolvedValue(null);

      const result = await service.findAdminMembershipByExtId(extId);

      expect(findAdminMembershipByExtIdSpy).toHaveBeenCalledWith(
        extId,
        undefined,
      );
      expect(result).toBeNull();
    });

    it('should handle repository errors', async () => {
      const error = new Error('Database error');
      findAdminMembershipByExtIdSpy.mockRejectedValue(error);

      await expect(service.findAdminMembershipByExtId(extId)).rejects.toThrow(
        'Database error',
      );
    });
  });
});
