import { Module } from '@nestjs/common';

import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

import { StudioRepository } from './studio.repository';
import { StudioService } from './studio.service';

@Module({
  imports: [PrismaModule, UtilityModule],
  providers: [StudioService, StudioRepository],
  exports: [StudioService],
})
export class StudioModule {}
