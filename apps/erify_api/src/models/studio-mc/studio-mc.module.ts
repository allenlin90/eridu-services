import { Module } from '@nestjs/common';

import { StudioMcRepository } from './studio-mc.repository';
import { StudioMcService } from './studio-mc.service';

import { McModule } from '@/models/mc/mc.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [PrismaModule, UtilityModule, McModule],
  providers: [StudioMcRepository, StudioMcService],
  exports: [StudioMcRepository, StudioMcService],
})
export class StudioMcModelModule {}
