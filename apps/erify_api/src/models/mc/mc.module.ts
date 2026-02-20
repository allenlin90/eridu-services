import { Module } from '@nestjs/common';

import { McRepository } from './mc.repository';
import { McService } from './mc.service';

import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [PrismaModule, UtilityModule],
  providers: [McService, McRepository],
  exports: [McService],
})
export class McModule {}
