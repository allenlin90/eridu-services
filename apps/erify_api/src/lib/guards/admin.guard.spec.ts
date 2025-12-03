// Mock auth-sdk modules to avoid ES module import issues
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';

import { AdminGuard } from './admin.guard';

import { IS_ADMIN_KEY } from '@/lib/decorators/admin-protected.decorator';
import type { StudioMembershipService } from '@/models/membership/studio-membership.service';
import { createMockExecutionContext } from '@/testing/guard-test.helper';

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

jest.mock('@eridu/auth-sdk/adapters/nestjs/jwt-auth.guard', () => ({
  JwtAuthGuard: class MockSdkJwtAuthGuard {},
}));

jest.mock('@eridu/auth-sdk/server/jwks/jwks-service', () => ({
  JwksService: class MockJwksService {
    constructor() {}
    async initialize() {}
  },
}));

jest.mock('@eridu/auth-sdk/server/jwt/jwt-verifier', () => ({
  JwtVerifier: class MockJwtVerifier {
    constructor() {}
  },
}));

jest.mock('@eridu/auth-sdk/server/jwks/types', () => ({}));
jest.mock('@eridu/auth-sdk/server/jwt/types', () => ({}));
jest.mock('@eridu/auth-sdk/types', () => ({}));

describe('adminGuard', () => {
  let guard: AdminGuard;
  let studioMembershipService: jest.Mocked<StudioMembershipService>;
  let reflector: jest.Mocked<Reflector>;
  let findAdminMembershipByExtIdSpy: jest.Mock;
  let getAllAndOverrideSpy: jest.Mock;

  beforeEach(() => {
    findAdminMembershipByExtIdSpy = jest.fn();
    getAllAndOverrideSpy = jest.fn().mockReturnValue(true);
    studioMembershipService = {
      findAdminMembershipByExtId: findAdminMembershipByExtIdSpy,
      // Other methods are not used in this guard
    } as unknown as jest.Mocked<StudioMembershipService>;

    reflector = {
      getAllAndOverride: getAllAndOverrideSpy,
    } as unknown as jest.Mocked<Reflector>;

    guard = new AdminGuard(reflector, studioMembershipService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should allow access for authenticated admin user', async () => {
    const extId = 'user_ext_123';
    const email = 'admin@example.com';

    getAllAndOverrideSpy.mockReturnValue(true);
    findAdminMembershipByExtIdSpy.mockResolvedValue({
      studioId: BigInt(1),
    } as unknown);

    const context = createMockExecutionContext({
      user: {
        ext_id: extId,
        email,
      },
    });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(getAllAndOverrideSpy).toHaveBeenCalledWith(IS_ADMIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    expect(findAdminMembershipByExtIdSpy).toHaveBeenCalledWith(extId);
  });

  it('should throw UnauthorizedException when user is missing', async () => {
    getAllAndOverrideSpy.mockReturnValue(true);
    const context = createMockExecutionContext({
      user: undefined,
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(getAllAndOverrideSpy).toHaveBeenCalledWith(IS_ADMIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // Should not call membership service if user is missing
    expect(findAdminMembershipByExtIdSpy).not.toHaveBeenCalled();
  });

  it('should throw ForbiddenException when user is not admin', async () => {
    const extId = 'user_ext_456';
    const email = 'user@example.com';

    getAllAndOverrideSpy.mockReturnValue(true);
    findAdminMembershipByExtIdSpy.mockResolvedValue(null);

    const context = createMockExecutionContext({
      user: {
        ext_id: extId,
        email,
      },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
    expect(getAllAndOverrideSpy).toHaveBeenCalledWith(IS_ADMIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    expect(findAdminMembershipByExtIdSpy).toHaveBeenCalledWith(extId);
  });
});
