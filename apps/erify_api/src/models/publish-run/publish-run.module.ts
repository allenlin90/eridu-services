import { Module } from '@nestjs/common';

import { PublishRunRepository } from './publish-run.repository';
import { PublishRunService } from './publish-run.service';

import { UidGeneratorModule } from '@/lib/uid/uid-generator.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule, UidGeneratorModule],
  providers: [PublishRunRepository, PublishRunService],
  exports: [PublishRunService],
})
export class PublishRunModule {}
