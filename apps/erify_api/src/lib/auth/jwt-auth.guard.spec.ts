import type { Reflector } from '@nestjs/core';

import type { JwtPayload, UserInfo } from '@eridu/auth-sdk/types';

import type { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('jwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    const authService = {
      getJwtVerifier: jest.fn().mockReturnValue({}),
    } as unknown as AuthService;
    const reflector = {} as Reflector;
    guard = new JwtAuthGuard(authService, reflector);
  });

  describe('transformUser', () => {
    // `transformUser` is the single source of the request.user shape: the SDK's
    // canActivate calls it after verifying the token and attaches the result to
    // `request.user`. Pins the better-auth `payload.id` → `ext_id` mapping and
    // the full-payload retention (WI-30 item 7c de-dup).
    const callTransformUser = (payload: JwtPayload, userInfo: UserInfo) =>
      (guard as unknown as {
        transformUser: (p: JwtPayload, u: UserInfo) => unknown;
      }).transformUser(payload, userInfo);

    it('maps the JWT payload + user info to AuthenticatedUser (id → ext_id, full payload retained)', () => {
      const payload = {
        id: 'user_abc123',
        name: 'Alice From JWT',
        email: 'alice@example.com',
        image: 'https://example.com/alice.png',
        iat: 1,
        exp: 2,
      } as JwtPayload;
      const userInfo: UserInfo = {
        id: 'user_abc123',
        name: 'Alice',
        email: 'alice@example.com',
        image: 'https://example.com/alice.png',
      };

      expect(callTransformUser(payload, userInfo)).toEqual({
        ext_id: 'user_abc123',
        id: 'user_abc123',
        name: 'Alice',
        email: 'alice@example.com',
        image: 'https://example.com/alice.png',
        payload,
      });
    });

    it('carries through an absent image and uses the userInfo name/email (not the payload copies)', () => {
      const payload = {
        id: 'user_xyz',
        name: 'Stale Payload Name',
        email: 'stale@example.com',
      } as JwtPayload;
      const userInfo: UserInfo = {
        id: 'user_xyz',
        name: 'Fresh Name',
        email: 'fresh@example.com',
      };

      expect(callTransformUser(payload, userInfo)).toEqual({
        ext_id: 'user_xyz',
        id: 'user_xyz',
        name: 'Fresh Name',
        email: 'fresh@example.com',
        image: undefined,
        payload,
      });
    });
  });
});
