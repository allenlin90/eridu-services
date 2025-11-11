import { Module } from '@nestjs/common';

import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

import { ShowStatusRepository } from './show-status.repository';
import { ShowStatusService } from './show-status.service';

@Module({
  imports: [PrismaModule, UtilityModule],
  providers: [ShowStatusRepository, ShowStatusService],
  exports: [ShowStatusService],
})
export class ShowStatusModule {}
