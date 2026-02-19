import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';

import { HttpError } from '@/lib/errors/http-error.util';
import { StudioGuard } from '@/lib/guards/studio.guard';
import { StudioService } from '@/models/studio/studio.service';
import { UserService } from '@/models/user/user.service';

describe('studioGuard', () => {
  let guard: StudioGuard;
  let reflector: Reflector;

  const mockUser = {
    ext_id: 'user-123',
    email: 'test@example.com',
  };

  const mockStudioId = `${StudioService.UID_PREFIX}_123`;

  const mockExecutionContext = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn(),
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext;

  const mockUserService = {
    getStudioMembership: jest.fn(),
  };

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudioGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    guard = module.get<StudioGuard>(StudioGuard);
    reflector = module.get<Reflector>(Reflector);
    // userService = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should return true if no roles metadata is found (pass through)', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockUserService.getStudioMembership).not.toHaveBeenCalled();
    });

    it('should throw Unauthorized if user is not in request', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

      (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue({
        user: undefined,
      });

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        HttpError.unauthorized('Authentication required'),
      );
    });

    it('should throw BadRequest if studioId is missing in params', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

      (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue({
        user: mockUser,
        params: {},
      });

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        HttpError.badRequest('Context missing studio identifier'),
      );
    });

    it('should throw BadRequest if studioId has invalid format', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

      (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue({
        user: mockUser,
        params: { studioId: 'invalid-id' },
      });

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        HttpError.badRequest('Invalid Studio ID format'),
      );
    });

    it('should throw Forbidden if user has no membership in studio', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
      jest.spyOn(mockUserService, 'getStudioMembership').mockResolvedValue(null);

      (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue({
        user: mockUser,
        params: { studioId: mockStudioId },
      });

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        HttpError.forbidden('Studio membership required'),
      );

      expect(mockUserService.getStudioMembership).toHaveBeenCalledWith(
        mockUser.ext_id,
        mockStudioId,
      );
    });

    it('should allow access if user has membership and no specific roles are required', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
      const mockMembership = { role: STUDIO_ROLE.MEMBER, uid: 'mem-1' };

      jest.spyOn(mockUserService, 'getStudioMembership').mockResolvedValue(mockMembership);

      const request = {
        user: mockUser,
        params: { studioId: mockStudioId },
      };

      (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(request);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect((request as any).studioMembership).toEqual(mockMembership);
    });

    it('should throw Forbidden if user has membership but insufficient role', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([STUDIO_ROLE.ADMIN]);
      const mockMembership = { role: STUDIO_ROLE.MEMBER, uid: 'mem-1' };

      jest.spyOn(mockUserService, 'getStudioMembership').mockResolvedValue(mockMembership);

      (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue({
        user: mockUser,
        params: { studioId: mockStudioId },
      });

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        HttpError.forbidden('Insufficient studio permissions'),
      );
    });

    it('should allow access if user has membership and required role', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([STUDIO_ROLE.ADMIN]);
      const mockMembership = { role: STUDIO_ROLE.ADMIN, uid: 'mem-1' };

      jest.spyOn(mockUserService, 'getStudioMembership').mockResolvedValue(mockMembership);

      const request = {
        user: mockUser,
        params: { studioId: mockStudioId },
      };

      (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(request);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect((request as any).studioMembership).toEqual(mockMembership);
    });
  });
});
