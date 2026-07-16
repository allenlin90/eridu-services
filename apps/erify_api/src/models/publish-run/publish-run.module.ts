import { Module } from '@nestjs/common';

import { PublishRunRepository } from './publish-run.repository';
import { PublishRunService } from './publish-run.service';

import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [PrismaModule, UtilityModule],
  providers: [PublishRunRepository, PublishRunService],
  exports: [PublishRunService],
})
export class PublishRunModule {}
