import { Module } from '@nestjs/common';

import { PlatformRepository } from './platform.repository';
import { PlatformService } from './platform.service';

import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [PrismaModule, UtilityModule],
  providers: [PlatformService, PlatformRepository],
  exports: [PlatformService],
})
export class PlatformModule {}
