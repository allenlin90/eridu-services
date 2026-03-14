import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const userExtId = typeof req.user?.ext_id === 'string'
      ? req.user.ext_id
      : 'anonymous';
    const ip = this.getClientIp(req);

    return `${userExtId}:${ip}`;
  }

  private getClientIp(req: Record<string, any>): string {
    if (typeof req.ip === 'string' && req.ip.length > 0) {
      return req.ip;
    }

    const socketIp = req.socket?.remoteAddress;
    if (typeof socketIp === 'string' && socketIp.length > 0) {
      return socketIp;
    }

    return 'unknown';
  }
}
