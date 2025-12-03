import { Module } from '@nestjs/common';

import { ShowPlatformRepository } from './show-platform.repository';
import { ShowPlatformService } from './show-platform.service';

import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [PrismaModule, UtilityModule],
  providers: [ShowPlatformService, ShowPlatformRepository],
  exports: [ShowPlatformService],
})
export class ShowPlatformModule {}
