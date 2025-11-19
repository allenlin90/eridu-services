import { Controller, Get } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { Public } from '@/lib/decorators/public.decorator';

@Public()
@Controller('health')
export class HealthController {
  constructor(
    @InjectPinoLogger(HealthController.name)
    private readonly logger: PinoLogger,
  ) {}

  @Get()
  liveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'erify_api',
    };
  }

  @Get('ready')
  readiness() {
    // Add any readiness checks here (database connectivity, etc.)
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      service: 'erify_api',
    };
  }
}
