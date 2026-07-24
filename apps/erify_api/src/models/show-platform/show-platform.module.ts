import { Module } from '@nestjs/common';

import { ShowPlatformRepository } from './show-platform.repository';
import { ShowPlatformService } from './show-platform.service';

import { UidGeneratorModule } from '@/lib/uid/uid-generator.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule, UidGeneratorModule],
  providers: [ShowPlatformService, ShowPlatformRepository],
  exports: [ShowPlatformService, ShowPlatformRepository],
})
export class ShowPlatformModule {}
