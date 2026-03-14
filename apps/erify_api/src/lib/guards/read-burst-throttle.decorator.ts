import { applyDecorators, SetMetadata } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

export const READ_BURST_THROTTLE_KEY = 'throttle:read-burst-enabled';

/**
 * Opt a route into the read-burst throttler and skip the strict default profile.
 */
export function ReadBurstThrottle() {
  return applyDecorators(
    SetMetadata(READ_BURST_THROTTLE_KEY, true),
    SkipThrottle({ default: true }),
  );
}
