import { Module } from '@nestjs/common';

import { ShowStatusRepository } from './show-status.repository';
import { ShowStatusService } from './show-status.service';

import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [PrismaModule, UtilityModule],
  providers: [ShowStatusRepository, ShowStatusService],
  exports: [ShowStatusService],
})
export class ShowStatusModule {}
