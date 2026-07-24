import { Module } from '@nestjs/common';

import { ShowStatusService } from './show-status.service';

import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [PrismaModule, UtilityModule],
  providers: [ShowStatusService],
  exports: [ShowStatusService],
})
export class ShowStatusModule {}
