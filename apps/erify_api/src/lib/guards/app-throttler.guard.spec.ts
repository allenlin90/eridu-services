import { Reflector } from '@nestjs/core';

import { AppThrottlerGuard } from './app-throttler.guard';

describe('appThrottlerGuard', () => {
  function createGuard() {
    return new AppThrottlerGuard(
      [] as any,
      { increment: jest.fn() } as any,
      new Reflector(),
    );
  }

  it('uses user ext_id and request ip for tracker identity', async () => {
    const guard = createGuard();
    const tracker = await (guard as any).getTracker({
      user: { ext_id: 'user_1' },
      ip: '10.0.0.9',
    });

    expect(tracker).toBe('user_1:10.0.0.9');
  });

  it('falls back to anonymous and socket address when request fields are missing', async () => {
    const guard = createGuard();
    const tracker = await (guard as any).getTracker({
      socket: {
        remoteAddress: '127.0.0.1',
      },
    });

    expect(tracker).toBe('anonymous:127.0.0.1');
  });
});
