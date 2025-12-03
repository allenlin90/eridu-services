import { Module } from '@nestjs/common';

import { ShowMcRepository } from './show-mc.repository';
import { ShowMcService } from './show-mc.service';

import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [PrismaModule, UtilityModule],
  providers: [ShowMcService, ShowMcRepository],
  exports: [ShowMcService],
})
export class ShowMcModule {}
