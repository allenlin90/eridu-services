import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import type { JwtPayload } from '@eridu/auth-sdk/types';

import { ProfileController } from './profile.controller';

import type { AuthenticatedUser } from '@/lib/auth/jwt-auth.guard';
import { UserService } from '@/models/user/user.service';

// Mock auth-sdk modules to avoid ES module import issues
jest.mock('@eridu/auth-sdk/adapters/nestjs/current-user.decorator', () => ({
  CurrentUser: jest.fn(() => () => {}),
}));

jest.mock('@eridu/auth-sdk/schemas/jwt-payload.schema', () => ({
  jwtPayloadSchema: {
    describe: jest.fn(() => ({
      describe: jest.fn(() => ({})),
    })),
  },
}));

jest.mock('@/lib/auth/jwt-auth.guard', () => ({
  JwtAuthGuard: jest.fn(() => ({
    canActivate: jest.fn(() => true),
  })),
}));

describe('profileController', () => {
  let controller: ProfileController;
  let userService: jest.Mocked<UserService>;
  let getUserByExtIdSpy: jest.Mock;

  const mockJwtPayload: JwtPayload = {
    id: 'HHHFNPNWDbKmElNBF2Y1yCfo0kqtbB7B',
    name: 'Test User',
    email: 'test-user@example.com',
    image: null,
    activeOrganizationId: null,
    activeTeamId: null,
    impersonatedBy: null,
    iat: 1763394738,
    exp: 1763395638,
    iss: 'http://localhost:3001',
    aud: 'http://localhost:3001',
    sub: 'HHHFNPNWDbKmElNBF2Y1yCfo0kqtbB7B',
  };

  const mockAuthenticatedUser: AuthenticatedUser = {
    ext_id: 'HHHFNPNWDbKmElNBF2Y1yCfo0kqtbB7B',
    id: 'HHHFNPNWDbKmElNBF2Y1yCfo0kqtbB7B',
    name: 'Test User',
    email: 'test-user@example.com',
    image: undefined,
    payload: mockJwtPayload,
  };

  const mockAuthenticatedUserWithImage: AuthenticatedUser = {
    ext_id: 'HHHFNPNWDbKmElNBF2Y1yCfo0kqtbB7B',
    id: 'HHHFNPNWDbKmElNBF2Y1yCfo0kqtbB7B',
    name: 'Test User',
    email: 'test-user@example.com',
    image: 'https://example.com/avatar.jpg',
    payload: {
      ...mockJwtPayload,
      image: 'https://example.com/avatar.jpg',
    },
  };

  const mockDbUser = {
    id: BigInt(1),
    extId: 'HHHFNPNWDbKmElNBF2Y1yCfo0kqtbB7B',
    isSystemAdmin: false,
  };

  beforeEach(async () => {
    getUserByExtIdSpy = jest.fn();
    userService = {
      getUserByExtId: getUserByExtIdSpy,
    } as unknown as jest.Mocked<UserService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [
        {
          provide: UserService,
          useValue: userService,
        },
      ],
    }).compile();

    controller = module.get<ProfileController>(ProfileController);
  });

  describe('getProfile', () => {
    it('should return user profile with ext_id mapping', async () => {
      getUserByExtIdSpy.mockResolvedValue(mockDbUser);

      const result = await controller.getProfile(mockAuthenticatedUser);

      expect(result).toBeDefined();
      expect(result.ext_id).toBe(mockAuthenticatedUser.ext_id);
      expect(result.id).toBe(mockAuthenticatedUser.id);
      expect(result.name).toBe(mockAuthenticatedUser.name);
      expect(result.email).toBe(mockAuthenticatedUser.email);
      expect(result.image).toBeNull();
      expect(result.is_system_admin).toBe(false);
      expect(result.payload).toEqual(mockJwtPayload);
      expect(getUserByExtIdSpy).toHaveBeenCalledWith(
        mockAuthenticatedUser.ext_id,
      );
    });

    it('should return is_system_admin=true when user is admin', async () => {
      getUserByExtIdSpy.mockResolvedValue({
        ...mockDbUser,
        isSystemAdmin: true,
      });

      const result = await controller.getProfile(mockAuthenticatedUser);

      expect(result.is_system_admin).toBe(true);
    });

    it('should throw NotFound error when user not found in DB', async () => {
      getUserByExtIdSpy.mockResolvedValue(null);

      await expect(controller.getProfile(mockAuthenticatedUser)).rejects.toThrow(
        'User not found',
      );
    });

    it('should map user.id to ext_id correctly', async () => {
      getUserByExtIdSpy.mockResolvedValue(mockDbUser);

      const result = await controller.getProfile(mockAuthenticatedUser);

      expect(result.ext_id).toBe(mockAuthenticatedUser.id);
      expect(result.ext_id).toBe('HHHFNPNWDbKmElNBF2Y1yCfo0kqtbB7B');
    });

    it('should return null for image when user.image is undefined', async () => {
      getUserByExtIdSpy.mockResolvedValue(mockDbUser);

      const result = await controller.getProfile(mockAuthenticatedUser);

      expect(result.image).toBeNull();
    });

    it('should return image URL when user has image', async () => {
      getUserByExtIdSpy.mockResolvedValue(mockDbUser);

      const result = await controller.getProfile(mockAuthenticatedUserWithImage);

      expect(result.image).toBe('https://example.com/avatar.jpg');
    });

    it('should include full JWT payload in response', async () => {
      getUserByExtIdSpy.mockResolvedValue(mockDbUser);

      const result = await controller.getProfile(mockAuthenticatedUser);

      expect(result.payload).toEqual(mockJwtPayload);
      expect(result.payload.id).toBe('HHHFNPNWDbKmElNBF2Y1yCfo0kqtbB7B');
      expect(result.payload.name).toBe('Test User');
      expect(result.payload.email).toBe('test-user@example.com');
      expect(result.payload.activeOrganizationId).toBeNull();
      expect(result.payload.activeTeamId).toBeNull();
      expect(result.payload.impersonatedBy).toBeNull();
    });

    it('should return all required fields in correct format', async () => {
      getUserByExtIdSpy.mockResolvedValue(mockDbUser);

      const result = await controller.getProfile(mockAuthenticatedUser);

      expect(result).toHaveProperty('ext_id');
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('image');
      expect(result).toHaveProperty('is_system_admin');
      expect(result).toHaveProperty('payload');

      expect(typeof result.ext_id).toBe('string');
      expect(typeof result.id).toBe('string');
      expect(typeof result.name).toBe('string');
      expect(typeof result.email).toBe('string');
      expect(result.image === null || typeof result.image === 'string').toBe(
        true,
      );
      expect(typeof result.is_system_admin).toBe('boolean');
      expect(typeof result.payload).toBe('object');
    });

    it('should handle user with organization and team IDs', async () => {
      getUserByExtIdSpy.mockResolvedValue(mockDbUser);

      const userWithOrg: AuthenticatedUser = {
        ...mockAuthenticatedUser,
        payload: {
          ...mockJwtPayload,
          activeOrganizationId: 'org_123',
          activeTeamId: 'team_456',
        },
      };

      const result = await controller.getProfile(userWithOrg);

      expect(result.payload.activeOrganizationId).toBe('org_123');
      expect(result.payload.activeTeamId).toBe('team_456');
    });

    it('should handle impersonated user', async () => {
      getUserByExtIdSpy.mockResolvedValue(mockDbUser);

      const impersonatedUser: AuthenticatedUser = {
        ...mockAuthenticatedUser,
        payload: {
          ...mockJwtPayload,
          impersonatedBy: 'admin_user_id',
        },
      };

      const result = await controller.getProfile(impersonatedUser);

      expect(result.payload.impersonatedBy).toBe('admin_user_id');
    });

    it('should return id and ext_id as the same value', async () => {
      getUserByExtIdSpy.mockResolvedValue(mockDbUser);

      const result = await controller.getProfile(mockAuthenticatedUser);

      expect(result.id).toBe(result.ext_id);
      expect(result.id).toBe('HHHFNPNWDbKmElNBF2Y1yCfo0kqtbB7B');
    });
  });
});
