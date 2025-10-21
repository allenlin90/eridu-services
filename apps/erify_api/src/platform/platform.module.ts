import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { UtilityModule } from '../utility/utility.module';
import { PlatformRepository } from './platform.repository';
import { PlatformService } from './platform.service';

@Module({
  imports: [PrismaModule, UtilityModule],
  providers: [PlatformService, PlatformRepository],
  exports: [PlatformService],
})
export class PlatformModule {}
